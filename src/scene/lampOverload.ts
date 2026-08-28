/**
 * Task 7G/7G.1 — lamp-abuse overload tracker (pure, unit-testable).
 *
 * The lamp burns out only if the user abuses it: 5 activations inside a
 * sliding time window (~10s). 5 toggles spread across hours must NEVER
 * trigger it, so we keep a sliding window of timestamps and prune anything
 * older than `windowMs` on every record. All state is explicit — no hidden
 * timers, no loops — so it is deterministic and trivially testable.
 *
 * Every lamp activation (cord pull, tap/click, ENTER) funnels through the
 * SAME toggle canal (ExperienceContext.toggleLamp), which is the ONLY
 * caller of recordToggle — pointermove / hover / drag intermediates never
 * reach this tracker.
 */
export const OVERLOAD_THRESHOLD = 5
export const OVERLOAD_WINDOW_MS = 10000

export interface OverloadTracker {
  threshold: number
  windowMs: number
  /** activation timestamps (ms), oldest first, all within `windowMs` */
  timestamps: number[]
}

export function createOverloadTracker(
  threshold: number = OVERLOAD_THRESHOLD,
  windowMs: number = OVERLOAD_WINDOW_MS
): OverloadTracker {
  return { threshold, windowMs, timestamps: [] }
}

/**
 * Record one activation at time `now`. Returns true exactly when the
 * threshold is reached inside the window (the moment the bulb should burn).
 * The recording toggle itself is part of the counted window.
 */
export function recordToggle(tracker: OverloadTracker, now: number): boolean {
  const { threshold, windowMs, timestamps } = tracker
  const cutoff = now - windowMs

  // prune everything that fell out of the window
  let start = 0
  while (start < timestamps.length && timestamps[start] < cutoff) start++
  if (start > 0) timestamps.splice(0, start)

  timestamps.push(now)
  return timestamps.length >= threshold
}

/** Empty the tracker (used when a fresh bulb is installed). */
export function resetOverloadTracker(tracker: OverloadTracker): void {
  tracker.timestamps.length = 0
}