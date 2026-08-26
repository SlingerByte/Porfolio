import { useExperience } from './ExperienceContext'
import { resolveEffectivePage, bookPageCount } from './narrative'
import { projects } from '../content/portfolio'

/**
 * Book page domain: page 0 = intro spread, 1..n = one spread per project.
 *
 * Ownership: `bookScrollPage` is written ONLY by the narrative tracking
 * (scroll), `bookPageShift` ONLY by the book UI (PREV/NEXT). The effective
 * page is DERIVED at read time — never stored — so no writer can go stale.
 */
export const BOOK_PAGE_COUNT = bookPageCount(projects.length)

export function useBookPage(): number {
  const { bookScrollPage, bookPageShift } = useExperience()
  return resolveEffectivePage(bookScrollPage, bookPageShift, BOOK_PAGE_COUNT)
}
