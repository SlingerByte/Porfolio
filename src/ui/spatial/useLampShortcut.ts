import { useEffect } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import { playLampDead, playLampToggle } from '../../scene/sound'

/**
 * True when the keydown landed on an element the browser already gives
 * Enter to (buttons, links, inputs, ...). The lamp shortcut must never
 * race those — it is an affordance of the ROOM, not of the UI.
 */
function onInteractiveTarget(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  if (!el || typeof el.closest !== 'function') return false
  return Boolean(
    el.closest(
      'button, a, input, select, textarea, [contenteditable="true"], [role="button"], [role="link"]'
    )
  )
}

/**
 * Keyboard parity for the pull cord (P0-A): ENTER performs the SAME toggle
 * the cord performs — it calls the same `toggleLamp` canal (LampRig owns
 * the resulting animation; this only delegates) plus the same click sound.
 *
 * Task 7G — a burned lamp stays keyboard-reachable through the same key:
 *   burned + no spare  → a dry dead-click (the lamp is broken, the drawer
 *                         is reachable through the docked affordance)
 *   burned + spare     → the replacement is installed (same canal)
 *
 * Active only in ROOM state (no focus interface open) and never when an
 * interactive element owns the Enter key. Discoverable via the hero hint
 * "PULL THE CORD · OR PRESS ENTER". Rendered only while the scene is live
 * (mounted from SpatialLayer), mirroring the physical cord's availability.
 */
export function useLampShortcut(): void {
  const { focus, toggleLamp, bulb, bulbAcquired, replaceBulb } = useExperience()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return
      if (focus !== 'none') return
      if (onInteractiveTarget(e)) return
      if (bulb === 'overloading' || bulb === 'replacing') return
      if (bulb === 'burned') {
        if (bulbAcquired) replaceBulb()
        else playLampDead()
        return
      }
      toggleLamp()
      playLampToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, toggleLamp, bulb, bulbAcquired, replaceBulb])
}