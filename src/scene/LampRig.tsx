import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { gsap } from '../motion/gsap'
import { useExperience, type SceneStage } from '../state/ExperienceContext'
import {
  AMBIENT_OFF,
  AMBIENT_ON,
  LIGHT_OFF,
  LIGHT_ON,
} from './config'
import { playLampToggle } from './sound'

/**
 * THE single owner of the lamp and its warm light.
 *
 * Two deterministic, non-competing timelines (never running simultaneously):
 *   ON  — cord pull -> swing (+-4deg) -> flicker -> warm ramp -> stable
 *   OFF — physical inertia (smaller damped pendulum, cord follows) ->
 *         dip -> last warm glow -> irregular flicker -> extinction -> pool fade
 *
 * Both timelines write narrative SceneStages at key moments so the DOM
 * overlay can follow the light's story (space first, content after):
 *   ON:  stage1 @pull · stage2 @ramp · stage3 @room readable · stage4 @settled
 *   OFF: stage0 immediately — content recedes before the room does.
 *
 * The pull cord is a REAL cord: the BEAD moves (not the whole cord), the
 * hang point stays fixed to the socket, and a soft sagging tube connects
 * them — it straightens under tension when pulled and sags back at rest, so
 * it never looks detached or like a rigid stick.
 *
 * Toggling mid-sequence freezes the current timeline and starts the other
 * from frozen values (invalidate + restart): no residual state, no
 * accumulating timelines. Reduced motion: simple fades, zero movement.
 */

/** cord hangs from the socket and the bead rests below it */
const HANG_Y = -1.08
const BEAD_REST_Y = -1.48
/** how far a single toggle pull travels (matches the old choreography) */
const PULL_TARGET = BEAD_REST_Y - 0.22
/** absolute limit while dragging the bead down */
const MAX_BEAD_Y = BEAD_REST_Y - 0.3
/** pull distance at which the cord is fully taut */
const TENSION_PULL = 0.22

