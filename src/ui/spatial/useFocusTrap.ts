import { useEffect, type RefObject } from 'react'

/** Elements the user can Tab to within a focused reading interface. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Small focus trap for the focused reading interfaces (P0-B). The dialog
 * declares `aria-modal="true"`; this hook guarantees it: Tab (and
 * Shift+Tab) can never leave the open interface, so the background cannot
 * receive focus while it is open.
 *
 * Focus ENTRY is handled by the panel's own autofocus; focus RETURN on
 * close is handled by SpatialLayer (`trigger?.focus()`). Reduced motion
 * and scroll-to-exit are untouched.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [containerRef])
}