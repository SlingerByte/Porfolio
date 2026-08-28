import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { gsap } from '../../motion/gsap'
import { useExperience } from '../../state/ExperienceContext'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'
import { useBookPage } from '../../state/book'
import { workSectionProgress, type SectionSpan } from '../../state/narrative'
import { PALETTE } from '../palette'
import { requestRender } from '../invalidate'

/**
 * "Selected Projects — Emilson Oviedo": the narrative container of the
 * projects — a PHYSICAL object (M5.10): cover and pages are procedural
 * canvas textures; real copy lives behind OPEN CASE STUDY only.
 *
 * States (sole owner of the book's own state machine):
 *   shelved   — closed hardcover standing on the upper shelf
 *   presented — narrative === 'shelf': slides out of the shelf toward the
 *               reader (one finite tween)
 *   open      — once the reader has scrolled into the book region
 *               (approached && bookPage >= 1): opens into a two-page spread;
 *               further page changes play a small physical page turn
 *               (NEXT left, PREV right); on leaving it the right page folds
 *               shut over the left like a book closing
 */

/** Task 7D: page textures are intentionally LOW-RES and NearestFiltered —
    the coarse, blocky pixel-art paper (Minecraft-book-inspired visual
    language, not a copy). The readable content lives in the DOM reading
    interface, so the diegetic page faces are chunky on purpose. 160×220
    keeps the diegetic project names readable while still clearly blocky. */
const PAGE_W = 160
const PAGE_H = 220

interface Spread {
  title: string
  subtitle: string
}

/** resting z of the closed book on the upper shelf */
const SHELF_Z = -1.88

/**
 * Y offset of the closed book (relative to its group origin) so its visible
 * near bottom edge rests on the shelf board's top surface. Derived from the
 * geometry: book half-height 0.335/2 = 0.1675, near-edge lean dip
 * sin(0.05 rad) * (0.205/2) ≈ 0.0051, shelf board top = 1.78 + 0.06/2 = 1.81,
 * book group origin y = 2.02 → 2.02 + y − 0.1675 − 0.0051 = 1.81 → y ≈ −0.048.
 * The far bottom edge dips ~1 cm into the board top but is occluded by the
 * book against the dark back panel.
 */
const CLOSED_REST_Y = -0.048

/**
 * Reading progress at which the book opens (scrolling down) vs. the lower
 * progress at which it closes again (scrolling up). The gap is hysteresis:
 * once open it stays open until the reader clearly leaves, and once closed
 * a tiny scroll jitter never flips it open again. The discrete bookPage
 * flips to page 1 at 0.2; opening at 0.3 keeps the book shut until the
 * reader is clearly at it — about half a page of scroll more.
 */
const OPEN_THRESHOLD = 0.3
const CLOSE_THRESHOLD = 0.2

/**
 * True while the reader is actually reading the open book — reached only by
 * scrolling DOWN through the work reading zone (progress 0.3 → 1).
 *
 * Direction matters: entering the section from BELOW (scrolling back up from
 * skills) means progress > 1, where the book should stay shut — opening it
 * there is meaningless. So `approached` is cleared on every re-entry and only
 * a fresh downward sweep through the zone opens it. It closes again on the
 * way out (progress < CLOSE_THRESHOLD or past the end at > 1).
 *
 * Listens to scroll like the narrative tracker, but writes state only when
 * the flag actually flips, so the book never re-renders on every scroll frame.
 */
