/**
 * Content model. Presentation-independent: UI and future sections read
 * from src/content, never the other way around.
 *
 * M4.2: extended for real portfolio content. Evidence levels distinguish
 * what can be publicly claimed. Attribution separates publishable labels
 * from organization names that still need clearance.
 */

/** How strongly the public copy can claim technical facts. */
export type EvidenceLevel =
  /** checked against the actual repository (code, tests, docs) */
  | 'verified'
  /** mostly verifiable, some gaps (e.g. no VCS history or no tests) */
  | 'partial'
  /** relies on the author's account; not independently checkable */
  | 'self-reported'

export interface ProjectLinks {
  repo?: string
  demo?: string
  caseStudy?: string
}

export interface ProjectAttribution {
  /** short public label shown on the card, e.g. "Professional project" */
  label: string
  /**
   * false until the org/client explicitly clears naming. When false,
   * UI must render `label` only — internal notes stay out of src/content.
   */
  organizationNamesPublic: boolean
}

export interface Project {
  id: string
  title: string
  /** one-liner for cards (≤160 chars) */
  shortDescription: string
  /** extended narrative: problem -> solution -> what I built -> what it proves */
  description: string
  /** narrative categories, e.g. "AI Engineering" */
  tags: string[]
  /** concrete stack shipped in the project */
  technologies: string[]
  role: string
  /** e.g. "2024" — null when dates are UNKNOWN */
  period: string | null
  featured: boolean
  evidence: EvidenceLevel
  /** null while no public URL is confirmed (never invent links) */
  links: ProjectLinks | null
  image: string | null
  attribution: ProjectAttribution
}

export interface Profile {
  name: string
  role: string
  tagline: string
}

export interface ExperienceItem {
  id: string
  role: string
  /** public display string — respect attribution rules */
  org: string
  period: string | null
  summary: string
}

export interface EducationItem {
  id: string
  title: string
  org: string
  year: string | null
}

export interface SkillGroup {
  id: string
  label: string
  items: string[]
}

export interface CertificationItem {
  id: string
  title: string
  issuer: string
  year: string | null
}

export interface ContactLinks {
  /**
   * Gates the whole Contact section UI. False until REAL channels replace
   * the placeholder values below — components must never render them.
   */
  published: boolean
  /** one-line invitation that nudges the reader to reach out */
  cta: string
  email: string
  github: string
  linkedin: string
  cvUrl: string | null
}
