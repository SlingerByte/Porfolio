import { useEffect, useRef, useState } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'
import { useBookPage, BOOK_PAGE_COUNT } from '../../state/book'
import { clampShift } from '../../state/narrative'
import { atScrollEnd, useScrollExit } from './useScrollExit'
import { gsap } from '../../motion/gsap'
import { playPageTurn } from '../../scene/sound'
import type { Project } from '../../content/types'

const SPREADS = BOOK_PAGE_COUNT - 1 // turnable pages (intro excluded)

interface BookInterfaceProps {
  onClose?: () => void
}

/** One physical leaf mid-turn (M5.11): hinged at the spine, not a fade. */
interface Leaf {
  dir: 'next' | 'prev'
  fromPage: number
  seq: number
}

/**
 * The focused face of the Selected Projects book: an OPEN BOOK — two
 * physical pages meeting at a spine, with a real turning leaf on
 * navigation (NEXT: right leaf rotates left around the spine; PREV: the
 * left leaf rotates right). Scroll past the last project and the book
 * closes itself — the journey continues without hunting for CLOSE.
 *
 * Page domain: 0 = cover, 1 = intro spread, 2..N = project spreads.
 */
export function BookInterface({ onClose }: BookInterfaceProps) {
  const { reducedMotion } = useExperience()
  const { projects } = useContent()
  const { t } = useI18n()
  const bookPage = useBookPage()
  const isIntro = bookPage === 0
  const project = bookPage >= 1 ? projects[bookPage - 1] : null
  const spreadRef = useRef<HTMLDivElement>(null)

  // the turning leaf: mounted only while the page-change animation plays
  const [leaf, setLeaf] = useState<Leaf | null>(null)
  const prevPage = useRef(bookPage)
  useEffect(() => {
    const from = prevPage.current
    if (bookPage === from) return undefined
    prevPage.current = bookPage
    if (reducedMotion) return undefined
    setLeaf({ dir: bookPage > from ? 'next' : 'prev', fromPage: from, seq: Date.now() })
    return undefined
  }, [bookPage, reducedMotion])

  // scroll past the final page closes the book — CLOSE stays as an
  // explicit affordance, but it is never mandatory
  useScrollExit(
    () => bookPage >= SPREADS && atScrollEnd(spreadRef.current),
    () => onClose?.(),
    Boolean(onClose)
  )

  return (
    <div className="book-ui book-ui--focus book-ui--open">
      <span className="book-ui-title">{t('bookTitle')}</span>
      <button type="button" className="book-ui-action" onClick={onClose}>
        {t('bookClose')}
      </button>

      <div className="book-body">
        <div className="book-volume">
          <div
            ref={spreadRef}
            className="book-ui-spread"
            key={bookPage}
            data-turn={leaf?.dir}
            tabIndex={0}
            role="region"
            aria-label={
              isIntro
                ? t('bookIntroAria')
                : t('bookSpreadAria', { title: project?.title ?? '' })
            }
          >
            {project ? (
              <>
                <LeftPage project={project} page={bookPage} />
                <RightPage project={project} page={bookPage} />
              </>
            ) : (
              <>
                <FirstSpreadLeft />
                <FirstSpreadRight />
              </>
            )}
            <span className="book-spine" aria-hidden="true" />
          </div>

          {/* the physical leaf: front carries the page being turned over,
              back is paper — it rotates around the spine and vanishes */}
          {leaf && <LeafElement key={leaf.seq} leaf={leaf} onDone={() => setLeaf(null)} />}
        </div>
      </div>

      <nav className="book-ui-nav">
        <BookNavButtons />
      </nav>
    </div>
  )
}

/* ---------------- the turning leaf (M5.11): a real page turn ----------- */

/**
 * One physical leaf mid-turn. Driven by GSAP instead of CSS keyframes so
 * the flip gets real physics: the page lifts off the stack, BOWS through
 * the air (a curvature layer rides the turn), and drops onto the facing
 * stack — two distinct phases, not a rigid board rotating.
 */
