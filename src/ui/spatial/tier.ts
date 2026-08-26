/**
 * UI device tier — mirrors the camera pose tiers in scene/cameraPoses.ts
 * (same breakpoints, DOM-safe: no three.js import).
 *
 * Used to pick the pose family for FLIP origin math and responsive focus
 * sizing. M5.10: no anchoring tiers anymore — ROOM never mounts DOM over
 * objects on any tier.
 */
export type UiTier = 'desktop' | 'tablet' | 'mobile'

export function getUiTier(width: number): UiTier {
  if (width <= 640) return 'mobile'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}
