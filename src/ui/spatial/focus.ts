/**
 * Focus mode — pure state machine for the focus layer.
 *
 *   none      — ROOM: pure 3D + diegetic visuals, no DOM content anywhere
 *   monitor   — the monitor's reading interface over the dimmed room
 *   book      — the case-study reading interface over the dimmed room
 *   corkboard — the skills board over the dimmed room
 *
 * Contact has NO focus mode: the door's speech lives in the DOM bubble
 * (ui/sections/Contact), never in a modal.
 * Kept pure so open/close/escape behavior is unit-testable and the React
 * component stays a thin shell.
 */

export type FocusMode = 'none' | 'monitor' | 'book' | 'corkboard'

export type FocusAction =
  | { type: 'open'; target: Exclude<FocusMode, 'none'> }
  | { type: 'close' }
  | { type: 'escape' }
  | { type: 'toggle'; target: Exclude<FocusMode, 'none'> }

export function nextFocus(current: FocusMode, action: FocusAction): FocusMode {
  switch (action.type) {
    case 'open':
      return action.target
    case 'close':
    case 'escape':
      return 'none'
    case 'toggle':
      return current === action.target ? 'none' : action.target
  }
}
