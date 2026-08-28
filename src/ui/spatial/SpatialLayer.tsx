import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import { ANCHORS, ANCHOR_STATE } from './anchors'
import { getCameraFov } from '../../scene/config'
import { projectWorldRect, quadAabb } from './projection'
import { getUiTier } from './tier'
import { nextFocus, type FocusMode } from './focus'
import { useLampShortcut } from './useLampShortcut'
import { useFocusTrap } from './useFocusTrap'
import { MonitorInterface } from './MonitorInterface'
import { BookInterface } from './BookInterface'
import { SkillsInterface } from './SkillsInterface'
import { LightGate } from './LightGate'
import { CAMERA_POSES } from '../../scene/cameraPoses'
import { useI18n } from '../../content/strings'

/**
 * THE owner of the focus layer (M5.10 architecture):
 *
 *   ROOM  → the 3D scene is the whole interface. Objects tell the story
 *           through diegetic textures only. The layer renders ONE small
 *           affordance (a docked action button, never content over the
 *           object) that opens the focused interface. Clicking the 3D
 *           objects themselves does the same (handlers live in furniture).
 *
 *   FOCUS → a full reading interface: FLIP expansion from the object's
 *           projected quad, dimmed room behind, Escape closes, zero
 *           residue after close.
 *
 * NO EMBEDDED UI RULE: no DOM surface is ever projected onto a mesh.
 * projection/anchors exist ONLY to compute the FLIP origin rect.
 */

type SurfaceKind = Exclude<FocusMode, 'none'>

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * env(safe-area-inset-top) measured with a one-off probe (0 on desktop
 * and in jsdom). Keeps the JS FLIP floor in agreement with the CSS clamp
 * that actually positions the panel.
 */
function safeInsetTop(): number {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)
  const value = probe.getBoundingClientRect().top
  probe.remove()
  return Number.isFinite(value) ? value : 0
}

/** space-4 (nav offset) + nav text row + clearance — mirrors --focus-top-min */
const NAV_CLEARANCE_BASE = 16 + 30 + 8
const MARGIN = 24

