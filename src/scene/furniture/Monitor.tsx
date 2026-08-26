import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { gsap } from '../../motion/gsap'
import { useExperience } from '../../state/ExperienceContext'
import { useI18n } from '../../content/strings'
import { PALETTE } from '../palette'
import { SCREEN_EMISSIVE } from '../config'

/**
 * Monitor: sole owner of the screen state machine — and of its DIEGETIC
 * content (M5.10): the room's screen is a runtime canvas texture, never
 * DOM. It IDENTIFIES (whoami / experience / education) — the deep read
 * lives behind OPEN DISPLAY.
 *
 *   idle   — identity terminal, dim cold spill
 *   focus  — narrative === 'monitor': wake flicker, spill grows; camera holds.
 *
 * Clicking the screen opens the focused display (the other affordance is
 * the docked OPEN DISPLAY action in the focus layer).
 */

const SCREEN_W = 512 // M5.11: 256 -> 512 (definition pass; pixel scale untouched)
const SCREEN_H = 296

function drawScreen(lines: string[], accentIndex: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SCREEN_W
  canvas.height = SCREEN_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0d2019'
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'bold 20px "Courier New", monospace'
  lines.forEach((line, i) => {
    const y = 40 + i * 28
    if (line.startsWith('$ ') || i === accentIndex) {
      ctx.fillStyle = '#a9f2d4'
      ctx.fillText(line.toUpperCase(), 24, y)
    } else {
      ctx.fillStyle = '#eafff5'
      ctx.fillText(line, 24, y)
    }
  })
  // block cursor on the last prompt line
  const last = lines.length - 1
  if (lines[last].startsWith('$')) {
    ctx.fillStyle = '#a9f2d4'
    ctx.fillRect(24 + ctx.measureText(lines[last]).width + 6, 40 + last * 28 - 18, 12, 20)
  }
  // subtle scanline treatment to match the pixel identity
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
  for (let y = 0; y < SCREEN_H; y += 6) ctx.fillRect(0, y, SCREEN_W, 2)
  return canvas
}

/** The diegetic screen: identify, nothing more. The deep read is one click away. */
const IDLE_ACCENT = 1 // the name glows like an active output line
const FOCUS_ACCENT = -1

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter // pixel-art identity
  return texture
}

export function Monitor() {
  const { narrative, reducedMotion, focus, setFocus } = useExperience()
  const { t } = useI18n()
  const screenMat = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.PointLight>(null)

  const active = narrative === 'monitor'
  /** clickable only while this beat owns the camera */
  const interactive = active && focus === 'none'

  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = interactive ? 'pointer' : 'auto'
  }
  const unhover = () => {
    document.body.style.cursor = 'auto'
  }
  const openDisplay = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (interactive) setFocus('monitor')
  }

  // two pre-drawn screens; textures disposed on unmount
  const textures = useMemo(() => {
    const idle = t('screenIdle').split('\n')
    const focus = t('screenFocus').split('\n')
    return {
      idle: makeTexture(drawScreen(idle, IDLE_ACCENT)),
      focus: makeTexture(drawScreen(focus, FOCUS_ACCENT)),
    }
  }, [t])
  useEffect(
    () => () => {
      textures.idle.dispose()
      textures.focus.dispose()
    },
    [textures]
  )

  useEffect(() => {
    const material = screenMat.current
    if (!material) return
    const duration = reducedMotion ? 0 : 0.9

    material.map = active ? textures.focus : textures.idle
    material.emissiveMap = material.map
    material.needsUpdate = true

    if (reducedMotion || !active) {
      const tweens = [
        gsap.to(material, { emissiveIntensity: active ? 1.15 : SCREEN_EMISSIVE, duration }),
        gsap.to(light.current, { intensity: active ? 2.4 : 0.7, duration }),
      ]
      return () => tweens.forEach((t) => t.kill())
    }

    // WAKE sequence: brief flicker, then settle bright — the monitor "wakes up"
    const tl = gsap.timeline()
    tl.to(material, { emissiveIntensity: 1.5, duration: 0.12 })
      .to(material, { emissiveIntensity: 0.5, duration: 0.08 })
      .to(material, { emissiveIntensity: 1.7, duration: 0.1 })
      .to(material, { emissiveIntensity: 1.15, duration: 0.6, ease: 'power2.out' })
      .to(light.current, { intensity: 2.4, duration: 0.7, ease: 'power2.out' }, 0.25)
    return () => {
      tl.kill()
    }
  }, [active, reducedMotion, textures])

  const bezelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.bezel, roughness: 0.42, metalness: 0.15 }),
    []
  )

  return (
    <group position={[0.55, 0, -1.12]}>
      {/* base + neck */}
      <mesh position={[0, 0.84, 0.04]} castShadow material={bezelMat}>
        <boxGeometry args={[0.34, 0.035, 0.24]} />
      </mesh>
      <mesh position={[0, 1.03, 0]} castShadow material={bezelMat}>
        <boxGeometry args={[0.07, 0.34, 0.05]} />
      </mesh>
      {/* panel */}
      <mesh
        position={[0, 1.38, 0]}
        castShadow
        material={bezelMat}
        onPointerOver={hover}
        onPointerOut={unhover}
        onClick={openDisplay}
      >
        <boxGeometry args={[0.7, 0.44, 0.04]} />
      </mesh>
      {/* screen */}
      <mesh
        position={[0, 1.38, 0.022]}
        onPointerOver={hover}
        onPointerOut={unhover}
        onClick={openDisplay}
      >
        <planeGeometry args={[0.64, 0.37]} />
        <meshStandardMaterial
          ref={screenMat}
          map={textures.idle}
          emissiveMap={textures.idle}
          emissive="#ffffff"
          color={PALETTE.screenBase}
          emissiveIntensity={SCREEN_EMISSIVE}
        />
      </mesh>

      {/* the monitor's own cold spill — reacts with the screen */}
      <pointLight
        ref={light}
        position={[0, 1.32, 0.5]}
        intensity={0.7}
        distance={3.5}
        decay={1.8}
        color="#3fae85"
      />
    </group>
  )
}
