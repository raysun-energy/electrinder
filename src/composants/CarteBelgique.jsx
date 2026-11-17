import { useMemo } from 'react'
import provinces from '../data/provinces.json'
import { geometrieVersChemin, projeter, VUE } from '../lib/geo.js'
import { COULEURS_ROLE } from '../config.js'

const REPERES = [
  { nom: 'Bruxelles', lat: 50.846, lng: 4.352 },
  { nom: 'Anvers', lat: 51.219, lng: 4.402 },
  { nom: 'Gand', lat: 51.054, lng: 3.717 },
  { nom: 'Liège', lat: 50.633, lng: 5.567 },
  { nom: 'Charleroi', lat: 50.411, lng: 4.444 },
  { nom: 'Bruges', lat: 51.209, lng: 3.224 },
  { nom: 'Namur', lat: 50.467, lng: 4.867 },
  { nom: 'Hasselt', lat: 50.93, lng: 5.338 },
  { nom: 'Arlon', lat: 49.684, lng: 5.816 },
]

export default function CarteBelgique({
  sites = [],
  groupes = [],
  dernierId = null,
  rayonPoint = 7,
  reperes = true,
}) {
  const chemins = useMemo(
    () =>
      provinces.features.map((f) => ({
        nom: f.properties.nom,
        d: geometrieVersChemin(f.geometry),
      })),
    []
  )

  return (
    <svg
      className="carte"
      viewBox={`0 0 ${VUE.w} ${VUE.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Carte des entreprises inscrites en Belgique"
    >
      <defs>
        <filter id="lueur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="f" />
          <feMerge>
            <feMergeNode in="f" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="provinces">
        {chemins.map((p) => (
          <path key={p.nom} d={p.d} />
        ))}
      </g>

      {reperes && (
        <g className="reperes">
          {REPERES.map((r) => {
            const [x, y] = projeter(r.lng, r.lat)
            return (
              <g key={r.nom}>
                <circle cx={x} cy={y} r="2" />
                <text x={x + 6} y={y + 4}>
                  {r.nom}
                </text>
              </g>
            )
          })}
        </g>
      )}

      <g className="liens">
        {groupes
          .filter((g) => g.taille > 1)
          .map((g) => {
            const [px, py] = projeter(g.pivot.lng, g.pivot.lat)
            return (
              <g key={g.id} stroke={g.teinte} opacity={g.viable ? 0.85 : 0.3}>
                {g.membres.slice(1).map((m) => {
                  const [x, y] = projeter(m.lng, m.lat)
                  return <line key={m.id} x1={px} y1={py} x2={x} y2={y} strokeWidth="1.6" />
                })}
              </g>
            )
          })}
      </g>

      <g className="sites">
        {sites.map((s) => {
          const [x, y] = projeter(s.lng, s.lat)
          const nouveau = s.id === dernierId
          return (
            <g key={s.id}>
              {nouveau && <circle className="onde" cx={x} cy={y} r={rayonPoint} />}
              <circle
                cx={x}
                cy={y}
                r={nouveau ? rayonPoint * 1.5 : rayonPoint}
                fill={s.demo ? 'none' : COULEURS_ROLE[s.role]}
                stroke={s.demo ? COULEURS_ROLE[s.role] : 'none'}
                strokeWidth={s.demo ? 2 : 0}
                opacity={s.demo ? 0.55 : 1}
                filter={nouveau ? 'url(#lueur)' : undefined}
              />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
