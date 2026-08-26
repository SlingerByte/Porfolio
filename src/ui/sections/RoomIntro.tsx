import { useEffect, useRef, useState } from 'react'
import { useContent } from '../../state/useContent'
import { useExperience } from '../../state/ExperienceContext'

/**
 * ABOUT THIS ROOM (M5.8) — the orientation beat right after the hero.
 *
 * With the scene live it is a wayfinding affordance of the ROOM itself: it
 * sits in its own section below the hero (never overlapping it) and reveals
 * with a soft fade/slide the moment it scrolls into the room, stepping aside
 * once passed. Without WebGL it renders as a normal always-readable section.
 */
export function RoomIntro() {
  const { sceneActive } = useExperience()
  const { roomIntro } = useContent()
  const panelRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = panelRef.current
    if (!el || !sceneActive || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sceneActive])

  // with the scene live the panel reveals on arrival and recedes when passed;
  // fallback keeps it as a normal always-readable panel
  const receded = sceneActive && !inView

  return (
    <section id="room" className="section section--room" aria-labelledby="room-title">
      <div
        ref={panelRef}
        className="room-intro"
        data-scene-intro={sceneActive ? 'true' : 'false'}
        data-receded={receded ? 'true' : 'false'}
      >
        <p className="section-label">{`// ${roomIntro.label}`}</p>
        <h2 id="room-title">{roomIntro.headline}</h2>
        <p className="room-intro-line">{roomIntro.line}</p>
        <p className="room-intro-note">{roomIntro.note}</p>

        <dl className="room-intro-legend">
          {roomIntro.legend.map((entry, i) => (
            <div key={entry.object} className="room-intro-row">
              <dt>
                <span className="room-intro-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="room-intro-name">{entry.object}</span>
                <span className="room-intro-arrow" aria-hidden="true">
                  →
                </span>
              </dt>
              <dd>{entry.holds}</dd>
            </div>
          ))}
        </dl>

        <p className="hint room-intro-hint">
          {roomIntro.hint} <span aria-hidden="true">↓</span>
        </p>
      </div>
    </section>
  )
}