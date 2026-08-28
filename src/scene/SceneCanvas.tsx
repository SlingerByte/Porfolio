import { useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from '../motion/gsap'
import { Room } from './Room'
import { LampRig } from './LampRig'
import { CameraRig } from './CameraRig'
import { useExperience } from '../state/ExperienceContext'
import { CAMERA_FOV, getCameraFov, MOON_INTENSITY } from './config'
import { CAMERA_POSES, getPoseTier } from './cameraPoses'
import { sceneStats } from './stats'
import { registerInvalidator } from './invalidate'

/** Polls renderer.info into the module-level stats object for dev panels. */
function StatsBridge() {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const id = window.setInterval(() => {
      sceneStats.calls = gl.info.render.calls
      sceneStats.triangles = gl.info.render.triangles
      sceneStats.geometries = gl.info.memory.geometries
      sceneStats.textures = gl.info.memory.textures
    }, 500)
    return () => window.clearInterval(id)
  }, [gl])
  return null
}

/**
 * True while GSAP has at least one playing animation. Mirrors GSAP's own
 * ticker auto-sleep logic (walks the global timeline's children, looking
 * for a non-paused one), so paused/completed tweens never keep us rendering.
 */
function gsapIsPlaying(): boolean {
  const first = (gsap.globalTimeline as unknown as { _first: unknown })._first
  let child = first as { _ts?: number; _next?: unknown } | null
  while (child) {
    if (child._ts) return true
    child = (child._next as typeof child | null | undefined) ?? null
  }
  return false
}

/** Wakes one frame whenever a scene animation starts — the primer. */
function FrameInvalidator() {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    registerInvalidator(invalidate)
    return () => registerInvalidator(null)
  }, [invalidate])
  return null
}

/**
 * Phase 6: keep the camera FOV in sync with the responsive breakpoint. The
 * Canvas FOV is set once at mount; resizing across the 640px line changes
 * the pose tier (CameraRig) but not the FOV, so portrait/landscape rotation
 * would keep a stale lens. Event-driven on size change — no per-frame work.
 */
function CameraFov() {
  const size = useThree((state) => state.size)
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  useEffect(() => {
    const fov = getCameraFov(size.width)
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [size.width, camera])
  return null
}

/**
 * frameloop="demand" chaining: while a GSAP animation plays, each rendered
 * frame requests exactly one more, so the scene animates smoothly; the
 * instant the last animation finishes, the loop falls completely quiet.
 */
function DemandFrame() {
  const invalidate = useThree((state) => state.invalidate)
  useFrame(() => {
    if (gsapIsPlaying()) invalidate()
  })
  return null
}

/**
 * The whole WebGL world, isolated behind a default export so App can
 * lazy-load it (three/R3F/GSAP live in their own chunk — M1 perf debt fix).
 * Everything inside reads global state from ExperienceContext.
 *
 * frameloop="demand" (Phase 3): the canvas only renders while invalidated.
 * Scene animations are all GSAP-driven — they prime one frame via
 * `requestRender()` and DemandFrame chains the rest; idle renders nothing
 * (which also stops the shadow map, since it only runs inside render()).
 */
export default function SceneCanvas() {
  const { pixelScale } = useExperience()
  // Phase 6: the establishing shot is the CURRENT tier's hero pose, not the
  // desktop one — tablet/mobile no longer zoom out from the desktop framing
  // during load (the CameraRig mount dolly becomes a no-op).
  const width = typeof window !== 'undefined' ? window.innerWidth : CAMERA_FOV
  const initialPose = CAMERA_POSES[getPoseTier(width)].hero

  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={pixelScale}
      camera={{
        fov: getCameraFov(width),
        position: [...initialPose.position] as [number, number, number],
        near: 0.1,
        far: 60,
      }}
      gl={{ antialias: false }}
      onCreated={({ gl, camera }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        // Phase 4 (kept): orient the very FIRST frame at the hero pose
        // instead of R3F's default lookAt(0,0,0), so there is no
        // "scene appears too high / drops into place" jump. Now also
        // tier-correct: the hero target belongs to the current device.
        camera.position.set(...initialPose.position)
        camera.lookAt(...initialPose.target)
      }}
    >
      <color attach="background" args={['#07080c']} />
      {/* OFF-state support lights: moonlight + the monitor's own spill
          (the monitor light lives inside <Monitor /> and reacts to narrative) */}
      <directionalLight position={[-6, 4, -1]} intensity={MOON_INTENSITY} color="#8490ce" />

      <Room />
      <LampRig />
      <CameraRig />
      <CameraFov />
      <FrameInvalidator />
      <DemandFrame />
      <StatsBridge />
    </Canvas>
  )
}