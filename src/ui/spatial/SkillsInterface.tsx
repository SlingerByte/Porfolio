import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { atScrollEnd, useScrollExit } from './useScrollExit'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'
import type { SkillGroup } from '../../content/types'

interface SkillsInterfaceProps {
  onClose?: () => void
}

/** natural post-it tilts, in degrees, per color variant */
const NOTE_TILT = [-1.1, 0.7, -0.5] as const

/* The user can rearrange the notes; their positions persist across open/
   close (and reloads), so the board keeps the arrangement they chose. */
const STORAGE_KEY = 'skills-note-layout'

type NoteOffset = { x: number; y: number }

function loadLayout(): Record<string, NoteOffset> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, NoteOffset>) : {}
  } catch {
    return {}
  }
}

const layout: Record<string, NoteOffset> = loadLayout()

function persistLayout(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    /* private mode / storage full — the arrangement just won't survive reloads */
  }
}

/** deterministic pseudo-random 0..1 from a string seed */
function seedFrom(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return (h >>> 0) / 0xffffffff
}

/** small deterministic stagger so notes look hand-pinned, not grid-stamped */
function baseStagger(id: string): { x: number; y: number; rot: number } {
  const seed = seedFrom(id)
  return {
    x: Math.round((seed * 2 - 1) * 22),
    y: Math.round((((seed * 97 + 13) % 1) * 2 - 1) * 15),
    rot: ((seed * 53 + 7) % 1) * 4 - 2,
  }
}

/**
 * One pinned post-it. It can be GRABBED and dragged anywhere on the board
 * (pointer capture), then "pinned" in place with a little pulse — like
 * moving a note on a real corkboard. Its resting spot is a deterministic
 * hand-pinned stagger, plus whatever the user dragged it to (persisted).
 */
function SkillNote({ group, index }: { group: SkillGroup; index: number }) {
  const variant = index % 3
  const base = baseStagger(group.id)
  const saved = layout[group.id] ?? { x: 0, y: 0 }
  const [offset, setOffset] = useState(saved)
  const [dragging, setDragging] = useState(false)
  const [pinned, setPinned] = useState(false)
  const drag = useRef<{
    startX: number
    startY: number
    ox: number
    oy: number
    x: number
    y: number
  } | null>(null)

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y, x: offset.x, y: offset.y }
    setDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    const x = d.ox + (e.clientX - d.startX)
    const y = d.oy + (e.clientY - d.startY)
    d.x = x
    d.y = y
    setOffset({ x, y })
  }
  const endDrag = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragging(false)
    // save the arrangement so it survives leaving and coming back
    layout[group.id] = { x: d.x, y: d.y }
    persistLayout()
    // a quick "chinche" pulse as the note settles into place
    setPinned(true)
    window.setTimeout(() => setPinned(false), 320)
  }

  const x = base.x + offset.x
  const y = base.y + offset.y
  const rot = base.rot + NOTE_TILT[variant]
  return (
    <section
      className={`skill-note skill-note--${variant}${dragging ? ' is-dragging' : ''}${pinned ? ' is-pinned' : ''}`}
      style={{ transform: `translate(${x}px, ${y}px) rotate(${rot.toFixed(2)}deg)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label={group.label}
    >
      <h3 className="skill-note-family">{group.label}</h3>
      <ul className="skill-note-items">
        {group.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The focused face of the corkboard (M5.10): the ONLY HTML this object
 * ever shows. In the room the board is physical post-its; VIEW ALL SKILLS
 * expands to the full, readable list of every family and tool. The post-its
 * can be grabbed and rearranged on the board — and the arrangement sticks.
 * Scrolling past the end of the lists exits naturally (M5.11).
 */
export function SkillsInterface({ onClose }: SkillsInterfaceProps) {
  const { skills } = useContent()
  const { t } = useI18n()
  const bodyRef = useRef<HTMLDivElement>(null)

  useScrollExit(
    () => atScrollEnd(bodyRef.current),
    () => onClose?.(),
    Boolean(onClose)
  )

  return (
    <div className="skills-ui skills-ui--focus">
      <header className="skills-ui-bar">
        <span className="skills-ui-title">{t('corkboardTitle')}</span>
        <button type="button" className="monitor-ui-action" onClick={onClose}>
          {t('skillsClose')}
        </button>
      </header>

      <div ref={bodyRef} className="skills-ui-body" tabIndex={0} role="region" aria-label={t('skillsAria')}>
        {skills.map((group, gi) => (
          <SkillNote key={group.id} group={group} index={gi} />
        ))}
      </div>

      <footer className="skills-ui-foot">
        <span className="term-meta">
          {t('skillsFooter', { n: String(skills.reduce((n, g) => n + g.items.length, 0)), f: String(skills.length) })}
        </span>
      </footer>
    </div>
  )
}