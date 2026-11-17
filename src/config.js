// ─────────────────────────────────────────────────────────────
//  HYPOTHÈSES DE CALCUL — le seul endroit à modifier
//  C'est ici qu'un visiteur qui connaît son dossier peut vous
//  contredire. Gardez ces chiffres défendables.
// ─────────────────────────────────────────────────────────────

export const HYPOTHESES = {
  // Production photovoltaïque annuelle par kWc installé, en Belgique
  rendementKwhParKwc: 950,

  // Écart entre le prix d'achat réseau et le tarif de partage négocié,
  // c'est-à-dire ce que le partage fait gagner par MWh échangé
  ecartPrixEuroParMwh: 55,

  // Contenu carbone évité par MWh d'électricité renouvelable partagée
  co2TonneParMwh: 0.15,

  // Rayon de partage par défaut (km). Réglable depuis l'écran Réglages.
  rayonKmDefaut: 8,

  // Part de la consommation d'un site réellement couvrable en local
  // (simultanéité production / consommation sur le quart-horaire)
  tauxSimultaneite: 0.35,
}

// Profils par taille d'entreprise : toiture disponible et consommation.
// Volontairement prudents : mieux vaut annoncer moins et surprendre.
export const TAILLES = [
  { id: 'xs', libelle: '1 à 9 personnes', kwc: 15, consoMwh: 25 },
  { id: 's', libelle: '10 à 49 personnes', kwc: 60, consoMwh: 120 },
  { id: 'm', libelle: '50 à 249 personnes', kwc: 200, consoMwh: 550 },
  { id: 'l', libelle: '250 personnes et plus', kwc: 600, consoMwh: 1800 },
]

export const ROLES = [
  {
    id: 'producteur',
    libelle: 'Je produis',
    sous: 'Panneaux, cogénération, éolienne',
    icone: '☀',
  },
  {
    id: 'consommateur',
    libelle: 'Je consomme',
    sous: 'Bureaux, atelier, entrepôt, magasin',
    icone: '⚡',
  },
  {
    id: 'mixte',
    libelle: 'Les deux',
    sous: 'Je produis et je consomme sur place',
    icone: '⇄',
  },
]

// Paliers annoncés sur le mur pour donner un objectif au public
export const PALIERS = [10, 25, 50, 100, 150, 200, 300, 400, 500]

export const COULEURS_ROLE = {
  producteur: '#FFC145',
  consommateur: '#56A8FF',
  mixte: '#7BE0A8',
}

// Teintes attribuées aux communautés qui se forment
export const TEINTES_COMMUNAUTE = [
  '#FF8A5B', '#C792F0', '#5BE0D4', '#F0C24B', '#7FB2FF',
  '#F58FC2', '#9BE07A', '#FF9F6B', '#8FD3F4', '#D6A0FF',
]
