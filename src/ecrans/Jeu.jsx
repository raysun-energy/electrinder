import { useCallback, useEffect, useRef, useState } from 'react'
import Courbe from '../composants/Courbe.jsx'
import {
  nouveauProducteur,
  nouveauCandidat,
  evaluer,
  tauxAutoconsommation,
  RAYON_JEU,
} from '../lib/jeu.js'
import {
  enregistrerScore,
  listerScores,
  lireReglageGlobal,
  lireReglages,
} from '../lib/donnees.js'
import {
  sonBon,
  sonMauvais,
  sonBoucle,
  sonNeutre,
  estMuet,
  basculerSon,
} from '../lib/sons.js'

// Le paquet est fixe : tout le monde voit exactement le même nombre
// d'entreprises. Sans ça, celui qui swipe sans regarder passe trois fois
// plus de cartes dans le temps imparti et gagne par le volume — la vitesse
// battait la justesse, ce qui est l'inverse du métier.
const PAQUET = 24 // cartes par partie
const DUREE_DEFAUT = 90 // secondes, plafond et non objectif
const COUT_ERREUR = 4 // secondes perdues sur un mauvais rapprochement
const SEUIL = 95 // px de glissement pour valider

export default function Jeu() {
  const [phase, setPhase] = useState('accueil') // accueil | partie | fin
  const [producteur, setProducteur] = useState(null)
  const [pile, setPile] = useState([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(1)
  const [duree, setDuree] = useState(lireReglages().dureeJeu || DUREE_DEFAUT)
  const [temps, setTemps] = useState(duree)
  const [restantes, setRestantes] = useState(PAQUET)
  const [flash, setFlash] = useState(null)
  const [bouclees, setBouclees] = useState([])
  const [glisse, setGlisse] = useState(0)
  const [secousse, setSecousse] = useState(false)
  const [muet, setMuet] = useState(estMuet())
  const [nom, setNom] = useState('')
  const [entreprise, setEntreprise] = useState('')
  const [tableau, setTableau] = useState([])
  const [enregistre, setEnregistre] = useState(false)

  /**
   * La partie tient dans ces références, pas dans l'état d'affichage.
   *
   * Sinon : deux appuis plus rapides qu'un rendu React lisent tous les deux
   * la même toiture, avec son réservoir encore plein, et placent sa
   * production deux fois. En maintenant une flèche enfoncée, on répétait
   * l'opération des dizaines de fois par seconde — on pouvait dépasser
   * 100 000 points sans regarder une seule courbe.
   *
   * Les références se mettent à jour immédiatement, et un verrou impose un
   * délai minimum entre deux décisions.
   */
  const jeu = useRef({ producteur: null, combo: 1, restantes: PAQUET, verrou: false })
  const drag = useRef(null)
  const carte = pile[0]

  // ─── Déroulement ───────────────────────────────────────────
  const demarrer = useCallback(() => {
    const p = nouveauProducteur()
    jeu.current = { producteur: p, combo: 1, restantes: PAQUET, verrou: false }
    setProducteur(p)
    setPile([nouveauCandidat(p), nouveauCandidat(p), nouveauCandidat(p)])
    setScore(0)
    setCombo(1)
    setTemps(duree)
    setRestantes(PAQUET)
    setBouclees([])
    setFlash(null)
    setGlisse(0)
    setEnregistre(false)
    setPhase('partie')
  }, [duree])

  // La durée vient de la base : le réglage fait au stand doit valoir
  // sur les téléphones des visiteurs, qui n'ont aucun réglage local.
  useEffect(() => {
    lireReglageGlobal('dureeJeu', null).then((v) => {
      if (v && Number(v) >= 30) {
        setDuree(Number(v))
        setTemps(Number(v))
      }
    })
  }, [])

  useEffect(() => {
    if (phase !== 'partie') return
    const t = setInterval(() => {
      setTemps((v) => {
        if (v <= 1) {
          clearInterval(t)
          setPhase('fin')
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'fin') return
    listerScores(20, 'jour').then(setTableau)
  }, [phase])

  useEffect(() => {
    if (!flash) return
    const delai = flash.ton === 'mauvais' ? 2200 : flash.ton === 'boucle' ? 2400 : 1300
    const t = setTimeout(() => setFlash(null), delai)
    return () => clearTimeout(t)
  }, [flash])

  useEffect(() => {
    if (!secousse) return
    const t = setTimeout(() => setSecousse(false), 500)
    return () => clearTimeout(t)
  }, [secousse])

  function suivante(prod) {
    setPile((p) => [...p.slice(1), nouveauCandidat(prod || jeu.current.producteur)])
    setGlisse(0)
  }

  // Verrou : une décision au maximum toutes les 320 ms.
  function prendreLaMain() {
    if (jeu.current.verrou || jeu.current.restantes <= 0) return false
    jeu.current.verrou = true
    setTimeout(() => {
      jeu.current.verrou = false
    }, 320)
    return true
  }

  // Une décision consomme une carte du paquet, quelle qu'elle soit.
  function consommerCarte() {
    jeu.current.restantes -= 1
    setRestantes(jeu.current.restantes)
    if (jeu.current.restantes <= 0) setPhase('fin')
  }

  function passer() {
    if (!carte || !prendreLaMain()) return
    sonNeutre()
    setFlash({ ton: 'neutre', titre: 'Suivant', phrase: 'Personne ne perd son temps.' })
    jeu.current.combo = 1
    setCombo(1)
    consommerCarte()
    suivante()
  }

  function relier() {
    if (!carte || !prendreLaMain()) return
    const prod = jeu.current.producteur
    if (!prod) return

    const r = evaluer(prod, carte, jeu.current.combo)
    setScore((s) => Math.max(0, s + r.points))
    setFlash({ ton: r.ok ? 'bon' : 'mauvais', ...r, cout: r.ok ? 0 : COUT_ERREUR })
    consommerCarte()

    if (!r.ok) {
      sonMauvais()
      setSecousse(true)
      jeu.current.combo = 1
      setCombo(1)
      setTemps((t) => Math.max(1, t - COUT_ERREUR))
      suivante()
      return
    }

    sonBon()
    jeu.current.combo = Math.min(3, +(jeu.current.combo + 0.25).toFixed(2))
    setCombo(jeu.current.combo)

    // Le réservoir est amputé tout de suite : la prochaine décision, même
    // immédiate, travaillera sur ce qu'il reste réellement.
    const maj = { ...prod, restant: r.restant }
    jeu.current.producteur = maj
    const taux = tauxAutoconsommation(maj)

    if (taux > 0.82) {
      const bonus = Math.round(taux * 600)
      sonBoucle()
      setScore((s) => s + bonus)
      setBouclees((b) => [...b, { ville: maj.ville, taux, bonus }])
      setFlash({
        ton: 'boucle',
        titre: `Communauté de ${maj.ville} bouclée`,
        phrase: `${Math.round(taux * 100)} % de la production placée sur place. +${bonus}`,
      })
      const neuf = nouveauProducteur()
      jeu.current.producteur = neuf
      setProducteur(neuf)
      setPile([nouveauCandidat(neuf), nouveauCandidat(neuf), nouveauCandidat(neuf)])
      setGlisse(0)
      return
    }

    setProducteur(maj)
    suivante(maj)
  }

  // ─── Glissement tactile ────────────────────────────────────
  function debut(e) {
    if (!carte) return
    drag.current = { x: e.clientX, actif: true }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function bouge(e) {
    if (!drag.current?.actif) return
    setGlisse(e.clientX - drag.current.x)
  }
  function fin() {
    if (!drag.current?.actif) return
    drag.current.actif = false
    if (glisse > SEUIL) relier()
    else if (glisse < -SEUIL) passer()
    else setGlisse(0)
  }

  useEffect(() => {
    if (phase !== 'partie') return
    const h = (e) => {
      // Une touche maintenue ne doit pas rejouer la carte en boucle.
      if (e.repeat) return
      if (e.key === 'ArrowRight') relier()
      if (e.key === 'ArrowLeft') passer()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  async function garderScore() {
    if (!nom.trim()) return
    try {
      await enregistrerScore({ nom, entreprise, score })
      setTableau(await listerScores(20, 'jour'))
    } catch (e) {
      console.warn('Score non enregistré :', e.message)
    }
    setEnregistre(true)
  }

  // ─── Écrans ────────────────────────────────────────────────

  if (phase === 'accueil') {
    return (
      <main className="jeu accueil-jeu">
        <h1 className="marque-jeu">
          Electrinder
          <span>by RaYSun</span>
        </h1>
        <p className="accroche">Une toiture cherche des voisins.</p>
        <p className="pitch">
          {PAQUET} entreprises, {duree} secondes au maximum. Vous décidez qui rejoint la
          communauté. Ce qui compte n'est pas d'être proche, c'est de consommer{' '}
          <em>pendant</em> que ça produit — et se tromper coûte {COUT_ERREUR} secondes.
          Tout le monde voit le même nombre de cartes : inutile de foncer.
        </p>
        <div className="regles">
          <span>← Glissez à gauche pour passer</span>
          <span>Glissez à droite pour relier →</span>
        </div>
        <button className="principal grand-bouton" onClick={demarrer}>
          Commencer
        </button>
        <a className="lien-discret" href="#/">
          Me mettre sur la carte plutôt
        </a>
      </main>
    )
  }

  if (phase === 'fin') {
    const rang = tableau.findIndex((s) => s.score < score)
    return (
      <main className="jeu fin-jeu">
        <p className="sur-titre">
          Electrinder · {restantes > 0 ? 'temps écoulé' : 'paquet terminé'}
        </p>
        <div className="score-final">{score.toLocaleString('fr-BE')}</div>
        <p className="pitch">
          {bouclees.length === 0
            ? "Aucune communauté bouclée. C'est plus dur qu'il n'y paraît — et c'est exactement pour ça que nous existons."
            : `${bouclees.length} communauté${bouclees.length > 1 ? 's' : ''} bouclée${
                bouclees.length > 1 ? 's' : ''
              } : ${bouclees.map((b) => b.ville).join(', ')}.`}
        </p>

        {!enregistre ? (
          <div className="formulaire-score">
            <input
              className="saisie"
              placeholder="Votre prénom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
            />
            <input
              className="saisie"
              placeholder="Votre entreprise (facultatif)"
              value={entreprise}
              onChange={(e) => setEntreprise(e.target.value)}
            />
            <button className="principal" disabled={!nom.trim()} onClick={garderScore}>
              Inscrire mon score
            </button>
          </div>
        ) : (
          <p className="message-ok">
            {rang >= 0 && rang < 10
              ? `${rang + 1}ᵉ du jour. Votre nom est sur le grand écran.`
              : 'Score enregistré. Le classement repart à zéro chaque matin, revenez demain.'}
          </p>
        )}

        {tableau.length > 0 && (
          <ol className="tableau-scores">
            {tableau.slice(0, 5).map((s, i) => (
              <li key={s.id || i}>
                <span className="place">{i + 1}</span>
                <span className="nom">{s.nom}</span>
                <span className="pts">{s.score.toLocaleString('fr-BE')}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="barre">
          <button onClick={demarrer}>Rejouer</button>
          <a className="principal bouton-lien" href="#/">
            Me mettre sur la carte
          </a>
        </div>
        <a className="lien-discret" href="#/classement">
          Voir le classement complet
        </a>
      </main>
    )
  }

  const restantPct = producteur
    ? (producteur.restant.reduce((a, b) => a + b, 0) / producteur.production) * 100
    : 100

  return (
    <main className={secousse ? 'jeu partie secouee' : 'jeu partie'}>
      <header className="entete-jeu">
        <div className="chrono">
          <span style={{ width: `${(temps / duree) * 100}%` }} />
        </div>
        <div className="compteurs">
          <b>{score.toLocaleString('fr-BE')}</b>
          <span className={combo > 1 ? 'combo actif' : 'combo'}>×{combo.toFixed(2)}</span>
          <span className="restantes">{restantes} cartes</span>
          <span className="temps">{temps}s</span>
          <button
            className="son"
            onClick={() => setMuet(basculerSon())}
            aria-label={muet ? 'Activer le son' : 'Couper le son'}
          >
            {muet ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {producteur && (
        <section className="producteur">
          <span className="emoji">{producteur.emoji}</span>
          <div>
            <b>{producteur.nom}</b>
            <span>
              {producteur.ville} · {producteur.kwc} kWc · il reste{' '}
              {Math.round((restantPct * producteur.production) / 100)} MWh à placer
            </span>
          </div>
          <div className="reservoir">
            <span style={{ height: `${restantPct}%` }} />
          </div>
        </section>
      )}

      <div className="zone-cartes">
        {pile
          .slice(0, 3)
          .reverse()
          .map((c, i, arr) => {
            const dessus = i === arr.length - 1
            return (
              <article
                key={c.id}
                className={dessus ? 'fiche dessus' : 'fiche'}
                style={
                  dessus
                    ? {
                        transform: `translateX(${glisse}px) rotate(${glisse / 25}deg)`,
                        transition: drag.current?.actif ? 'none' : 'transform .25s',
                      }
                    : {
                        transform: `scale(${0.94 + i * 0.03}) translateY(${
                          (arr.length - 1 - i) * 14
                        }px)`,
                      }
                }
                onPointerDown={dessus ? debut : undefined}
                onPointerMove={dessus ? bouge : undefined}
                onPointerUp={dessus ? fin : undefined}
                onPointerCancel={dessus ? fin : undefined}
              >
                {dessus && glisse > 40 && <span className="tampon oui">Relier</span>}
                {dessus && glisse < -40 && <span className="tampon non">Passer</span>}
                <div className="tete-fiche">
                  <span className="emoji">{c.emoji}</span>
                  <div>
                    <b>{c.nom}</b>
                    <span>
                      {c.ville} · {c.distance} km · {c.conso} MWh/an
                    </span>
                  </div>
                </div>
                <Courbe courbe={c.courbe} />
                <p className="legende-courbe">
                  Barres : sa consommation. Aplat : votre production. La zone claire est
                  ce qui se partage.
                </p>
                {c.distance > RAYON_JEU && (
                  <p className="alerte">Au-delà du périmètre de partage</p>
                )}
              </article>
            )
          })}
      </div>

      <div className="actions-jeu">
        <button className="rond non" onClick={passer} aria-label="Passer">
          ✕
        </button>
        <button className="rond oui" onClick={relier} aria-label="Relier">
          ⚡
        </button>
      </div>

      {flash && (
        <div className={'verdict ' + flash.ton} key={flash.titre + flash.phrase}>
          {flash.points !== undefined && flash.ton !== 'neutre' && (
            <p className="points">
              {flash.points > 0 ? '+' : ''}
              {flash.points}
            </p>
          )}
          <p className="verdict-titre">{flash.titre}</p>
          <p className="verdict-phrase">{flash.phrase}</p>
          {flash.cout > 0 && <p className="cout-temps">−{flash.cout} secondes</p>}
        </div>
      )}
    </main>
  )
}
