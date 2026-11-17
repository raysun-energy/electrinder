import codesPostaux from '../data/codespostaux.json'
import { distanceKm } from './geo.js'

// ─────────────────────────────────────────────────────────────
//  Le cœur du jeu : les courbes de charge.
//  Un partage d'énergie ne marche pas parce que les gens sont
//  voisins, mais parce qu'ils consomment quand l'autre produit.
//  Chaque secteur a donc sa journée type, sur 24 heures.
// ─────────────────────────────────────────────────────────────

const SOLEIL = [0, 0, 0, 0, 0, 1, 4, 12, 28, 48, 68, 84, 94, 100, 94, 82, 62, 40, 22, 8, 2, 0, 0, 0]

const SECTEURS = [
  {
    nom: 'Boulangerie',
    emoji: '🥐',
    courbe: [20, 60, 95, 100, 95, 80, 70, 60, 45, 35, 30, 28, 25, 22, 20, 18, 15, 12, 10, 8, 6, 5, 8, 12],
    remarque: 'Les fours tournent quand il fait encore nuit.',
  },
  {
    nom: 'Bureaux',
    emoji: '💼',
    courbe: [8, 8, 8, 8, 8, 10, 20, 45, 80, 92, 96, 98, 90, 95, 98, 95, 85, 65, 35, 18, 12, 10, 8, 8],
    remarque: 'Ordinateurs, clim, ascenseurs : la journée classique.',
  },
  {
    nom: 'Menuiserie',
    emoji: '🪵',
    courbe: [5, 5, 5, 5, 5, 12, 45, 85, 98, 100, 100, 95, 60, 92, 98, 96, 80, 40, 15, 8, 5, 5, 5, 5],
    remarque: "Les machines démarrent à 7h et s'arrêtent à 17h.",
  },
  {
    nom: 'Supermarché',
    emoji: '🛒',
    courbe: [42, 40, 40, 40, 42, 48, 60, 72, 85, 92, 96, 100, 98, 95, 93, 95, 98, 96, 88, 72, 58, 48, 44, 42],
    remarque: 'Le froid ne dort jamais, mais il consomme plus en journée.',
  },
  {
    nom: 'Entrepôt frigorifique',
    emoji: '🧊',
    courbe: [70, 68, 66, 65, 65, 68, 74, 80, 86, 92, 96, 100, 100, 98, 96, 92, 86, 80, 76, 74, 72, 71, 70, 70],
    remarque: 'Presque plat, avec un pic quand il fait chaud dehors.',
  },
  {
    nom: 'Restaurant',
    emoji: '🍽️',
    courbe: [5, 5, 5, 5, 5, 8, 15, 25, 40, 55, 78, 100, 95, 70, 45, 40, 50, 70, 95, 92, 70, 40, 20, 10],
    remarque: 'Deux services, dont un après le coucher du soleil.',
  },
  {
    nom: 'Salle de sport',
    emoji: '🏋️',
    courbe: [10, 8, 8, 8, 10, 40, 75, 85, 60, 45, 42, 45, 55, 50, 45, 50, 72, 95, 100, 92, 70, 45, 25, 15],
    remarque: 'On vient avant le travail ou après. Jamais à midi.',
  },
  {
    nom: 'Car-wash',
    emoji: '🚿',
    courbe: [2, 2, 2, 2, 2, 5, 15, 35, 60, 85, 95, 100, 96, 92, 90, 88, 80, 62, 35, 15, 6, 3, 2, 2],
    remarque: 'Personne ne lave sa voiture à 3h du matin.',
  },
  {
    nom: 'Piscine communale',
    emoji: '🏊',
    courbe: [30, 28, 28, 28, 30, 45, 70, 88, 92, 90, 88, 90, 95, 92, 90, 92, 96, 100, 95, 80, 55, 40, 34, 32],
    remarque: 'Chauffage et pompes toute la journée : un client de rêve.',
  },
  {
    nom: 'Imprimerie',
    emoji: '🖨️',
    courbe: [15, 15, 15, 15, 20, 55, 88, 98, 100, 98, 96, 90, 65, 92, 98, 96, 88, 70, 45, 30, 20, 18, 15, 15],
    remarque: 'Deux équipes, du petit matin à la fin de soirée.',
  },
  {
    nom: 'Brasserie de nuit',
    emoji: '🍺',
    courbe: [70, 55, 35, 20, 12, 8, 6, 6, 8, 10, 15, 25, 35, 40, 42, 48, 62, 80, 92, 98, 100, 96, 90, 82],
    remarque: "Ouvre quand vos panneaux s'éteignent.",
  },
  {
    nom: 'École',
    emoji: '🎒',
    courbe: [8, 8, 8, 8, 10, 18, 40, 78, 96, 100, 98, 95, 88, 92, 90, 75, 45, 25, 15, 10, 8, 8, 8, 8],
    remarque: 'Parfaite en semaine, déserte en juillet.',
  },
  {
    nom: 'Blanchisserie',
    emoji: '🧺',
    courbe: [10, 10, 10, 12, 30, 70, 95, 100, 100, 98, 96, 92, 80, 88, 85, 70, 45, 25, 15, 12, 10, 10, 10, 10],
    remarque: 'Sèche-linge à fond dès 6h.',
  },
  {
    nom: 'Hébergeur informatique',
    emoji: '🖥️',
    courbe: [82, 80, 80, 80, 80, 82, 85, 88, 92, 95, 97, 100, 100, 98, 97, 95, 92, 90, 88, 86, 85, 84, 83, 82],
    remarque: 'Consomme la même chose 8 760 heures par an.',
  },
  {
    nom: 'Serres horticoles',
    emoji: '🌱',
    courbe: [88, 90, 92, 90, 85, 60, 30, 15, 10, 8, 8, 8, 10, 10, 12, 18, 40, 70, 90, 95, 100, 96, 92, 90],
    remarque: "L'éclairage s'allume justement quand le soleil part.",
  },
  {
    nom: 'Garage automobile',
    emoji: '🔧',
    courbe: [5, 5, 5, 5, 5, 10, 35, 75, 95, 100, 98, 92, 60, 90, 96, 94, 82, 55, 20, 10, 6, 5, 5, 5],
    remarque: 'Ponts et compresseurs aux heures ouvrables.',
  },
  {
    nom: 'Discothèque',
    emoji: '🪩',
    courbe: [100, 98, 90, 70, 40, 15, 8, 5, 4, 4, 4, 5, 6, 8, 10, 12, 15, 20, 30, 45, 65, 85, 95, 100],
    remarque: 'Le pire client possible pour du solaire. Et tout le monde le sent.',
  },
  {
    nom: 'Bornes de recharge',
    emoji: '🔌',
    courbe: [12, 10, 10, 10, 12, 20, 45, 70, 88, 95, 98, 100, 96, 94, 92, 90, 82, 70, 55, 40, 28, 20, 15, 12],
    remarque: 'Les voitures dorment sur le parking pendant que ça produit.',
  },
  {
    nom: 'Fromagerie',
    emoji: '🧀',
    courbe: [25, 25, 30, 55, 85, 98, 100, 96, 90, 85, 80, 75, 60, 68, 65, 55, 40, 30, 26, 25, 25, 25, 25, 25],
    remarque: 'Cuves chauffées dès 4h, refroidissement toute la journée.',
  },
  {
    nom: 'Cabinet médical',
    emoji: '🩺',
    courbe: [12, 12, 12, 12, 12, 15, 25, 55, 85, 95, 98, 92, 70, 88, 95, 96, 90, 78, 55, 30, 18, 14, 12, 12],
    remarque: 'Imagerie et stérilisation, en journée uniquement.',
  },
]

