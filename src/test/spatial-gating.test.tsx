import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import type { NarrativeState } from '../state/narrative'

/**
 * M5.10 — THE ARCHITECTURAL RULE:
 *
 *   NO CONTENT UI IS RENDERED OVER THE 3D OBJECTS IN ROOM STATE.
 *
 * WebGL is mocked AVAILABLE and the heavy scene module is stubbed, so these
 * exercise the real App composition with the scene live:
 *   ROOM (any narrative beat)  -> ZERO interface content over objects;
 *                                 ONE docked affordance button only
 *   open monitor               -> MonitorInterface focused content exists
 *   open book                  -> BookInterface focused content exists
 *   open corkboard             -> SkillsInterface focused content exists
 *   close / Escape cycles      -> deterministic, zero residual DOM
 */

vi.mock('../scene/webgl', () => ({ webglAvailable: () => true }))
vi.mock('../scene/SceneCanvas', () => ({ default: () => null }))

import App from '../App'
import { ExperienceProvider, useExperience } from '../state/ExperienceContext'
import { SpatialLayer } from '../ui/spatial/SpatialLayer'
import { FOCUSABLE_SELECTOR } from '../ui/spatial/useFocusTrap'

/** Every class that ever marked an embedded surface — none may exist. */
const EMBEDDED_SELECTORS = [
  '.monitor-ui--embedded',
  '.book-ui--embedded',
  '.skills-ui--embedded',
  '.door-ui--embedded',
  '.monitor-ui--sheet',
  '.book-ui--sheet',
  '.skills-ui--sheet',
  '.door-ui--sheet',
  // the old projection architecture
  '.spatial-anchor',
  '.spatial-surface',
]

describe('App with the scene live (initial state)', () => {
  it('mounts the spatial layer but ZERO interface content before any interaction', () => {
    const { container } = render(<App />)

    // spatial presentation is active...
    expect(container.querySelector('[data-spatial-layer]')).not.toBeNull()
    const main = document.getElementById('content')!
    expect(main).toHaveAttribute('data-scene', 'on')

    // ...yet no interface content exists anywhere: no interfaces of any
    // variant, no focused panel, no embedded surfaces, no scrim
    for (const selector of EMBEDDED_SELECTORS) {
      expect(container.querySelector(selector)).toBeNull()
    }
    expect(container.querySelector('.monitor-ui')).toBeNull()
    expect(container.querySelector('.book-ui')).toBeNull()
    expect(container.querySelector('.skills-ui')).toBeNull()
    expect(container.querySelector('.door-ui')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('.spatial-scrim')).toBeNull()
  })

  it('keeps semantic document content in the DOM for fallback/SEO while hidden by presentation', () => {
    const { container } = render(<App />)
    // document flow stays mounted (layout drives narrative scroll) ...
    for (const id of ['room', 'experience', 'work', 'skills', 'about', 'contact']) {
      expect(document.getElementById(id)).not.toBeNull()
    }
// ABOUT THIS ROOM: orientation beat right after the hero
    expect(screen.getByText(/ABOUT THIS ROOM/)).toBeInTheDocument()
    expect(screen.getByText('Each object tells a different part of my story.')).toBeInTheDocument()
    // every object is explained - including the door as the contact anchor
    for (const object of ['The monitor', 'The book', 'The corkboard', 'The door']) {
      expect(screen.getByText(new RegExp(object))).toBeInTheDocument()
    }
    expect(container.querySelectorAll('.timeline li').length).toBeGreaterThan(0)
    expect(document.getElementById('content')).toHaveAttribute('data-scene', 'on')
  })
})

/** Writes narrative/camera state as CameraRig + scroll tracking would. */
function SceneProbe({ narrative, settled }: { narrative: NarrativeState; settled: boolean }) {
  const { setNarrative, setCameraSettled } = useExperience()
  useEffect(() => {
    setNarrative(narrative)
    setCameraSettled(settled)
  }, [narrative, settled, setNarrative, setCameraSettled])
  return null
}

/** Reads the lamp state so tests can observe keyboard toggling. */
function LampProbe() {
  const { lampOn } = useExperience()
  return <span data-testid="lamp">{lampOn ? 'on' : 'off'}</span>
}

