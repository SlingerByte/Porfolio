import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

/**
 * Task 7H — the light-first discovery gate.
 *
 * Pure logic (the gate predicate + scroll clamp + projection anchor) is
 * tested deterministically. The component is driven through the real App
 * with the scene live (webgl mocked): initial OFF gates scroll, a scroll
 * attempt reveals the lamp-anchored note, turning the lamp ON releases it,
 * and a later lamp turned off (or burned) never re-gates the room.
 */

vi.mock('../scene/webgl', () => ({ webglAvailable: vi.fn(() => true) }))
vi.mock('../scene/SceneCanvas', () => ({ default: () => null }))

import App from '../App'
import { webglAvailable } from '../scene/webgl'
import { isLightGateActive, shouldClampScroll, lampScreenAnchor } from '../state/lightGate'

/* ------------------------------------------------------------------ */
/* Pure gate logic                                                     */
/* ------------------------------------------------------------------ */

describe('Task 7H — gate predicate (pure)', () => {
  it('is active initially: scene on, lamp off, discovery incomplete', () => {
    expect(isLightGateActive(true, false, false)).toBe(true)
  })

  it('releases the moment the lamp is on', () => {
    expect(isLightGateActive(true, true, false)).toBe(false)
  })

  it('stays released once discovery is complete — a later OFF does not re-gate', () => {
    expect(isLightGateActive(true, false, true)).toBe(false)
  })

  it('never applies in the no-WebGL fallback', () => {
    expect(isLightGateActive(false, false, false)).toBe(false)
  })

  it('clamps only while gated and actually scrolled', () => {
    expect(shouldClampScroll(300, true)).toBe(true)
    expect(shouldClampScroll(0, true)).toBe(false)
    expect(shouldClampScroll(300, false)).toBe(false)
  })

  it('anchors the lamp cord inside the viewport at the hero pose', () => {
    const a = lampScreenAnchor(1280, 720)
    expect(a).not.toBeNull()
    if (a) {
      expect(a.x).toBeGreaterThan(0)
      expect(a.x).toBeLessThan(1280)
      expect(a.y).toBeGreaterThan(0)
      expect(a.y).toBeLessThan(720)
    }
  })
})

/* ------------------------------------------------------------------ */
/* Component behavior through the real App                             */
/* ------------------------------------------------------------------ */

function mockScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true })
}

const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

afterEach(() => {
  mockScrollY(0)
  scrollSpy.mockClear()
})

function expectNoGate() {
  expect(document.querySelector('.light-gate')).toBeNull()
}

function expectGate(): HTMLElement {
  const gate = document.querySelector('.light-gate')
  expect(gate).not.toBeNull()
  return gate as HTMLElement
}

describe('Task 7H — light gate (component)', () => {
  it('starts dark and undiscovered: no guidance, but the cord hint is there', () => {
    render(<App />)
    expectNoGate()
    expect(screen.getByText(/PULL THE CORD/)).toBeInTheDocument()
  })

  it('a scroll attempt reveals the guidance and snaps the scroll back', () => {
    render(<App />)
    mockScrollY(400)

    fireEvent.scroll(window)
    const gate = expectGate()
    expect(gate).toHaveTextContent('A little dark in here — turn the light on first.')
    expect(gate).toHaveAttribute('role', 'status')
    expect(gate).toHaveAttribute('aria-live', 'polite')
    expect(scrollSpy).toHaveBeenCalled()

    // repeated attempts leave a single note (no spam / no duplicates)
    const before = document.querySelectorAll('.light-gate').length
    fireEvent.scroll(window)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(document.querySelectorAll('.light-gate').length).toBe(before)
  })

  it('a keyboard scrolling key also reveals the guidance', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'PageDown' })
    expectGate()
  })

  it('turning the lamp ON releases the gate and removes the guidance', () => {
    render(<App />)
    mockScrollY(400)
    fireEvent.scroll(window)
    expectGate()
    scrollSpy.mockClear()

    // any valid lamp activation — ENTER (the canonical canal)
    fireEvent.keyDown(window, { key: 'Enter' })
    expectNoGate()

    // scrolling is now free: it neither clamps nor re-shows
    mockScrollY(900)
    fireEvent.scroll(window)
    expect(scrollSpy).not.toHaveBeenCalled()
    expectNoGate()
  })

  it('a lamp turned ON then OFF (or a burned bulb later) never re-gates', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'Enter' }) // discovery complete
    fireEvent.keyDown(window, { key: 'Enter' }) // lamp back off (or burned later)
    mockScrollY(400)
    fireEvent.scroll(window)
    expect(scrollSpy).not.toHaveBeenCalled()
    expectNoGate()
  })

  it('shows the Spanish copy when the language is switched to ES', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Cambiar a español/ }))
    fireEvent.keyDown(window, { key: 'End' })
    expect(expectGate()).toHaveTextContent('Está un poco oscuro aquí — enciende la luz primero.')
  })

  it('never renders guidance in the no-WebGL fallback', () => {
    vi.mocked(webglAvailable).mockReturnValue(false)
    const { unmount } = render(<App />)
    expectNoGate()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expectNoGate()
    unmount()
    vi.mocked(webglAvailable).mockReturnValue(true)
  })
})