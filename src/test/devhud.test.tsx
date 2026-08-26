import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExperienceProvider } from '../state/ExperienceContext'
import { DevPanels } from '../ui/DevPanels'

/**
 * M5.9 — debug UX: instrumentation must not steal the composition.
 * Collapsed by default; expands on demand. The lamp is a pixel bulb with
 * secondary controls in a popover.
 */
describe('dev hud (collapsed / expanded)', () => {
  it('renders as a thin strip by default and keeps the inspector hidden', () => {
    render(
      <ExperienceProvider>
        <DevPanels />
      </ExperienceProvider>
    )
    const tab = screen.getByRole('button', { name: /Developer hud/i })
    expect(tab).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('DEV')).toBeInTheDocument()
    expect(screen.queryByText('RENDER SCALE')).toBeNull()
  })

  it('expands to the full inspector and collapses again', () => {
    render(
      <ExperienceProvider>
        <DevPanels />
      </ExperienceProvider>
    )
    const tab = screen.getByRole('button', { name: /Developer hud/i })
    fireEvent.click(tab)
    expect(tab).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('RENDER SCALE')).toBeInTheDocument()
    expect(screen.getByText('SCENE')).toBeInTheDocument()
    // every instrumented render scale survives the redesign
    for (const scale of ['1.00', '0.50', '0.40', '0.34', '0.25']) {
      expect(screen.getByRole('button', { name: scale })).toBeInTheDocument()
    }
    fireEvent.click(tab)
    expect(screen.queryByText('RENDER SCALE')).toBeNull()
  })
})

describe('lamp bulb widget', () => {
  it('toggles the lamp with a clear pressed state', () => {
    render(
      <ExperienceProvider>
        <DevPanels />
      </ExperienceProvider>
    )
    const bulb = screen.getByRole('button', { name: /lamp off/i })
    expect(bulb).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(bulb)
    expect(bulb).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /lamp on/i })).toBeInTheDocument()
  })

  it('hides secondary controls in a popover', () => {
    render(
      <ExperienceProvider>
        <DevPanels />
      </ExperienceProvider>
    )
    expect(screen.queryByRole('group', { name: /Lamp control/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /More lamp controls/i }))
    const pop = screen.getByRole('group', { name: /Lamp control/ })
    expect(pop).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Turn off|Turn on/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset sequence/ })).toBeInTheDocument()
    expect(screen.getByText(/reduced motion:/)).toBeInTheDocument()
  })
})
