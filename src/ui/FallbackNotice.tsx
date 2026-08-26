import { useContent } from '../state/useContent'
import { useI18n } from '../content/strings'

/** Full portfolio fallback when WebGL is unavailable — zero 3D dependency. */
export function FallbackNotice() {
  const { profile, projects, experience, education, certifications, skills, contact } = useContent()
  const { t } = useI18n()

  return (
    <div className="fallback" role="status">
      <div className="panel" style={{ maxWidth: 640, width: '100%', textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
        <p style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: 8 }}>{t('fallbackWebgl')}</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-primary)', marginBottom: 16 }}>
          {profile.name}
        </h2>
        <p style={{ fontSize: 13, letterSpacing: 2, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {profile.role} — {profile.tagline}
        </p>

        <p style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: 8 }}>{t('fallbackExperience')}</p>
        {experience.map((item) => (
          <div key={item.id} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>{item.role}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.org}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{item.summary}</p>
          </div>
        ))}

        <p style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginTop: 20, marginBottom: 8 }}>{t('fallbackEducation')}</p>
        {education.map((item) => (
          <p key={item.id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {item.title} — {item.org}{item.year ? ` · ${item.year}` : ''}
          </p>
        ))}

        {certifications.length > 0 && (
          <>
            <p style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginTop: 20, marginBottom: 8 }}>{t('fallbackCertifications')}</p>
            {certifications.map((item) => (
              <p key={item.id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {item.title} — {item.issuer}{item.year ? ` · ${item.year}` : ''}
              </p>
            ))}
          </>
        )}

        <p style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginTop: 20, marginBottom: 8 }}>{t('fallbackProjects')}</p>
        {projects.map((p) => (
          <div key={p.id} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>{p.title}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.shortDescription}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.technologies.join(' · ')}</p>
          </div>
        ))}

        <p style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginTop: 20, marginBottom: 8 }}>{t('fallbackSkills')}</p>
        {skills.map((g) => (
          <p key={g.id} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span style={{ color: 'var(--accent)' }}>{g.label}:</span> {g.items.join(' · ')}
          </p>
        ))}

        <p style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginTop: 20, marginBottom: 8 }}>{t('fallbackContact')}</p>
        {contact.published ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{contact.cta}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {contact.email && <a href={`mailto:${contact.email}`} className="button">EMAIL</a>}
              {contact.github && <a href={contact.github} className="button" target="_blank" rel="noreferrer">GITHUB</a>}
              {contact.linkedin && <a href={contact.linkedin} className="button" target="_blank" rel="noreferrer">LINKEDIN</a>}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('contactComingSoon')}</p>
        )}
      </div>
    </div>
  )
}