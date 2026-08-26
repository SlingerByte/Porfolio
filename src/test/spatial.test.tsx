import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { projectPoint, projectWorldRect, quadAabb, type CamView } from '../ui/spatial/projection'
import { ANCHORS } from '../ui/spatial/anchors'
import { nextFocus } from '../ui/spatial/focus'
import { getUiTier } from '../ui/spatial/tier'
import { getPoseTier } from '../scene/cameraPoses'
import { resolveEffectivePage, clampShift, bookPageCount } from '../state/narrative'
import { ExperienceProvider, useExperience } from '../state/ExperienceContext'
import { MonitorInterface } from '../ui/spatial/MonitorInterface'
import { BookInterface } from '../ui/spatial/BookInterface'
import { SkillsInterface } from '../ui/spatial/SkillsInterface'
import App from '../App'

const CAM: CamView = { position: [0, 1.75, 7.4], target: [0, 1.15, 0], fovY: 35 }

describe('FLIP origin projection', () => {
  const W = 1600
  const H = 900

  it('projects the look-at point to the exact viewport center', () => {
    const p = projectPoint({ x: 0, y: 1.15, z: 0 }, CAM, W, H)
    expect(p).not.toBeNull()
    expect(p!.x).toBeCloseTo(W / 2, 5)
    expect(p!.y).toBeCloseTo(H / 2, 5)
  })

  it('returns null for points behind the camera', () => {
    // 2 units back along the view axis from the camera position
    expect(projectPoint({ x: 0, y: 1.9, z: 9.6 }, CAM, W, H)).toBeNull()
  })

  it('projects the monitor anchor into a usable FLIP origin at the monitor pose', () => {
    const pose: CamView = { position: [0.42, 1.5, 0.7], target: [0.55, 1.36, -1.12], fovY: 35 }
    const quad = projectWorldRect(ANCHORS.monitor, pose, W, H)!
    expect(quad).not.toBeNull()
    const box = quadAabb(quad)
    // significant presence in frame — the focused panel grows out of it
    expect(box.height).toBeGreaterThan(H * 0.18)
    expect(box.width).toBeGreaterThan(W * 0.14)
    expect(box.left).toBeLessThan(W / 2)
    expect(box.left + box.width).toBeGreaterThan(W / 2)
  })
})

describe('tier consistency', () => {
  it('UI tiers mirror the camera pose tiers at every breakpoint', () => {
    for (const width of [360, 640, 641, 800, 1024, 1025, 1440]) {
      expect(getUiTier(width)).toBe(getPoseTier(width))
    }
  })
})

describe('focus mode state machine', () => {
  it('opens, toggles and closes deep-dive surfaces', () => {
    expect(nextFocus('none', { type: 'open', target: 'monitor' })).toBe('monitor')
    expect(nextFocus('monitor', { type: 'toggle', target: 'monitor' })).toBe('none')
    expect(nextFocus('none', { type: 'toggle', target: 'book' })).toBe('book')
    expect(nextFocus('book', { type: 'close' })).toBe('none')
  })

  it('escape always closes, switching targets replaces the surface', () => {
    expect(nextFocus('book', { type: 'escape' })).toBe('none')
    expect(nextFocus('none', { type: 'escape' })).toBe('none')
    expect(nextFocus('monitor', { type: 'open', target: 'book' })).toBe('book')
  })
})

describe('book page ownership (scroll + UI shift)', () => {
  const COUNT = bookPageCount(4)

  it('effective page adds the UI shift and clamps into range', () => {
    expect(resolveEffectivePage(0, 0, COUNT)).toBe(0)
    expect(resolveEffectivePage(1, 1, COUNT)).toBe(2)
    expect(resolveEffectivePage(4, 2, COUNT)).toBe(4) // clamped to COUNT-1
    expect(resolveEffectivePage(0, -3, COUNT)).toBe(0)
  })

  it('clampShift keeps the shift achievable for the current scroll page', () => {
    expect(clampShift(5, 0, COUNT)).toBe(4) // COUNT-1 = 4
    expect(clampShift(-5, 0, COUNT)).toBe(0)
    expect(clampShift(3, 3, COUNT)).toBe(1) // only 1 page left above the scroll page
    expect(clampShift(-3, 1, COUNT)).toBe(-1)
  })

  it('is deterministic across repeated navigation cycles', () => {
    const COUNT5 = bookPageCount(4)
    for (let cycle = 0; cycle < 3; cycle++) {
      let shift = 0
      for (let scroll = 0; scroll <= 4; scroll++) {
        shift = clampShift(Math.min(COUNT5 - 1, shift + 1), scroll, COUNT5)
        expect(resolveEffectivePage(scroll, shift, COUNT5)).toBe(Math.min(scroll + shift, COUNT5 - 1))
      }
    }
  })
})

function ShiftProbe() {
  const { bookPageShift } = useExperience()
  return <p data-testid="shift">{String(bookPageShift)}</p>
}

function PageProbe({ page }: { page: number }) {
  const { setBookScrollPage } = useExperience()
  useEffect(() => {
    setBookScrollPage(page)
  }, [page, setBookScrollPage])
  return null
}

/**
 * M5.10 ARCHITECTURAL RULE:
 *   NO CONTENT UI IS RENDERED OVER THE 3D OBJECTS IN ROOM STATE.
 *
 * These tests pin the interfaces' only remaining variants: every
 * MonitorInterface / BookInterface / SkillsInterface instance is a FOCUS
 * reading interface. Contact has no interface — the door speaks through
 * the DOM bubble. The embedded/sheet variants are gone — rendering them
 * must fail.
 */