export function LampRig() {
  const { lampOn, reducedMotion, toggleLamp, setSceneStage } = useExperience()
  const group = useRef<THREE.Group>(null)
  const pullGroup = useRef<THREE.Group>(null)
  const cordRef = useRef<THREE.Mesh>(null)
  const cordGeom = useRef<THREE.BufferGeometry | null>(null)
  const beadRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const bulbMat = useRef<THREE.MeshStandardMaterial>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const onTl = useRef<gsap.core.Timeline | null>(null)
  const offTl = useRef<gsap.core.Timeline | null>(null)
  const swayRef = useRef<gsap.core.Tween | null>(null)
  const mounted = useRef(false)
  const prevEnd = useRef(new THREE.Vector3(0, BEAD_REST_Y, 0))

  /**
   * Rebuild the cord as a flexible tube from the FIXED hang point to the
   * bead's current position. Two things make it read as a cord, not a rod:
   * a visible gravity sag at rest (that stays slightly curved even when
   * taut), and the middle of the cord LAGGING behind the bead — when the
   * bead moves fast it bows and whips, then settles back. Pulling lengthens
   * the cord without moving its anchor, so it never looks detached.
   */
  const buildCord = useCallback(() => {
    const mesh = cordRef.current
    const bead = beadRef.current
    if (!mesh || !bead) return
    const hang = new THREE.Vector3(0, HANG_Y, 0)
    const end = bead.position.clone()
    // how fast the bead is moving → how much the middle lags behind
    const vel = end.clone().sub(prevEnd.current).length()
    const stretch = Math.max(0, BEAD_REST_Y - end.y)
    const tension = Math.min(1, stretch / TENSION_PULL)
    // gravity sag: visible at rest, keeps a slight curve even under tension
    const sag = 0.05 * (1 - tension * 0.55) + Math.min(0.05, vel * 1.4)
    // the middle trails the bead's swing too, so sideways motion waves it
    const mid = hang.clone().add(end).multiplyScalar(0.5)
    mid.x += (prevEnd.current.x - end.x) * 0.45
    mid.y -= sag
    prevEnd.current.copy(end)

    const curve = new THREE.QuadraticBezierCurve3(hang, mid, end)
    const geom = new THREE.TubeGeometry(curve, 20, 0.005, 6, false)
    if (cordGeom.current) cordGeom.current.dispose()
    cordGeom.current = geom
    mesh.geometry = geom
    // the invisible grab zone rides with the bead
    if (hitRef.current) hitRef.current.position.set(end.x, end.y + 0.08, 0)
  }, [])

  // build the soft cord once mounted (and keep its sag in sync with pulls)
  useEffect(() => {
    buildCord()
  }, [buildCord])

  // cord drag: grab the bead/cord and pull DOWN to toggle the lamp. The
  // bead is driven directly, so the top of the cord never leaves the socket.
  const dragRef = useRef({ active: false, startY: 0 })

  const onCordPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      const bead = beadRef.current
      if (!drag.active || !bead) return
      const dy = (e.clientY - drag.startY) * 0.0016
      bead.position.y = Math.max(MAX_BEAD_Y, Math.min(BEAD_REST_Y, BEAD_REST_Y - dy))
      buildCord()
    },
    [buildCord]
  )

  const onCordPointerUp = useCallback(
    (e: PointerEvent) => {
      window.removeEventListener('pointermove', onCordPointerMove)
      window.removeEventListener('pointerup', onCordPointerUp)
      window.removeEventListener('pointercancel', onCordPointerUp)
      const drag = dragRef.current
      drag.active = false
      document.body.style.cursor = ''
      const bead = beadRef.current
      if (!bead) return
      const moved = Math.abs(e.clientY - drag.startY)
      const pulled = bead.position.y < BEAD_REST_Y - 0.1
      if (moved < 8 || pulled) {
        // a tap or a real pull: turn the lamp, with the pull-click sound
        toggleLamp()
        playLampToggle()
      } else {
        // barely pulled — the bead springs back to its hang
        gsap.to(bead.position, {
          y: BEAD_REST_Y,
          x: 0,
          duration: 0.45,
          ease: 'elastic.out(1, 0.35)',
          onUpdate: buildCord,
        })
      }
    },
    [onCordPointerMove, toggleLamp, buildCord]
  )

  const cordHover = useCallback(() => {
    document.body.style.cursor = 'pointer'
  }, [])
  const cordLeave = useCallback(() => {
    document.body.style.cursor = ''
  }, [])

  const onCordPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      swayRef.current?.kill()
      swayRef.current = null
      dragRef.current = { active: true, startY: e.clientY }
      document.body.style.cursor = 'grabbing'
      window.addEventListener('pointermove', onCordPointerMove)
      window.addEventListener('pointerup', onCordPointerUp)
      window.addEventListener('pointercancel', onCordPointerUp)
    },
    [onCordPointerMove, onCordPointerUp]
  )

  // never leak the drag listeners if the rig unmounts mid-drag
  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onCordPointerMove)
      window.removeEventListener('pointerup', onCordPointerUp)
      window.removeEventListener('pointercancel', onCordPointerUp)
    },
    [onCordPointerMove, onCordPointerUp]
  )

  // build / rebuild both sequences
  useEffect(() => {
    if (
      !group.current ||
      !beadRef.current ||
      !light.current ||
      !bulbMat.current ||
      !ambient.current
    )
      return

    onTl.current?.kill()
    offTl.current?.kill()

    if (reducedMotion) {
      const on = gsap.timeline({ paused: true })
      on.call(() => setSceneStage(2 as SceneStage))
        .to(beadRef.current.position, { x: 0, y: BEAD_REST_Y, duration: 0.3 }, 0)
        .to(light.current, { intensity: LIGHT_ON, duration: 0.6, ease: 'power1.inOut' }, 0.15)
        .to(bulbMat.current, { emissiveIntensity: 2.5, duration: 0.6 }, 0.15)
        .to(ambient.current, { intensity: AMBIENT_ON, duration: 0.6 }, 0.15)
        .call(() => setSceneStage(3 as SceneStage), undefined, 0.5)
        .call(() => setSceneStage(4 as SceneStage), undefined, 0.85)

      const off = gsap.timeline({ paused: true })
      off.call(() => setSceneStage(0 as SceneStage)) // content recedes first
        .to(beadRef.current.position, { x: 0, y: BEAD_REST_Y, duration: 0.3 }, 0)
        .to(light.current, { intensity: LIGHT_OFF, duration: 0.5, ease: 'power1.inOut' }, 0)
        .to(bulbMat.current, { emissiveIntensity: 0, duration: 0.5 }, 0)
        .to(ambient.current, { intensity: AMBIENT_OFF, duration: 0.5 }, 0)

      onTl.current = on
      offTl.current = off
    } else {
      // ON: pull -> swing -> flicker -> ramp; stages follow the light's reach
      const on = gsap.timeline({ paused: true })
      on.call(() => setSceneStage(1 as SceneStage), undefined, 0)
        .to(
          beadRef.current.position,
          { y: PULL_TARGET, duration: 0.18, ease: 'power2.out', onUpdate: buildCord },
          0
        )
        .to(
          beadRef.current.position,
          { y: BEAD_REST_Y, duration: 1.1, ease: 'elastic.out(1, 0.30)', onUpdate: buildCord },
          0.18
        )
        // settle any residual bead swing from an interrupted OFF/idle
        .to(
          beadRef.current.position,
          { x: 0, duration: 0.9, ease: 'sine.out', onUpdate: buildCord },
          0.15
        )
        .to(group.current.rotation, { z: 0.075, duration: 0.55, ease: 'sine.inOut' }, 0.1)
        .to(group.current.rotation, { z: -0.06, duration: 0.95, ease: 'sine.inOut' }, '>')
        .to(group.current.rotation, { z: 0.038, duration: 0.8, ease: 'sine.inOut' }, '>')
        .to(group.current.rotation, { z: -0.016, duration: 0.7, ease: 'sine.inOut' }, '>')
        .to(group.current.rotation, { z: 0, duration: 0.7, ease: 'sine.inOut' }, '>')
        .to(light.current, { intensity: 9, duration: 0.07 }, 0.42)
        .to(light.current, { intensity: 0.4, duration: 0.09 }, '>')
        .to(light.current, { intensity: 14, duration: 0.11 }, '>')
        .to(light.current, { intensity: 1.5, duration: 0.08 }, '>')
        .to(light.current, { intensity: LIGHT_ON, duration: 0.85, ease: 'power2.in' }, '>')
        .to(bulbMat.current, { emissiveIntensity: 2.5, duration: 0.12 }, 0.62)
        .to(ambient.current, { intensity: AMBIENT_ON, duration: 1.0 }, 0.62)
        // pool reaching floor/desk
        .call(() => setSceneStage(2 as SceneStage), undefined, 0.8)
        // room readable -> scrim + name may rise
        .call(() => setSceneStage(3 as SceneStage), undefined, 1.35)
        // settled -> tagline / CTA / scroll hint
        .call(() => setSceneStage(4 as SceneStage), undefined, 1.7)

      // OFF: inertia first (smaller damped pendulum than the pull), light follows,
      // content recedes immediately (stage 0) so DOM never outlives the room.
      const off = gsap.timeline({ paused: true })
      off.call(() => setSceneStage(0 as SceneStage), undefined, 0)
        // the cord snaps back to its hang with a bounce — on or off
        .to(
          beadRef.current.position,
          { y: BEAD_REST_Y, duration: 0.55, ease: 'elastic.out(1, 0.35)', onUpdate: buildCord },
          0.08
        )
        // physical after-movement: 2-3 decreasing oscillations, ends perfectly still
        .to(group.current.rotation, { z: -0.04, duration: 0.55, ease: 'power1.out' }, 0)
        .to(group.current.rotation, { z: 0.028, duration: 0.8, ease: 'sine.inOut' }, '>')
        .to(group.current.rotation, { z: -0.014, duration: 0.68, ease: 'sine.inOut' }, '>')
        .to(group.current.rotation, { z: 0, duration: 0.6, ease: 'sine.inOut' }, '>')
        // the bead trails the swinging shell with a little lag, bending the cord
        .to(
          beadRef.current.position,
          { x: 0.05, duration: 0.6, ease: 'sine.out', onUpdate: buildCord },
          0.12
        )
        .to(
          beadRef.current.position,
          { x: -0.03, duration: 0.75, ease: 'sine.inOut', onUpdate: buildCord },
          '>'
        )
        .to(
          beadRef.current.position,
          { x: 0, duration: 0.7, ease: 'sine.inOut', onUpdate: buildCord },
          '>'
        )
        // dip -> warm glow -> irregular flicker -> extinction -> gradual pool fade
        .to(light.current, { intensity: 26, duration: 0.22, ease: 'power1.out' }, 0)
        .to(light.current, { intensity: 21, duration: 0.35, ease: 'sine.inOut' }, '>')
        .to(light.current, { intensity: 11, duration: 0.06 }, '>')
        .to(light.current, { intensity: 19, duration: 0.05 }, '>')
        .to(light.current, { intensity: 3, duration: 0.08 }, '>')
        .to(light.current, { intensity: 7, duration: 0.05 }, '>')
        .to(bulbMat.current, { emissiveIntensity: 0.4, duration: 0.12 }, '<')
        .to(light.current, { intensity: 1.2, duration: 0.25, ease: 'power2.in' }, '>')
        .to(bulbMat.current, { emissiveIntensity: 0, duration: 0.2 }, '<')
        .to(light.current, { intensity: LIGHT_OFF, duration: 0.8, ease: 'power2.out' }, '>')
        .to(ambient.current, { intensity: AMBIENT_OFF, duration: 1.3, ease: 'power1.inOut' }, 0.35)

      onTl.current = on
      offTl.current = off
    }

    return () => {
      onTl.current?.kill()
      offTl.current?.kill()
      onTl.current = null
      offTl.current = null
    }
  }, [reducedMotion, setSceneStage, buildCord])

  // route state changes to exactly one timeline; skip the initial mount
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const on = onTl.current
    const off = offTl.current
    if (!on || !off) return

    if (lampOn) {
      off.pause()
      on.invalidate().restart()
    } else {
      on.pause()
      off.invalidate().restart()
    }
  }, [lampOn])

  // subtle idle sway of the pull bead: discoverability in the dark.
  // Delayed past the longest sequence (OFF ~2.6s) so it never fights the
  // physical inertia of a settling lamp; killed instantly on any toggle.
  useEffect(() => {
    const bead = beadRef.current
    if (!bead || reducedMotion || lampOn) return
    const sway = gsap.to(bead.position, {
      x: 0.03,
      duration: 2.8,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 3.4,
      onUpdate: buildCord,
    })
    swayRef.current = sway
    return () => {
      sway.kill()
      swayRef.current = null
    }
  }, [reducedMotion, lampOn, buildCord])

  return (
    <group ref={group} position={[0.55, 3.15, -0.55]}>
      {/* ceiling rose */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.06, 14]} />
        <meshStandardMaterial color="#241b13" roughness={0.6} />
      </mesh>
      {/* main cord */}
      <mesh position={[0, -0.44, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.88, 8]} />
        <meshStandardMaterial color="#2e241a" roughness={0.9} />
      </mesh>
      {/* industrial shade: dark metal shell with controlled highlights + warm inner reflector */}
      <mesh position={[0, -0.97, 0]} castShadow>
        <coneGeometry args={[0.32, 0.26, 22, 1, true]} />
        <meshStandardMaterial
          color="#211811"
          roughness={0.38}
          metalness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.96, 0]}>
        <coneGeometry args={[0.285, 0.215, 20, 1, true]} />
        <meshStandardMaterial
          color="#66492c"
          roughness={0.5}
          metalness={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      {/* mouth rim catches the bulb light */}
      <mesh position={[0, -1.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.315, 0.012, 8, 28]} />
        <meshStandardMaterial color="#3d2c1a" roughness={0.32} metalness={0.5} />
      </mesh>
      {/* socket */}
      <mesh position={[0, -1.11, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.05, 10]} />
        <meshStandardMaterial color="#14100c" roughness={0.5} />
      </mesh>
      {/* visible bulb */}
      <mesh position={[0, -1.17, 0]}>
        <sphereGeometry args={[0.062, 16, 14]} />
        <meshStandardMaterial ref={bulbMat} color="#ffe9c0" emissive="#ffb35c" emissiveIntensity={0} />
      </mesh>
      {/* filament hint: faintly visible even in OFF (glass catching moonlight) */}
      <mesh position={[0, -1.175, 0]}>
        <capsuleGeometry args={[0.008, 0.02, 3, 8]} />
        <meshStandardMaterial
          color="#ffe2b0"
          emissive="#ffdca4"
          emissiveIntensity={0.22}
        />
      </mesh>
      {/* THE warm light */}
      <pointLight
        ref={light}
        position={[0, -1.16, 0]}
        intensity={LIGHT_OFF}
        color="#ffc06a"
        distance={14}
        decay={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.002}
      />
      {/* room fill follows the lamp ramp */}
      <ambientLight ref={ambient} intensity={AMBIENT_OFF} />

      {/*
        Pull cord: a soft sagging tube (rebuilt by buildCord) from the FIXED
        hang point to the BEAD. The bead moves — the top never leaves the
        socket — so pulling lengthens the cord like a real pull chain.
        Hangs on the LEFT so it never covers the book on the shelf.
      */}
      <group ref={pullGroup} position={[-0.26, 0, 0]}>
        {/* bendable cord — the visible grab target */}
        <mesh
          ref={cordRef}
          onPointerDown={onCordPointerDown}
          onPointerOver={cordHover}
          onPointerOut={cordLeave}
        >
          <meshStandardMaterial
            color="#4a3a26"
            emissive="#8ea7c9"
            emissiveIntensity={0.18}
          />
        </mesh>
        {/* the bead at the end of the cord */}
        <mesh
          ref={beadRef}
          position={[0, BEAD_REST_Y, 0]}
          onPointerDown={onCordPointerDown}
          onPointerOver={cordHover}
          onPointerOut={cordLeave}
        >
          <sphereGeometry args={[0.026, 10, 8]} />
          <meshStandardMaterial
            color="#9a8266"
            emissive="#8ea7c9"
            emissiveIntensity={0.45}
          />
        </mesh>
        {/* generous invisible grab zone riding with the bead */}
        <mesh
          ref={hitRef}
          position={[0, BEAD_REST_Y + 0.08, 0]}
          onPointerDown={onCordPointerDown}
          onPointerOver={cordHover}
          onPointerOut={cordLeave}
        >
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
    </group>
  )
}