import * as THREE from 'three'

/**
 * Task 7G/7G.1 — tiny local spark FX for the bulb overload/replacement.
 *
 * Deliberately NOT a particle system: a handful of small stretched boxes
 * that fly outward from the bulb, then a few glowing embers that stay
 * around the burned socket for several seconds and settle completely.
 * Fully compatible with frameloop="demand": the burst is driven by ONE
 * short GSAP tween (a per-frame clock) and the residual by ONE bounded
 * timeline — DemandFrame chains the frames while they play and the scene
 * falls completely quiet the instant they end. No permanent loops.
 *
 * Positions are deterministic (seeded PRNG) so the effect looks the same
 * every time — controlled, never noise filling the screen.
 */

export const SPARK_COUNT = 12
/** total length of one burst, seconds */
export const SPARK_BURST_DURATION = 0.9

export interface SparkSpawn {
  /** local offset around the bulb where the spark starts */
  base: THREE.Vector3
  /** unit radial direction the spark flies toward */
  dir: THREE.Vector3
  /** two unit vectors perpendicular to `dir` — the zigzag axes */
  perp1: THREE.Vector3
  perp2: THREE.Vector3
  /** how far it travels (world units) */
  dist: number
  /** the spark's stretched length */
  len: number
  /** seconds after the burst starts at which it appears */
  start: number
  /** seconds it stays alive */
  dur: number
  /** amplitude of the high-frequency zigzag (world units) */
  jitter: number
  /** zigzag frequencies (rad/s) and phases per axis */
  wx: number
  wy: number
  px: number
  py: number
  /** brightness flicker: frequency (rad/s) + phase + overall brightness */
  flicker: number
  flickerPhase: number
  brightness: number
}

/** mulberry32 — small deterministic PRNG so sparks are stable across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const UP = new THREE.Vector3(0, 1, 0)
const RIGHT = new THREE.Vector3(1, 0, 0)

/**
 * Deterministic spark spawns around the bulb center (lamp-group local
 * space, the bulb sits at y ≈ -1.17). Each spark is flung radially outward
 * AND given its own zigzag axes + flicker so the burst reads as real
 * electrical sparking rather than smooth streaks.
 */
export function sparkSpawns(count: number = SPARK_COUNT, seed: number = 20260729): SparkSpawn[] {
  const rand = mulberry32(seed)
  const out: SparkSpawn[] = []
  for (let i = 0; i < count; i++) {
    // random unit vector (spherical coords) as the outward direction
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    )
    // two unit vectors perpendicular to the flight direction (zigzag axes)
    const ref = Math.abs(dir.y) < 0.99 ? UP : RIGHT
    const perp1 = new THREE.Vector3().crossVectors(dir, ref)
    if (perp1.lengthSq() < 1e-6) perp1.copy(RIGHT)
    perp1.normalize()
    const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize()
    const base = new THREE.Vector3(0, -1.17, 0).addScaledVector(dir, 0.045 + rand() * 0.03)
    out.push({
      base,
      dir,
      perp1,
      perp2,
      dist: 0.05 + rand() * 0.12,
      len: 0.02 + rand() * 0.024,
      // staggered: first sparks near the flash, the rest trail shortly after
      start: (i / Math.max(1, count - 1)) * 0.35,
      dur: 0.28 + rand() * 0.18,
      jitter: 0.008 + rand() * 0.02,
      wx: 25 + rand() * 35,
      wy: 20 + rand() * 40,
      px: rand() * Math.PI * 2,
      py: rand() * Math.PI * 2,
      flicker: 30 + rand() * 50,
      flickerPhase: rand() * Math.PI * 2,
      brightness: 0.7 + rand() * 0.6,
    })
  }
  return out
}

/**
 * Write the burst state for time `t` (seconds since the burst started) into
 * the spark meshes. Sparks outside their life window are hidden; live ones
 * fly outward (eased) while ZIGZAGGING on their perpendicular axes (high-
 * frequency, like real electrical sparks) and FLICKERING in brightness.
 */
