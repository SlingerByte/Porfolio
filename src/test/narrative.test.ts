import { describe, expect, it } from 'vitest'
import {
  bookPageCount,
  resolveBookPage,
  resolveNarrative,
  workSectionProgress,
  type NarrativeState,
  type ScrollFrame,
  type SectionSpan,
} from '../state/narrative'

const VH = 800

function frame(scrollY: number): ScrollFrame {
  return { mid: scrollY + VH * 0.5, viewport: VH }
}

/** Synthetic document layout mirroring the real section flow (heights in viewports). */
function layout(): Record<string, SectionSpan> {
  return {
    top: { top: 0, bottom: VH },
    experience: { top: VH, bottom: VH * 3 },
    work: { top: VH * 3.4, bottom: VH * 9 },
    skills: { top: VH * 9.4, bottom: VH * 10.6 },
    about: { top: VH * 11, bottom: VH * 12.2 },
    contact: { top: VH * 12.6, bottom: VH * 13.6 },
  }
}

/** Story order, used to prove transitions never jump backwards or skip. */
const RANK: Record<NarrativeState, number> = {
  hero: 0,
  monitor: 1,
  room: 2,
  shelf: 3,
  skills: 4,
  contact: 5,
}

describe('narrative state machine', () => {
  it('starts at hero before any beat is reached', () => {
    expect(resolveNarrative(layout(), frame(0))).toBe('hero')
    expect(resolveNarrative(layout(), frame(VH * 0.3))).toBe('hero')
  })

  it('engages the monitor beat exactly at the entry line', () => {
    const spans = layout()
    const engage = spans.experience.top - VH * 0.62 // top crosses mid + 0.12vh
    expect(resolveNarrative(spans, frame(engage - 10))).toBe('hero')
    expect(resolveNarrative(spans, frame(engage + 10))).toBe('monitor')
  })

  it('restores the room after leaving experience, before the shelf', () => {
    const spans = layout()
    // experience content fully above the viewport, shelf not yet engaged
    expect(resolveNarrative(spans, frame(VH * 2.72))).toBe('room')
  })

  it('moves room -> shelf -> skills -> contact in order', () => {
    const spans = layout()
    expect(resolveNarrative(spans, frame(spans.work.top))).toBe('shelf')
    expect(resolveNarrative(spans, frame(spans.skills.top))).toBe('skills')
    expect(resolveNarrative(spans, frame(spans.contact.top))).toBe('contact')
  })

  it('keeps the corkboard composition through about', () => {
    const spans = layout()
    expect(resolveNarrative(spans, frame(VH * 11.1))).toBe('skills')
  })

  it('walks the beats in order, with room restores between moments', () => {
    const spans = layout()
    const steps: number[] = []
    for (let s = 0; s <= VH * 14; s += VH * 0.05) steps.push(s)
    const descending = [...steps].reverse()

    const sequenceOf = (scrolls: number[]) =>
      scrolls.map((s) => resolveNarrative(spans, frame(s)))

    // focus beats never skip more than one step; a 'room' restore may sit
    // between them (book closes -> room -> next moment), allowing one extra
    const checkFocusSequence = (states: NarrativeState[]) => {
      let lastRank: number | null = null
      let sawRoom = false
      for (const state of states) {
        if (state === 'room') {
          sawRoom = true
          continue
        }
        const rank = RANK[state]
        if (lastRank !== null) {
          const maxStep = sawRoom ? 2 : 1
          expect(Math.abs(rank - lastRank)).toBeLessThanOrEqual(maxStep)
        }
        lastRank = rank
        sawRoom = false
      }
    }
    checkFocusSequence(sequenceOf(steps))
    checkFocusSequence(sequenceOf(descending))
  })

  it('is deterministic across repeated full story cycles', () => {
    const spans = layout()
    const cycle = [0, VH, VH * 2.72, VH * 5, VH * 9.6, VH * 11.5, VH * 13, 0]
    const expected: NarrativeState[] = [
      'hero',
      'monitor',
      'room',
      'shelf',
      'skills',
      'skills',
      'contact',
      'hero',
    ]
    for (let round = 0; round < 3; round++) {
      const states = cycle.map((s) => resolveNarrative(spans, frame(s)))
      expect(states).toEqual(expected)
    }
  })

  it('treats missing sections as absent instead of throwing', () => {
    expect(resolveNarrative({}, frame(1000))).toBe('hero')
  })
})

describe('book pagination', () => {
  const COUNT = bookPageCount(4) // intro + 4 projects

  it('counts one page per project plus the intro spread', () => {
    expect(COUNT).toBe(5)
    expect(bookPageCount(0)).toBe(1) // intro only
  })

  it('page 0 is the intro spread while entering the section', () => {
    expect(resolveBookPage(0, COUNT)).toBe(0)
    expect(resolveBookPage(0.1, COUNT)).toBe(0)
  })

  it('advances monotonically and clamps to the last project', () => {
    let prev = -1
    for (let p = 0; p <= 1.001; p += 0.01) {
      const page = resolveBookPage(p, COUNT)
      expect(page).toBeGreaterThanOrEqual(prev)
      expect(page).toBeLessThanOrEqual(COUNT - 1)
      prev = page
    }
    expect(resolveBookPage(1, COUNT)).toBe(COUNT - 1)
    expect(resolveBookPage(42, COUNT)).toBe(COUNT - 1)
    expect(resolveBookPage(-3, COUNT)).toBe(0)
  })

  it('maps real scroll progress through the work span to pages', () => {
    const spans = layout()
    const span = spans.work
    const height = span.bottom - span.top
    const first = workSectionProgress(span, frame(span.top))
    const last = workSectionProgress(span, frame(span.bottom))
    expect(resolveBookPage(first, COUNT)).toBe(0) // still the intro on arrival
    expect(last).toBeGreaterThan(0.95)
    const midPage = resolveBookPage(
      workSectionProgress(span, frame(span.top + height * 0.5)),
      COUNT
    )
    expect(midPage).toBeGreaterThan(0)
    expect(midPage).toBeLessThan(COUNT - 1)
  })
})

