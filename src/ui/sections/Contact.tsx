import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'
import { useExperience } from '../../state/ExperienceContext'

/**
 * CONTACT (M5.10) — the door speaks.
 *
 * With the scene live this renders as the door's speech bubble: a square
 * comic-style bubble, styled like the room guide, that appears the moment
 * the journey reaches the door (narrative === 'contact') and steps aside
 * when it moves on. Without WebGL it stays a normal always-readable panel.
 * Placeholder channels are NEVER rendered (contact.published gates them).
 */
export function Contact() {
  const { sceneActive, narrative } = useExperience()
  const { contact, sectionIntros } = useContent()
  const { t } = useI18n()
  // hidden away from the door; the bubble speaks when you reach it
  const receded = sceneActive && narrative !== 'contact'

  return (
    <section
      id="contact"
      className="section section--door section--contact"
      aria-labelledby="contact-title"
    >
      <div className="section-inner">
        <div
          className="contact-bubble"
          data-scene-intro={sceneActive ? 'true' : 'false'}
          data-receded={receded ? 'true' : 'false'}
        >
          <span className="contact-bubble-tail" aria-hidden="true" />
          <p className="section-label">{`// ${t('contactLabel')}`}</p>
          <h2 id="contact-title" className="contact-title">
            {t('contactTitle')}
          </h2>
          <p className="contact-quip">{sectionIntros.contact}</p>
          <p className="contact-cta">{contact.cta}</p>
          <span className="contact-rule" aria-hidden="true" />

          {contact.published ? (
            <ul className="contact-links">
              {contact.email && (
                <li>
                  <a className="button" href={`mailto:${contact.email}`}>
                    EMAIL →
                  </a>
                </li>
              )}
              {contact.github && (
                <li>
                  <a className="button" href={contact.github} target="_blank" rel="noreferrer">
                    GITHUB →
                  </a>
                </li>
              )}
              {contact.linkedin && (
                <li>
                  <a className="button" href={contact.linkedin} target="_blank" rel="noreferrer">
                    LINKEDIN →
                  </a>
                </li>
              )}
              {contact.cvUrl && (
                <li>
                  <a className="button" href={contact.cvUrl} target="_blank" rel="noreferrer">
                    DOWNLOAD CV →
                  </a>
                </li>
              )}
            </ul>
          ) : (
            /* TODO(contact-real): flip `contact.published` once real channels exist */
            <p className="contact-pending">{t('contactPending')}</p>
          )}
        </div>
      </div>
    </section>
  )
}