function LeafElement({ leaf, onDone }: { leaf: Leaf; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const bendRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const forward = leaf.dir === 'next'
    const bend = bendRef.current
    const tl = gsap.timeline({ onComplete: onDone })
    // the paper swishes as it lifts
    tl.call(() => playPageTurn(), [], 0)
    // phase 1 — the page peels off the stack: hinge turns while the free
    // edge lifts and bows toward the reader
    tl.fromTo(
      el,
      { rotateY: 0, rotateZ: 0, rotateX: 0, z: 0 },
      {
        rotateY: forward ? -96 : 96,
        rotateZ: forward ? 7 : -7,
        rotateX: forward ? -5 : 5,
        z: 7,
        duration: 0.34,
        ease: 'power2.in',
      }
    )
      // phase 2 — the page falls under gravity and settles flat on the stack
      .to(
        el,
        {
          rotateY: forward ? -180 : 180,
          rotateZ: 0,
          rotateX: 0,
          z: 0,
          duration: 0.46,
          ease: 'power2.inOut',
        },
        0.34
      )
    // the paper visibly bows: a curvature gradient swells mid-turn, then
    // flattens as the page lands — this is what sells "a real page"
    if (bend) {
      tl.fromTo(bend, { opacity: 0 }, { opacity: 0.7, duration: 0.32, ease: 'sine.out' }, 0.06)
      tl.to(bend, { opacity: 0, duration: 0.3, ease: 'sine.in' }, 0.46)
    }
    return () => {
      tl.kill()
    }
  }, [leaf, onDone])

  return (
    <div
      ref={ref}
      className={`book-leaf book-leaf--${leaf.dir}`}
      data-turn-leaf={leaf.dir}
      aria-hidden="true"
    >
      <div className="book-leaf-face book-leaf-front">
        <div ref={bendRef} className="book-leaf-bend" aria-hidden="true" />
        <LeafFront page={leaf.fromPage} side={leaf.dir === 'next' ? 'right' : 'left'} />
      </div>
      <div className="book-leaf-face book-leaf-back" />
    </div>
  )
}

/* ---------------- intro spread (M7.3b / M7.3 — refined) ---------------- */

/** Left page of the intro: editorial title page, no project list. */
function FirstSpreadLeft() {
  const { projects } = useContent()
  const { t } = useI18n()
  return (
    <section className="book-page book-page--left book-page--intro-left">
      <span className="book-corner-ornament book-corner-ornament--tl" aria-hidden="true">┌</span>
      <span className="book-corner-ornament book-corner-ornament--tr" aria-hidden="true">┐</span>
      <span className="book-intro-ornament" aria-hidden="true">◆</span>
      <h2 className="book-intro-title">
        {t('introTitleLeft')}
        <br />
        {t('introTitleRight')}
      </h2>
      <span className="book-intro-rule" aria-hidden="true" />
      <p className="book-intro-tagline">{t('introTagline')}</p>
      <p className="book-intro-note">{t('introNote')}</p>
      <span className="book-intro-divider" aria-hidden="true">— ◆ —</span>
      <p className="book-intro-stat">
        <span className="book-intro-stat-num">{String(projects.length).padStart(2, '0')}</span>
        {' '}{t('introStat')}
      </p>
      <p className="book-intro-motto">{t('introMotto')}</p>
      <p className="book-intro-personality">{t('introPersonality')}</p>
      <span className="book-intro-divider book-intro-divider--subtle" aria-hidden="true">· · ·</span>
      <p className="book-intro-author">
        EMILSON OVIEDO
        <span className="book-intro-author-role">{t('introRole')}</span>
      </p>
      <p className="book-folio" aria-hidden="true">00</p>
    </section>
  )
}

/** Right page of the intro: editorial foreword, no project list. */
function FirstSpreadRight() {
  const { t } = useI18n()
  return (
    <section className="book-page book-page--right book-page--intro-right">
      <span className="book-corner-ornament book-corner-ornament--tl" aria-hidden="true">┌</span>
      <span className="book-corner-ornament book-corner-ornament--tr" aria-hidden="true">┐</span>
      <p className="book-intro-right-label">{t('introRightLabel')}</p>
      <span className="book-intro-index-rule" aria-hidden="true" />
      <p className="book-intro-right-body">{t('introRightBody')}</p>
      <span className="book-intro-divider book-intro-divider--center" aria-hidden="true">— ◆ —</span>
      <p className="book-intro-right-footer">{t('introRightFooter')}</p>
      <p className="book-intro-turn">{t('introTurn')}</p>
      <p className="book-folio" aria-hidden="true">00 / 04</p>
    </section>
  )
}

/* ---------------- project pages ---------------- */

