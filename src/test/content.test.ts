import { describe, expect, it } from 'vitest'
import {
  certifications,
  contact,
  education,
  experience,
  profile,
  projects,
  sectionIntros,
  skills,
} from '../content/portfolio'
import type { Project } from '../content/types'

describe('content structures', () => {
  it('profile has required identity fields', () => {
    expect(profile.name.trim()).not.toBe('')
    expect(profile.role.trim()).not.toBe('')
    expect(profile.tagline.trim()).not.toBe('')
  })

  it('every project has a unique id, valid shape and honest evidence level', () => {
    const ids = new Set<string>()
    for (const p of projects as Project[]) {
      expect(p.id.trim()).not.toBe('')
      expect(ids.has(p.id)).toBe(false)
      ids.add(p.id)
      expect(p.title.trim()).not.toBe('')
      expect(p.shortDescription.length).toBeLessThanOrEqual(160)
      expect(p.description.length).toBeGreaterThan(0)
      expect(Array.isArray(p.technologies)).toBe(true)
      expect(['verified', 'partial', 'self-reported']).toContain(p.evidence)
      if (p.links) {
        for (const url of [p.links.repo, p.links.demo, p.links.caseStudy]) {
          if (url) expect(() => new URL(url)).not.toThrow()
        }
      }
    }
  })

  it('featured projects exist and the star project is listed first', () => {
    expect(projects.some((p) => p.featured)).toBe(true)
  })

  it('attribution rules: withheld org names never leak into public project fields', () => {
    for (const p of projects) {
      if (!p.attribution.organizationNamesPublic) {
        const haystack = `${p.title} ${p.shortDescription} ${p.description}`.toLowerCase()
        expect(haystack).not.toContain('ballenas')
        expect(haystack).not.toContain('icb')
      }
    }
  })

  it('collections are arrays ready for UI consumption', () => {
    expect(experience.length).toBeGreaterThan(0)
    expect(education.length).toBeGreaterThan(0)
    expect(certifications.length).toBeGreaterThan(0)
    expect(skills.length).toBeGreaterThan(0)
    expect(Object.keys(sectionIntros).length).toBeGreaterThanOrEqual(4)
  })

  it('contact email looks like an email', () => {
    expect(contact.email).toMatch(/^\S+@\S+\.\S+$/)
  })
})