function useBookApproached(enabled: boolean): boolean {
  const [approached, setApproached] = useState(false)
  const held = useRef(approached)
  const lastProgress = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return undefined
    // re-entering the section starts with a clean slate: the book is shut
    // until the reader sweeps down through the zone again
    lastProgress.current = null
    held.current = false
    setApproached(false)
    let ticking = false

    const measure = (id: string): SectionSpan | undefined => {
      const el = document.getElementById(id)
      if (!el) return undefined
      const top = el.getBoundingClientRect().top + window.scrollY
      return { top, bottom: top + el.offsetHeight }
    }

    const evaluate = () => {
      ticking = false
      const span = measure('work')
      if (!span) return
      const frame = { mid: window.scrollY + window.innerHeight * 0.5, viewport: window.innerHeight }
      const progress = workSectionProgress(span, frame)
      const prev = lastProgress.current
      lastProgress.current = progress
      // first measure establishes the baseline; we need a real scroll frame
      // to know which direction the reader is moving
      if (prev === null) return

      let next = held.current
      const inZone = progress >= OPEN_THRESHOLD && progress <= 1
      const movingDown = progress >= prev

      if (!next && inZone && movingDown) {
        next = true
      } else if (next && (progress < CLOSE_THRESHOLD || progress > 1)) {
        next = false
      }

      if (next !== held.current) {
        held.current = next
        setApproached(next)
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
  }, [enabled])

  return approached
}

/** Cream paper base for the LEFT page: fibers + blocky grain + a shadow at
    the SPINE edge (the right side of the left page). Drawn once, low-res,
    NearestFiltered. */
function drawPaper(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_W
  canvas.height = PAGE_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f0e6d0'
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  // faint horizontal fibers
  ctx.fillStyle = 'rgba(180, 160, 130, 0.07)'
  for (let y = 0; y < PAGE_H; y += 4) ctx.fillRect(0, y, PAGE_W, 1)
  // deterministic blocky grain — staggered 2×2 specks
  ctx.fillStyle = 'rgba(120, 95, 60, 0.05)'
  for (let y = 8; y < PAGE_H; y += 16) {
    const off = y % 32 < 16 ? 0 : 12
    for (let x = 6 + off; x < PAGE_W; x += 24) ctx.fillRect(x, y, 2, 2)
  }
  // spine-edge shadow at the RIGHT (the binding side of the left page)
  const gutter = ctx.createLinearGradient(PAGE_W - 18, 0, PAGE_W, 0)
  gutter.addColorStop(0, 'rgba(80, 60, 30, 0)')
  gutter.addColorStop(1, 'rgba(80, 60, 30, 0.28)')
  ctx.fillStyle = gutter
  ctx.fillRect(PAGE_W - 18, 0, 18, PAGE_H)
  return canvas
}

/** One diegetic project page: blocky pixel-art title + ruled rows over the
    same paper base. The spread texture is the RIGHT page of the open book
    (the left page uses drawPaper). */
