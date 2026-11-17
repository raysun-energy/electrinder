import { useEffect, useState } from 'react'
import Pave from '../composants/Pave.jsx'
import { ROLES, TAILLES, COULEURS_ROLE } from '../config.js'
import { codesPostaux, inscrire, listerSites, lireReglages } from '../lib/donnees.js'
import { regrouper, nomCommunaute } from '../lib/communautes.js'

const ETAPES = ['Votre rôle', 'Où êtes-vous ?', 'Votre entreprise', 'Rester en contact']

export default function Inscription() {
  const [etape, setEtape] = useState(0)
  const [role, setRole] = useState(null)
  const [cp, setCp] = useState('')
  const [entreprise, setEntreprise] = useState('')
  const [taille, setTaille] = useState('s')
  const [email, setEmail] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState(null)

  const ville = codesPostaux[cp]?.v
  const cpValide = cp.length === 4 && !!ville

  useEffect(() => {
    if (!resultat) return
    const t = setTimeout(recommencer, 25000)
    return () => clearTimeout(t)
  }, [resultat])

  function recommencer() {
    setEtape(0)
    setRole(null)
    setCp('')
    setEntreprise('')
    setTaille('s')
    setEmail('')
    setResultat(null)
    setErreur(null)
  }

  async function valider() {
    setEnvoi(true)
    setErreur(null)
    try {
      const site = await inscrire({ entreprise, role, taille, codePostal: cp, email })
      const sites = await listerSites()
      const groupes = regrouper(sites, lireReglages().rayonKm)
      const mien = groupes.find((g) => g.membres.some((m) => m.id === site.id))
      setResultat({ site, groupe: mien })
    } catch (e) {
      setErreur("L'inscription n'est pas passée. Vérifiez la connexion, puis réessayez.")
    } finally {
      setEnvoi(false)
    }
  }

  if (resultat) {
    const g = resultat.groupe
    const seul = !g || g.taille < 2
    return (
      <main className="tablette confirmation">
        <div
          className="pastille-role"
          style={{ background: COULEURS_ROLE[resultat.site.role] }}
        />
        <h1>{resultat.site.entreprise} est sur la carte</h1>
        {seul ? (
          <p className="grand">
            Vous êtes le premier de {resultat.site.ville}. Repassez demain : sur trois
            jours, les voisins arrivent.
          </p>
        ) : (
          <>
            <p className="grand">
              Vous rejoignez la communauté de {nomCommunaute(g)}, avec{' '}
              <strong>{g.taille - 1}</strong>{' '}
              {g.taille - 1 > 1 ? 'autres entreprises' : 'autre entreprise'} à portée de
              partage.
            </p>
            <div className="chiffres-confirmation">
              <div>
                <b>{Math.round(g.partageable)}</b>
                <span>MWh partageables par an</span>
              </div>
              <div>
                <b>{Math.round(g.economie)} k€</b>
                <span>de facture évitée par an</span>
              </div>
            </div>
          </>
        )}
        <p className="note">Regardez le grand écran, votre point vient d'apparaître.</p>
        <div className="apres-inscription">
          <a className="principal bouton-lien" href="#/jeu">
            Maintenant, à vous de faire le tri
          </a>
          <button onClick={recommencer}>Au suivant</button>
        </div>
      </main>
    )
  }

  return (
    <main className="tablette">
      <header className="fil">
        {ETAPES.map((e, i) => (
          <span key={e} className={i === etape ? 'actif' : i < etape ? 'fait' : ''}>
            {e}
          </span>
        ))}
      </header>

      {etape === 0 && (
        <section className="etape">
          <h1>Chez vous, l'électricité…</h1>
          <div className="choix-roles">
            {ROLES.map((r) => (
              <button
                key={r.id}
                className="carte-role"
                style={{ borderColor: COULEURS_ROLE[r.id] }}
                onClick={() => {
                  setRole(r.id)
                  setEtape(1)
                }}
              >
                <span className="icone" style={{ color: COULEURS_ROLE[r.id] }}>
                  {r.icone}
                </span>
                <b>{r.libelle}</b>
                <em>{r.sous}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {etape === 1 && (
        <section className="etape">
          <h1>Votre code postal</h1>
          <Pave valeur={cp} onChange={setCp} />
          <p className="ville">{cp.length === 4 ? ville || 'Code postal inconnu' : ' '}</p>
          <div className="barre">
            <button onClick={() => setEtape(0)}>Retour</button>
            <button className="principal" disabled={!cpValide} onClick={() => setEtape(2)}>
              Continuer
            </button>
          </div>
        </section>
      )}

      {etape === 2 && (
        <section className="etape">
          <h1>Qui êtes-vous ?</h1>
          <input
            className="saisie"
            placeholder="Nom de votre entreprise"
            value={entreprise}
            autoFocus
            onChange={(e) => setEntreprise(e.target.value)}
          />
          <div className="choix-tailles">
            {TAILLES.map((t) => (
              <button
                key={t.id}
                className={taille === t.id ? 'puce active' : 'puce'}
                onClick={() => setTaille(t.id)}
              >
                {t.libelle}
              </button>
            ))}
          </div>
          <div className="barre">
            <button onClick={() => setEtape(1)}>Retour</button>
            <button
              className="principal"
              disabled={entreprise.trim().length < 2}
              onClick={() => setEtape(3)}
            >
              Continuer
            </button>
          </div>
        </section>
      )}

      {etape === 3 && (
        <section className="etape">
          <h1>On vous envoie vos voisins ?</h1>
          <p className="explication">
            À la fin du salon, nous vous envoyons la liste des entreprises à portée de
            partage autour de vous. Sans e-mail, vous restez sur la carte quand même.
          </p>
          <input
            className="saisie"
            type="email"
            inputMode="email"
            placeholder="prenom@entreprise.be"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {erreur && <p className="erreur">{erreur}</p>}
          <div className="barre">
            <button onClick={() => setEtape(2)}>Retour</button>
            <button className="principal" disabled={envoi} onClick={valider}>
              {envoi ? 'Un instant…' : 'Me mettre sur la carte'}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
