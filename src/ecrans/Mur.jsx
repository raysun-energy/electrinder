import { useEffect, useMemo, useRef, useState } from 'react'
import CarteBelgique from '../composants/CarteBelgique.jsx'
import CodeQR from '../composants/CodeQR.jsx'
import {
  abonner,
  listerSites,
  listerScores,
  lireReglages,
  etatBase,
} from '../lib/donnees.js'
import { regrouper, bilan, nomCommunaute } from '../lib/communautes.js'
import { PALIERS, COULEURS_ROLE } from '../config.js'

const fmt = (n, d = 0) =>
  n.toLocaleString('fr-BE', { minimumFractionDigits: d, maximumFractionDigits: d })

export default function Mur() {
  const [sites, setSites] = useState([])
  const [arrivee, setArrivee] = useState(null)
  const [scores, setScores] = useState([])
  const [record, setRecord] = useState(null)
  const [base, setBase] = useState({ mode: 'base' })
  const [volet, setVolet] = useState('communautes')
  const connus = useRef(new Set())
  const premier = useRef(true)
  const reglages = lireReglages()

  async function rafraichir() {
    const liste = await listerSites()
    setBase(etatBase())
    listerScores(10, 'jour').then(setScores)
    listerScores(1, 'salon').then((r) => setRecord(r[0] || null))
    const nouveaux = liste.filter((s) => !connus.current.has(s.id))
    liste.forEach((s) => connus.current.add(s.id))
    setSites(liste)
    if (!premier.current && nouveaux.length) {
      setArrivee(nouveaux[nouveaux.length - 1])
    }
    premier.current = false
  }

  useEffect(() => {
    rafraichir()
    const stop = abonner(rafraichir)
    const t = setInterval(rafraichir, 15000) // filet de sécurité si le temps réel décroche
    return () => {
      stop?.()
      clearInterval(t)
    }
  }, [])

  // Le volet de droite alterne : on ne peut pas tout montrer à la fois
  // sur un écran qu'on lit à cinq mètres.
  useEffect(() => {
    const t = setInterval(
      () => setVolet((v) => (v === 'communautes' ? 'scores' : 'communautes')),
      14000
    )
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!arrivee) return
    const t = setTimeout(() => setArrivee(null), 9000)
    return () => clearTimeout(t)
  }, [arrivee])

  const groupes = useMemo(
    () => regrouper(sites, reglages.rayonKm),
    [sites, reglages.rayonKm]
  )
  const total = useMemo(() => bilan(groupes, sites), [groupes, sites])
  const classement = useMemo(
    () => groupes.filter((g) => g.taille > 1).sort((a, b) => b.taille - a.taille).slice(0, 6),
    [groupes]
  )
  const groupeArrivee = arrivee
    ? groupes.find((g) => g.membres.some((m) => m.id === arrivee.id))
    : null

  const palier = PALIERS.find((p) => p > total.entreprises) || null
  const rayonPoint = sites.length > 250 ? 4 : sites.length > 120 ? 5 : 7

  return (
    <div className="mur">
      <div className="colonne gauche">
        <div className="marque">
          <span className="logo">RaYSun</span>
          <span className="baseline">Le partage d'énergie, en vrai</span>
        </div>

        <div className="indicateurs">
          <div className="indicateur majeur">
            <b>{fmt(total.entreprises)}</b>
            <span>
              entreprises sur la carte
              {sites.some((s) => s.demo) && (
                <em className="mention-demo">
                  dont {sites.filter((s) => s.demo).length} exemples, en creux
                </em>
              )}
            </span>
          </div>
          <div className="indicateur">
            <b>{fmt(total.communautes)}</b>
            <span>communautés d'énergie possibles</span>
          </div>
          <div className="indicateur">
            <b>{fmt(total.mwh)}</b>
            <span>MWh échangeables par an</span>
          </div>
          <div className="indicateur">
            <b>{fmt(total.economie)} k€</b>
            <span>de facture évitée par an</span>
          </div>
        </div>

        <div className="legende">
          {Object.entries({
            producteur: 'Produit',
            consommateur: 'Consomme',
            mixte: 'Les deux',
          }).map(([k, v]) => (
            <span key={k}>
              <i style={{ background: COULEURS_ROLE[k] }} />
              {v}
            </span>
          ))}
          {sites.some((s) => s.demo) && (
            <span className="rayon">Points en creux : exemples d'amorçage</span>
          )}
          <span className="rayon">Rayon de partage : {reglages.rayonKm} km</span>
        </div>
      </div>

      <div className="scene">
        <CarteBelgique
          sites={sites}
          groupes={groupes}
          dernierId={arrivee?.id}
          rayonPoint={rayonPoint}
        />
        {sites.length === 0 && (
          <p className="vide">
            La carte est vide. Posez votre code postal sur la tablette : le premier point,
            c'est vous.
          </p>
        )}
      </div>

      <div className="colonne droite">
        {volet === 'communautes' || scores.length === 0 ? (
          <>
            <h2>Les communautés qui se forment</h2>
            <ol className="classement">
              {classement.map((g) => (
                <li key={g.id}>
                  <i style={{ background: g.teinte }} />
                  <span className="nom">{nomCommunaute(g)}</span>
                  <span className="compte">{g.taille}</span>
                </li>
              ))}
              {classement.length === 0 && (
                <li className="attente">
                  Encore aucun voisin à portée. Il en faut deux pour partager.
                </li>
              )}
            </ol>
          </>
        ) : (
          <>
            <h2>Les meilleurs matcheurs du jour</h2>
            <ol className="classement scores">
              {scores.slice(0, 6).map((s, i) => (
                <li key={s.id || i}>
                  <span className="place">{i + 1}</span>
                  <span className="nom">
                    {s.nom}
                    {s.entreprise && <em>{s.entreprise}</em>}
                  </span>
                  <span className="compte">{s.score.toLocaleString('fr-BE')}</span>
                </li>
              ))}
            </ol>
            {record && (
              <p className="record-mur">
                Record des trois jours : {record.nom} —{' '}
                {record.score.toLocaleString('fr-BE')}
              </p>
            )}
          </>
        )}

        {palier && (
          <div className="palier">
            <div className="jauge">
              <span
                style={{ width: `${Math.min(100, (total.entreprises / palier) * 100)}%` }}
              />
            </div>
            <p>
              Plus que {palier - total.entreprises} entreprises avant {palier} sur la
              carte
            </p>
          </div>
        )}

        <div className="inscription-qr">
          <p className="titre-jeu">Electrinder</p>
          <CodeQR valeur={reglages.urlJeu} taille={200} />
          <p>Trouvez le bon voisin à une toiture. {reglages.dureeJeu} secondes, sur votre téléphone.</p>
        </div>
      </div>

      {base.mode !== 'base' && (
        <div className="alerte-base">
          <b>
            {base.mode === 'local'
              ? 'Ce site ne parle à aucune base de données'
              : 'La base de données ne répond pas'}
          </b>
          <span>
            Les inscriptions restent sur l'appareil qui les saisit et n'arrivent pas ici.{' '}
            {base.message}
          </span>
        </div>
      )}

      {arrivee && (
        <div className="bandeau">
          <i style={{ background: COULEURS_ROLE[arrivee.role] }} />
          <b>{arrivee.entreprise}</b>
          {groupeArrivee && groupeArrivee.taille > 1 ? (
            <span>
              rejoint la communauté de {nomCommunaute(groupeArrivee)} —{' '}
              {groupeArrivee.taille} entreprises
            </span>
          ) : (
            <span>ouvre la carte à {arrivee.ville}</span>
          )}
        </div>
      )}
    </div>
  )
}
