import { SectionShell } from './SectionShell'
import { ProjectCard } from './ProjectCard'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'
import { useExperience } from '../../state/ExperienceContext'
import { useBookPage, BOOK_PAGE_COUNT } from '../../state/book'

/**
 * The DOM twin of the Selected Works book. The 3D book turns pages with the
 * scroll; this panel always shows every project for accessibility — but the
 * card matching the open page is lifted, and a page indicator ties the two
 * together spatially.
 */
export function Work() {
  const { narrative } = useExperience()
  const { projects, sectionIntros } = useContent()
  const { t } = useI18n()
  const bookPage = useBookPage()
  const inBook = narrative === 'shelf'
  const pageNames = [t('bookIntroduction'), ...projects.map((p) => p.title)]

  return (
    <SectionShell
      id="work"
      align="desk"
      state="shelf"
      label={t('selectedWorkLabel')}
      title={t('projectsTitle')}
      intro={sectionIntros.work}
    >
      {inBook && (
        <p className="book-progress" role="status" aria-live="polite">
          {t('bookProgress', { n: String(bookPage + 1), c: String(BOOK_PAGE_COUNT) })} ·{' '}
          {pageNames[bookPage] ?? t('bookIntroduction')}
        </p>
      )}
      <div className="projects-grid">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            highlighted={inBook && bookPage - 1 === index}
          />
        ))}
      </div>
    </SectionShell>
  )
}