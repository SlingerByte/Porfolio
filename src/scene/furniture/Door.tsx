import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { gsap } from '../../motion/gsap'
import { useExperience } from '../../state/ExperienceContext'
import { useI18n } from '../../content/strings'
import { PALETTE } from '../palette'
import { playKnock } from '../sound'

/**
 * Structural door (~85% horizontal) — the narrative endpoint of the journey.
 * When narrative === 'contact' a faint warm leak fades in at the frame's
 * edge: light from the hallway. The exit is "on".
 *
 * The door is ALIVE only while you're at it: a knock is TWO soft hits (the
 * door swings inward on its hinges twice, with a beat between — toc, toc —
 * and settles). Touching the door (pointer over) answers with that same
 * double knock, and every few seconds (randomly, up to ~15s) the door
 * knocks on its own — but never outside the contact beat.
 *
 * The door opens NO modal: contact lives in the DOM speech bubble
 * (ui/sections/Contact), so the door stays purely diegetic.
 */

const PLATE_W = 256 // M5.11: 128 -> 256 (definition pass; pixel scale untouched)
const PLATE_H = 64

/** small screens: bigger onomatopoeia sprites so they stay readable */
const MOBILE = typeof window !== 'undefined' && window.innerWidth <= 640

function drawPlate(label: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PLATE_W
  canvas.height = PLATE_H
  const ctx = canvas.getContext('2d')!
  const brass = ctx.createLinearGradient(0, 0, 0, PLATE_H)
  brass.addColorStop(0, '#e7bd6a')
  brass.addColorStop(0.5, '#d9a748')
  brass.addColorStop(1, '#b8893a')
  ctx.fillStyle = brass
  ctx.fillRect(0, 0, PLATE_W, PLATE_H)
  ctx.strokeStyle = 'rgba(70, 48, 16, 0.55)'
  ctx.lineWidth = 4
  ctx.strokeRect(4, 4, PLATE_W - 8, PLATE_H - 8)
  ctx.fillStyle = '#3c2a10'
  ctx.font = 'bold 22px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('E. OVIEDO', PLATE_W / 2, 28)
  ctx.font = 'bold 18px "Courier New", monospace'
  ctx.fillText(label.toUpperCase(), PLATE_W / 2, 52)
  return canvas
}

/** Comic onomatopoeia for one knock — transparent canvas, drawn once. */
function drawKnockText(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 80
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 160, 80)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 40px Impact, "Arial Black", "Helvetica Neue", sans-serif'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(24, 13, 5, 0.95)'
  ctx.lineWidth = 7
  ctx.strokeText('TOC', 80, 42)
  ctx.fillStyle = '#ffc06a'
  ctx.fillText('TOC', 80, 42)
  return canvas
}

