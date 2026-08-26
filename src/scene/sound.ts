/**
 * Tiny Web Audio helpers for diegetic sounds — no audio assets, everything
 * is synthesized on the fly (the browser's Web Audio API is the only "sound
 * library" we need).
 *
 * The AudioContext is created lazily on the first call and resumed on every
 * use, so sound never autoplays before the browser allows it (idle knocks
 * stay silent until the reader interacts once).
 */

let audioCtx: AudioContext | null = null

function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

/**
 * A knock on a WOODEN door: a crisp broadband "toc" (filtered noise burst)
 * over a very fast low body. Short and dry — nothing like a heartbeat.
 */
export function playKnock(): void {
  const ctx = ensureAudio()
  if (!ctx) return
  const t0 = ctx.currentTime

  // the wood impact — a burst of noise filtered into the "knock" band
  const noise = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noise.buffer = buffer
  const wood = ctx.createBiquadFilter()
  wood.type = 'bandpass'
  wood.frequency.value = 1300
  wood.Q.value = 0.9
  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.0001, t0)
  nGain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.002)
  nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06)
  noise.connect(wood).connect(nGain).connect(ctx.destination)

  // the wooden body — a low thump with a very fast decay
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(170, t0)
  osc.frequency.exponentialRampToValueAtTime(85, t0 + 0.05)
  const tGain = ctx.createGain()
  tGain.gain.setValueAtTime(0.0001, t0)
  tGain.gain.exponentialRampToValueAtTime(0.6, t0 + 0.002)
  tGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08)
  osc.connect(tGain).connect(ctx.destination)

  noise.start(t0)
  osc.start(t0)
  noise.stop(t0 + 0.12)
  osc.stop(t0 + 0.1)
}

/**
 * The lamp turning on: the pull-chain click (two sharp taps) followed by a
 * faint electrical hum as the bulb warms — unmistakably a lamp.
 */
export function playLampToggle(): void {
  const ctx = ensureAudio()
  if (!ctx) return
  const t0 = ctx.currentTime

  // the pull-chain click — two crisp metallic taps
  for (let i = 0; i < 2; i++) {
    const t = t0 + i * 0.06
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1900 - i * 350, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.05)
  }

  // the bulb's electrical hum — a low, warm tone that swells and settles
  const hum = ctx.createOscillator()
  hum.type = 'sine'
  hum.frequency.setValueAtTime(125, t0 + 0.12)
  hum.frequency.linearRampToValueAtTime(110, t0 + 0.6)
  const humGain = ctx.createGain()
  humGain.gain.setValueAtTime(0.0001, t0 + 0.12)
  humGain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.18)
  humGain.gain.setValueAtTime(0.07, t0 + 0.4)
  humGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9)
  hum.connect(humGain).connect(ctx.destination)
  hum.start(t0 + 0.12)
  hum.stop(t0 + 0.95)
}

/**
 * A soft paper flip for the book's page turn: a bandpass noise sweep that
 * rises with the page and settles as it lands.
 */
export function playPageTurn(): void {
  const ctx = ensureAudio()
  if (!ctx) return
  const t0 = ctx.currentTime
  const noise = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noise.buffer = buffer
  // paper: a bandpass that sweeps up as the page flips, then fades
  const paper = ctx.createBiquadFilter()
  paper.type = 'bandpass'
  paper.Q.value = 1.4
  paper.frequency.setValueAtTime(700, t0)
  paper.frequency.linearRampToValueAtTime(2600, t0 + 0.12)
  paper.frequency.exponentialRampToValueAtTime(500, t0 + 0.32)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34)
  noise.connect(paper).connect(gain).connect(ctx.destination)
  noise.start(t0)
  noise.stop(t0 + 0.35)
}