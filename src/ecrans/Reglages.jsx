import { useEffect, useState } from 'react'
import {
  ecrireReglageGlobal,
  ecrireReglages,
  lireReglageGlobal,
  lireReglages,
  listerSites,
  retirerDemo,
  semerDemo,
  viderScores,
  viderTout,
} from '../lib/donnees.js'
import { HYPOTHESES } from '../config.js'
import CodeQR from '../composants/CodeQR.jsx'

export default function Reglages() {
  const [r, setR] = useState(lireReglages())
  const [message, setMessage] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [dureeGlobale, setDureeGlobale] = useState(null)

  useEffect(() => {
    lireReglageGlobal('dureeJeu', null).then(setDureeGlobale)
  }, [])

  function maj(champ, valeur) {
    const suivant = { ...r, [champ]: valeur }
    setR(suivant)
    ecrireReglages(suivant)
  }

  async function majDuree(secondes) {
    maj('dureeJeu', secondes)
    try {
      await ecrireReglageGlobal('dureeJeu', secondes)
      setDureeGlobale(secondes)
      setMessage(`Durée d'une partie : ${secondes} secondes, sur tous les appareils.`)
    } catch (e) {
      setMessage(
        "Durée changée sur cet appareil seulement. Pour qu'elle s'applique aux téléphones des visiteurs, relancez supabase.sql. (" +
          e.message +
          ')'
      )
    }
  }

  async function tester() {
    setOccupe(true)
    try {
      const sites = await listerSites()
      setMessage(`Connexion établie. ${sites.length} entreprise(s) déjà enregistrée(s).`)
    } catch (e) {
      setMessage('Échec : ' + e.message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <main className="reglages">
      <h1>Réglages du stand</h1>

      <section>
        <h2>Base de données</h2>
        <p className="aide">
          Sans ces deux valeurs, l'application fonctionne quand même : tout reste dans le
          navigateur de l'appareil. Utile pour tester, insuffisant pour faire tourner la
          tablette et le mur sur deux machines différentes.
        </p>
        <label>
          URL du projet Supabase
          <input
            value={r.url}
            onChange={(e) => maj('url', e.target.value)}
            placeholder="https://xxxx.supabase.co"
          />
        </label>
        <label>
          Clé publique (anon)
          <input value={r.cle} onChange={(e) => maj('cle', e.target.value)} placeholder="eyJ..." />
        </label>
        <button onClick={tester} disabled={occupe}>
          Tester la connexion
        </button>
        {message && <p className="message">{message}</p>}
      </section>

      <section>
        <h2>Périmètre de partage</h2>
        <label className="curseur">
          Rayon : <b>{r.rayonKm} km</b>
          <input
            type="range"
            min="2"
            max="30"
            value={r.rayonKm}
            onChange={(e) => maj('rayonKm', Number(e.target.value))}
          />
        </label>
        <p className="aide">
          Deux entreprises sont considérées comme partageables si elles sont à moins de
          cette distance l'une de l'autre. Au-delà de 15 km, les communautés deviennent
          énormes et le classement perd son intérêt.
        </p>
      </section>

      <section>
        <h2>Durée d'une partie</h2>
        <div className="choix-tailles">
          {[30, 60, 90, 120].map((d) => (
            <button
              key={d}
              className={r.dureeJeu === d ? 'puce active' : 'puce'}
              onClick={() => majDuree(d)}
            >
              {d < 60 ? `${d} s` : d === 60 ? '1 min' : d === 90 ? '1 min 30' : '2 min'}
            </button>
          ))}
        </div>
        <p className="aide">
          Le paquet reste de 24 cartes quoi qu'il arrive : la durée est un plafond, pas un
          objectif. Raccourcissez quand la file s'allonge, rallongez quand le stand est
          calme et que vous voulez laisser les gens lire les courbes.
        </p>
        {dureeGlobale ? (
          <p className="aide">
            Réglage actuellement partagé avec tous les appareils : {dureeGlobale} secondes.
          </p>
        ) : (
          <p className="aide">
            Ce réglage n'est pas encore enregistré dans la base. Tant qu'il ne l'est pas,
            les téléphones des visiteurs joueront 90 secondes.
          </p>
        )}
      </section>

      <section>
        <h2>Code QR du mur</h2>
        <label>
          Adresse vers laquelle il envoie
          <input value={r.urlJeu} onChange={(e) => maj('urlJeu', e.target.value)} />
        </label>
        <div className="apercu-qr">
          <CodeQR valeur={r.urlJeu} taille={150} />
          <p className="aide">
            Scannez-le avec votre téléphone pour vérifier qu'il mène au bon endroit. Il
            pointe sur <code>/#/jeu</code> : les visiteurs jouent depuis leur propre
            téléphone, et la fin de partie leur propose de se mettre sur la carte.
          </p>
        </div>
      </section>

      <section>
        <h2>Amorçage de la carte</h2>
        <p className="aide">
          Deux entreprises par province, un producteur et un consommateur dans la même
          commune, pour qu'un lien apparaisse tout de suite. Elles s'affichent en creux
          sur la carte, donc personne ne les confond avec de vraies inscriptions.
        </p>
        <div className="boutons">
          <button
            onClick={async () => {
              setOccupe(true)
              try {
                await semerDemo(2)
                setMessage('Carte amorcée : deux entreprises par province.')
              } catch (e) {
                setMessage('Échec : ' + e.message)
              }
              setOccupe(false)
            }}
            disabled={occupe}
          >
            Amorcer la carte
          </button>
          <button
            onClick={async () => {
              if (!confirm("Retirer l'amorçage ? Les vraies inscriptions sont conservées."))
                return
              setOccupe(true)
              try {
                await retirerDemo()
                setMessage("Amorçage retiré. Il ne reste que les vraies inscriptions.")
              } catch (e) {
                setMessage('Échec : ' + e.message)
              }
              setOccupe(false)
            }}
            disabled={occupe}
          >
            Retirer l'amorçage
          </button>
        </div>
        <p className="aide">
          En fin de journée, retirez l'amorçage : la carte, les communautés et les chiffres
          se recalculent sur les seules entreprises réellement venues au stand. C'est cette
          carte-là qui vaut quelque chose.
        </p>
      </section>

      <section>
        <h2>Remise à zéro</h2>
        <p className="aide">
          À n'utiliser qu'avant l'ouverture, après vos répétitions. Le classement se vide
          séparément si vous voulez repartir de zéro sur le jeu sans toucher à la carte.
        </p>
        <div className="boutons">
          <button
            onClick={async () => {
              if (!confirm('Vider le classement du jeu ?')) return
              try {
                await viderScores()
                setMessage('Classement vidé.')
              } catch (e) {
                setMessage('Échec : ' + e.message)
              }
            }}
          >
            Vider le classement
          </button>
          <button
            className="danger"
            onClick={async () => {
              if (
                !confirm('Effacer la carte ET le classement, inscriptions réelles comprises ?')
              )
                return
              try {
                await viderTout()
                setMessage('Carte et classement vidés.')
              } catch (e) {
                setMessage('Suppression refusée par Supabase : ' + e.message)
              }
            }}
          >
            Tout effacer
          </button>
        </div>
      </section>

      <section>
        <h2>Hypothèses de calcul</h2>
        <ul className="hypotheses">
          <li>{HYPOTHESES.rendementKwhParKwc} kWh produits par kWc et par an</li>
          <li>{HYPOTHESES.ecartPrixEuroParMwh} € gagnés par MWh partagé</li>
          <li>
            {Math.round(HYPOTHESES.tauxSimultaneite * 100)} % de la consommation couvrable
            en local
          </li>
          <li>{HYPOTHESES.co2TonneParMwh} tonne de CO₂ évitée par MWh</li>
        </ul>
        <p className="aide">
          Ces valeurs se modifient dans <code>src/config.js</code>, puis il faut
          reconstruire le site.
        </p>
      </section>

      <nav className="liens">
        <a href="#/">Écran tablette</a>
        <a href="#/mur">Écran mur</a>
        <a href="#/jeu">Electrinder</a>
        <a href="#/classement">Classement</a>
      </nav>
    </main>
  )
}
