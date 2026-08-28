/** Scene-wide constants. Values validated in M0.3; art-direction tuning lands in M2. */

export const PIXEL_SCALES = [1.0, 0.5, 0.4, 0.34, 0.25] as const

export const BREAKPOINTS = {
  phoneMax: 640,
  tabletMax: 1024,
} as const

/** Vertical FOV of the single perspective camera. Shared with the Spatial UI
    projection math so DOM overlays land exactly on scene surfaces. */
export const CAMERA_FOV = 35

/**
 * FOV by device width. Portrait phones get a wider vertical FOV so more of
 * the room fits in the narrow horizontal frame; the projection math reads
 * the same value, so FLIP origins stay aligned.
 */
export function getCameraFov(width: number): number {
  return width <= 640 ? 48 : CAMERA_FOV
}

/**
 * Fine-pixel baseline. 0.50 is the human-approved value (M2 revision) and is
 * now the default for ALL tiers: on mobile it doubles as the GPU-saving
 * coarser render, so a single constant keeps look and budget aligned.
 */
export function getDefaultPixelScale(): number {
  return 1.0
}

/* Camera poses live in cameraPoses.ts — one named table per device tier.
   The initial camera position comes from HERO_ESTABLISHING there. */

export const LIGHT_OFF = 0.15
export const LIGHT_ON = 34

/* ---- OFF-state atmosphere (M2 refinement: silhouettes, not full reveal) ---- */

/** animated room-fill ambient owned by LampRig */
export const AMBIENT_OFF = 0.03
export const AMBIENT_ON = 0.22

/** cold moonlight through the window */
export const MOON_INTENSITY = 0.28

/** monitor: a promise of technology, never the protagonist */
export const MONITOR_LIGHT_INTENSITY = 0.7
export const SCREEN_EMISSIVE = 0.55
