// Trois sons, synthétisés à la volée : aucun fichier à charger, rien à
// attendre. Dans une allée de salon, le son fait autant que l'image.

let ctx = null
const CLE = 'raysun.muet'

export const estMuet = () => localStorage.getItem(CLE) === '1'
export const basculerSon = () => {
  const suivant = !estMuet()
  localStorage.setItem(CLE, suivant ? '1' : '0')
  return suivant
}

function contexte() {
  if (estMuet()) return null
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function note(freq, debut, duree, type = 'triangle', volume = 0.16) {
  const c = contexte()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + debut)
  g.gain.setValueAtTime(0, c.currentTime + debut)
  g.gain.linearRampToValueAtTime(volume, c.currentTime + debut + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + debut + duree)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + debut)
  o.stop(c.currentTime + debut + duree + 0.02)
}

export const sonBon = () => {
  note(660, 0, 0.12)
  note(880, 0.08, 0.16)
}

export const sonMauvais = () => {
  note(160, 0, 0.22, 'sawtooth', 0.13)
  note(110, 0.1, 0.28, 'sawtooth', 0.13)
}

export const sonBoucle = () => {
  ;[523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.075, 0.26))
}

export const sonNeutre = () => note(420, 0, 0.06, 'sine', 0.07)
