import { useEffect, useState } from 'react'
import { useI18n } from '../content/strings'

/** Sections observed for the active state; about folds into PROJECTS zone. */
const SECTION_TO_NAV: Record<string, string> = {
  experience: 'experience',
  work: 'work',
  about: 'work',
  skills: 'skills',
  contact: 'contact',
}

/**
 * Fixed anchor navigation. Works without JavaScript (plain anchors);
 * IntersectionObserver only enhances the active marker. Includes the
 * language toggle (EN ⇄ ES, English by default).
 */
export function Nav() {
  const [active, setActive] = useState<string>('work')
  const { language, setLanguage, t } = useI18n()

  const ITEMS = [
    { id: 'experience', label: t('navExperience') },
    { id: 'work', label: t('navWork') },
    { id: 'skills', label: t('navSkills') },
    { id: 'contact', label: t('navContact') },
  ]

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(SECTION_TO_NAV[entry.target.id] ?? 'work')
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    for (const id of Object.keys(SECTION_TO_NAV)) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <a className="brand" href="#top">
        EMILSON OVIEDO <span aria-hidden="true">·</span> AMBER STUDIO
      </a>
      <nav className="site-nav" aria-label={t('navAria')}>
        {ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? 'true' : undefined}
          >
            {item.label}
          </a>
        ))}
        <button
          type="button"
          className="lang-toggle"
          aria-label={language === 'en' ? 'Cambiar a español' : 'Switch to English'}
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
        >
          {language === 'en' ? 'ES' : 'EN'}
        </button>
      </nav>
    </>
  )
}