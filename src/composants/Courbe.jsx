import { SOLEIL } from '../lib/jeu.js'

// La production solaire en aplat, la consommation du candidat en barres.
// Ce qui se chevauche, c'est ce qui se partage. Tout est là.
export default function Courbe({ courbe, hauteur = 78 }) {
  const l = 24 * 9
  const solaire = SOLEIL.map((v, h) => `${h * 9 + 4.5},${hauteur - (v / 100) * hauteur}`)
  const aire = `M4.5,${hauteur} L${solaire.join(' L')} L${23 * 9 + 4.5},${hauteur} Z`

  return (
    <svg className="courbe" viewBox={`0 0 ${l} ${hauteur + 14}`} aria-hidden="true">
      <path d={aire} className="aire-soleil" />
      {courbe.map((v, h) => {
        const ht = (v / 100) * hauteur
        const chevauche = Math.min(v, SOLEIL[h])
        return (
          <g key={h}>
            <rect x={h * 9 + 1.5} y={hauteur - ht} width="6" height={ht} className="barre" />
            {chevauche > 2 && (
              <rect
                x={h * 9 + 1.5}
                y={hauteur - (chevauche / 100) * hauteur}
                width="6"
                height={(chevauche / 100) * hauteur}
                className="barre-partagee"
              />
            )}
          </g>
        )
      })}
      <text x="4" y={hauteur + 12} className="heure">0h</text>
      <text x={12 * 9} y={hauteur + 12} className="heure">12h</text>
      <text x={22 * 9 - 4} y={hauteur + 12} className="heure">24h</text>
    </svg>
  )
}
