import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Room } from './Room'
import { LampRig } from './LampRig'
import { CameraRig } from './CameraRig'
import { useExperience } from '../state/ExperienceContext'
import { CAMERA_FOV, getCameraFov, MOON_INTENSITY } from './config'
import { HERO_ESTABLISHING } from './cameraPoses'
import { sceneStats } from './stats'

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
 * The whole WebGL world, isolated behind a default export so App can
 * lazy-load it (three/R3F/GSAP live in their own chunk — M1 perf debt fix).
 * Everything inside reads global state from ExperienceContext.
 */
export default function SceneCanvas() {
  const { pixelScale } = useExperience()

  return (
    <Canvas
      shadows
      dpr={pixelScale}
      camera={{
        fov: getCameraFov(typeof window !== 'undefined' ? window.innerWidth : CAMERA_FOV),
        position: [...HERO_ESTABLISHING.position] as [number, number, number],
        near: 0.1,
        far: 60,
      }}
      gl={{ antialias: false }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={['#07080c']} />
      {/* OFF-state support lights: moonlight + the monitor's own spill
          (the monitor light lives inside <Monitor /> and reacts to narrative) */}
      <directionalLight position={[-6, 4, -1]} intensity={MOON_INTENSITY} color="#7d95c9" />

      <Room />
      <LampRig />
      <CameraRig />
      <StatsBridge />
    </Canvas>
  )
}