export function applySparkBurst(
  meshes: (THREE.Mesh | null)[],
  spawns: SparkSpawn[],
  t: number
): void {
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i]
    if (!mesh) continue
    const s = spawns[i]
    const local = t - s.start
    if (local < 0 || local > s.dur) {
      mesh.visible = false
      continue
    }
    const u = local / s.dur
    // outward drift eases, then the zigzag damps as the spark dies
    const travel = 1 - (1 - u) * (1 - u)
    const damp = 1 - u
    const w1 = Math.sin(local * s.wx + s.px) * s.jitter * damp
    const w2 = Math.sin(local * s.wy + s.py) * s.jitter * damp
    mesh.visible = true
    mesh.position
      .copy(s.base)
      .addScaledVector(s.dir, s.dist * travel)
      .addScaledVector(s.perp1, w1)
      .addScaledVector(s.perp2, w2)
    mesh.scale.set(0.006, Math.max(0.001, s.len * (1 - u * 0.7)), 0.006)
    const mat = mesh.material as THREE.MeshBasicMaterial
    // quick random-looking flicker on top of the overall fade-out
    const flick = 0.5 + 0.5 * Math.sin(local * s.flicker + s.flickerPhase)
    mat.opacity = Math.max(0, Math.min(1, (1 - u) * s.brightness * (0.3 + 0.7 * flick)))
  }
}

/* ------------------------------------------------------------------ */
/* Residual embers — the "still smoking" state after the pop           */
/* ------------------------------------------------------------------ */

/** how long the residual sparking stays visible, seconds (then it settles) */
export const RESIDUAL_DURATION = 7
/** how many slivers keep re-firing during the residual window */
export const RESIDUAL_SPARK_COUNT = 10

export interface ResidualSparkSpawn {
  /** seconds between firings for this spark */
  period: number
  /** seconds each firing lasts (kept < period so it dies before re-firing) */
  lifeDur: number
  /** phase offset so the pool doesn't fire in sync */
  offset: number
  /** amplitude of the high-frequency zigzag (world units) */
  jitter: number
  /** zigzag frequencies (rad/s) + phases */
  wx: number
  wy: number
  px: number
  py: number
  /** random travel range per firing (world units) */
  travelMin: number
  travelMax: number
}

/**
 * Deterministic spawns for the RESIDUAL sparking: each sliver re-fires on
 * its own cadence for the whole residual window, so the burned socket keeps
 * visibly spitting sparks in random directions until it settles. This is the
 * "it's still alive in there" effect — never a frozen dot.
 */
export function residualSparkSpawns(
  count: number = RESIDUAL_SPARK_COUNT,
  seed: number = 20260930
): ResidualSparkSpawn[] {
  const rand = mulberry32(seed)
  const out: ResidualSparkSpawn[] = []
  for (let i = 0; i < count; i++) {
    const period = 0.6 + rand() * 0.8
    out.push({
      period,
      lifeDur: 0.14 + rand() * 0.13,
      offset: rand() * period,
      jitter: 0.008 + rand() * 0.02,
      wx: 26 + rand() * 40,
      wy: 22 + rand() * 44,
      px: rand() * Math.PI * 2,
      py: rand() * Math.PI * 2,
      travelMin: 0.04 + rand() * 0.05,
      travelMax: 0.12 + rand() * 0.12,
    })
  }
  return out
}

/**
 * Deterministic per-(spark, firing-cycle) hash in [0,1). Stable within one
 * firing (same i + cycle → same values every frame), and different between
 * firings — so each re-fire gets a fresh random direction/length/brightness.
 */
