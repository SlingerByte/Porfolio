import { useEffect, useCallback, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from '../../motion/gsap'
import { useExperience } from '../../state/ExperienceContext'
import { PALETTE } from '../palette'

/**
 * The studio's resident. Black cat watches the night through the window
 * (moon rim draws its silhouette). It lives here, it doesn't perform.
 */

/* ------------------------------------------------------------------ */
/* Black cat — a real pixel-art silhouette, seen from BEHIND, sitting on
   the windowsill facing the moonlit pane. Drawn as a canvas sprite (low
   res + nearest filtering = the scene's pixel identity) instead of a
   stack of boxes. Its tail sweeps from one side to the other now and then. */

const CAT_W = 128
const CAT_H = 176

/**
 * Draw the cat silhouette at a given tail swing (radians). The tail base
 * stays by the body; the tip sweeps from one side to the other and rises
 * at each end — a natural "swish".
 */
function drawCat(angle: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CAT_W
  canvas.height = CAT_H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, CAT_W, CAT_H)
  ctx.fillStyle = PALETTE.catBlack

  // tail — swings side to side; the tip arcs across the frame
  const tipX = 88 + Math.sin(angle) * 42
  const tipY = 138 - Math.abs(Math.sin(angle)) * 34
  const ctrlX = (76 + tipX) / 2
  const ctrlY = (130 + tipY) / 2 + 8
  ctx.strokeStyle = PALETTE.catBlack
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(76, 130)
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(tipX, tipY, 6, 0, Math.PI * 2)
  ctx.fill()

  // seated body (back view): wide base, narrowing up into the shoulders
  ctx.beginPath()
  ctx.moveTo(38, 138)
  ctx.quadraticCurveTo(34, 104, 44, 88)
  ctx.quadraticCurveTo(52, 77, 61, 77)
  ctx.quadraticCurveTo(70, 77, 78, 88)
  ctx.quadraticCurveTo(88, 104, 84, 138)
  ctx.quadraticCurveTo(84, 149, 61, 149)
  ctx.quadraticCurveTo(38, 149, 38, 138)
  ctx.fill()

  // head with two triangular ears
  ctx.beginPath()
  ctx.moveTo(43, 51)
  ctx.lineTo(54, 18)
  ctx.lineTo(63, 48)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(58, 46)
  ctx.lineTo(68, 18)
  ctx.lineTo(79, 51)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(61, 56, 18, 0, Math.PI * 2)
  ctx.fill()

  // a faint cold rim on the moonlit side — moonlight catching the fur
  ctx.strokeStyle = 'rgba(120, 150, 190, 0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(83, 140)
  ctx.quadraticCurveTo(87, 104, 78, 90)
  ctx.stroke()

  return canvas
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter // pixel-art identity
  return texture
}

/**
 * Black cat — sitting on the windowsill, facing the night. A canvas pixel
 * sprite (back view) instead of primitives. Every ~12s (randomly) its tail
 * sweeps from one side to the other. Reduced motion: one still frame.
 */
export function BlackCat() {
  const { reducedMotion } = useExperience()
  const meshRef = useRef<THREE.Mesh>(null)
  const currentTex = useRef<THREE.CanvasTexture | null>(null)
  const swishTl = useRef<gsap.core.Timeline | null>(null)
  const tail = useRef({ angle: 0 })
  const initialTex = useMemo(() => makeTexture(drawCat(0)), [])

  // redraw the sprite with the tail at a given swing angle
  const applyTail = useCallback((angle: number) => {
    const mat = meshRef.current?.material
    if (!mat || Array.isArray(mat)) return
    const tex = makeTexture(drawCat(angle))
    if (currentTex.current) currentTex.current.dispose()
    currentTex.current = tex
    const standard = mat as THREE.MeshStandardMaterial
    standard.map = tex
    standard.needsUpdate = true
  }, [])

  // keep the initial texture tracked for disposal
  useEffect(() => {
    currentTex.current = initialTex
    return () => {
      swishTl.current?.kill()
      swishTl.current = null
      currentTex.current?.dispose()
      currentTex.current = null
    }
  }, [initialTex])

  // every ~12s (randomly) the tail sweeps from one side to the other
  useEffect(() => {
    if (reducedMotion) return undefined
    let cancelled = false
    let timer: number | undefined

    const swish = () => {
      const obj = tail.current
      swishTl.current?.kill()
      swishTl.current = gsap
        .timeline({
          onUpdate: () => applyTail(obj.angle),
        })
        .to(obj, { angle: 0.95, duration: 0.4, ease: 'sine.inOut' })
        .to(obj, { angle: -0.95, duration: 0.9, ease: 'sine.inOut' })
        .to(obj, { angle: 0, duration: 0.45, ease: 'sine.inOut' })
    }

    const schedule = () => {
      if (cancelled) return
      const delay = 9000 + Math.random() * 6000 // 9–15s, ~12s on average
      timer = window.setTimeout(() => {
        if (cancelled) return
        swish()
        schedule()
      }, delay)
    }

    schedule()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
      swishTl.current?.kill()
      swishTl.current = null
    }
  }, [reducedMotion, applyTail])

  const hover = () => {
    document.body.style.cursor = 'pointer'
  }
  const unhover = () => {
    document.body.style.cursor = 'auto'
  }

  return (
    <group position={[-2.7, 1.535, -1.87]}>
      {/* soft contact shadow on the sill, right under the cat's paws */}
      <mesh position={[0, -0.342, 0.015]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.3, 1]}>
        <circleGeometry args={[0.22, 16]} />
        <meshBasicMaterial color="#05070c" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {/* the cat — a pixel silhouette against the moon pane */}
      <mesh ref={meshRef} onPointerOver={hover} onPointerOut={unhover}>
        <planeGeometry args={[0.5, 0.69]} />
        <meshStandardMaterial
          map={initialTex}
          transparent
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>
    </group>
  )
}