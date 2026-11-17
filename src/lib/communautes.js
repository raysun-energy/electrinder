import { distanceKm } from './geo.js'
import { HYPOTHESES, TAILLES, TEINTES_COMMUNAUTE } from '../config.js'

const profil = (id) => TAILLES.find((t) => t.id === id) || TAILLES[1]

export function kwcDe(site) {
  return site.role === 'consommateur' ? 0 : profil(site.taille).kwc
}
export function consoDe(site) {
  return site.role === 'producteur' ? 0 : profil(site.taille).consoMwh
}

/**
 * Regroupement autour d'un site pivot.
 *
 * La version naïve — « je relie de proche en proche tout ce qui est à
 * portée » — fait fusionner tout le pays en une seule communauté dès
 * quelques centaines de participants, par effet de chaîne : A touche B,
 * B touche C, et de fil en aiguille Ostende se retrouve avec Arlon.
 *
 * Ici, on choisit à chaque tour le site restant qui a le plus de voisins,
 * on lui rattache ses voisins encore libres, et on recommence. Chaque
 * membre est donc réellement à portée d'un même point central, ce qui
 * correspond à la réalité physique d'un partage d'énergie.
 */
export function regrouper(sites, rayonKm) {
  const n = sites.length
  const voisins = sites.map(() => [])
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (distanceKm(sites[i], sites[j]) <= rayonKm) {
        voisins[i].push(j)
        voisins[j].push(i)
      }
    }
  }

  const libre = new Array(n).fill(true)
  const groupes = []

  while (true) {
    let pivot = -1
    let meilleur = -1
    for (let i = 0; i < n; i++) {
      if (!libre[i]) continue
      let dispo = 0
      for (const v of voisins[i]) if (libre[v]) dispo++
      if (dispo > meilleur) {
        meilleur = dispo
        pivot = i
      }
    }
    if (pivot === -1) break

    const membres = [pivot]
    libre[pivot] = false
    for (const v of voisins[pivot]) {
      if (libre[v]) {
        libre[v] = false
        membres.push(v)
      }
    }
    groupes.push(membres)
  }

  return groupes.map((membres, index) => {
    const liste = membres.map((i) => sites[i])
    const pivot = liste[0]
    const kwc = liste.reduce((s, x) => s + kwcDe(x), 0)
    const conso = liste.reduce((s, x) => s + consoDe(x), 0)
    const production = (kwc * HYPOTHESES.rendementKwhParKwc) / 1000 // MWh/an
    const partageable = Math.min(production, conso * HYPOTHESES.tauxSimultaneite)
    return {
      id: 'c' + index,
      membres: liste,
      pivot,
      taille: liste.length,
      producteurs: liste.filter((x) => x.role !== 'consommateur').length,
      consommateurs: liste.filter((x) => x.role !== 'producteur').length,
      kwc,
      production,
      partageable,
      economie: (partageable * HYPOTHESES.ecartPrixEuroParMwh) / 1000, // k€/an
      co2: partageable * HYPOTHESES.co2TonneParMwh, // t/an
      teinte: TEINTES_COMMUNAUTE[index % TEINTES_COMMUNAUTE.length],
      viable:
        liste.length >= 2 &&
        liste.some((x) => x.role !== 'consommateur') &&
        liste.some((x) => x.role !== 'producteur'),
    }
  })
}

export function bilan(groupes, sites) {
  const viables = groupes.filter((g) => g.viable)
  return {
    entreprises: sites.length,
    communautes: viables.length,
    mwh: viables.reduce((s, g) => s + g.partageable, 0),
    economie: viables.reduce((s, g) => s + g.economie, 0),
    co2: viables.reduce((s, g) => s + g.co2, 0),
    isoles: sites.length - viables.reduce((s, g) => s + g.taille, 0),
  }
}

// Nom lisible d'une communauté : la ville de son site pivot
export function nomCommunaute(groupe) {
  return groupe.pivot?.ville || groupe.pivot?.code_postal || 'Belgique'
}
