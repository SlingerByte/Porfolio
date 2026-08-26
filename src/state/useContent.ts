import { getContent, type Content } from '../content/locale'
import { useExperience } from './ExperienceContext'

/**
 * The content object for the current UI language. Components read their
 * data from here instead of importing portfolio.ts directly, so switching
 * language re-renders everything with the right copy.
 */
export function useContent(): Content {
  const { language } = useExperience()
  return getContent(language)
}