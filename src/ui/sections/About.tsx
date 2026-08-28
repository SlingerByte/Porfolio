import { SectionShell } from './SectionShell'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'
import { useExperience } from '../../state/ExperienceContext'

export function About() {
  const { sceneActive } = useExperience()
  const { aboutParagraphs } = useContent()
  const { t } = useI18n()

  // With the scene live, document panels keep layout but must not paint or
  // take focus (spatial presentation — see global.css). About has no
  // spatial reading interface, so it must still exist as a semantic,
  // screen-reader reachable block: visually hidden (sr-only), never
  // removed from the accessibility tree. Without WebGL the section
  // renders as a normal readable panel.
  if (sceneActive) {
    return (
      <section id="about" className="section section--shelf" aria-labelledby="about-title">
        <div className="sr-only">
          <h2 id="about-title">{t('aboutTitle')}</h2>
          {aboutParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>
    )
  }

  return (
    <SectionShell id="about" align="shelf" label={t('aboutLabel')} title={t('aboutTitle')}>
      <div className="about-body">
        {aboutParagraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </SectionShell>
  )
}