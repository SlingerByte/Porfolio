/**
 * Narrative state machine — the single source of truth for the spatial story.
 *
 * The scroll does NOT drive the camera. It drives THIS state:
 *
 *   hero ──▶ monitor ──▶ room ──▶ shelf ──▶ skills ──▶ contact
 *            (desk)    (restore)  (book)  (corkboard)  (door)
 *
 * Every state maps to one named camera pose and one protagonist object.
 * Transitions are finite tweens owned by each rig; while a state holds,
 * nothing moves — the user reads.
 *
 * All resolution logic here is PURE so it can be unit-tested without DOM.
 */

export type NarrativeState =
  | 'hero' // establishing shot; the lamp owns this moment
  | 'monitor' // experience read at the desk
  | 'room' // restored room composition between moments
  | 'shelf' // selected-works book on the shelf
  | 'skills' // corkboard reveals
  | 'contact' // the door ends the journey

/** Ordered narrative beats: section id → the state it holds. */
export const NARRATIVE_BEATS: ReadonlyArray<readonly [string, NarrativeState]> = [
  ['experience', 'monitor'],
  ['work', 'shelf'],
  ['skills', 'skills'],
  ['about', 'skills'], // about keeps the corkboard composition; it is a read zone
  ['contact', 'contact'],
]

export interface SectionSpan {
  /** document-space top edge, px */
  top: number
  /** document-space bottom edge, px */
  bottom: number
}

export interface ScrollFrame {
  /** viewport middle in document coordinates */
  mid: number
  /** viewport height, px */
  viewport: number
}

/**
 * Fraction of the viewport used as the "entry line": a beat engages when its
 * section top rises above this line (slightly early, so the transition lands
 * before the reader arrives).
 */
const ENTRY_LINE = 0.62

/**
 * After leaving a section, fall back to the restored-room composition once
 * the section bottom clears the viewport middle by 20% of the viewport
 * (see the hold-zone overrides in resolveNarrative).
 */

/**
 * Resolve the narrative state from real layout geometry.
 * Deterministic and reversible: same frame → same state, scrolling up
 * walks the story backwards.
 */
export function resolveNarrative(
  spans: Record<string, SectionSpan | undefined>,
  frame: ScrollFrame
): NarrativeState {
  const entry = frame.mid - frame.viewport * (0.5 - ENTRY_LINE)
  let current: NarrativeState = 'hero'

  for (const [id, state] of NARRATIVE_BEATS) {
    const span = spans[id]
    if (!span) continue
    if (span.top <= entry) current = state
  }

  // Hold-zone overrides: when the active section's content is fully above
  // the viewport, we are between moments → restore the room.
  if (current === 'monitor') {
    const span = spans['experience']
    if (span && span.bottom < frame.mid - frame.viewport * 0.2) return 'room'
  }
  if (current === 'shelf') {
    const span = spans['work']
    if (span && span.bottom < frame.mid - frame.viewport * 0.2) return 'room'
  }

  return current
}

/** Book pages: page 0 is the intro spread, then one spread per project. */
export function bookPageCount(projectCount: number): number {
  return projectCount + 1
}

/**
 * Clamp a UI navigation shift so the effective page always stays in range.
 */
export function clampShift(shift: number, scrollPage: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  const clamped = Math.min(pageCount - 1 - scrollPage, Math.max(-scrollPage, shift))
  return clamped === 0 ? 0 : clamped // avoid -0 leaking into state comparisons
}

/**
 * Map intra-section reading progress (0..1) to a discrete book page.
 * Discrete by design: the scroll advances the STORY of the book, the book
 * component animates each turn; the camera stays put.
 */
export function resolveBookPage(progress: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  const clamped = Math.min(1, Math.max(0, progress))
  const page = Math.floor(clamped * pageCount)
  return Math.min(pageCount - 1, Math.max(0, page))
}

/**
 * Effective page = scroll-derived page + UI navigation shift, clamped.
 * Keeps a single deterministic source of truth while letting PREV/NEXT
 * buttons participate without fighting the narrative scroll.
 */
export function resolveEffectivePage(scrollPage: number, shift: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  return Math.min(pageCount - 1, Math.max(0, scrollPage + shift))
}

/**
 * Progress through the work section (0..1 unclamped) given the viewport
 * middle. Zero at the beat's engagement point (section top on the entry
 * line), ~1 as the reading zone ends.
 */
export function workSectionProgress(span: SectionSpan, frame: ScrollFrame): number {
  const start = span.top + frame.viewport * 0.12 // entry-line engagement point
  const end = Math.max(span.bottom - frame.viewport * 0.2, start + 1)
  return (frame.mid - start) / (end - start)
}
