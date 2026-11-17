import { useEffect, useState } from 'react'
import Inscription from './ecrans/Inscription.jsx'
import Mur from './ecrans/Mur.jsx'
import Jeu from './ecrans/Jeu.jsx'
import Classement from './ecrans/Classement.jsx'
import Reglages from './ecrans/Reglages.jsx'

function route() {
  return (window.location.hash || '#/').replace(/^#/, '')
}

export default function App() {
  const [chemin, setChemin] = useState(route())

  useEffect(() => {
    const h = () => setChemin(route())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  if (chemin.startsWith('/mur')) return <Mur />
  if (chemin.startsWith('/jeu')) return <Jeu />
  if (chemin.startsWith('/classement')) return <Classement />
  if (chemin.startsWith('/reglages')) return <Reglages />
  return <Inscription />
}
