import { SectionShell } from './SectionShell'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'

export function Skills() {
  const { skills, sectionIntros } = useContent()
  const { t } = useI18n()

  return (
    <SectionShell
      id="skills"
      align="shelf"
      state="skills"
      label={t('skillsLabel')}
      title={t('skillsTitle')}
      intro={sectionIntros.skills}
    >
      <dl className="skills-list">
        {skills.map((group) => (
          <div key={group.id} className="skill-group">
            <dt>{group.label}</dt>
            <dd>{group.items.join('  ·  ')}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  )
}