function renderSpatial(narrative: NarrativeState) {
  return render(
    <ExperienceProvider>
      <SceneProbe narrative={narrative} settled />
      <SpatialLayer />
    </ExperienceProvider>
  )
}

function expectCleanRoom(container: HTMLElement) {
  // NO CONTENT UI OVER OBJECTS — on any tier, in any ROOM beat
  for (const selector of EMBEDDED_SELECTORS) {
    expect(container.querySelector(selector)).toBeNull()
  }
  expect(container.querySelector('.monitor-ui')).toBeNull()
  expect(container.querySelector('.book-ui')).toBeNull()
  expect(container.querySelector('.skills-ui')).toBeNull()
  expect(container.querySelector('.door-ui')).toBeNull()
}

describe('ROOM is clean: affordance only, never content', () => {
  it('every ROOM beat renders exactly one docked affordance and zero surfaces', () => {
    const BEATS: Array<[NarrativeState, RegExp]> = [
      ['monitor', /OPEN DISPLAY/],
      ['shelf', /OPEN CASE STUDY/],
      ['skills', /VIEW ALL SKILLS/],
    ]
    for (const [beat, label] of BEATS) {
      const { container, unmount } = renderSpatial(beat)
      expectCleanRoom(container)
      // exactly one affordance action, docked — not a panel over an object
      const actions = screen.getAllByRole('button')
      expect(actions).toHaveLength(1)
      expect(actions[0]).toHaveTextContent(label)
      expect(container.querySelectorAll('.spatial-focused')).toHaveLength(0)
      unmount()
    }
  })

  it('renders nothing at all when the camera has not settled or the beat has no affordance', () => {
    const { rerender } = render(
      <ExperienceProvider>
        <SceneProbe narrative="monitor" settled={false} />
        <SpatialLayer />
      </ExperienceProvider>
    )
    expect(screen.queryByRole('button', { name: /OPEN DISPLAY/ })).toBeNull()

    rerender(
      <ExperienceProvider>
        <SceneProbe narrative="hero" settled />
        <SpatialLayer />
      </ExperienceProvider>
    )
    expect(screen.queryByRole('button', { name: /OPEN DISPLAY/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /OPEN CASE STUDY/ })).toBeNull()
  })
})

