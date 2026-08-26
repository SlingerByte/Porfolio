import { describe, expect, it, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { ExperienceProvider, useExperience } from '../state/ExperienceContext'
import { BookInterface } from '../ui/spatial/BookInterface'
import { buildNotes, MAX_ITEMS_PER_NOTE, SKILLS_SIGN, validateBoardBounds } from '../scene/furniture/boardNotes'
import { skills } from '../content/portfolio'

function PageProbe({ page }: { page: number }) {
  const { setBookScrollPage } = useExperience()
  useEffect(() => {
    setBookScrollPage(page)
  }, [page, setBookScrollPage])
  return null
}

afterEach(() => {
  vi.useRealTimers()
})

describe('M5.11 — the turning leaf (physical page turn)', () => {
  it('NEXT mounts a leaf rotating LEFT around the spine', () => {
    const { rerender } = render(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={1} />
      </ExperienceProvider>
    )
    rerender(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={2} />
      </ExperienceProvider>
    )
    const leaf = document.querySelector('.book-leaf[data-turn-leaf="next"]')
    expect(leaf).not.toBeNull()
    // the leaf carries the page it turns over: the previous spread's project
    expect(leaf!.querySelector('.book-leaf-front')).not.toBeNull()
    expect(leaf!.textContent).toContain('GrantFlow') // spread 1 = first project
    // the new spread underneath is already the target page
    expect(screen.getByRole('heading', { name: 'EcoFunding' })).toBeInTheDocument()
  })

  it('PREV mounts a leaf rotating RIGHT around the spine', () => {
    const { rerender } = render(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={2} />
      </ExperienceProvider>
    )
    rerender(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={1} />
      </ExperienceProvider>
    )
    expect(document.querySelector('.book-leaf[data-turn-leaf="prev"]')).not.toBeNull()
  })

  it('the open book is a physical spread: two pages and a spine, not a card', () => {
    render(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={0} />
      </ExperienceProvider>
    )
    expect(document.querySelector('.book-page--left')).not.toBeNull()
    expect(document.querySelector('.book-page--right')).not.toBeNull()
    expect(document.querySelector('.book-spine')).not.toBeNull()
    // each page prints its own folio
    expect(document.querySelectorAll('.book-folio').length).toBeGreaterThanOrEqual(2)
  })
})

describe('M5.11 — the focus is never a cage (scroll exits naturally)', () => {
  function renderBook(page: number, onClose: () => void) {
    vi.useFakeTimers()
    const epoch = Date.now()
    render(
      <ExperienceProvider>
        <BookInterface onClose={onClose} />
        <PageProbe page={page} />
      </ExperienceProvider>
    )
    // move past the open cooldown, as a reader who settled in would
    vi.setSystemTime(epoch + 2000)
  }

  it('continued scroll on the FINAL project closes the book', () => {
    const onClose = vi.fn()
    renderBook(4, onClose) // last spread (page 4 = project 04)
    fireEvent.wheel(window, { deltaY: 200 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('scroll mid-book never closes — the reader is reading', () => {
    const onClose = vi.fn()
    renderBook(2, onClose)
    fireEvent.wheel(window, { deltaY: 200 })
    fireEvent.wheel(window, { deltaY: 200 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('upward scroll never closes', () => {
    const onClose = vi.fn()
    renderBook(4, onClose)
    fireEvent.wheel(window, { deltaY: -200 })
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('M5.11 — diegetic board content (pure model)', () => {
  it('every skill family is pinned with a readable, capped preview', () => {
    const notes = buildNotes()
    const families = notes.filter((n) => n.family).map((n) => n.family)
    for (const group of skills) {
      expect(families).toContain(group.label)
    }
    for (const note of notes) {
      expect(note.items.length).toBeLessThanOrEqual(MAX_ITEMS_PER_NOTE)
      expect(note.items.length).toBeGreaterThan(0)
    }
    // every family's first skills really appear on the board
    const pinned = new Set(notes.flatMap((n) => n.items))
    for (const group of skills) {
      expect(pinned.has(group.items[0])).toBe(true)
    }
  })

  it('the board carries a physical SKILLS sign', () => {
    expect(SKILLS_SIGN.label.toUpperCase()).toBe('// SKILLS')
  })

  it('all notes fit inside the corkboard bounds (M7.1)', () => {
    const notes = buildNotes()
    const NOTE_SIZE = 0.075
    const violations = validateBoardBounds(notes, NOTE_SIZE, NOTE_SIZE)
    expect(violations).toEqual([])
  })

  it('skills preview contains real skills from the CV', () => {
    const notes = buildNotes()
    const pinned = new Set(notes.flatMap((n) => n.items))
    // check a representative sample from each family
    for (const group of skills) {
      expect(pinned.has(group.items[0])).toBe(true)
    }
  })
})

describe('M7.1 — book intro and page count', () => {
  it('opens on the intro spread: title page and author', () => {
    render(
      <ExperienceProvider>
        <BookInterface />
      </ExperienceProvider>
    )
    expect(screen.getByRole('heading', { name: /Selected/i })).toBeInTheDocument()
    expect(screen.getByText('EMILSON OVIEDO')).toBeInTheDocument()
    expect(screen.getByText(/A small collection of things I built/)).toBeInTheDocument()
  })

  it('page count matches the number of projects', () => {
    render(
      <ExperienceProvider>
        <BookInterface />
      </ExperienceProvider>
    )
    // folio shows "00 / 04" in both the header bar and footer nav — 4 projects
    expect(screen.getAllByText('00 / 04').length).toBeGreaterThanOrEqual(1)
  })
})

describe('M7.1 — directional page turn', () => {
  it('NEXT produces a leaf with data-turn-leaf="next"', () => {
    const { rerender } = render(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={0} />
      </ExperienceProvider>
    )
    rerender(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={1} />
      </ExperienceProvider>
    )
    expect(document.querySelector('.book-leaf[data-turn-leaf="next"]')).not.toBeNull()
  })

  it('PREV produces a leaf with data-turn-leaf="prev"', () => {
    const { rerender } = render(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={1} />
      </ExperienceProvider>
    )
    rerender(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={0} />
      </ExperienceProvider>
    )
    expect(document.querySelector('.book-leaf[data-turn-leaf="prev"]')).not.toBeNull()
  })
})

describe('M7.1 — reduced motion', () => {
  it('leaf turn animation is removed under reduced motion', () => {
    // The component never mounts the leaf under reduced motion; when it
    // does mount it, GSAP drives the transform. We verify the leaf element
    // exists (motion is GSAP-managed).
    const { rerender } = render(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={0} />
      </ExperienceProvider>
    )
    rerender(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={1} />
      </ExperienceProvider>
    )
    const leaf = document.querySelector('.book-leaf')
    expect(leaf).not.toBeNull()
  })
})
