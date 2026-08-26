import type { Project } from '../../content/types'
import { useI18n } from '../../content/strings'

interface ProjectCardProps {
  project: Project
  index: number
  /** true while the 3D book is open on this project's spread */
  highlighted?: boolean
}

/** Typed project card. Featured projects span wider; expansion via native <details>. */
export function ProjectCard({ project, index, highlighted = false }: ProjectCardProps) {
  const { t } = useI18n()
  const statusChip = project.links ? null : t('codeOnRequest')
  const paragraphs = project.description.split('\n\n')

  return (
    <article
      className={`project-card${project.featured ? ' featured' : ''}${highlighted ? ' is-open-page' : ''}`}
      aria-labelledby={`${project.id}-title`}
    >
      <header className="project-header">
        <span className="project-num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div>
          <h3 id={`${project.id}-title`}>{project.title}</h3>
          <p className="project-attribution">
            {project.attribution.label}
            {project.period ? ` · ${project.period}` : ''}
          </p>
        </div>
      </header>

      <p className="project-short">{project.shortDescription}</p>

      <p className="project-role">
        {t('projectRole')}
        <span>{project.role}</span>
      </p>

      <ul className="tag-list" aria-label={t('categoriesAria')}>
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>

      <p className="tech-line">{project.technologies.join('  ·  ')}</p>

      <p
        className={`evidence-line evidence-${project.evidence}`}
        title={t('evidenceTitle')}
      >
        {t('projectEvidence')}
        {project.evidence.toUpperCase()}
      </p>

      <div className="project-links">
        {project.links ? (
          <>
            {project.links.repo && (
              <a className="button" href={project.links.repo} target="_blank" rel="noreferrer">
                REPO →
              </a>
            )}
            {project.links.demo && (
              <a className="button" href={project.links.demo} target="_blank" rel="noreferrer">
                {t('projectDemo')}
              </a>
            )}
          </>
        ) : (
          <span className="link-status">{statusChip}</span>
        )}
      </div>

      {project.featured && (
        <details className="project-details">
          <summary>{t('projectHow')}</summary>
          <div className="case-study">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </details>
      )}
    </article>
  )
}