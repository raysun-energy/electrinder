import { createClient } from '@supabase/supabase-js'
import codesPostaux from '../data/codespostaux.json'
import { HYPOTHESES, TAILLES } from '../config.js'
import { decaler } from './geo.js'

// Découpage postal officiel : chaque province a ses tranches.
const PROVINCES = [
  { nom: 'Bruxelles', min: 1000, max: 1299 },
  { nom: 'Brabant wallon', min: 1300, max: 1499 },
  { nom: 'Brabant flamand', min: 1500, max: 1999 },
  { nom: 'Anvers', min: 2000, max: 2999 },
  { nom: 'Brabant flamand', min: 3000, max: 3499 },
  { nom: 'Limbourg', min: 3500, max: 3999 },
  { nom: 'Liège', min: 4000, max: 4999 },
  { nom: 'Namur', min: 5000, max: 5999 },
  { nom: 'Hainaut', min: 6000, max: 6599 },
  { nom: 'Luxembourg', min: 6600, max: 6999 },
  { nom: 'Hainaut', min: 7000, max: 7999 },
  { nom: 'Flandre-Occidentale', min: 8000, max: 8999 },
  { nom: 'Flandre-Orientale', min: 9000, max: 9999 },
]

export function provinceDe(codePostal) {
  const n = Number(codePostal)
  return PROVINCES.find((p) => n >= p.min && n <= p.max)?.nom || null
}

const CLE_REGLAGES = 'raysun.reglages'
const CLE_LOCALE = 'raysun.participants'
const CLE_SCORES = 'raysun.scores'

export function lireReglages() {
  let r = {}
  try {
    r = JSON.parse(localStorage.getItem(CLE_REGLAGES) || '{}')
  } catch {}
  return {
    url: r.url || import.meta.env.VITE_SUPABASE_URL || '',
    cle: r.cle || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    rayonKm: r.rayonKm || HYPOTHESES.rayonKmDefaut,
    titreSalon: r.titreSalon || 'Odoo Experience',
    // Le code QR du mur envoie sur le jeu : c'est ce qui fait sortir les
    // téléphones. La fin de partie renvoie vers la carte, donc rien n'est perdu.
    urlJeu: r.urlJeu || window.location.origin + window.location.pathname + '#/jeu',
    dureeJeu: r.dureeJeu || 90,
  }
}

export function ecrireReglages(r) {
  localStorage.setItem(CLE_REGLAGES, JSON.stringify(r))
}

let client = null
export function obtenirClient() {
  const { url, cle } = lireReglages()
  if (!url || !cle) return null
  if (!client || client.__url !== url) {
    client = createClient(url, cle, { realtime: { params: { eventsPerSecond: 5 } } })
    client.__url = url
  }
  return client
}

export const enLigne = () => !!obtenirClient()

/**
 * État réel de la base, mis à jour à chaque lecture.
 *
 *  'base'   la base répond, tout le monde voit la même carte
 *  'local'  aucune clé : chaque appareil garde ses données pour lui
 *  'panne'  les clés sont là mais la base refuse — c'est le cas piégeux,
 *           parce que l'application continuait à fonctionner en silence
 *
 * Sans cet indicateur, un stand peut tourner une journée entière en croyant
 * collecter des inscriptions qui ne quittent jamais le téléphone du visiteur.
 */
let etat = { mode: 'local', message: null }
export const etatBase = () => etat

// ─── Repli local ─────────────────────────────────────────────
// Sans Supabase, tout reste dans le navigateur. Le canal de diffusion
// permet à l'écran mur de réagir quand la tablette inscrit quelqu'un
// depuis un autre onglet du même appareil.
const canal = 'BroadcastChannel' in window ? new BroadcastChannel('raysun') : null

function lireLocal() {
  try {
    return JSON.parse(localStorage.getItem(CLE_LOCALE) || '[]')
  } catch {
    return []
  }
}
function ecrireLocal(liste) {
  localStorage.setItem(CLE_LOCALE, JSON.stringify(liste))
  canal?.postMessage({ type: 'maj' })
}

// ─── Lecture / écriture ──────────────────────────────────────