function cycleHash(i: number, cycle: number, slot: number): number {
  let h = (i * 374761393 + cycle * 668265263 + slot * 1442695041) | 0
  h = (h ^ (h >>> 13)) | 0
  h = Math.imul(h, 1274126177)
  h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

/**
 * Write the residual sparking state for time `t` (seconds since it started).
 * Each sliver re-fires repeatedly in fresh random directions — shooting out,
 * zigzagging, flickering — for the whole residual window, then the whole
 * pool fades out and settles. Driven by one bounded GSAP clock.
 */
export function applyResidualSparks(
  meshes: (THREE.Mesh | null)[],
  spawns: ResidualSparkSpawn[],
  t: number
): void {
  const fadeIn = Math.min(1, t / 0.5)
  const fadeOut = Math.min(1, (RESIDUAL_DURATION - t) / 1.2)
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i]
    if (!mesh) continue
    const s = spawns[i]
    const phase = ((t + s.offset) % s.period + s.period) % s.period
    if (phase >= s.lifeDur) {
      mesh.visible = false
      continue
    }
    const cycle = Math.floor((t + s.offset) / s.period)
    const u = phase / s.lifeDur
    const damp = 1 - u
    // fresh random direction for this firing (stable within the firing)
    const theta = cycleHash(i, cycle, 0) * Math.PI * 2
    const phi = Math.acos(2 * cycleHash(i, cycle, 1) - 1)
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    )
    const ref = Math.abs(dir.y) < 0.99 ? UP : RIGHT
    const perp1 = new THREE.Vector3().crossVectors(dir, ref)
    if (perp1.lengthSq() < 1e-6) perp1.copy(RIGHT)
    perp1.normalize()
    const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize()
    const travel =
      (s.travelMin + (s.travelMax - s.travelMin) * cycleHash(i, cycle, 2)) *
      (1 - (1 - u) * (1 - u))
    const len = 0.02 + cycleHash(i, cycle, 3) * 0.026
    const bright = 0.75 + cycleHash(i, cycle, 4) * 0.6
    const flickFreq = 28 + cycleHash(i, cycle, 5) * 46
    const flickPhase = cycleHash(i, cycle, 6) * Math.PI * 2
    const w1 = Math.sin(t * s.wx + s.px) * s.jitter * damp
    const w2 = Math.sin(t * s.wy + s.py) * s.jitter * damp
    const flick = 0.5 + 0.5 * Math.sin(t * flickFreq + flickPhase)
    mesh.visible = true
    mesh.position
      .set(0, -1.17, 0)
      .addScaledVector(dir, 0.05 + travel)
      .addScaledVector(perp1, w1)
      .addScaledVector(perp2, w2)
    mesh.scale.set(0.006, Math.max(0.001, len * (1 - u * 0.7)), 0.006)
    const mat = mesh.material as THREE.MeshBasicMaterial
    mat.opacity = fadeIn * fadeOut * (1 - u) * bright * (0.3 + 0.7 * flick)
  }
}

/* ------------------------------------------------------------------ */
/* Drag-and-drop installation geometry                                 */
/* ------------------------------------------------------------------ */

/**
 * World-space target for a successful install: the visible bulb of the lamp
 * (lamp group at [0.55, 3.15, -0.55], bulb at local [0, -1.17, 0]).
 * Documented coupling: if the lamp rig's group origin moves, update this.
 */
export const LAMP_BULB_POSITION = { x: 0.55, y: 1.98, z: -0.55 } as const

/** forgiving socket hit zone (no pixel-perfect placement required) */
export const BULB_INSTALL_RADIUS = 0.55

export function bulbInstallDistance(x: number, y: number, z: number): number {
  const dx = x - LAMP_BULB_POSITION.x
  const dy = y - LAMP_BULB_POSITION.y
  const dz = z - LAMP_BULB_POSITION.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/** true when the released bulb is close enough to the socket to install */
export function canInstallBulb(x: number, y: number, z: number): boolean {
  return bulbInstallDistance(x, y, z) <= BULB_INSTALL_RADIUS
}