const pick = (a) => a[Math.floor(Math.random() * a.length)]
const somme = (a) => a.reduce((s, x) => s + x, 0)

const NOMS = ['Verhoeven', 'Dubois', 'Peeters', 'Lambert', 'Janssens', 'Martin', 'De Smet',
  'Leroy', 'Claes', 'Willems', 'Dupont', 'Maes', 'Simon', 'Goossens', 'Wouters', 'Mercier',
  'Nyssen', 'Vandamme', 'Delvaux', 'Coppens', 'Thys', 'Renard', 'Bastin', 'Van Hoof']

const TOITURES = [
  { nom: 'Hall logistique', emoji: '📦' },
  { nom: 'Ferme laitière', emoji: '🐄' },
  { nom: 'Zoning artisanal', emoji: '🏭' },
  { nom: 'Centre commercial', emoji: '🏬' },
  { nom: 'Site de production', emoji: '⚙️' },
  { nom: 'Dépôt de bus', emoji: '🚌' },
  { nom: 'Hall sportif', emoji: '🏟️' },
]

// Affinité d'un secteur avec le soleil : la part de sa journée type qui
// tombe pendant que les panneaux produisent. C'est le seul chiffre qui
// décide si un rapprochement a un sens. Calculée une fois au démarrage.
const normaliser = (c) => {
  const t = somme(c)
  return c.map((v) => v / t)
}
const SOLEIL_PART = normaliser(SOLEIL)
SECTEURS.forEach((s) => {
  const c = normaliser(s.courbe)
  s.affinite = c.reduce((acc, v, h) => acc + Math.min(v, SOLEIL_PART[h]), 0)
})

