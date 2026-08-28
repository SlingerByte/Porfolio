import { useCallback, useEffect, useState } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import { useI18n } from '../../content/strings'
import { isLightGateActive, lampScreenAnchor, shouldClampScroll } from '../../state/lightGate'

/**
 * Task 7H — the "light first" discovery gate.
 *
 * While the room is dark and undiscovered, scroll progression is held at the
 * hero and any scroll attempt surfaces a small room-integrated note pointing
 * at the lamp cord ("turn on the light first"). Turning the lamp ON releases
 * the gate instantly — one source of truth (lampOn/discoveryComplete from
 * the context), no second lamp state, no modal.
 *
 * Mechanics:
 *   - clamp: any document scroll while gated is snapped back to the hero
 *   - reveal: a wheel / touch / scroll / scrolling-key attempt shows the note
 *             (idempotent — it stays visible, never re-animates/spams)
 *   - anchor: the note's position is projected from the lamp cord once per
 *             activation/resize (no per-frame measurement, no loop)
 *   - accessibility: the note is a polite live region; it does not trap
 *             focus, block Tab, or hide interactive content; ENTER on the
 *             lamp still works (released immediately on lampOn)
 *   - reduced motion: entrance + arrow bob are disabled via CSS
 */
export function LightGate() {
  const { sceneActive, lampOn, discoveryComplete, focus, reducedMotion } = useExperience()
  const { t } = useI18n()
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [revealed, setRevealed] = useState(false)

  const active = isLightGateActive(sceneActive, lampOn, discoveryComplete)
  const show = active && revealed && focus === 'none'

  const reveal = useCallback(() => setRevealed(true), [])

  // keep the viewport measurement fresh (the anchor is a stable projection)
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // project the lamp cord anchor while the gate is active (and on resize)
  useEffect(() => {
    if (!active) return
    setAnchor(lampScreenAnchor(viewport.width, viewport.height))
  }, [active, viewport])

  // the gate itself: hold scroll at the hero + reveal on any attempt
  useEffect(() => {
    if (!active) return
    const clamp = () => {
      if (shouldClampScroll(window.scrollY, active)) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
    }
    const onScroll = () => {
      if (shouldClampScroll(window.scrollY, active)) {
        clamp()
        reveal()
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) reveal()
    }
    const onTouchMove = () => reveal()
    const onKeyDown = (e: KeyboardEvent) => {
      // keys that progress the document downward
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'End') {
        reveal()
      }
    }
    // snap any stray scroll (e.g., a URL hash on load) back to the hero
    if (shouldClampScroll(window.scrollY, active)) {
      clamp()
      reveal()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('keydown', onKeyDown, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [active, reveal])

  // once the gate releases (lamp on), forget the revealed state
  useEffect(() => {
    if (!active) setRevealed(false)
  }, [active])

  if (!show) return null

  const margin = 16
  const width = Math.min(280, viewport.width - margin * 2)
  const left = anchor
    ? Math.max(margin, Math.min(anchor.x - width / 2, viewport.width - width - margin))
    : viewport.width / 2 - width / 2
  const top = anchor
    ? Math.max(64, Math.min(anchor.y + 96, viewport.height - 130))
    : Math.max(64, viewport.height * 0.55)

  return (
    <div
      className="light-gate"
      data-light-gate="revealed"
      data-light-gate-reduced={reducedMotion ? 'true' : 'false'}
      role="status"
      aria-live="polite"
      style={{ left, top, width }}
    >
      <svg className="light-gate-arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 L20 12 H15 V22 H9 V12 H4 Z" />
      </svg>
      <p className="light-gate-text">{t('lightGate')}</p>
    </div>
  )
}