function normaliser(p) {
  const base = codesPostaux[p.code_postal]
  const pos = base
    ? decaler(base.lat, base.lng, p.id || p.entreprise || p.code_postal)
    : { lat: 50.85, lng: 4.35 }
  return {
    id: p.id,
    entreprise: p.entreprise,
    role: p.role,
    taille: p.taille,
    code_postal: p.code_postal,
    ville: p.ville || base?.v || '',
    cree_le: p.cree_le || p.created_at || new Date().toISOString(),
    demo: !!p.demo,
    lat: pos.lat,
    lng: pos.lng,
  }
}

export async function listerSites() {
  const c = obtenirClient()
  if (!c) {
    etat = { mode: 'local', message: 'Aucune clé Supabase dans ce site' }
    return lireLocal().map(normaliser)
  }
  const { data, error } = await c
    .from('participants')
    .select('id, entreprise, role, taille, code_postal, ville, cree_le, demo')
    .order('cree_le', { ascending: true })
    .limit(2000)
  if (error) {
    console.warn('Supabase indisponible, repli local :', error.message)
    etat = { mode: 'panne', message: error.message }
    return lireLocal().map(normaliser)
  }
  etat = { mode: 'base', message: null }
  return data.map(normaliser)
}

export async function inscrire({
  entreprise,
  role,
  taille,
  codePostal,
  email,
  demo = false,
}) {
  const ville = codesPostaux[codePostal]?.v || ''
  const ligne = {
    entreprise: entreprise.trim(),
    role,
    taille,
    code_postal: codePostal,
    ville,
    demo,
  }
  const c = obtenirClient()
  if (!c) {
    const liste = lireLocal()
    const enregistre = {
      ...ligne,
      id: 'l' + Date.now() + Math.random().toString(36).slice(2, 6),
      cree_le: new Date().toISOString(),
    }
    liste.push(enregistre)
    ecrireLocal(liste)
    return normaliser(enregistre)
  }
  const { data, error } = await c.from('participants').insert(ligne).select().single()
  if (error) throw error
  if (email) {
    // Table séparée : la clé publique peut y écrire, jamais la relire.
    await c.from('contacts').insert({ participant_id: data.id, email: email.trim() })
  }
  return normaliser(data)
}

// ─── Réglages partagés ───────────────────────────────────────
// Les visiteurs jouent sur leur propre téléphone, qui n'a aucun réglage
// local. Ce qui doit s'appliquer à eux passe donc par la base. Si la table
// n'existe pas encore, on retombe sans bruit sur le réglage de l'appareil.

export async function lireReglageGlobal(cle, defaut) {
  const c = obtenirClient()
  if (!c) return defaut
  try {
    const { data, error } = await c
      .from('reglages')
      .select('valeur')
      .eq('cle', cle)
      .maybeSingle()
    if (error || !data) return defaut
    return data.valeur ?? defaut
  } catch {
    return defaut
  }
}

export async function ecrireReglageGlobal(cle, valeur) {
  const c = obtenirClient()
  if (!c) return false
  const { error } = await c
    .from('reglages')
    .upsert({ cle, valeur, maj: new Date().toISOString() }, { onConflict: 'cle' })
  if (error) throw error
  return true
}

// ─── Scores du jeu ───────────────────────────────────────────

export async function enregistrerScore({ nom, entreprise, score }) {
  const ligne = {
    nom: nom.trim().slice(0, 24),
    entreprise: (entreprise || '').trim().slice(0, 48),
    score,
  }
  const c = obtenirClient()
  if (!c) {
    const liste = JSON.parse(localStorage.getItem(CLE_SCORES) || '[]')
    liste.push({ ...ligne, id: 's' + Date.now(), cree_le: new Date().toISOString() })
    localStorage.setItem(CLE_SCORES, JSON.stringify(liste))
    canal?.postMessage({ type: 'score' })
    return
  }
  const { error } = await c.from('scores').insert(ligne)
  if (error) throw error
}

// Début de la journée en cours, heure locale. Un salon dure trois jours :
// sans remise à zéro quotidienne, le score du premier matin décourage
// tous ceux qui jouent le dernier jour.
export function debutDuJour() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function listerScores(limite = 20, portee = 'salon') {
  const c = obtenirClient()
  if (!c) {
    etat = { mode: 'local', message: 'Aucune clé Supabase dans ce site' }
    let liste = JSON.parse(localStorage.getItem(CLE_SCORES) || '[]')
    if (portee === 'jour') liste = liste.filter((s) => s.cree_le >= debutDuJour())
    return liste.sort((a, b) => b.score - a.score).slice(0, limite)
  }
  let requete = c
    .from('scores')
    .select('id, nom, entreprise, score, cree_le')
    .order('score', { ascending: false })
    .limit(limite)
  if (portee === 'jour') requete = requete.gte('cree_le', debutDuJour())
  const { data, error } = await requete
  if (error) {
    etat = { mode: 'panne', message: error.message }
    return []
  }
  etat = { mode: 'base', message: null }
  return data
}

