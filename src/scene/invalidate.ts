/**
 * Tiny invalidate bus for frameloop="demand" (Phase 3): the canvas registers
 * R3F's `invalidate` while mounted; scene animation starts call
 * `requestRender()` to wake one frame, and DemandFrame (SceneCanvas) chains
 * the rest while a GSAP animation is playing. Safe no-op when the scene is
 * not mounted, so the DOM chunk never imports three.js through this module.
 */
let invalidate: (() => void) | null = null

export function registerInvalidator(fn: (() => void) | null): void {
  invalidate = fn
}

/** Ask the canvas for one new frame (no-op while the scene is absent). */
export function requestRender(): void {
  invalidate?.()
}