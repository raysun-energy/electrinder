import { useEffect, useState } from 'react'
import { listerScores, abonner, etatBase } from '../lib/donnees.js'

const MEDAILLES = ['🥇', '🥈', '🥉']

export default function Classement() {
  const [jour, setJour] = useState([])
  const [salon, setSalon] = useState([])
  const [portee, setPortee] = useState('jour')
  const [base, setBase] = useState({ mode: 'base' })

  async function rafraichir() {
    setJour(await listerScores(15, 'jour'))
    setSalon(await listerScores(15, 'salon'))
    setBase(etatBase())
  }

  useEffect(() => {
    rafraichir()
    const stop = abonner(rafraichir)
    const t = setInterval(rafraichir, 20000)
    return () => {
      stop?.()
      clearInterval(t)
    }
  }, [])

  const liste = portee === 'jour' ? jour : salon
  const record = salon[0]

  return (
    <main className="ecran-classement">
      <header>
        <div>
          <p className="sur-titre">Electrinder by RaYSun</p>
          <h1>
            {portee === 'jour' ? "Les meilleurs d'aujourd'hui" : 'Les meilleurs du salon'}
          </h1>
        </div>
        <div className="bascule">
          <button
            className={portee === 'jour' ? 'actif' : ''}
            onClick={() => setPortee('jour')}
          >
            Aujourd'hui
          </button>
          <button
            className={portee === 'salon' ? 'actif' : ''}
            onClick={() => setPortee('salon')}
          >
            Les trois jours
          </button>
        </div>
      </header>

      {base.mode !== 'base' && (
        <div className="alerte-base statique">
          <b>
            {base.mode === 'local'
              ? 'Ce site ne parle à aucune base de données'
              : 'La base de données ne répond pas'}
          </b>
          <span>Chaque appareil garde son propre classement. {base.message}</span>
        </div>
      )}

      {liste.length === 0 ? (
        <p className="vide-classement">
          Personne n'a encore joué aujourd'hui. La première place est libre.
        </p>
      ) : (
        <ol className="grand-classement">
          {liste.map((s, i) => (
            <li key={s.id || i} className={i < 3 ? 'podium' : ''}>
              <span className="place">{MEDAILLES[i] || i + 1}</span>
              <span className="qui">
                {s.nom}
                {s.entreprise && <em>{s.entreprise}</em>}
              </span>
              <span className="pts">{s.score.toLocaleString('fr-BE')}</span>
            </li>
          ))}
        </ol>
      )}

      <footer>
        {record && portee === 'jour' && (
          <p className="record">
            Record des trois jours : {record.nom} — {record.score.toLocaleString('fr-BE')}
          </p>
        )}
        <a className="principal bouton-lien" href="#/jeu">
          À vous d'essayer
        </a>
      </footer>
    </main>
  )
}