const zips = Object.keys(codesPostaux)

function repartir(totalMwh, courbe) {
  const t = somme(courbe)
  return courbe.map((v) => (v / t) * totalMwh)
}

export const RAYON_JEU = 12 // km

export function nouveauProducteur() {
  const cp = pick(zips)
  const lieu = codesPostaux[cp]
  const modele = pick(TOITURES)
  const kwc = 120 + Math.floor(Math.random() * 12) * 30 // 120 → 450 kWc
  const production = (kwc * 950) / 1000 // MWh/an
  return {
    id: 'p' + Math.random().toString(36).slice(2, 8),
    nom: `${modele.nom} ${pick(NOMS)}`,
    emoji: modele.emoji,
    ville: lieu.v,
    cp,
    lat: lieu.lat,
    lng: lieu.lng,
    kwc,
    production,
    profil: repartir(production, SOLEIL),
    restant: repartir(production, SOLEIL),
  }
}

// Les candidats sont tirés autour du producteur, avec quelques
// intrus lointains : refuser un site hors périmètre fait partie du métier.
export function nouveauCandidat(producteur) {
  const secteur = pick(SECTEURS)
  const loin = Math.random() < 0.16

  // On ne garde que des communes réellement à portée, distance calculée.
  const boite = zips.filter((z) => {
    const e = codesPostaux[z]
    return Math.abs(e.lat - producteur.lat) < 0.4 && Math.abs(e.lng - producteur.lng) < 0.6
  })
  const dedans = []
  const dehors = []
  for (const z of boite) {
    const d = distanceKm(producteur, codesPostaux[z])
    if (d <= RAYON_JEU - 1) dedans.push(z)
    else if (d < RAYON_JEU * 3) dehors.push(z)
  }
  const source = loin ? dehors : dedans
  const cp = source.length ? pick(source) : pick(dedans.length ? dedans : boite)
  const lieu = codesPostaux[cp]
  const conso = [40, 70, 110, 160, 240, 320][Math.floor(Math.random() * 6)]
  return {
    id: 'c' + Math.random().toString(36).slice(2, 8),
    nom: `${secteur.nom} ${pick(NOMS)}`,
    secteur: secteur.nom,
    emoji: secteur.emoji,
    remarque: secteur.remarque,
    affinite: secteur.affinite,
    courbe: secteur.courbe,
    ville: lieu.v,
    cp,
    lat: lieu.lat,
    lng: lieu.lng,
    conso,
    profil: repartir(conso, secteur.courbe),
    distance: Math.round(distanceKm(producteur, lieu)),
  }
}

/**
 * Évalue un rapprochement. Retourne les points, l'énergie réellement
 * partagée et une phrase à afficher — c'est elle qui fait comprendre
 * le métier en une seconde.
 */
export function evaluer(producteur, candidat, combo) {
  if (candidat.distance > RAYON_JEU) {
    return {
      ok: false,
      points: -900,
      mwh: 0,
      titre: 'Hors périmètre',
      phrase: `${candidat.distance} km. Le partage s'arrête bien avant.`,
    }
  }

  if (candidat.affinite < 0.4) {
    return {
      ok: false,
      points: -750,
      mwh: 0,
      titre: 'Mauvais horaire',
      phrase: candidat.remarque,
    }
  }

  let mwh = 0
  const restant = producteur.restant.slice()
  for (let h = 0; h < 24; h++) {
    const pris = Math.min(restant[h], candidat.profil[h])
    restant[h] -= pris
    mwh += pris
  }

  const proximite = 1 - (candidat.distance / RAYON_JEU) * 0.35
  const points = Math.round(mwh * 6 * candidat.affinite * proximite * combo)
  const excellent = candidat.affinite > 0.62

  return {
    ok: true,
    points,
    mwh,
    restant,
    titre: excellent ? 'Excellent voisin' : 'Ça peut marcher',
    phrase: excellent
      ? candidat.remarque
      : `${Math.round(candidat.affinite * 100)} % de sa consommation tombe en journée. ${Math.round(mwh)} MWh placés.`,
  }
}

export function tauxAutoconsommation(producteur) {
  return 1 - somme(producteur.restant) / producteur.production
}

export { SOLEIL, SECTEURS }