// ─── Temps réel ──────────────────────────────────────────────

export function abonner(auChangement) {
  const c = obtenirClient()
  if (!c) {
    const h = () => auChangement()
    canal?.addEventListener('message', h)
    window.addEventListener('storage', h)
    return () => {
      canal?.removeEventListener('message', h)
      window.removeEventListener('storage', h)
    }
  }
  const abo = c
    .channel('stand-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () =>
      auChangement()
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () =>
      auChangement()
    )
    .subscribe()
  return () => c.removeChannel(abo)
}

// ─── Amorçage et remise à zéro ───────────────────────────────

const PREFIXES = ['Menuiserie', 'Imprimerie', 'Garage', 'Boulangerie', 'Transports',
  'Clinique', 'Brasserie', 'Atelier', 'Logistique', 'Fromagerie', 'Chocolaterie',
  'Carrosserie', 'Serres', 'Métallerie', 'Pépinières', 'Blanchisserie']
const NOMS = ['Verhoeven', 'Dubois', 'Peeters', 'Lambert', 'Janssens', 'Martin',
  'De Smet', 'Leroy', 'Claes', 'Willems', 'Dupont', 'Maes', 'Simon', 'Goossens',
  'Wouters', 'Mercier', 'Nyssen', 'Vandamme']

/**
 * Amorçage : deux entreprises par province, une qui produit et une qui
 * consomme, placées dans la même commune pour qu'un lien apparaisse tout
 * de suite. Une carte vide ne donne envie à personne de s'y mettre.
 *
 * Ces entrées sont marquées : elles s'affichent en creux sur la carte et
 * se retirent d'un bouton, sans toucher aux vraies inscriptions.
 */
export async function semerDemo(parProvince = 2) {
  const zips = Object.keys(codesPostaux)
  const parNom = {}
  for (const z of zips) {
    const p = provinceDe(z)
    if (!p) continue
    ;(parNom[p] = parNom[p] || []).push(z)
  }

  for (const liste of Object.values(parNom)) {
    for (let i = 0; i < parProvince; i += 2) {
      const cp = liste[Math.floor(Math.random() * liste.length)]
      const voisins = liste.filter((z) => {
        const a = codesPostaux[z]
        const b = codesPostaux[cp]
        return Math.abs(a.lat - b.lat) < 0.05 && Math.abs(a.lng - b.lng) < 0.08
      })
      const cp2 = voisins.length ? voisins[Math.floor(Math.random() * voisins.length)] : cp

      await inscrire({
        entreprise: `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]} ${
          NOMS[Math.floor(Math.random() * NOMS.length)]
        }`,
        role: 'producteur',
        taille: TAILLES[1 + Math.floor(Math.random() * 3)].id,
        codePostal: cp,
        demo: true,
      })
      await inscrire({
        entreprise: `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]} ${
          NOMS[Math.floor(Math.random() * NOMS.length)]
        }`,
        role: 'consommateur',
        taille: TAILLES[Math.floor(Math.random() * 3)].id,
        codePostal: cp2,
        demo: true,
      })
    }
  }
}

// Retire uniquement l'amorçage. Les vraies inscriptions restent.
export async function retirerDemo() {
  const c = obtenirClient()
  if (!c) {
    ecrireLocal(lireLocal().filter((p) => !p.demo))
    return
  }
  const { error } = await c.from('participants').delete().eq('demo', true)
  if (error) throw error
}

export async function viderScores() {
  const c = obtenirClient()
  if (!c) {
    localStorage.removeItem(CLE_SCORES)
    canal?.postMessage({ type: 'score' })
    return
  }
  const { error } = await c
    .from('scores')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}

// Remise à zéro complète : la carte et le classement.
export async function viderTout() {
  const c = obtenirClient()
  if (!c) {
    ecrireLocal([])
    localStorage.removeItem(CLE_SCORES)
    return
  }
  const { error } = await c
    .from('participants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
  await viderScores()
}

export { codesPostaux }
