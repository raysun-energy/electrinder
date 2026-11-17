// Projection et géométrie. Aucune dépendance, aucune API externe :
// tout fonctionne même si le wifi du hall lâche.

export const BORNES = { lngMin: 2.45, lngMax: 6.45, latMin: 49.44, latMax: 51.56 }

const LAT_REF = (BORNES.latMin + BORNES.latMax) / 2
const K = Math.cos((LAT_REF * Math.PI) / 180) // correction de la convergence des méridiens

// Rapport largeur/hauteur naturel de la Belgique une fois projetée
export const RATIO =
  ((BORNES.lngMax - BORNES.lngMin) * K) / (BORNES.latMax - BORNES.latMin)

// Repère interne : 1000 de large, hauteur déduite du ratio
export const VUE = { w: 1000, h: Math.round(1000 / RATIO) }

export function projeter(lng, lat) {
  const x = ((lng - BORNES.lngMin) / (BORNES.lngMax - BORNES.lngMin)) * VUE.w
  const y = ((BORNES.latMax - lat) / (BORNES.latMax - BORNES.latMin)) * VUE.h
  return [x, y]
}

function anneauVersChemin(anneau) {
  let d = ''
  for (let i = 0; i < anneau.length; i++) {
    const [x, y] = projeter(anneau[i][0], anneau[i][1])
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
}

export function geometrieVersChemin(geom) {
  if (!geom) return ''
  if (geom.type === 'Polygon') return geom.coordinates.map(anneauVersChemin).join(' ')
  if (geom.type === 'MultiPolygon')
    return geom.coordinates.map((p) => p.map(anneauVersChemin).join(' ')).join(' ')
  return ''
}

// Distance à vol d'oiseau, en kilomètres
export function distanceKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Deux entreprises au même code postal se superposeraient. On les
// écarte légèrement, de façon déterministe, pour qu'elles restent lisibles.
export function decaler(lat, lng, graine) {
  let h = 2166136261
  const s = String(graine)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const angle = ((h >>> 0) % 360) * (Math.PI / 180)
  const rayon = 0.004 + (((h >>> 9) % 100) / 100) * 0.009
  return { lat: lat + Math.sin(angle) * rayon, lng: lng + (Math.cos(angle) * rayon) / K }
}