export function Door() {
  const { narrative, reducedMotion } = useExperience()
  const { t } = useI18n()
  const active = narrative === 'contact'
  const doorRef = useRef<THREE.Group>(null)
  const hingeRef = useRef<THREE.Group>(null)
  const leak = useRef<THREE.PointLight>(null)
  const knobRef = useRef<THREE.Mesh>(null)
  const tocRefs = useRef<(THREE.Sprite | null)[]>([])
  const tocMats = useRef<(THREE.SpriteMaterial | null)[]>([])
  const activeRef = useRef(active)
  activeRef.current = active

  /**
   * one knock event = TWO soft hits: the door swings inward on its hinges
   * twice (with a beat between — toc, toc), the knob presses, the hallway
   * light flares, and a small "TOC·TOC" pops above the touch point.
   */
  const knock = useCallback((touch?: THREE.Vector3) => {
    const hinge = hingeRef.current
    const light = leak.current
    if (!hinge || !light) return

    // where the knock lands — the pointer point when touched, else the center
    const origin = new THREE.Vector3(0, 1.19, 0)
    if (touch && doorRef.current) {
      doorRef.current.updateWorldMatrix(true, false)
      const local = doorRef.current.worldToLocal(touch.clone())
      origin.x = Math.max(-0.44, Math.min(0.44, local.x))
      origin.y = Math.max(0.4, Math.min(1.9, local.y))
    }

    const tl = gsap.timeline()
    // hit 1 — the door pushes inward and springs back
    tl.to(hinge.rotation, { y: 0.06, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0)
    tl.to(hinge.position, { z: -0.014, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0)
    tl.to(light, { intensity: 2.2, duration: 0.07, yoyo: true, repeat: 1 }, 0)
    // hit 2 — a touch lighter, after a beat
    tl.to(hinge.rotation, { y: 0.05, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.2)
    tl.to(hinge.position, { z: -0.012, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.2)
    tl.to(light, { intensity: 2.2, duration: 0.07, yoyo: true, repeat: 1 }, 0.2)
    tl.to(light, { intensity: activeRef.current ? 1.4 : 0, duration: 0.7, ease: 'power2.out' }, 0.32)
    if (knobRef.current) {
      tl.to(
        knobRef.current.scale,
        { x: 0.93, y: 0.93, z: 0.93, duration: 0.05, yoyo: true, repeat: 1, ease: 'power1.inOut' },
        0
      )
      tl.to(
        knobRef.current.scale,
        { x: 0.93, y: 0.93, z: 0.93, duration: 0.05, yoyo: true, repeat: 1, ease: 'power1.inOut' },
        0.2
      )
    }

    // a comic onomatopoeia pops once per hit, like a comic panel: first
    // "TOC" with the first hit, a second "TOC" a beat later. On small
    // screens the sprites are scaled up so they stay readable.
    const TOC_W = MOBILE ? 0.95 : 0.44
    const TOC_H = MOBILE ? 0.475 : 0.22
    const popToc = (i: number, x: number, y: number, at: number) => {
      const sprite = tocRefs.current[i]
      const mat = tocMats.current[i]
      if (!sprite || !mat) return
      sprite.visible = true
      sprite.position.set(x, y, 0.22)
      sprite.scale.set(0.001, 0.001, 1)
      sprite.rotation.z = i === 0 ? -0.12 : 0.1
      mat.opacity = 1
      tl.to(sprite.scale, { x: TOC_W, y: TOC_H, z: 1, duration: 0.24, ease: 'back.out(2.4)' }, at)
      tl.to(sprite.position, { y: y + 0.12, duration: 0.32, ease: 'power2.out' }, at)
      tl.to(sprite.rotation, { z: 0, duration: 0.22, ease: 'power1.inOut' }, at)
      tl.to(mat, { opacity: 0, duration: 0.24, ease: 'power2.in' }, at + 0.24)
      tl.call(
        () => {
          sprite.visible = false
        },
        [],
        at + 0.48
      )
    }
    popToc(0, origin.x - 0.08, origin.y + 0.28, 0.06)
    popToc(1, origin.x + 0.12, origin.y + 0.42, 0.24)

    // the knock is heard, too — one wood knock per hit
    tl.call(() => playKnock(), [], 0)
    tl.call(() => playKnock(), [], 0.2)
  }, [])

  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = active ? 'pointer' : 'auto'
    // touching the door answers with a soft knock right where you touched
    if (active && !reducedMotion) knock(e.point)
  }
  // on touch there is no hover — tapping the door knocks too
  const touchKnock = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (active && !reducedMotion) knock(e.point)
  }
  const unhover = () => {
    document.body.style.cursor = 'auto'
  }

  const plateTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(drawPlate(t('doorPlate')))
    texture.colorSpace = THREE.SRGBColorSpace
    texture.magFilter = THREE.NearestFilter
    return texture
  }, [t])
  const knockTextTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(drawKnockText())
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
  useEffect(
    () => () => {
      plateTexture.dispose()
      knockTextTexture.dispose()
    },
    [plateTexture, knockTextTexture]
  )

  // base hallway leak: present only at the contact beat
  useEffect(() => {
    if (!leak.current) return
    const tween = gsap.to(leak.current, {
      intensity: active ? 1.4 : 0,
      duration: reducedMotion ? 0 : 1.2,
      ease: 'power2.inOut',
    })
    return () => {
      tween.kill()
    }
  }, [active, reducedMotion])

  // idle "someone is knocking": the door knocks on its own at random
  // intervals (up to ~15s), only while the reader is at the contact beat
  useEffect(() => {
    if (reducedMotion || !active) return undefined
    const light = leak.current
    if (!light) return undefined

    let timer: number | undefined
    let cancelled = false

    const scheduleNext = (first: boolean) => {
      if (cancelled) return
      // first knock shortly after arriving, then occasionally up to 15s
      const delay = first ? 2000 + Math.random() * 2000 : 4000 + Math.random() * 11000
      timer = window.setTimeout(() => {
        if (cancelled) return
        knock()
        scheduleNext(false)
      }, delay)
    }

    scheduleNext(true)
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [active, reducedMotion, knock])

  return (
    <group ref={doorRef} position={[3.1, 0, -1.94]}>
      {/* casing — fixed to the wall */}
      <mesh position={[0, 2.42, 0]} castShadow>
        <boxGeometry args={[1.18, 0.12, 0.14]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh position={[-0.56, 1.2, 0]} castShadow>
        <boxGeometry args={[0.11, 2.44, 0.14]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh position={[0.56, 1.2, 0]} castShadow>
        <boxGeometry args={[0.11, 2.44, 0.14]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>

      {/* the slab assembly, hinged at the left edge so it swings when knocked */}
      <group position={[-0.5, 0, 0]}>
        <group ref={hingeRef}>
          {/* slab: slightly smoother than casing so warm light grazes it */}
          <mesh
            position={[0.5, 1.19, 0]}
            castShadow
            receiveShadow
            onPointerOver={hover}
            onPointerOut={unhover}
            onPointerDown={touchKnock}
          >
            <boxGeometry args={[1.0, 2.32, 0.08]} />
            <meshStandardMaterial color={PALETTE.woodMid} roughness={0.58} />
          </mesh>
          {/* inset panels */}
          <mesh position={[0.5, 1.68, 0.045]}>
            <boxGeometry args={[0.7, 0.82, 0.02]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
          </mesh>
          <mesh position={[0.5, 0.66, 0.045]}>
            <boxGeometry args={[0.7, 1.06, 0.02]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
          </mesh>
          {/* knob (brass accent: warm but discreet) */}
          <mesh ref={knobRef} position={[0.12, 1.16, 0.07]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color="#d9a748" metalness={0.75} roughness={0.3} />
          </mesh>
          {/* brass nameplate in the rail between the panels */}
          <mesh position={[0.62, 1.225, 0.05]} onPointerOver={hover} onPointerOut={unhover} onPointerDown={touchKnock}>
            <boxGeometry args={[0.34, 0.085, 0.012]} />
            <meshStandardMaterial map={plateTexture} roughness={0.35} metalness={0.4} />
          </mesh>
        </group>
      </group>

      {/* comic onomatopoeia: two small "TOC" pops, one per knock hit */}
      {Array.from({ length: 2 }).map((_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            tocRefs.current[i] = el
          }}
          position={[0, 1.6, 0.22]}
          scale={[0.001, 0.001, 1]}
          visible={false}
        >
          <spriteMaterial
            ref={(m) => {
              tocMats.current[i] = m
            }}
            map={knockTextTexture}
            transparent
            depthWrite={false}
          />
        </sprite>
      ))}

      {/* hallway leak through the gap under the door */}
      <pointLight
        ref={leak}
        position={[0, 0.12, 0.25]}
        intensity={0}
        distance={2.2}
        decay={1.6}
        color="#ffc06a"
      />
    </group>
  )
}