export function SpatialLayer() {
  const {
    narrative,
    cameraSettled,
    focus,
    setFocus,
    reducedMotion,
    bulb,
    bulbAcquired,
    drawerOpen,
    setDrawerOpen,
    acquireBulb,
  } = useExperience()
  const { t } = useI18n()
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  const [trigger, setTrigger] = useState<HTMLElement | null>(null)
  /** quad of the object at open time — the focused panel grows out of it */
  const [originRect, setOriginRect] = useState<Rect | null>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  // P0-A: ENTER toggles the lamp exactly like the pull cord (same canal).
  // This DOM layer owns the room-state affordances, so the shortcut lives
  // here and delegates to the lamp state; LampRig still owns the animation.
  useLampShortcut()

  // P0-B: while a focus interface is open the rest of the app is inert —
  // focus, pointer and AT stay inside the dialog. The focus trap in
  // FocusedDisplay is the keyboard guarantee; inert is the structural one.
  useEffect(() => {
    if (focus === 'none') return undefined
    const layer = layerRef.current
    if (!layer?.parentElement) return undefined
    const background = Array.from(layer.parentElement.children).filter(
      (el) => el !== layer
    ) as HTMLElement[]
    background.forEach((el) => el.setAttribute('inert', ''))
    return () => background.forEach((el) => el.removeAttribute('inert'))
  }, [focus])

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const close = useCallback(() => {
    setFocus('none')
    // reversibility: hand focus back to exactly where exploration started
    trigger?.focus()
    setTrigger(null)
  }, [setFocus, trigger])

  useEffect(() => {
    if (focus === 'none') return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setFocus(nextFocus(focus, { type: 'escape' }))
        trigger?.focus()
        setTrigger(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus, trigger])

  /** Screen AABB of the object's anchor rect at its held pose — FLIP origin. */
  const quadBoxFor = useCallback(
    (kind: SurfaceKind): Rect | null => {
      const pose = CAMERA_POSES[getUiTier(viewport.width)][ANCHOR_STATE[kind]]
      if (!pose) return null
      const quad = projectWorldRect(
        ANCHORS[kind],
        { position: pose.position, target: pose.target, fovY: getCameraFov(viewport.width) },
        viewport.width,
        viewport.height
      )
      return quad ? quadAabb(quad) : null
    },
    [viewport]
  )

  const open = useCallback(
    (target: SurfaceKind) => {
      setOriginRect(quadBoxFor(target))
      setFocus(nextFocus(focus, { type: 'open', target }))
    },
    [focus, setFocus, quadBoxFor]
  )

  const AFFORDANCE: Partial<Record<string, { kind: SurfaceKind; label: string }>> = {
    monitor: { kind: 'monitor', label: t('affordMonitor') },
    shelf: { kind: 'book', label: t('affordBook') },
    skills: { kind: 'corkboard', label: t('affordSkills') },
  }

  const affordance = cameraSettled && focus === 'none' ? AFFORDANCE[narrative] : undefined

  /** Task 7G — while the lamp is burned and the spare hasn't been found, the
      top drawer is the story's only object of interest. A single docked
      affordance (the app's own pattern for acting on objects) keeps the whole
      mechanic reachable by keyboard/screen reader without any quest UI:
      OPEN DRAWER → TAKE BULB → (the lamp, via ENTER/cord). It shows on the
      lamp's own beats (hero / restored room), never over another beat's
      affordance. */
  const drawerAffordance =
    bulb === 'burned' && !bulbAcquired && cameraSettled && focus === 'none' &&
    (narrative === 'hero' || narrative === 'room')

  return (
    <div className="spatial-layer" data-spatial-layer="true" data-focus={focus} ref={layerRef}>
      {/* dimmed room behind focused interfaces — silhouettes stay readable */}
      {focus !== 'none' && <div className="spatial-scrim" onClick={close} aria-hidden="true" />}

      {focus !== 'none' && (
        <FocusedDisplay
          kind={focus}
          origin={originRect}
          reducedMotion={reducedMotion}
          viewport={viewport}
          onClose={close}
        />
      )}

      {/* ROOM affordance: one quiet action, docked — never over the object */}
      {affordance && !drawerAffordance && (
        <div className="room-affordance">
          <button
            type="button"
            className="room-affordance-btn"
            onClick={(e) => {
              setTrigger(e.currentTarget)
              open(affordance.kind)
            }}
          >
            {affordance.label}
          </button>
        </div>
      )}

      {/* Task 7G/7G.1 — the spare-bulb drawer's docked affordance (two steps:
          open the drawer, then take the bulb — both keyboard-reachable; the
          drawer closes on its own once the bulb is installed) */}
      {drawerAffordance && (
        <div className="room-affordance">
          <button
            type="button"
            className="room-affordance-btn"
            onClick={() => {
              if (drawerOpen) acquireBulb()
              else setDrawerOpen(true)
            }}
          >
            {drawerOpen ? t('affordTakeBulb') : t('affordDrawer')}
          </button>
        </div>
      )}

      {/* Task 7H — the light-first discovery gate: holds scroll at the hero
          while the room is dark and points at the lamp cord on any attempt */}
      <LightGate />
    </div>
  )
}

/**
 * The expanded state of the object. Positioned and scaled so its first
 * frame coincides exactly with the object's projected quad, then animates
 * to reading size — "the screen grows", not "a modal appears".
 */
function FocusedDisplay({
  kind,
  origin,
  reducedMotion,
  viewport,
  onClose,
}: {
  kind: SurfaceKind
  origin: Rect | null
  reducedMotion: boolean
  viewport: { width: number; height: number }
  onClose: () => void
}) {
  const { t } = useI18n()
  const [entered, setEntered] = useState(reducedMotion)

  // P0-B: focus isolation — the dialog is aria-modal and Tab cannot leave
  // it while it is open (wraps inside; background stays unreachable).
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    if (reducedMotion) return undefined
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(raf)
  }, [reducedMotion])

  // M5.11: the panel NEVER slides under the fixed navbar — the floor
  // respects nav height + safe area (CSS clamps again as belt-and-braces)
  const [topFloor] = useState(() => NAV_CLEARANCE_BASE + safeInsetTop())

  const width = Math.min(1080, viewport.width - MARGIN * 2)
  const height = Math.min(viewport.height - topFloor - MARGIN, 780)
  // grow from the object's center when known, else from screen center
  const cx = origin ? origin.left + origin.width / 2 : viewport.width / 2
  const cy = origin ? origin.top + origin.height / 2 : viewport.height / 2
  const left = Math.min(Math.max(cx - width / 2, MARGIN), Math.max(viewport.width - width - MARGIN, MARGIN))
  const top = Math.min(Math.max(cy - height / 2, topFloor), Math.max(viewport.height - height - MARGIN, topFloor))

  let flipStyle: CSSProperties | undefined
  if (!entered && origin) {
    flipStyle = {
      transformOrigin: 'top left',
      transform: `translate(${origin.left - left}px, ${origin.top - top}px) scale(${origin.width / width}, ${origin.height / height})`,
    }
  }

  const focusLabel =
      kind === 'monitor' ? t('focusMonitor') : kind === 'book' ? t('focusBook') : t('focusCorkboard')

  return (
    <div
      ref={dialogRef}
      className={`spatial-focused spatial-focused--${kind}${entered ? ' is-entered' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={focusLabel}
    >
      <div
        className="spatial-focused-panel"
        data-focus-panel={kind}
        style={
          {
            left,
            width,
            '--panel-top': `${top}px`,
            '--panel-h': `${height}px`,
            ...flipStyle,
          } as CSSProperties
        }
        tabIndex={-1}
        ref={(el) => {
          el?.focus({ preventScroll: true })
        }}
      >
        {kind === 'monitor' ? (
          <MonitorInterface onClose={onClose} />
        ) : kind === 'book' ? (
          <BookInterface onClose={onClose} />
        ) : (
          <SkillsInterface onClose={onClose} />
        )}
      </div>
    </div>
  )
}