describe('FOCUS opens from the affordance and closes back to a clean ROOM', () => {
  it('monitor: OPEN DISPLAY -> focused reader -> CLOSE -> clean room', () => {
    const { container } = renderSpatial('monitor')

    fireEvent.click(screen.getByRole('button', { name: /OPEN DISPLAY/ }))
    expect(screen.getByRole('dialog', { name: /Monitor display expanded/ })).toBeInTheDocument()
    expect(container.querySelector('.monitor-ui--focus')).not.toBeNull()
    expect(screen.getByText(/CLOSE/)).toBeInTheDocument()

    // M5.11: the panel position is navbar-aware — JS proposes via the
    // --panel-top custom property; CSS clamps it below the fixed nav
    const panel = container.querySelector<HTMLElement>('.spatial-focused-panel')!
    expect(panel).not.toBeNull()
    expect(panel.style.getPropertyValue('--panel-top')).not.toBe('')
    expect(panel.style.getPropertyValue('--panel-h')).not.toBe('')

    fireEvent.click(screen.getByRole('button', { name: /CLOSE/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('.spatial-scrim')).toBeNull()
    expect(container.querySelector('.monitor-ui--focus')).toBeNull()
    expectCleanRoom(container)
  })

  it('book: OPEN CASE STUDY -> focused spread -> Escape closes with zero residue', () => {
    const { container } = renderSpatial('shelf')

    fireEvent.click(screen.getByRole('button', { name: /OPEN CASE STUDY/ }))
    expect(screen.getByRole('dialog', { name: /Selected projects expanded/ })).toBeInTheDocument()
    expect(container.querySelector('.book-ui--focus')).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('.spatial-scrim')).toBeNull()
    expect(container.querySelector('.book-ui--focus')).toBeNull()
    expectCleanRoom(container)
  })

  it('corkboard: VIEW ALL SKILLS expands to every tool; close is reversible', () => {
    const { container } = renderSpatial('skills')

    fireEvent.click(screen.getByRole('button', { name: /VIEW ALL SKILLS/ }))
    expect(screen.getByRole('dialog', { name: /Skills board expanded/ })).toBeInTheDocument()
    expect(container.querySelector('.skills-ui--focus')).not.toBeNull()
    expect(screen.getByText('pytest')).toBeInTheDocument() // full list, nothing capped

    fireEvent.click(screen.getByRole('button', { name: /CLOSE/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('.spatial-scrim')).toBeNull()
    expectCleanRoom(container)
  })

  it('repeated open/close cycles are deterministic — zero residual state', () => {
    const { container } = renderSpatial('monitor')
    for (let cycle = 0; cycle < 3; cycle++) {
      fireEvent.click(screen.getByRole('button', { name: /OPEN DISPLAY/ }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /CLOSE/ }))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(container.querySelector('[data-focus="none"]')).not.toBeNull()
      expect(container.querySelector('.spatial-focused')).toBeNull()
      expect(container.querySelector('.spatial-scrim')).toBeNull()
      expectCleanRoom(container)
    }
  })
})

describe('P0-A — lamp keyboard parity', () => {
  it('ENTER toggles the lamp in ROOM state (same toggleLamp canal as the cord)', () => {
    render(
      <ExperienceProvider>
        <SceneProbe narrative="hero" settled />
        <LampProbe />
        <SpatialLayer />
      </ExperienceProvider>
    )
    expect(screen.getByTestId('lamp')).toHaveTextContent('off')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByTestId('lamp')).toHaveTextContent('on')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByTestId('lamp')).toHaveTextContent('off')
  })

  it('never fires while a focus interface is open', () => {
    render(
      <ExperienceProvider>
        <SceneProbe narrative="monitor" settled />
        <LampProbe />
        <SpatialLayer />
      </ExperienceProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /OPEN DISPLAY/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByTestId('lamp')).toHaveTextContent('off')
  })

  it('does not race an element that already owns Enter', () => {
    render(
      <ExperienceProvider>
        <SceneProbe narrative="monitor" settled />
        <LampProbe />
        <SpatialLayer />
      </ExperienceProvider>
    )
    const affordance = screen.getByRole('button', { name: /OPEN DISPLAY/ })
    fireEvent.keyDown(affordance, { key: 'Enter' })
    expect(screen.getByTestId('lamp')).toHaveTextContent('off')
  })
})

describe('P0-B — focus isolation', () => {
  it('open dialog is aria-modal with an accessible name, focus enters, and Tab cannot escape', () => {
    renderSpatial('monitor')
    fireEvent.click(screen.getByRole('button', { name: /OPEN DISPLAY/ }))

    const dialog = screen.getByRole('dialog', { name: /Monitor display expanded/ })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    // focus entered the interface itself (the terminal focuses its input)
    expect(dialog.contains(document.activeElement)).toBe(true)

    // Tab from the last focusable wraps back to the first — never the background
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    expect(focusables.length).toBeGreaterThan(0)
    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    // a stray focus outside the dialog is pulled back in on the next Tab
    ;(document.activeElement as HTMLElement | null)?.blur()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('background siblings are inert while a focus interface is open, released on close', () => {
    const { container } = render(
      <ExperienceProvider>
        <SceneProbe narrative="monitor" settled />
        <div data-testid="background" />
        <SpatialLayer />
      </ExperienceProvider>
    )
    const background = container.querySelector('[data-testid="background"]')!
    expect(background.hasAttribute('inert')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /OPEN DISPLAY/ }))
    expect(background.hasAttribute('inert')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /CLOSE/ }))
    expect(background.hasAttribute('inert')).toBe(false)
  })
})

describe('P0-C — About accessibility with the scene live', () => {
  it('About stays semantically reachable while WebGL owns the presentation', () => {
    render(<App />)
    expect(document.getElementById('content')).toHaveAttribute('data-scene', 'on')
    const about = document.getElementById('about')!
    expect(about).not.toBeNull()
    // stable heading + a visually-hidden-but-accessible body
    const hidden = about.querySelector('.sr-only')
    expect(hidden).not.toBeNull()
    expect(hidden!.querySelectorAll('p').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /Who's in this room/ })).toBeInTheDocument()
  })
})
