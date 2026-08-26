import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import { useContent } from '../../state/useContent'
import { useI18n, type TFunction } from '../../content/strings'
import { atScrollEnd, useScrollExit } from './useScrollExit'

interface MonitorInterfaceProps {
  onClose?: () => void
}

interface IoLine {
  cmd: string
  out: string[]
}

/** un mini Python de juguete para el terminal en vivo — real-ish, sobre todo por diversión */
function pythonEval(code: string, t: TFunction): string[] {
  if (!code) return t('pyHint').split('\n')
  const printMatch = code.match(/^print\(\s*['"](.+?)['"]\s*\)$/)
  if (printMatch) return [printMatch[1] ?? '']
  if (/^[\d\s+\-*/()%]+$/.test(code)) {
    try {
      const value = Function(`"use strict"; return (${code})`)()
      return [String(value)]
    } catch {
      return [t('pySyntaxError')]
    }
  }
  return [t('pyNameError', { name: (code.split(/\s/)[0] ?? '').trim() })]
}

/** la tabla de comandos — algunas respuestas reales, algunas bromas */
function respond(raw: string, t: TFunction): string[] {
  const cmd = raw.trim()
  const lower = cmd.toLowerCase()
  if (!cmd) return []
  if (lower === 'help') return t('termHelp').split('\n')
  if (lower === 'whoami') return [t('termWhoami')]
  if (lower === 'ls') return t('termLs').split('\n')
  if (lower === 'pwd') return [t('termPwd')]
  if (lower === 'date') return [t('termDate')]
  if (lower === 'exit' || lower === 'quit') return t('termExit').split('\n')
  if (lower.startsWith('sudo')) return [t('termSudo')]
  if (lower === 'py' || lower.startsWith('py ')) return pythonEval(cmd.slice(lower.startsWith('py ') ? 3 : 2), t)
  return [t('termNotFound', { cmd })]
}

/**
 * The focused face of the monitor (M5.10): the ONLY HTML this object ever
 * shows. The room keeps the pixel-art screen; OPEN DISPLAY grows THIS
 * terminal into a full, professional reading interface — and the blinking
 * cursor at the end is LIVE: you can type commands and run them (a few are
 * even real). Scrolling past the end exits naturally (M5.11).
 */
export function MonitorInterface({ onClose }: MonitorInterfaceProps) {
  const { reducedMotion } = useExperience()
  const { profile, experience, education, certifications } = useContent()
  const { t } = useI18n()
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<IoLine[]>([])

  useScrollExit(
    () => atScrollEnd(bodyRef.current),
    () => onClose?.(),
    Boolean(onClose)
  )

  // ready to type the moment the display opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // keep the newest output in view
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [lines])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cmd = input.trim()
    if (cmd.toLowerCase() === 'clear') {
      setLines([])
      setInput('')
      return
    }
    setLines((prev) => [...prev, { cmd, out: respond(cmd, t) }])
    setInput('')
  }

  return (
    <div className="monitor-ui monitor-ui--focus" data-reduced-motion={reducedMotion}>
      <header className="monitor-ui-bar">
        <span className="monitor-ui-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="monitor-ui-path">{t('monitorPath')}</span>
        <button type="button" className="monitor-ui-action" onClick={onClose}>
          {t('monitorClose')}
        </button>
      </header>

      <div
        ref={bodyRef}
        className="monitor-ui-body"
        tabIndex={0}
        role="region"
        aria-label={t('monitorAria')}
      >
        <p className="term-prompt">$ whoami</p>
        <p className="term-name">{profile.name}</p>
        <p className="term-role">{profile.role}</p>
        <p className="term-tagline">{profile.tagline}</p>

        <p className="term-prompt">$ cat timeline.txt</p>
        <ol className="term-timeline">
          {experience.map((item) => (
            <li key={item.id}>
              <h3>{item.role}</h3>
              <p className="term-org">{item.org}</p>
              {item.period && <p className="term-meta">{item.period}</p>}
              <p className="term-summary">{item.summary}</p>
            </li>
          ))}
        </ol>

        <p className="term-prompt">$ cat education.log</p>
        <ul className="term-education">
          {education.map((item) => (
            <li key={item.id}>
              <span>{item.title}</span>
              <span className="term-meta">
                {item.org}
                {item.year ? ` · ${item.year}` : ''}
              </span>
            </li>
          ))}
        </ul>

        {certifications.length > 0 && (
          <>
            <p className="term-prompt">$ cat certifications.log</p>
            <ul className="term-education">
              {certifications.map((item) => (
                <li key={item.id}>
                  <span>{item.title}</span>
                  <span className="term-meta">
                    {item.issuer}
                    {item.year ? ` · ${item.year}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="term-prompt">$ echo {t('termPwd')}</p>
        <p className="term-idle">{t('monitorIdle')}</p>

        {lines.map((line, i) => (
          <div key={i} className="term-io">
            <p className="term-prompt">$ {line.cmd}</p>
            {line.out.map((out, j) => (
              <p key={j} className="term-out">
                {out}
              </p>
            ))}
          </div>
        ))}

        <form className="term-input-row" onSubmit={submit}>
          <span className="term-prompt" aria-hidden="true">
            $
          </span>
          {input === '' && (
            <span className="term-caret" aria-hidden="true">
              ▊
            </span>
          )}
          <input
            ref={inputRef}
            className={`term-input${input === '' ? ' is-empty' : ''}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
aria-label={t('terminalInputAria')}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </form>
        <div ref={endRef} aria-hidden="true" />
      </div>
    </div>
  )
}