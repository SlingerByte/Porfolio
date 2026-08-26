import type {
  CertificationItem,
  ContactLinks,
  EducationItem,
  ExperienceItem,
  Profile,
  Project,
  SkillGroup,
} from './types'
import * as en from './portfolio'
import * as es from './portfolio.es'

/**
 * Language-aware content selection.
 *
 * portfolio.ts is the ENGLISH default; portfolio.es.ts is the Spanish
 * translation. Both share the same shape, so components pick one via
 * getContent(language) — never importing a language file directly.
 */

export type Language = 'en' | 'es'

export interface Content {
  profile: Profile
  projects: Project[]
  experience: ExperienceItem[]
  education: EducationItem[]
  certifications: CertificationItem[]
  skills: SkillGroup[]
  contact: ContactLinks
  aboutParagraphs: string[]
  sectionIntros: { work: string; skills: string; experience: string; contact: string }
  roomIntro: {
    label: string
    headline: string
    line: string
    note: string
    hint: string
    legend: Array<{ object: string; holds: string }>
  }
}

const contentByLanguage: Record<Language, Content> = {
  en: en as unknown as Content,
  es: es as unknown as Content,
}

export function getContent(lang: Language): Content {
  return contentByLanguage[lang]
}