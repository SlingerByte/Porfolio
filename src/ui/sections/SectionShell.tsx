import type { ReactNode } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import type { NarrativeState } from '../../state/narrative'

interface SectionShellProps {
  id: string
  label: string
  title: string
  intro?: string
  /**
   * Spatial coupling with the room: panels sit toward the side of the scene
   * they narrate (shelf→right, door→far right, desk→center-left).
   */
  align?: 'desk' | 'center' | 'shelf' | 'door'
  /** Which narrative moment this panel belongs to (drives the active treatment). */
  state?: NarrativeState
  children: ReactNode
}

/**
 * Shared section chrome: stable id, semantic heading, terminal label, panel
 * scrim. When the narrative reaches this section's moment the panel gains
 * `.is-active` — CSS lifts it while non-active panels recede, so the content
 * visually belongs to its room object instead of floating over a background.
 */
export function SectionShell({ id, label, title, intro, align = 'center', state, children }: SectionShellProps) {
  const { narrative } = useExperience()
  const active = state ? narrative === state : false

  return (
    <section id={id} className={`section section--${align}`} aria-labelledby={`${id}-title`}>
      <div className="section-inner">
        <div className={`section-panel${state ? ' section-panel--narrative' : ''}${active ? ' is-active' : ''}`}>
          <p className="section-label">{`// ${label}`}</p>
          <h2 id={`${id}-title`}>{title}</h2>
          {intro && <p className="section-intro">{intro}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}
