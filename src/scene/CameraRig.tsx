import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from '../motion/gsap'
import { useExperience } from '../state/ExperienceContext'
import type { NarrativeState } from '../state/narrative'
import { CAMERA_POSES, VIA_ROOM, getPoseTier, type Pose } from './cameraPoses'
import { requestRender } from './invalidate'

/**
 * THE single owner of the camera.
 *
 * Paradigm (M5.4/M5.5): the scroll selects the narrative state; this rig maps
 * state → named pose and runs ONE finite, cinematographic transition per
 * change. While a pose holds, the camera does not move — the user reads.
 *
 * Choreography: moving between two focus moments passes through the
 * restored-room composition (pull back, re-aim, approach), so the room
 * never "slides sideways" behind the DOM.
 *
 * The rig also owns the `cameraSettled` flag: true exactly when a pose is
 * holding. The Spatial UI layer shows anchored surfaces only while settled,
 * so interfaces never chase a moving camera.
 *
 * Reduced motion: poses apply instantly; settled immediately.
 */

const FOCUS_DURATION = 1.7 // hero/room <-> focus dolly
const VIA_SPLIT = 0.42 // fraction of the trip spent pulling back to room

export function CameraRig() {
  const { camera, size } = useThree()
  const { narrative, reducedMotion, setCameraSettled } = useExperience()
  const tier = getPoseTier(size.width)

  const lookAt = useRef<THREE.Vector3>(new THREE.Vector3(...CAMERA_POSES.desktop.hero.target))
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const prevNarrative = useRef<NarrativeState>('hero')

  useEffect(() => {
    const table = CAMERA_POSES[tier]
    const pose: Pose = table[narrative]

    const proxy = {
      px: camera.position.x,
      py: camera.position.y,
      pz: camera.position.z,
      tx: lookAt.current.x,
      ty: lookAt.current.y,
      tz: lookAt.current.z,
    }

    const apply = () => {
      camera.position.set(proxy.px, proxy.py, proxy.pz)
      camera.lookAt(proxy.tx, proxy.ty, proxy.tz)
      lookAt.current.set(proxy.tx, proxy.ty, proxy.tz)
    }

    timelineRef.current?.kill()

    const finish = () => {
      prevNarrative.current = narrative
      setCameraSettled(true)
    }

    if (reducedMotion) {
      Object.assign(proxy, {
        px: pose.position[0],
        py: pose.position[1],
        pz: pose.position[2],
        tx: pose.target[0],
        ty: pose.target[1],
        tz: pose.target[2],
      })
      apply()
      finish()
      requestRender() // demand: the pose applied instantly still needs a frame
      return undefined
    }

    // focus -> focus travels through the restored-room composition
    const prev = prevNarrative.current
    const via =
      VIA_ROOM.has(narrative) && VIA_ROOM.has(prev) && prev !== narrative ? table.room : null

    setCameraSettled(false)
    const tl = gsap.timeline({
      onComplete: () => {
        timelineRef.current = null
        finish()
      },
    })
    timelineRef.current = tl
    requestRender() // demand primer: the dolly runs on chained frames from here

    if (via) {
      tl.to(proxy, {
        px: via.position[0],
        py: via.position[1],
        pz: via.position[2],
        tx: via.target[0],
        ty: via.target[1],
        tz: via.target[2],
        duration: FOCUS_DURATION * VIA_SPLIT,
        ease: 'power2.inOut',
        onUpdate: apply,
      })
    }
    tl.to(proxy, {
      px: pose.position[0],
      py: pose.position[1],
      pz: pose.position[2],
      tx: pose.target[0],
      ty: pose.target[1],
      tz: pose.target[2],
      duration: FOCUS_DURATION * (via ? 1 - VIA_SPLIT : 1),
      ease: 'power2.inOut',
      onUpdate: apply,
    })

    return () => {
      tl.kill()
      if (timelineRef.current === tl) timelineRef.current = null
    }
  }, [camera, narrative, reducedMotion, tier, setCameraSettled])

  return null
}
