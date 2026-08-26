import type { WorldRect } from './projection'
import type { NarrativeState } from '../../state/narrative'
import { CAMERA_FOV } from '../../scene/config'

/**
 * World-space anchor rects — M5.10: used ONLY to compute the FLIP origin
 * of the focused interfaces (where the panel grows from). They are NOT
 * DOM projection targets anymore; no surface is anchored onto meshes.
 *
 * Coordinates MUST match the M3 scene furniture:
 *   Monitor screen  — group [0.55, 0, -1.12], plane 0.64×0.37 at local y 1.38, z +0.022
 *   Book spread     — open group at [1.06+0.09, 2.02+0.03, -1.62], pages 0.52×0.34
 *   Corkboard       — board 0.92×0.36 at [1.42, 2.95, -1.96] (front face +z)
 *
 * If furniture geometry ever changes, these are the values to update.
 */

export { CAMERA_FOV }

export const ANCHORS: Record<'monitor' | 'book' | 'corkboard', WorldRect> = {
  monitor: {
    center: { x: 0.55, y: 1.38, z: -1.098 },
    halfWidth: 0.32,
    halfHeight: 0.185,
  },
  book: {
    center: { x: 1.15, y: 2.05, z: -1.606 },
    halfWidth: 0.26,
    halfHeight: 0.172,
  },
  corkboard: {
    center: { x: 1.42, y: 2.95, z: -1.932 },
    halfWidth: 0.46,
    halfHeight: 0.18,
  },
}

/** Which narrative state holds which anchor object (for FLIP origins). */
export const ANCHOR_STATE: Record<'monitor' | 'book' | 'corkboard', NarrativeState> = {
  monitor: 'monitor',
  book: 'shelf',
  corkboard: 'skills',
}
