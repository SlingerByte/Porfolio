import { CAMERA_POSES, getPoseTier } from '../scene/cameraPoses'
import { getCameraFov } from '../scene/config'
import { projectPoint, type Vec2 } from '../ui/spatial/projection'

/**
 * Task 7H — the "light first" discovery gate (pure, unit-testable).
 *
 * While the room starts with the lamp OFF, scroll progression into the dark
 * experience is gated and a small guidance note points at the lamp cord.
 * The gate is an INITIAL DISCOVERY mechanic: once the lamp has ever been
 * switched on (`discoveryComplete`), it never re-activates — a lamp that is
 * later toggled off or burns out (7G) does not re-gate the room.
 *
 * One source of truth: it reads the canonical lamp state, never a second
 * copy. The projection helper anchors the note to the lamp cord using the
 * existing camera tables — computed once per activation/resize, no loop.
 */

/** True when scroll progression should be held at the discovery point. */
export function isLightGateActive(
  sceneActive: boolean,
  lampOn: boolean,
  discoveryComplete: boolean
): boolean {
  return sceneActive && !lampOn && !discoveryComplete
}

/** True when a gated scroll position must be snapped back to the hero. */
export function shouldClampScroll(scrollY: number, gateActive: boolean): boolean {
  return gateActive && scrollY > 0
}

/** The pull-bead's world position — the lamp cord interaction target
    (lamp group [0.55, 3.15, -0.55], cord hangs at x −0.26, bead at y −1.48). */
export const CORD_WORLD = { x: 0.29, y: 1.67, z: -0.55 } as const

/**
 * Screen-space position of the lamp cord under the CURRENT tier's hero pose,
 * or null when it is off-screen. Pure projection (no three.js) using the same
 * camera tables CameraRig consumes, so it stays aligned with the scene.
 */
export function lampScreenAnchor(width: number, height: number): Vec2 | null {
  const pose = CAMERA_POSES[getPoseTier(width)].hero
  return projectPoint(
    CORD_WORLD,
    { position: pose.position, target: pose.target, fovY: getCameraFov(width) },
    width,
    height
  )
}