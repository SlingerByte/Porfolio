import { SectionShell } from './SectionShell'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'

export function Experience() {
  const { certifications, education, experience, sectionIntros } = useContent()
  const { t } = useI18n()

  return (
    <SectionShell
      id="experience"
      label={t('experienceLabel')}
      title={t('experienceTitle')}
      intro={sectionIntros.experience}
      state="monitor"
    >
      <ol className="timeline">
        {experience.map((item) => (
          <li key={item.id}>
            <header>
              <h3>{item.role}</h3>
              <p className="timeline-org">{item.org}</p>
              {item.period && <p className="timeline-period">{item.period}</p>}
            </header>
            <p className="timeline-summary">{item.summary}</p>
          </li>
        ))}
      </ol>

      <h3 className="education-title">{t('educationTitle')}</h3>
      <ul className="education-list">
        {education.map((item) => (
          <li key={item.id}>
            <span>{item.title}</span>
            <span className="education-meta">
              {item.org}
              {item.year ? ` · ${item.year}` : ''}
            </span>
          </li>
        ))}
      </ul>

      {certifications.length > 0 && (
        <>
          <h3 className="education-title">{t('certificationsTitle')}</h3>
          <ul className="education-list">
            {certifications.map((item) => (
              <li key={item.id}>
                <span>{item.title}</span>
                <span className="education-meta">
                  {item.issuer}
                  {item.year ? ` · ${item.year}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionShell>
  )
}