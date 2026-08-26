import { useExperience } from '../../state/ExperienceContext'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'

/**
 * Opening section: name + role + CTAs over the dark room. Visual prominence
 * is driven by data-stage (written by LampRig) — the light reveals the room,
 * then the content.
 */
export function HeroSection() {
  const { reducedMotion, webglFailed, sceneStage } = useExperience()
  const { profile } = useContent()
  const { t } = useI18n()

  const cordHint = webglFailed ? null : t('cordHint')
  const scrollHint = webglFailed
    ? t('sceneUnavailable')
    : reducedMotion
      ? t('reducedMotionHint')
      : t('scrollHint')

  return (
    <section id="top" className="hero-section" data-stage={sceneStage}>
      <div className="hero-scrim" aria-hidden="true" />
      <div className="section-inner hero-inner">
        <div className="hero" aria-labelledby="hero-title">
          <p className="label">// {profile.name.toUpperCase()}</p>
          <h1 id="hero-title">{profile.name}</h1>
          <p className="hero-role">{profile.role}</p>
          <p className="reveal">{profile.tagline}</p>
          <div className="reveal hero-ctas">
            <a className="button" href="#work">
              {t('viewWork')}
            </a>
            <a className="button ghost" href="#contact">
              {t('getInTouch')}
            </a>
          </div>
          {cordHint && <p className="hint cord-hint">{cordHint}</p>}
          <p className="hint reveal scroll-hint">{scrollHint}</p>
        </div>
      </div>
    </section>
  )
}