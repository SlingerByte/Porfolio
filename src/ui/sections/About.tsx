import { SectionShell } from './SectionShell'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'

export function About() {
  const { aboutParagraphs } = useContent()
  const { t } = useI18n()

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