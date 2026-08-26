import type { NarrativeState } from '../state/narrative'

/**
 * NAMED CAMERA POSES — the camera's whole vocabulary.
 *
 * The scroll never writes camera values; it selects a narrative state, and
 * each state maps to exactly one pose per device tier. Transitions between
 * poses are finite GSAP tweens owned by CameraRig.
 *
 * World references (M3 scene, unchanged):
 *   desk/monitor  x .55  · monitor screen center ≈ [0.55, 1.38, -1.10]
 *   shelf         x 1.42 · book on upper shelf [1.06, 2.02, -1.88]
 *   corkboard     [1.42, 2.95, -1.96]
 *   door          x 3.1, z -1.94
 *   fov 35 — focus poses dolly in until the protagonist object fills a
 *   significant portion of the frame ("the user decided to look at it").
 */

export interface Pose {
  position: [number, number, number]
  target: [number, number, number]
}

export type PoseTier = 'desktop' | 'tablet' | 'mobile'

export function getPoseTier(width: number): PoseTier {
  if (width <= 640) return 'mobile'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}

/** Full-room establishing shot; also the initial camera position. */
export const HERO_ESTABLISHING: Pose = {
  position: [0, 1.75, 7.4],
  target: [0, 1.15, 0],
}

const DESKTOP: Record<NarrativeState, Pose> = {
  hero: HERO_ESTABLISHING,
  // walk up to the desk: screen occupies a large share of the frame
  monitor: { position: [0.42, 1.5, 0.7], target: [0.55, 1.36, -1.12] },
  // restored room composition between moments — closer than hero, neutral
  room: { position: [0, 1.66, 5.3], target: [0.6, 1.32, -1.4] },
  // step to the shelf, eye level with the book
  shelf: { position: [0.75, 1.92, -0.35], target: [1.18, 1.98, -1.88] },
  // look up at the corkboard above the shelf
  skills: { position: [1.05, 2.6, -0.55], target: [1.42, 2.94, -1.96] },
  // open composition facing the door
  contact: { position: [1.35, 1.52, -0.1], target: [2.95, 1.28, -1.94] },
}

/** Tablet: same protagonists, more contained poses (further back, higher). */
const TABLET: Record<NarrativeState, Pose> = {
  hero: HERO_ESTABLISHING,
  monitor: { position: [0.35, 1.58, 1.5], target: [0.55, 1.36, -1.12] },
  room: { position: [0, 1.72, 5.9], target: [0.55, 1.3, -1.4] },
  shelf: { position: [0.5, 2.0, 0.45], target: [1.18, 1.95, -1.88] },
  skills: { position: [0.85, 2.62, 0.25], target: [1.42, 2.9, -1.96] },
  contact: { position: [1.05, 1.6, 0.45], target: [2.8, 1.3, -1.94] },
}

/** Mobile hero: pulled way back so the whole room fits the narrow frame. */
const MOBILE_HERO: Pose = { position: [0, 2.6, 19], target: [0, 1.2, -1.4] }

/** Mobile portrait: narrow horizontal FOV → start wide (whole room) and
    zoom in progressively as the story walks the room. */
const MOBILE: Record<NarrativeState, Pose> = {
  hero: MOBILE_HERO,
  // restored room composition — still wide, a little closer than the hero
  room: { position: [0, 2.4, 15], target: [0, 1.3, -1.4] },
  // walk up to the desk
  monitor: { position: [0.35, 1.7, 2.6], target: [0.55, 1.34, -1.12] },
  // step to the shelf, eye level with the book
  shelf: { position: [0.75, 2.15, 2.0], target: [1.18, 1.95, -1.88] },
  // look up at the corkboard above the shelf
  skills: { position: [0.9, 2.7, 1.9], target: [1.42, 2.9, -1.96] },
  // open composition facing the door
  contact: { position: [1.0, 1.65, 1.8], target: [2.8, 1.3, -1.94] },
}

export const CAMERA_POSES: Record<PoseTier, Record<NarrativeState, Pose>> = {
  desktop: DESKTOP,
  tablet: TABLET,
  mobile: MOBILE,
}

/**
 * Focus states whose transitions pass through the restored-room pose, so
 * moving between moments feels like walking across the studio instead of
 * the room sliding sideways.
 */
export const VIA_ROOM: ReadonlySet<NarrativeState> = new Set(['monitor', 'shelf', 'skills', 'contact'])