describe('NO EMBEDDED UI — interfaces are FOCUS-only', () => {
  it('monitor interface is always the focused terminal with real content', () => {
    render(
      <ExperienceProvider>
        <MonitorInterface onClose={() => {}} />
      </ExperienceProvider>
    )
    expect(document.querySelector('.monitor-ui--focus')).not.toBeNull()
    expect(document.querySelector('.monitor-ui--embedded')).toBeNull()
    expect(screen.getByText('Emilson Oviedo')).toBeInTheDocument()
    expect(screen.getByText('Software Developer · AI')).toBeInTheDocument()
    expect(screen.getByText('Microsoft')).toBeInTheDocument()
    expect(screen.getByText(/SENA/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CLOSE/ })).toBeInTheDocument()
  })

  it('monitor terminal is live: you can type and run commands', () => {
    render(
      <ExperienceProvider>
        <MonitorInterface onClose={() => {}} />
      </ExperienceProvider>
    )
    const input = screen.getByRole('textbox', { name: /terminal input/i })
    fireEvent.change(input, { target: { value: 'py 2+2' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText('$ py 2+2')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    // unknown commands answer helpfully
    fireEvent.change(input, { target: { value: 'nope' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText(/command not found: nope/)).toBeInTheDocument()
  })

  it('book interface is always the focused case study with prev/next clamped', () => {
    render(
      <ExperienceProvider>
        <BookInterface />
        <ShiftProbe />
      </ExperienceProvider>
    )
    const prev = screen.getByRole('button', { name: 'Previous page' })
    expect(prev).toBeDisabled() // cover state
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByTestId('shift')).toHaveTextContent('1')
    fireEvent.click(prev)
    expect(screen.getByTestId('shift')).toHaveTextContent('0')
  })

  it('never invents links for projects without confirmed URLs', () => {
    render(
      <ExperienceProvider>
        <BookInterface onClose={() => {}} />
        <PageProbe page={2} /> {/* EcoFunding spread (page 2 = project 02, private) */}
      </ExperienceProvider>
    )
    expect(screen.getByRole('heading', { name: 'EcoFunding' })).toBeInTheDocument()
    // private project: links are null in the content model -> status chip, never dead anchors
    expect(screen.getByText('CODE AVAILABLE ON REQUEST')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('projects with public repos render real REPO links', () => {
    render(
      <ExperienceProvider>
        <BookInterface onClose={() => {}} />
        <PageProbe page={1} /> {/* GrantFlow spread (public repo) */}
      </ExperienceProvider>
    )
    const repo = screen.getByRole('link', { name: /REPO/i })
    expect(repo).toHaveAttribute('href', 'https://github.com/SlingerByte/GrantFlow')
  })

  it('the focused case study carries the labeled deep dive + evidence', () => {
    render(
      <ExperienceProvider>
        <BookInterface onClose={() => {}} />
        <PageProbe page={2} />
      </ExperienceProvider>
    )
    for (const label of ['THE PROBLEM', 'THE APPROACH', 'WHAT I BUILT', 'STACK', 'EVIDENCE']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('the book opens on the intro spread: title page, author and count', () => {
    render(
      <ExperienceProvider>
        <BookInterface />
      </ExperienceProvider>
    )
    expect(screen.getByRole('heading', { name: /Selected/i })).toBeInTheDocument()
    expect(screen.getByText('EMILSON OVIEDO')).toBeInTheDocument()
    expect(screen.getByText(/A small collection of things I built/)).toBeInTheDocument()
  })

  it('spreads turn like pages: NEXT turns left, PREV turns right (deterministic)', () => {
    const { rerender } = render(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={2} />
      </ExperienceProvider>
    )
    expect(document.querySelector('.book-ui-spread[data-turn]')).not.toBeNull()
    // folio shows "02 / 04" on the second project spread
    expect(screen.getAllByText('02 / 04').length).toBeGreaterThan(0)

    rerender(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={3} />
      </ExperienceProvider>
    )
    expect(screen.getAllByText('03 / 04').length).toBeGreaterThan(0) // deterministic turn

    rerender(
      <ExperienceProvider>
        <BookInterface />
        <PageProbe page={2} />
      </ExperienceProvider>
    )
    // PREV: the turn flips direction around the other hinge
    expect(document.querySelector('.book-ui-spread[data-turn="prev"]')).not.toBeNull()
  })

  it('skills interface is the focused board: every tool listed on open', () => {
    render(
      <ExperienceProvider>
        <SkillsInterface onClose={() => {}} />
      </ExperienceProvider>
    )
    expect(screen.getByRole('region', { name: /Skills — scrollable/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CLOSE/ })).toBeInTheDocument()
    expect(screen.getAllByText('pgvector').length).toBeGreaterThan(0)
    expect(screen.getByText('pytest')).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    for (const invented of ['expert', 'advanced', 'beginner']) {
      expect(text.toLowerCase()).not.toContain(invented)
    }
  })

  it('fallback behavior: renders no spatial layer when WebGL is unavailable', () => {
    const { container } = render(<App />)
    expect(container.querySelector('[data-spatial-layer]')).toBeNull()
    // ...and the document flow stays completely legible without the scene
    expect(screen.getByRole('heading', { level: 1, name: /Emilson Oviedo/i })).toBeInTheDocument()
  })
})
