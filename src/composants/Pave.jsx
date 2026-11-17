const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←']

export default function Pave({ valeur, onChange, longueur = 4 }) {
  function appuyer(t) {
    if (t === '←') return onChange(valeur.slice(0, -1))
    if (t === '') return
    if (valeur.length >= longueur) return
    onChange(valeur + t)
  }

  return (
    <div className="pave">
      <div className="pave-affichage" aria-live="polite">
        {Array.from({ length: longueur }).map((_, i) => (
          <span key={i} className={valeur[i] ? 'case pleine' : 'case'}>
            {valeur[i] || ''}
          </span>
        ))}
      </div>
      <div className="pave-touches">
        {TOUCHES.map((t, i) => (
          <button
            key={i}
            type="button"
            className={t === '' ? 'touche vide' : 'touche'}
            disabled={t === ''}
            onClick={() => appuyer(t)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