function drawSpread(spread: Spread, rows: string[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_W
  canvas.height = PAGE_H
  const ctx = canvas.getContext('2d')!

  // paper base
  ctx.fillStyle = '#f0e6d0'
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  ctx.fillStyle = 'rgba(180, 160, 130, 0.07)'
  for (let y = 0; y < PAGE_H; y += 4) ctx.fillRect(0, y, PAGE_W, 1)
  ctx.fillStyle = 'rgba(120, 95, 60, 0.05)'
  for (let y = 8; y < PAGE_H; y += 16) {
    const off = y % 32 < 16 ? 0 : 12
    for (let x = 6 + off; x < PAGE_W; x += 24) ctx.fillRect(x, y, 2, 2)
  }
  // spine-edge shadow (left, the binding side of the right page)
  const gutter = ctx.createLinearGradient(0, 0, 18, 0)
  gutter.addColorStop(0, 'rgba(80, 60, 30, 0.3)')
  gutter.addColorStop(1, 'rgba(80, 60, 30, 0)')
  ctx.fillStyle = gutter
  ctx.fillRect(0, 0, 18, PAGE_H)

  // title — chunky blocky letters, readable (the project name must be seen)
  ctx.fillStyle = '#3d2c18'
  ctx.textAlign = 'center'
  ctx.font = 'bold 20px "Courier New", monospace'
  ctx.fillText(spread.title, PAGE_W / 2, 42)
  // subtitle
  ctx.font = '9px "Courier New", monospace'
  ctx.fillStyle = '#7a5c33'
  ctx.fillText(spread.subtitle, PAGE_W / 2, 56)
  // gold rule
  ctx.fillStyle = '#c9973f'
  ctx.fillRect(PAGE_W / 2 - 18, 62, 36, 1)
  ctx.fillStyle = 'rgba(160, 120, 50, 0.4)'
  ctx.fillRect(PAGE_W / 2 - 14, 66, 28, 1)

  // ruled body lines
  ctx.textAlign = 'left'
  rows.forEach((row, i) => {
    const y = 82 + i * 24
    ctx.fillStyle = '#8a6a3e'
    ctx.font = 'bold 8px "Courier New", monospace'
    ctx.fillText(row, 14, y)
    ctx.strokeStyle = 'rgba(70, 52, 30, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(52, y - 3)
    ctx.lineTo(PAGE_W - 12, y - 3)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(52, y + 5)
    ctx.lineTo(PAGE_W - 26 - i * 12, y + 5)
    ctx.stroke()
  })

  return canvas
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  // Task 7D: pixel-art identity — nearest upscale, like the monitor, corkboard
  // and cat textures. The readable project content lives in the DOM reading
  // interface, so the diegetic book faces are intentionally low-res/blocky.
  texture.magFilter = THREE.NearestFilter
  return texture
}

export function SelectedWorksBook() {
  const { narrative, reducedMotion, focus, setFocus, setBookScrollPage } = useExperience()
  const { projects } = useContent()
  const { t } = useI18n()
  const bookPage = useBookPage()
  const closedGroup = useRef<THREE.Group>(null)
  const openGroup = useRef<THREE.Group>(null)
  const turningPage = useRef<THREE.Group>(null)
  const rightPivot = useRef<THREE.Group>(null)
  const rightPageMesh = useRef<THREE.Mesh>(null)
  const closing = useRef<gsap.core.Timeline | null>(null)
  const prevPage = useRef(bookPage)

  const active = narrative === 'shelf'
  /** clickable only while this beat owns the camera */
  const interactive = active && focus === 'none'
  /** the reader has scrolled most of the way into the book region */
  const approached = useBookApproached(active)

  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = interactive ? 'pointer' : 'auto'
  }
  const unhover = () => {
    document.body.style.cursor = 'auto'
  }
  const openCaseStudy = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (interactive) {
      setFocus('book')
      setBookScrollPage(0) // open directly at the intro spread
    }
  }

  // cover texture (front face of the closed book) — a real cover: title,
  // author, edition line. M7.1: richer palette, decorative details, editorial feel.
  const coverTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 448
    const ctx = canvas.getContext('2d')!

    // base: warm dark leather with subtle vertical grain
    ctx.fillStyle = '#3d2815'
    ctx.fillRect(0, 0, 256, 448)
    ctx.fillStyle = 'rgba(80, 55, 30, 0.12)'
    for (let y = 0; y < 448; y += 3) {
      ctx.fillRect(0, y, 256, 1)
    }

    // outer border: double gold rule
    ctx.strokeStyle = '#c9973f'
    ctx.lineWidth = 5
    ctx.strokeRect(14, 14, 228, 420)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#a07830'
    ctx.strokeRect(24, 24, 208, 400)

    // inner decorative frame
    ctx.strokeStyle = 'rgba(201, 151, 63, 0.35)'
    ctx.lineWidth = 1
    ctx.strokeRect(36, 36, 184, 376)

    // corner ornaments: small L-shaped marks
    ctx.strokeStyle = '#c9973f'
    ctx.lineWidth = 2
    const c = 42
    const cl = 18
    // top-left
    ctx.beginPath(); ctx.moveTo(c, c + cl); ctx.lineTo(c, c); ctx.lineTo(c + cl, c); ctx.stroke()
    // top-right
    ctx.beginPath(); ctx.moveTo(256 - c - cl, c); ctx.lineTo(256 - c, c); ctx.lineTo(256 - c, c + cl); ctx.stroke()
    // bottom-left
    ctx.beginPath(); ctx.moveTo(c, 448 - c - cl); ctx.lineTo(c, 448 - c); ctx.lineTo(c + cl, 448 - c); ctx.stroke()
    // bottom-right
    ctx.beginPath(); ctx.moveTo(256 - c - cl, 448 - c); ctx.lineTo(256 - c, 448 - c); ctx.lineTo(256 - c, 448 - c - cl); ctx.stroke()

    // title block
    ctx.fillStyle = '#e8dcc4'
    ctx.textAlign = 'center'
    ctx.font = 'bold 28px Georgia, serif'
    ctx.fillText(t('coverTitle1'), 128, 138)
    ctx.fillText(t('coverTitle2'), 128, 174)

    // decorative rule under title
    ctx.fillStyle = '#c9973f'
    ctx.fillRect(78, 196, 100, 2)
    ctx.fillStyle = '#a07830'
    ctx.fillRect(88, 202, 80, 1)

    // edition dot cluster
    ctx.fillStyle = 'rgba(201, 151, 63, 0.4)'
    for (const dx of [-12, 0, 12]) {
      ctx.beginPath()
      ctx.arc(128 + dx, 224, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // author
    ctx.font = 'bold 15px "Courier New", monospace'
    ctx.fillStyle = '#d9b06a'
    ctx.fillText('EMILSON OVIEDO', 128, 348)

    // edition line
    ctx.font = '13px "Courier New", monospace'
    ctx.fillStyle = '#a07830'
    ctx.fillText('PORTFOLIO · 2026', 128, 384)

    // spine edge highlight (left side)
    ctx.fillStyle = 'rgba(201, 151, 63, 0.18)'
    ctx.fillRect(0, 0, 8, 448)

    // Task 7D: blocky bevel + faint wear — voxel-ish cover depth without
    // looking like a clean card: dark right/bottom edge, light top-left,
    // and a couple of small artisanal marks.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
    ctx.fillRect(244, 0, 12, 448)
    ctx.fillRect(0, 434, 256, 14)
    ctx.fillStyle = 'rgba(255, 240, 210, 0.07)'
    ctx.fillRect(0, 0, 10, 448)
    ctx.fillRect(0, 0, 256, 10)
    ctx.fillStyle = 'rgba(50, 32, 16, 0.10)'
    ctx.fillRect(52, 428, 22, 8)
    ctx.fillRect(188, 240, 12, 6)

    return makeTexture(canvas)
  }, [t])

  // spine texture: a small label/title area on the spine face
  const spineTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    // spine base — slightly lighter than cover for contrast
    ctx.fillStyle = '#5a3a22'
    ctx.fillRect(0, 0, 64, 256)
    // subtle vertical grain
    ctx.fillStyle = 'rgba(90, 60, 30, 0.15)'
    for (let y = 0; y < 256; y += 3) {
      ctx.fillRect(0, y, 64, 1)
    }
    // top/bottom gold rules
    ctx.fillStyle = '#c9973f'
    ctx.fillRect(8, 12, 48, 1.5)
    ctx.fillRect(8, 244, 48, 1.5)
    // title label: rotated text simulation — vertical lines as "title"
    ctx.fillStyle = '#d9b06a'
    ctx.fillRect(24, 50, 16, 2)
    ctx.fillRect(28, 58, 8, 2)
    // small dot cluster
    ctx.fillStyle = 'rgba(201, 151, 63, 0.5)'
    ctx.beginPath()
    ctx.arc(32, 128, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(32, 140, 2, 0, Math.PI * 2)
    ctx.fill()
    return makeTexture(canvas)
  }, [])

  // page edges texture: horizontal lines on the right side of the page block
  const pageEdgesTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    // base paper color
    ctx.fillStyle = '#e8dcc0'
    ctx.fillRect(0, 0, 32, 256)
    // horizontal lines simulating individual page edges
    ctx.strokeStyle = 'rgba(140, 120, 80, 0.35)'
    ctx.lineWidth = 1
    for (let y = 4; y < 256; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(32, y)
      ctx.stroke()
    }
    // slight shadow at the top and bottom edges
    const edgeGrad = ctx.createLinearGradient(0, 0, 0, 20)
    edgeGrad.addColorStop(0, 'rgba(100, 80, 50, 0.25)')
    edgeGrad.addColorStop(1, 'rgba(100, 80, 50, 0)')
    ctx.fillStyle = edgeGrad
    ctx.fillRect(0, 0, 32, 20)
    const edgeGradBot = ctx.createLinearGradient(0, 236, 0, 256)
    edgeGradBot.addColorStop(0, 'rgba(100, 80, 50, 0)')
    edgeGradBot.addColorStop(1, 'rgba(100, 80, 50, 0.25)')
    ctx.fillStyle = edgeGradBot
    ctx.fillRect(0, 236, 32, 20)
    return makeTexture(canvas)
  }, [])

  // the left open page's paper surface (the right page carries the project
  // spread texture) — same cream grain as the spread
  const paperTexture = useMemo(() => makeTexture(drawPaper()), [])

  // one spread per project — subtitles follow the current language
  const spreads = useMemo(
    () =>
      projects.map((p) => ({
        title: p.title.toUpperCase(),
        subtitle:
          p.id === 'grantflow'
            ? t('subGrantflow')
            : p.id === 'ecofunding'
              ? t('subEcofunding')
              : p.id === 'voxlab'
                ? t('subVoxlab')
                : t('subBlip'),
      })),
    [projects, t]
  )

  // one texture per project spread
  const rows = t('bookRows').split('\n')
  const spreadTextures = useMemo(
    () => spreads.map((s) => makeTexture(drawSpread(s, rows))),
    [spreads, rows]
  )
  useEffect(
    () => () => {
      coverTexture.dispose()
      spineTexture.dispose()
      pageEdgesTexture.dispose()
      spreadTextures.forEach((t) => t.dispose())
      paperTexture.dispose()
    },
    [coverTexture, spineTexture, pageEdgesTexture, spreadTextures, paperTexture]
  )

  // slide out of the shelf when presented; return when the story moves on
  useEffect(() => {
    const g = closedGroup.current
    if (!g) return
    const target = {
      y: active ? 0 : CLOSED_REST_Y, // presented slides out level; shelved rests on the board
      z: active ? SHELF_Z + 0.16 : SHELF_Z,
      rx: active ? -0.12 : -0.05,
      ry: active ? 0.22 : 0,
      s: active ? 1.15 : 1,
    }
    const duration = reducedMotion ? 0 : 1.1
    const tweens = [
      gsap.to(g.position, { y: target.y, z: target.z, duration, ease: 'power2.inOut' }),
      gsap.to(g.rotation, { x: target.rx, y: target.ry, duration, ease: 'power2.inOut' }),
      gsap.to(g.scale, { x: target.s, y: target.s, z: target.s, duration, ease: 'power2.inOut' }),
    ]
    requestRender() // demand primer: presentation/shelving runs on chained frames
    return () => tweens.forEach((t) => t.kill())
  }, [active, reducedMotion])

  // a close interrupted by unmount must not keep touching disposed meshes
  useEffect(
    () => () => {
      closing.current?.kill()
      closing.current = null
    },
    []
  )

  // open/closed + page-turn choreography
  // The book stays CLOSED while the camera approaches the shelf (page 0 =
  // intro) and for the first part of the reading region: it opens only once
  // the reader is clearly at the book (approached), not a moment earlier.
  const open = active && approached && bookPage >= 1 && bookPage <= spreads.length
  useEffect(() => {
    const closed = closedGroup.current
    const opened = openGroup.current
    if (!closed || !opened) return
    requestRender() // demand primer: opening/closing/page-turn run on chained frames

    // whenever the book is open, its right page lies flat (never half-folded
    // from an interrupted close) and any in-flight close is abandoned
    if (open) {
      closing.current?.kill()
      closing.current = null
      if (rightPivot.current) rightPivot.current.rotation.y = 0
    }

    const faceMaterial = rightPageMesh.current
    const applyFace = () => {
      if (!faceMaterial) return
      const mat = faceMaterial.material as THREE.MeshStandardMaterial
      mat.map = spreadTextures[Math.min(Math.max(bookPage, 1), spreads.length) - 1] ?? null
      mat.needsUpdate = true
    }

    if (reducedMotion) {
      closed.visible = !open
      opened.visible = open
      if (open) applyFace()
      prevPage.current = bookPage
      return
    }

    if (open && !opened.visible) {
      // OPENING: cover swings aside, spread settles
      applyFace()
      if (rightPivot.current) rightPivot.current.rotation.y = 0 // ensure the page isn't half-folded
      opened.visible = true
      opened.rotation.y = -0.5
      opened.scale.setScalar(0.82)
      closed.visible = false
      const tl = gsap.timeline()
      tl.to(opened.rotation, { y: 0, duration: 0.55, ease: 'back.out(1.6)' }).to(
        opened.scale,
        { x: 1, y: 1, z: 1, duration: 0.45, ease: 'power2.out' },
        0.08
      )
      prevPage.current = bookPage
      return () => {
        tl.kill()
      }
    }

    if (!open && opened.visible) {
      // CLOSING: the right page folds shut over the left — like the last page
      // closing — then the closed book slides back into its place on the shelf.
      // Runs once per close (guarded) so page changes mid-close never restart it.
      if (reducedMotion) {
        opened.visible = false
        closed.visible = true
      } else if (!closing.current) {
        // the closed cover waits near the open book, then retreats to the shelf
        const present = { y: 0, z: SHELF_Z + 0.16, rx: -0.12, ry: 0.22, s: 1.15 }
        const shelf = { y: CLOSED_REST_Y, z: SHELF_Z, rx: -0.05, ry: 0, s: 1 }
        closed.position.set(0, present.y, present.z)
        closed.rotation.set(present.rx, present.ry, 0)
        closed.scale.setScalar(present.s)

        const tl = gsap.timeline({
          onComplete: () => {
            closing.current = null
            opened.visible = false
            closed.visible = true
          },
        })
        closing.current = tl
        if (rightPivot.current) {
          tl.to(rightPivot.current.rotation, { y: -Math.PI, duration: 0.45, ease: 'power2.in' }, 0)
        }
        tl.to(opened.scale, { x: 0.94, y: 0.94, z: 0.94, duration: 0.45, ease: 'power2.in' }, 0)
        tl.to(opened.rotation, { y: 0.12, duration: 0.45, ease: 'power2.in' }, 0)
        // cover swap, then the closed book returns to its place on the shelf
        tl.call(() => {
          closed.visible = true
          opened.visible = false
        }, [], 0.45)
        tl.to(closed.position, { y: shelf.y, z: shelf.z, duration: 0.7, ease: 'power2.inOut' }, 0.45)
        tl.to(closed.rotation, { x: shelf.rx, y: shelf.ry, z: 0, duration: 0.7, ease: 'power2.inOut' }, 0.45)
        tl.to(closed.scale, { x: shelf.s, y: shelf.s, z: shelf.s, duration: 0.7, ease: 'power2.inOut' }, 0.45)
      }
      prevPage.current = bookPage
      return
    }

    if (open && opened.visible && bookPage !== prevPage.current) {
      // PAGE TURN: small physical flip around the spine
      applyFace()
      const page = turningPage.current
      if (page) {
        const forward = bookPage > prevPage.current
        page.visible = true
        page.rotation.y = forward ? -1.9 : 1.9
        const tl = gsap.timeline({
          onComplete: () => {
            page.visible = false
          },
        })
        tl.to(page.rotation, { y: 0, duration: 0.5, ease: 'power2.inOut' })
      }
      prevPage.current = bookPage
    }
  }, [open, bookPage, reducedMotion, spreadTextures, spreads.length])

  return (
    <group position={[1.06, 2.02, 0]}>
      {/* closed hardcover (shelved / presented-cover states) — slight natural lean */}
      <group ref={closedGroup} position={[0, CLOSED_REST_Y, SHELF_Z]} rotation={[0.04, 0, -0.07]}>
        {/* inner page block — page edges visible on the right side */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.13, 0.32, 0.185]} />
          <meshStandardMaterial attach="material-0" color="#e2d5bc" roughness={0.88} />
          <meshStandardMaterial attach="material-1" color="#e2d5bc" roughness={0.88} />
          <meshStandardMaterial attach="material-2" color="#e2d5bc" roughness={0.88} />
          <meshStandardMaterial attach="material-3" color="#e2d5bc" roughness={0.88} />
          <meshStandardMaterial attach="material-4" color="#e2d5bc" roughness={0.88} />
          <meshStandardMaterial attach="material-5" map={pageEdgesTexture} roughness={0.82} />
        </mesh>
        {/* outer cover with distinct spine, cover, and edges */}
        <mesh castShadow onPointerOver={hover} onPointerOut={unhover} onClick={openCaseStudy}>
          <boxGeometry args={[0.145, 0.335, 0.205]} />
          {/* +x right edge: darker cover tone */}
          <meshStandardMaterial attach="material-0" color="#6b4028" roughness={0.72} />
          {/* -x left edge (spine side): slightly lighter */}
          <meshStandardMaterial attach="material-1" color="#7a4c32" roughness={0.7} />
          {/* +y top: cover color */}
          <meshStandardMaterial attach="material-2" color={PALETTE.bookA} roughness={0.7} />
          {/* -y bottom: cover color */}
          <meshStandardMaterial attach="material-3" color={PALETTE.bookA} roughness={0.7} />
          {/* +z spine: textured label */}
          <meshStandardMaterial attach="material-4" map={spineTexture} roughness={0.6} />
          {/* -z front cover: the main cover texture */}
          <meshStandardMaterial attach="material-5" map={coverTexture} roughness={0.65} />
        </mesh>
      </group>

      {/* open spread (reading state) */}
      <group ref={openGroup} position={[0.09, 0.03, -1.62]} rotation={[0, 0, -0.04]} visible={false}>
        {/* left page — cream pixel paper */}
        <mesh
          castShadow
          position={[-0.126, 0, 0]}
          rotation={[0, 0.06, 0]}
          onPointerOver={hover}
          onPointerOut={unhover}
          onClick={openCaseStudy}
        >
          <planeGeometry args={[0.25, 0.34]} />
          <meshStandardMaterial map={paperTexture} color="#ffffff" roughness={0.88} side={THREE.DoubleSide} />
        </mesh>
        {/* right page (carries the current project's face texture), hinged at
            the spine so it can fold shut over the left page on close */}
        <group ref={rightPivot as React.RefObject<THREE.Group>}>
          <mesh
            ref={rightPageMesh as React.RefObject<THREE.Mesh>}
            castShadow
            position={[0.126, 0, 0]}
            rotation={[0, -0.06, 0]}
            onPointerOver={hover}
            onPointerOut={unhover}
            onClick={openCaseStudy}
          >
            <planeGeometry args={[0.25, 0.34]} />
            <meshStandardMaterial map={null} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
        {/* front binding line at the gutter */}
        <mesh position={[0, 0, -0.004]}>
          <boxGeometry args={[0.02, 0.345, 0.01]} />
          <meshStandardMaterial color="#9a6540" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* invisible-in-waiting turning page, hinged AT the spine */}
        <group ref={turningPage as React.RefObject<THREE.Group>} visible={false}>
          <mesh position={[0.125, 0, 0.004]}>
            <planeGeometry args={[0.25, 0.34]} />
            <meshStandardMaterial color="#f0e6d0" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
