import { useEffect, useRef } from 'react'

/**
 * Scroll-to-exit for focused interfaces (M5.11) — the focus is never a
 * cage. When the user keeps scrolling DOWN past the logical end of the
 * content (bottom of the reading region, last book page, ...), the focus
 * closes naturally and the narrative journey continues.
 *
 * Not aggressive: requires accumulated downward wheel delta beyond a
 * threshold, a short cooldown after opening (so settling scroll never
 * triggers it), and a caller-supplied `canExit` gate (e.g. only on the
 * final page). Reading never closes anything.
 *
 * Pure wheel-based; touch users keep the explicit CLOSE affordance.
 */
export function useScrollExit(
  canExit: () => boolean,
  onExit: () => void,
  enabled = true
) {
  const canExitRef = useRef(canExit)
  const onExitRef = useRef(onExit)
  canExitRef.current = canExit
  onExitRef.current = onExit

  useEffect(() => {
    if (!enabled) return undefined
    let accumulated = 0
    const cooldownUntil = Date.now() + 600 // ignore the scroll that opened us

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0) {
        accumulated = 0
        return
      }
      if (Date.now() < cooldownUntil) return
      accumulated += e.deltaY
      if (accumulated >= 160) {
        accumulated = 0
        if (canExitRef.current()) onExitRef.current()
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [enabled])
}

/** True when a scrollable element is at (or past) its bottom edge. */
export function atScrollEnd(el: HTMLElement | null, tolerance = 4): boolean {
  if (!el) return false
  return el.scrollHeight - el.scrollTop - el.clientHeight <= tolerance
}
