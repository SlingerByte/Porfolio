import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { gsap } from '../../motion/gsap'
import { useExperience } from '../../state/ExperienceContext'
import { useContent } from '../../state/useContent'
import { useI18n } from '../../content/strings'
import { buildNotes, type NoteSpec } from './boardNotes'
import { PALETTE } from '../palette'

/**
 * Corkboard above the shelf: the Skills anchor point — a PHYSICAL board
 * (M5.10/M5.11). Post-its are canvas-textured with real family/skill names
 * so the scene explains itself; no DOM ever sits on it. A small pinned
 * sign names the board ("// SKILLS"). When narrative === 'skills' the
 * notes appear progressively, like cards being pinned while you watch.
 * Clicking the board opens VIEW ALL SKILLS.
 */

const NOTE_W = 256 // M7.1+: 160 -> 256 so the pinned skills read at a glance
const NOTE_H = 256

const NOTE_BG = ['#f2cf7e', '#cfe0b4', '#e8b48d'] as const
const NOTE_FG = ['#3a2c17', '#26301c', '#3a2317'] as const

function drawNote(note: NoteSpec): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = NOTE_W
  canvas.height = NOTE_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = NOTE_BG[note.colorIndex]
  ctx.fillRect(0, 0, NOTE_W, NOTE_H)
  // pin
  ctx.fillStyle = 'rgba(60, 40, 20, 0.85)'
  ctx.beginPath()
  ctx.arc(NOTE_W / 2, 22, 11, 0, Math.PI * 2)
  ctx.fill()

  let y = 88
  if (note.family) {
    ctx.fillStyle = NOTE_FG[note.colorIndex]
    ctx.font = 'bold 26px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(note.family.toUpperCase(), NOTE_W / 2, y, NOTE_W - 24)
    y += 46
    ctx.fillRect(58, y - 20, NOTE_W - 116, 3)
    y += 34
  }
  ctx.font = 'bold 22px "Courier New", monospace'
  ctx.textAlign = 'center'
  for (const item of note.items) {
    ctx.fillStyle = NOTE_FG[note.colorIndex]
    ctx.fillText(item.toUpperCase(), NOTE_W / 2, y, NOTE_W - 18)
    y += 36
  }
  return canvas
}

const SIGN_W = 320
const SIGN_H = 80

function drawSign(label: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SIGN_W
  canvas.height = SIGN_H
  const ctx = canvas.getContext('2d')!
  // crisp off-white card — maximum contrast for the board's name
  ctx.fillStyle = '#fdf6e3'
  ctx.fillRect(0, 0, SIGN_W, SIGN_H)
  ctx.strokeStyle = 'rgba(70, 48, 16, 0.4)'
  ctx.lineWidth = 3
  ctx.strokeRect(3, 3, SIGN_W - 6, SIGN_H - 6)
  // two pins, one at each end — a sign, not a sticky
  ctx.fillStyle = 'rgba(60, 40, 20, 0.9)'
  for (const px of [22, SIGN_W - 22]) {
    ctx.beginPath()
    ctx.arc(px, SIGN_H / 2, 7, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#33240f'
  ctx.font = 'bold 38px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label.toUpperCase(), SIGN_W / 2, SIGN_H / 2 + 3)
  return canvas
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter // pixel-art identity
  return texture
}

export function Corkboard() {
  const { narrative, reducedMotion, focus, setFocus } = useExperience()
  const { skills } = useContent()
  const { t } = useI18n()
  const active = narrative === 'skills'
  /** clickable only while this beat owns the camera */
  const interactive = active && focus === 'none'
  const notes = useRef<(THREE.Mesh | null)[]>([])

  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = interactive ? 'pointer' : 'auto'
  }
  const unhover = () => {
    document.body.style.cursor = 'auto'
  }
  const viewAllSkills = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (interactive) setFocus('corkboard')
  }

  // diegetic note + sign faces: real names drawn into the scene, per language
  const noteSpecs = useMemo(() => buildNotes(skills), [skills])
  const textures = useMemo(() => noteSpecs.map((n) => makeTexture(drawNote(n))), [noteSpecs])
  const signTexture = useMemo(() => makeTexture(drawSign(t('skillsSign'))), [t])
  useEffect(
    () => () => {
      textures.forEach((t) => t.dispose())
      signTexture.dispose()
    },
    [textures, signTexture]
  )

  // cork material shared by every note's non-front faces
  const sideMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.cork, roughness: 0.95 }),
    []
  )
  const faceMats = useMemo(
    () => textures.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })),
    [textures]
  )
  const signMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.9 }),
    [signTexture]
  )
  useEffect(
    () => () => {
      faceMats.forEach((m) => m.dispose())
      signMat.dispose()
      sideMat.dispose()
    },
    [faceMats, signMat, sideMat]
  )

  useEffect(() => {
    const targets = notes.current.filter((m): m is THREE.Mesh => Boolean(m))
    if (reducedMotion) {
      for (const mesh of targets) mesh.scale.setScalar(active ? 1 : 0.01)
      return
    }
    const tweens = targets.map((mesh, i) =>
      gsap.to(mesh.scale, {
        x: active ? 1 : 0.01,
        y: active ? 1 : 0.01,
        z: active ? 1 : 0.01,
        duration: 0.45,
        ease: active ? 'back.out(2)' : 'power2.in',
        delay: active ? i * 0.14 : 0,
      })
    )
    return () => tweens.forEach((t) => t.kill())
  }, [active, reducedMotion])

  return (
    <group position={[1.42, 2.95, -1.96]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.36, 0.03]} />
        <meshStandardMaterial color={PALETTE.cork} roughness={0.95} />
      </mesh>

      {/* the board's name: always visible, so the scene reads "skills" at
          a glance — a physical sign, not an overlay */}
      <mesh
        position={[-0.28, 0.245, 0.02]}
        rotation={[0, 0, 0.03]}
        castShadow
        material={[sideMat, sideMat, sideMat, sideMat, signMat, sideMat]}
        onPointerOver={hover}
        onPointerOut={unhover}
        onClick={viewAllSkills}
      >
        <boxGeometry args={[0.27, 0.0675, 0.008]} />
      </mesh>

      {noteSpecs.map((note, i) => (
        <mesh
          key={i}
          ref={(m) => {
            notes.current[i] = m
          }}
          position={[note.x, note.y, 0.02]}
          rotation={[0, 0, note.rot]}
          scale={[0.01, 0.01, 0.01]}
          castShadow
          material={[sideMat, sideMat, sideMat, sideMat, faceMats[i], sideMat]}
          onPointerOver={hover}
          onPointerOut={unhover}
          onClick={viewAllSkills}
        >
          <boxGeometry args={[0.08, 0.08, 0.004]} />
        </mesh>
      ))}
    </group>
  )
}
