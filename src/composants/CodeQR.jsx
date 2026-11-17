import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Sortie SVG plutôt que canvas : rien à dimensionner, le rendu est immédiat,
// et une génération ratée se voit au lieu de laisser un carré blanc.
export default function CodeQR({ valeur, taille = 180 }) {
  const [svg, setSvg] = useState(null)
  const [echec, setEchec] = useState(null)

  useEffect(() => {
    if (!valeur) {
      setEchec("Aucune adresse d'inscription réglée")
      return
    }
    QRCode.toString(valeur, {
      type: 'svg',
      margin: 1,
      color: { dark: '#0A1622', light: '#FFFFFF' },
    })
      .then((s) => {
        setSvg(s)
        setEchec(null)
      })
      .catch((e) => setEchec(e.message))
  }, [valeur])

  if (echec) {
    return (
      <p className="qr-echec">
        {echec}
        {valeur && <span>{valeur}</span>}
      </p>
    )
  }

  if (!svg) return <div className="qr-attente" style={{ width: taille, height: taille }} />

  return (
    <div
      className="qr"
      style={{ width: taille, height: taille }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
