import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'

// keep the persisted language from leaking between tests (default is English)
afterEach(() => {
  window.localStorage.clear()
})

/**
 * jsdom has no WebGL, so these exercise the real fallback path:
 * the DOM portfolio must be fully present with no canvas mounted.
 */
describe('App (no WebGL environment)', () => {
  it('renders the portfolio without a canvas', () => {
    const { container } = render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Emilson Oviedo/i })
    ).toBeInTheDocument()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('exposes stable section ids as semantic sections', () => {
    render(<App />)
    for (const id of ['work', 'about', 'skills', 'experience', 'contact']) {
      const el = document.getElementById(id)
      expect(el).not.toBeNull()
      expect(el!.tagName).toBe('SECTION')
    }
  })

  it('keeps exactly one h1 and gives every section an h2', () => {
    render(<App />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    // count within the content flow; the WebGL fallback lives outside it
    const main = document.getElementById('content')!
    expect(main.querySelectorAll('h2')).toHaveLength(6) // room intro + 5 sections
  })

  it('navigation anchors point to valid section ids', () => {
    render(<App />)
    const NAV: Array<[string, string]> = [
      ['01 EXPERIENCE', 'experience'],
      ['02 PROJECTS', 'work'],
      ['03 SKILLS', 'skills'],
      ['04 CONTACT', 'contact'],
    ]
    for (const [label, id] of NAV) {
      const link = screen.getByRole('link', { name: label })
      expect(link).toHaveAttribute('href', `#${id}`)
      expect(document.getElementById(id)).not.toBeNull()
    }
  })

  it('follows the narrative order: hero -> experience -> projects -> ...', () => {
    const { container } = render(<App />)
    const main = container.querySelector('#content')!
    const order = ['top', 'experience', 'work', 'skills', 'about', 'contact'].map((id) =>
      document.getElementById(id)
    )
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    }
    expect(main.contains(order[0]!)).toBe(true)
  })

  it('renders four projects with GrantFlow first and featured', () => {
    const { container } = render(<App />)
    const cards = container.querySelectorAll('.project-card')
    expect(cards).toHaveLength(4)
    expect(cards[0].textContent).toContain('GrantFlow')
    expect(cards[0].className).toContain('featured')
    for (const title of ['EcoFunding', 'VoxLab', 'Blip']) {
      expect(container.textContent).toContain(title)
    }
  })

  it('never leaks client organization names in public project fields', () => {
    const { container } = render(<App />)
    // Client org names (ballenas, ICB) must never appear anywhere
    const text = (container.textContent ?? '').toLowerCase()
    expect(text).not.toContain('ballenas')
    expect(text).not.toContain('icb')
  })

  it('public repo links are real, clickable anchors that open in a new tab', () => {
    render(<App />)
    const repos = screen.getAllByRole('link', { name: /repo/i })
    expect(repos.length).toBeGreaterThan(0)
    expect(repos[0]).toHaveAttribute('href', 'https://github.com/SlingerByte/GrantFlow')
    for (const repo of repos) {
      expect(repo).toHaveAttribute('target', '_blank')
      expect(repo).toHaveAttribute('rel', 'noreferrer')
    }
  })

  it('switches language: English by default, the toggle shows Spanish', () => {
    render(<App />)
    // English by default
    expect(screen.getByRole('link', { name: /01 EXPERIENCE/ })).toBeInTheDocument()
    expect(screen.getByText('Each object tells a different part of my story.')).toBeInTheDocument()

    // toggle to Spanish
    fireEvent.click(screen.getByRole('button', { name: /cambiar a español/i }))
    expect(screen.getByRole('link', { name: /01 EXPERIENCIA/ })).toBeInTheDocument()
    expect(screen.getByText('Cada objeto cuenta una parte diferente de mi historia.')).toBeInTheDocument()

    // and back to English
    fireEvent.click(screen.getByRole('button', { name: /switch to english/i }))
    expect(screen.getByRole('link', { name: /01 EXPERIENCE/ })).toBeInTheDocument()
  })

  it('renders the published contact channels', () => {
    render(<App />)
    const emails = screen.getAllByRole('link', { name: /email/i })
    expect(emails.length).toBeGreaterThan(0)
    expect(emails[0]).toHaveAttribute('href', 'mailto:emilson1662@gmail.com')
    const githubs = screen.getAllByRole('link', { name: /github/i })
    expect(githubs[0]).toHaveAttribute('href', 'https://github.com/SlingerByte')
  })

  it('provides keyboard skip link and main landmark', () => {
    render(<App />)
    const skip = screen.getByRole('link', { name: /skip to content/i })
    expect(skip).toHaveAttribute('href', '#content')
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('shows the WebGL fallback notice when the scene fails', async () => {
    const { container } = render(<App />)
    await Promise.resolve()
    expect(await screen.findByText(/webgl unavailable/i)).toBeInTheDocument()
    expect(container.querySelector('.scene-canvas')).toBeNull()
  })
})