function LeftPage({ project, page }: { project: Project; page: number }) {
  const maxChips = 4
  const chips = project.technologies.slice(0, maxChips)
  const rest = project.technologies.length - chips.length
  const displayNum = page // page 1 = project 01, page 2 = project 02, etc.
  const { t } = useI18n()
  return (
    <section className="book-page book-page--left">
      <p className="book-kicker">{t('bookKicker')}</p>
      <p className="book-num">{String(displayNum).padStart(2, '0')}</p>
      <h3 className="book-project-title">{project.title}</h3>
      <p className="book-attribution">
        {project.attribution.label}
        {project.period ? ` · ${project.period}` : ''}
      </p>
      <ul className="book-tags" aria-label={t('categoriesAria')}>
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <p className="book-role">
        {t('bookRole')}
        <span>{project.role}</span>
      </p>
      <p className="book-case-label book-stack-label">{t('bookStack')}</p>
      <ul className="book-stack" aria-label="Stack">
        {chips.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
        {rest > 0 && <li className="book-stack-more">+{rest}</li>}
      </ul>
      <p className="book-folio" aria-hidden="true">
        {String(displayNum).padStart(2, '0')}
      </p>
    </section>
  )
}

function RightPage({ project, page }: { project: Project; page: number }) {
  const { projects } = useContent()
  const { t } = useI18n()
  const paragraphs = project.description.split('\n\n')
  const labels = [t('bookProblem'), t('bookApproach'), t('bookBuilt')]
  const displayNum = page
  return (
    <section className="book-page book-page--right">
      <div className="book-case">
        {paragraphs.map((paragraph, i) => (
          <div key={i} className="book-case-section">
            {i < labels.length && <p className="book-case-label">{labels[i]}</p>}
            <p>{paragraph}</p>
          </div>
        ))}
        <Evidence project={project} />
      </div>
      <p className="book-folio" aria-hidden="true">
        {String(displayNum).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
      </p>
    </section>
  )
}

function Evidence({ project }: { project: Project }) {
  const { t } = useI18n()
  return (
    <>
      <p className="book-case-label book-stack-label">{t('bookEvidence')}</p>
      <p className="book-links">
        <span className={`evidence-${project.evidence}`}>{project.evidence.toUpperCase()}</span>
        {' — '}
        {project.links ? (
          <>
            {project.links.repo && (
              <a href={project.links.repo} target="_blank" rel="noreferrer">
                REPO
              </a>
            )}{' '}
            {project.links.demo && (
              <a href={project.links.demo} target="_blank" rel="noreferrer">
                DEMO
              </a>
            )}
          </>
        ) : (
          <span>{t('codeOnRequest')}</span>
        )}
      </p>
    </>
  )
}

/** The face of the leaf being turned: a ghost of the page it carries. */
function LeafFront({ page, side }: { page: number; side: 'left' | 'right' }) {
  const { projects } = useContent()
  const { t } = useI18n()
  const isIntroPage = page === 0
  const project = page >= 1 ? projects[page - 1] : null
  return (
    <div className={`book-leaf-paper book-leaf-paper--${side}`}>
      {project ? (
        <>
          <p className="book-kicker">{t('bookKicker')}</p>
          <p className="book-leaf-title">{project.title}</p>
          <span className="book-cover-rule" aria-hidden="true" />
        </>
      ) : isIntroPage ? (
        <>
          <p className="book-kicker">{t('bookKicker')}</p>
          <p className="book-leaf-title">{t('bookIntroduction')}</p>
          <span className="book-cover-rule" aria-hidden="true" />
        </>
      ) : (
        <p className="book-leaf-title">{t('bookSelected')}</p>
      )}
      <p className="book-folio">
        {isIntroPage ? '00' : String(page).padStart(2, '0')}
      </p>
    </div>
  )
}

/* ---------------- shared chrome ---------------- */

/** Diegetic page indicator — intro as 00, projects as 01–04. */
export function Folio() {
  const { projects } = useContent()
  const bookPage = useBookPage()
  const display = bookPage === 0 ? '00' : String(bookPage).padStart(2, '0')
  return (
    <span className="book-ui-indicator" role="status">
      {display} / {String(projects.length).padStart(2, '0')}
    </span>
  )
}

/**
 * Page navigation (focus footer only — in the room, scroll tells the story).
 * Writes only the clamped shift; scroll stays the primary storyteller.
 */
export function BookNavButtons() {
  const { bookScrollPage, setBookPageShift } = useExperience()
  const { t } = useI18n()
  const bookPage = useBookPage()

  const goto = (desired: number) => {
    const target = Math.min(SPREADS, Math.max(0, desired))
    setBookPageShift(clampShift(target - bookScrollPage, bookScrollPage, BOOK_PAGE_COUNT))
  }

  return (
    <>
      <button
        type="button"
        className="book-nav-btn"
        onClick={() => goto(bookPage - 1)}
        disabled={bookPage === 0}
        aria-label={t('bookPrevAria')}
      >
        {t('bookPrev')}
      </button>
      <Folio />
      <button
        type="button"
        className="book-nav-btn"
        onClick={() => goto(bookPage + 1)}
        disabled={bookPage >= SPREADS}
        aria-label={t('bookNextAria')}
      >
        {t('bookNext')}
      </button>
    </>
  )
}