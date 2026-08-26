import { useEffect } from 'react'
import { useExperience } from './ExperienceContext'
import { BOOK_PAGE_COUNT } from './book'
import {
  resolveBookPage,
  resolveNarrative,
  workSectionProgress,
  type SectionSpan,
} from './narrative'

/**
 * The ONLY writer of narrative state and the scroll-derived book page.
 *
 * One passive scroll listener, rAF-throttled. It reads real section geometry
 * (hold zones depend on actual content, not uniform scroll percentages) and
 * writes DISCRETE state to the context. Nothing here touches the camera:
 * rigs observe the context and run their own finite transitions.
 */
export function useNarrativeTracking(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const { setNarrative, setBookScrollPage, setBookPageShift, narrative, bookScrollPage, bookPageShift } =
    useExperience()

  useEffect(() => {
    if (!enabled) return undefined
    let ticking = false

    const measure = (id: string): SectionSpan | undefined => {
      const el = document.getElementById(id)
      if (!el) return undefined
      // document-space span (rect is viewport-relative)
      const top = el.getBoundingClientRect().top + window.scrollY
      return { top, bottom: top + el.offsetHeight }
    }

    const evaluate = () => {
      ticking = false
      const frame = { mid: window.scrollY + window.innerHeight * 0.5, viewport: window.innerHeight }
      const spans = {
        experience: measure('experience'),
        work: measure('work'),
        skills: measure('skills'),
        about: measure('about'),
        contact: measure('contact'),
      }
      const next = resolveNarrative(spans, frame)
      setNarrative(next)
      if (next !== 'shelf' && bookPageShift !== 0) {
        setBookPageShift(0) // leaving the shelf resets UI page navigation
      }

      // Scroll progress through the work section derives the base page.
      // The effective page adds the UI navigation offset (derived in state/book.ts).
      const work = spans.work
      if (work) {
        const scrollPage = resolveBookPage(workSectionProgress(work, frame), BOOK_PAGE_COUNT)
        if (scrollPage !== bookScrollPage) setBookScrollPage(scrollPage)
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(evaluate)
      }
    }

    evaluate()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enabled, setNarrative, setBookScrollPage, setBookPageShift, narrative, bookScrollPage, bookPageShift])
}
