import { skills as enSkills } from '../../content/portfolio'

/**
 * Pure board composition for the corkboard (M7.1) — no three.js, so the
 * diegetic content is unit-testable: which families are pinned, which
 * skills are readable, and the physical SKILLS sign that names the board.
 *
 * Layout: 4 columns × 2 rows. All notes fit inside the 0.92 × 0.36 board.
 * Overflow notes sit slightly below and right of their primary note,
 * creating a natural pinned-together look.
 *
 * Corkboard local bounds: x ∈ [-0.46, +0.46], y ∈ [-0.18, +0.18]
 */

export const MAX_ITEMS_PER_NOTE = 2

/** Board half-width for boundary checks */
const BOARD_HALF_W = 0.46
const BOARD_HALF_H = 0.18

export interface NoteSpec {
  x: number
  y: number
  rot: number
  colorIndex: number
  family?: string
  items: string[]
}

/** The small physical sign pinned above the notes: the board's name (EN default; the drawn sign follows the current language). */
export const SKILLS_SIGN = { label: '// SKILLS' } as const

/**
 * Deterministic "random" rotation — produces a small tilt in [-0.08, +0.08]
 * that varies per note index without actual randomness.
 */
function tilt(seed: number): number {
  return ((seed * 37 + 13) % 17) / 170 - 0.05
}

export function buildNotes(source = enSkills): NoteSpec[] {
  const COLS = 4
  // column x-centers: evenly spaced within the board with breathing room
  const colX = [-0.30, -0.10, 0.10, 0.30]
  // row y-centers: two rows, upper and lower
  const rowY = [0.07, -0.05]

  return source.flatMap((group, gi) => {
    const col = gi % COLS
    const row = Math.floor(gi / COLS)
    const baseX = colX[col]
    const baseY = rowY[row]

    const head = group.items.slice(0, MAX_ITEMS_PER_NOTE)
    const rest = group.items.slice(MAX_ITEMS_PER_NOTE, MAX_ITEMS_PER_NOTE * 2)

    const notes: NoteSpec[] = [
      {
        x: baseX,
        y: baseY,
        rot: tilt(gi),
        colorIndex: gi % 3,
        family: group.label,
        items: head,
      },
    ]

    if (rest.length > 0) {
      // overflow note: offset down-right, slightly different rotation
      // bottom row uses a smaller vertical offset to stay inside the board
      const ox = baseX + 0.06
      const oy = baseY - (row === 1 ? 0.08 : 0.11)
      // clamp to board bounds (note is 0.075 tall, half = 0.0375)
      notes.push({
        x: Math.min(ox, BOARD_HALF_W - 0.04),
        y: Math.max(oy, -BOARD_HALF_H + 0.04),
        rot: tilt(gi + 100),
        colorIndex: (gi + 1) % 3,
        items: rest,
      })
    }
    return notes
  })
}

/**
 * Validate that all notes fit inside the corkboard bounds.
 * Returns an array of violation descriptions (empty = all inside).
 */
export function validateBoardBounds(
  notes: NoteSpec[],
  noteW: number,
  noteH: number
): string[] {
  const hw = noteW / 2
  const hh = noteH / 2
  const violations: string[] = []
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    const left = n.x - hw
    const right = n.x + hw
    const top = n.y + hh
    const bottom = n.y - hh
    if (left < -BOARD_HALF_W || right > BOARD_HALF_W) {
      violations.push(
        `note ${i} (${n.family ?? 'overflow'}) x=${n.x.toFixed(3)} exceeds board width`
      )
    }
    if (top > BOARD_HALF_H || bottom < -BOARD_HALF_H) {
      violations.push(
        `note ${i} (${n.family ?? 'overflow'}) y=${n.y.toFixed(3)} exceeds board height`
      )
    }
  }
  return violations
}
