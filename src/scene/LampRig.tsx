import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { gsap } from '../motion/gsap'
import { useExperience, type SceneStage } from '../state/ExperienceContext'
import {
  AMBIENT_OFF,
  AMBIENT_ON,
  LIGHT_OFF,
  LIGHT_ON,
} from './config'
import {
  playBulbInsert,
  playLampDead,
  playLampFlicker,
  playLampPop,
  playLampToggle,
  playResidualCrackle,
} from './sound'
import { requestRender } from './invalidate'
import { getPoseTier } from './cameraPoses'
import {
  applyResidualSparks,
  applySparkBurst,
  RESIDUAL_DURATION,
  residualSparkSpawns,
  SPARK_BURST_DURATION,
  sparkSpawns,
} from './lampFx'

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

/** Task 7C — desktop/tablet drag sensitivity (world units per screen px),
    unchanged existing behavior */
const PULL_WORLD_PER_PX = 0.0016
/** Task 7C — the bead's on-screen travel as a fraction of the finger's,
    matching the desktop-hero feel (~0.25). Used to derive the mobile
    sensitivity from the camera distance so the pull feels the same on the
    small, far-away mobile hero (z ≈ 19). */
const PULL_RESPONSE = 0.25
/** invisible grab-zone radius around the bead. Mobile gets a much larger one
    because the mobile camera sits far back — the tap target must not shrink
    to a few pixels. Kept bounded so it never reaches the monitor/shelf. */
const HIT_RADIUS = 0.13
const MOBILE_HIT_RADIUS = 0.5

/** Task 7F — lightweight flexible cord (spring-damper chain). The cord is a
    row of points from the fixed hang point to the bead; each interior point
    springs toward its sag "goal" with verlet-style inertia, so a yank sends a
    small wave down the cord and it settles back naturally. Run ONLY while
    dragging or settling — never in idle. */
export const ROPE_POINTS = 14 // anchor + 12 interior + bead
const ROPE_STIFFNESS = 0.35 // how fast interior points chase their sag goal
const ROPE_DAMPING = 0.75 // velocity retention per step (lower = faster stop)
const ROPE_SAG = 0.06 // resting bow of the cord
const ROPE_SETTLE_THRESHOLD = 0.0015 // summed point motion below which we stop
const ROPE_MAX_SETTLE_TIME = 0.8 // longest the cord may oscillate after a release
/** Task 7F hover nudge — a gentle, smooth scripted sway (not per-point
    physics): the cord and the bead swing out and back once with a sine. */
const ROPE_NUDGE_TIME = 0.7
const ROPE_NUDGE_AMP = 0.025

/** the fixed point the cord hangs from (pull-group local space) */
const ANCHOR = new THREE.Vector3(0, HANG_Y, 0)

/** Task 7F: write the sag "goal" for interior point i into `out` — the
    straight line anchor→bead bowed downward by a parabola (zero at both
    ends), so at rest the cord hangs with a natural controlled sag. */
export function setSagGoal(
  out: THREE.Vector3,
  anchor: THREE.Vector3,
  bead: THREE.Vector3,
  i: number,
  sag: number
): void {
  const t = i / (ROPE_POINTS - 1)
  out.x = anchor.x + (bead.x - anchor.x) * t
  out.y = anchor.y + (bead.y - anchor.y) * t - sag * Math.sin(Math.PI * t)
  out.z = anchor.z + (bead.z - anchor.z) * t
}

/** Task 7F: how much the rope is still moving (sum of point motion). */
export function ropeEnergy(pts: THREE.Vector3[], prev: THREE.Vector3[]): number {
  let e = 0
  for (let i = 1; i < ROPE_POINTS - 1; i++) {
    e +=
      Math.abs(pts[i].x - prev[i].x) +
      Math.abs(pts[i].y - prev[i].y) +
      Math.abs(pts[i].z - prev[i].z)
  }
  return e
}

export function LampRig() {
  const {
    lampOn,
    reducedMotion,
    toggleLamp,
    setSceneStage,
    bulb,
    bulbAcquired,
    replaceBulb,
    completeOverload,
    completeReplacement,
  } = useExperience()
  // targeted selectors only: camera is stable, size changes only on resize,
  // so this component never re-renders on render-loop store updates
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)
  /** mobile = narrow phone tier (existing pose/FOV infra, not a new breakpoint) */
  const isMobile = getPoseTier(size.width) === 'mobile'
  const group = useRef<THREE.Group>(null)
  const pullGroup = useRef<THREE.Group>(null)
  const cordRef = useRef<THREE.Mesh>(null)
  const cordGeom = useRef<THREE.BufferGeometry | null>(null)
  const beadRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const bulbMat = useRef<THREE.MeshStandardMaterial>(null)
  const bulbMesh = useRef<THREE.Mesh>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const onTl = useRef<gsap.core.Timeline | null>(null)
  const offTl = useRef<gsap.core.Timeline | null>(null)
  const swayRef = useRef<gsap.core.Tween | null>(null)
  const mounted = useRef(false)
  // Task 7G — overload/replacement FX owners (one timeline at a time)
  const fxTl = useRef<gsap.core.Timeline | null>(null)
  const burstTween = useRef<gsap.core.Tween | null>(null)
  const sparkMeshes = useRef<(THREE.Mesh | null)[]>([])
  const spawns = useMemo(() => sparkSpawns(), [])
  // Task 7G.1 — the residual sparking that keeps firing around the socket
  const residualTween = useRef<gsap.core.Timeline | null>(null)
  const residualSparkMeshes = useRef<(THREE.Mesh | null)[]>([])
  const residualSpawns = useMemo(() => residualSparkSpawns(), [])
  // Task 7F — the flexible cord's points (pull-group local). pts[0] is the
  // anchor, pts[N-1] mirrors the bead; interior points are stepped by the
  // spring-damper while dragging/settling, else sit on the static sag.
  const ropePts = useRef<THREE.Vector3[]>([])
  const ropePrev = useRef<THREE.Vector3[]>([])
  const ropeActive = useRef(false)
  const settleTween = useRef<gsap.core.Tween | null>(null)

  /**
   * Task 7F — park the interior points exactly on the static sag (used when
   * the rope is NOT being stepped: idle, reduced motion, or after settling).
   */
  const applyStaticSag = useCallback(() => {
    const bead = beadRef.current
    if (!bead) return
    const pts = ropePts.current
    const prev = ropePrev.current
    const beadPos = bead.position
    const stretch = Math.max(0, BEAD_REST_Y - beadPos.y)
    const tension = Math.min(1, stretch / TENSION_PULL)
    const sag = ROPE_SAG * (1 - tension * 0.55)
    const goal = new THREE.Vector3()
    for (let i = 1; i < ROPE_POINTS - 1; i++) {
      setSagGoal(goal, ANCHOR, beadPos, i, sag)
      pts[i].copy(goal)
      prev[i].copy(goal)
    }
  }, [])

  /**
   * Rebuild the cord as a smooth multi-point tube from the FIXED hang point
   * to the bead. The interior points are the flexible rope: stepped by the
   * spring-damper while dragging/settling, or parked on the static sag when
   * idle (so the cord follows the bead and the lamp sway without physics).
   * A small TubeGeometry is rebuilt per change (documented cost, kept small).
   */
  const buildCord = useCallback(() => {
    const mesh = cordRef.current
    const bead = beadRef.current
    if (!mesh || !bead) return
    const end = bead.position
    ropePts.current[ROPE_POINTS - 1].copy(end)
    ropePts.current[0].copy(ANCHOR)
    if (!ropeActive.current) applyStaticSag()

    const curve = new THREE.CatmullRomCurve3(ropePts.current)
    const geom = new THREE.TubeGeometry(curve, 20, 0.005, 6, false)
    if (cordGeom.current) cordGeom.current.dispose()
    cordGeom.current = geom
    mesh.geometry = geom
    // the invisible grab zone rides with the bead
    if (hitRef.current) hitRef.current.position.set(end.x, end.y + 0.08, 0)
    requestRender() // demand: the cord changed (drag or tween frame) — draw it
  }, [applyStaticSag])

  /**
   * Task 7F — one spring-damper step of the interior points. Each point keeps
   * a little velocity (inertia) toward its sag goal; the goal follows the
   * bead, so a fast pull makes the middle trail and wave, then damping settles
   * it. Bypassed entirely under reduced motion (static sag only).
   */
  const stepRope = useCallback(() => {
    if (reducedMotion) return
    const bead = beadRef.current
    if (!bead) return
    const pts = ropePts.current
    const prev = ropePrev.current
    const beadPos = bead.position
    const stretch = Math.max(0, BEAD_REST_Y - beadPos.y)
    const tension = Math.min(1, stretch / TENSION_PULL)
    const sag = ROPE_SAG * (1 - tension * 0.55)
    const goal = new THREE.Vector3()
    for (let i = 1; i < ROPE_POINTS - 1; i++) {
      const p = pts[i]
      const pr = prev[i]
      const vx = (p.x - pr.x) * ROPE_DAMPING
      const vy = (p.y - pr.y) * ROPE_DAMPING
      const vz = (p.z - pr.z) * ROPE_DAMPING
      pr.set(p.x, p.y, p.z)
      setSagGoal(goal, ANCHOR, beadPos, i, sag)
      p.x += vx + (goal.x - p.x) * ROPE_STIFFNESS
      p.y += vy + (goal.y - p.y) * ROPE_STIFFNESS
      p.z += vz + (goal.z - p.z) * ROPE_STIFFNESS
    }
  }, [reducedMotion])

  /**
   * Task 7F — a SHORT-lived settle window after a release (or a lamp toggle).
   * A tiny GSAP tween is used purely as a per-frame clock: it steps the rope
   * with damping and stops on its own once the motion dies (or after
   * ROPE_MAX_SETTLE_TIME). No permanent ticker — after it ends, idle returns
   * to 0 renders.
   */
  const startSettle = useCallback(() => {
    if (reducedMotion) {
      ropeActive.current = false
      return
    }
    ropeActive.current = true
    settleTween.current?.kill()
    const proxy = { t: 0 }
    const tween = gsap.to(proxy, {
      t: 1,
      duration: ROPE_MAX_SETTLE_TIME,
      ease: 'none',
      onUpdate: () => {
        stepRope()
        buildCord()
        if (ropeEnergy(ropePts.current, ropePrev.current) < ROPE_SETTLE_THRESHOLD) {
          tween.kill()
          ropeActive.current = false
        }
      },
      onComplete: () => {
        ropeActive.current = false
      },
    })
    settleTween.current = tween
  }, [reducedMotion, stepRope, buildCord])

  /**
   * Task 7G — hide every spark mesh (end of a burst / cleanup). Must leave
   * the scene fully quiet: no active tweens, no residual visible sparks.
   */
  const hideSparks = useCallback(() => {
    for (const m of sparkMeshes.current) if (m) m.visible = false
  }, [])

  /** Task 7G.1 — hide every residual spark mesh (settled / cleanup). */
  const hideResidualSparks = useCallback(() => {
    for (const m of residualSparkMeshes.current) if (m) m.visible = false
  }, [])

  /**
   * Task 7G — play the spark burst for a given tween-driven clock (both the
   * overload pop and the positive replacement blip use this). Wrapped in a
   * call so the burst tween is a child of the global timeline and DemandFrame
   * chains its frames exactly while it lives.
   */
  const startSparkBurst = useCallback(() => {
    burstTween.current?.kill()
    const proxy = { t: 0 }
    burstTween.current = gsap.to(proxy, {
      t: SPARK_BURST_DURATION,
      duration: SPARK_BURST_DURATION,
      ease: 'none',
      onUpdate: () => applySparkBurst(sparkMeshes.current, spawns, proxy.t),
      onComplete: () => {
        hideSparks()
        burstTween.current = null
      },
    })
  }, [spawns, hideSparks])

  /**
   * Task 7G.1 — the residual state: the burned socket keeps visibly spitting
   * sparks for ~RESIDUAL_DURATION. ONE bounded GSAP clock drives
   * applyResidualSparks per frame (each sliver re-fires repeatedly in fresh
   * random directions), so DemandFrame chains frames only while it plays and
   * the scene falls quiet at the end. The occasional tiny crackle is
   * scheduled inside the same timeline (audio only).
   */
  const startResidual = useCallback(() => {
    residualTween.current?.kill()
    const meshes = residualSparkMeshes.current
    if (reducedMotion) return
    const clock = { t: 0 }
    const tl = gsap.timeline({
      onComplete: () => {
        for (const m of meshes) if (m) m.visible = false
        residualTween.current = null
      },
    })
    tl.to(
      clock,
      {
        t: RESIDUAL_DURATION,
        duration: RESIDUAL_DURATION,
        ease: 'none',
        onUpdate: () => applyResidualSparks(meshes, residualSpawns, clock.t),
      },
      0
    )
    // a few tiny electrical ticks through the residual life
    tl.call(() => playResidualCrackle(), [], 1.2)
    tl.call(() => playResidualCrackle(), [], 3.2)
    tl.call(() => playResidualCrackle(), [], 5.2)
    residualTween.current = tl
  }, [reducedMotion, residualSpawns])

  /**
   * Task 7G/7G.1 — THE overload: the bulb pops. Instability buzz → irregular
   * flicker → a bright flash with a crack → a burst of sparks → the residual
   * embers stay around the socket for several seconds while the light dies,
   * then the room returns to its normal (moonlit) lighting. Reduced motion
   * resolves the same story instantly with zero flicker/particles.
   */
  const playOverload = useCallback(() => {
    const lightObj = light.current
    const mat = bulbMat.current
    const amb = ambient.current
    const bead = beadRef.current
    if (!lightObj || !mat || !amb) return
    onTl.current?.pause()
    offTl.current?.pause()
    fxTl.current?.kill()
    burstTween.current?.kill()
    residualTween.current?.kill()
    requestRender() // demand primer: the overload runs on chained frames

    if (reducedMotion) {
      lightObj.intensity = LIGHT_OFF
      mat.emissiveIntensity = 0
      amb.intensity = AMBIENT_OFF
      if (bead) bead.position.set(0, BEAD_REST_Y, 0)
      hideSparks()
      hideResidualSparks()
      completeOverload()
      return
    }

    const tl = gsap.timeline({ onComplete: () => { hideSparks(); completeOverload() } })
    fxTl.current = tl
    // the cord/bead spring back from the pull that killed the bulb
    if (bead) {
      tl.to(bead.position, { x: 0, y: BEAD_REST_Y, duration: 0.8, ease: 'elastic.out(1, 0.35)', onUpdate: buildCord }, 0.1)
    }
    // the lamp itself takes the shock and settles back to its natural rest —
    // it must never stay frozen mid-swing from the interrupted toggle
    if (group.current) {
      tl.to(group.current.rotation, { z: 0.06, duration: 0.16, ease: 'power2.out' }, 0.12)
        .to(group.current.rotation, { z: -0.032, duration: 0.3, ease: 'sine.inOut' }, '>')
        .to(group.current.rotation, { z: 0, duration: 0.5, ease: 'sine.inOut' }, '>')
    }
    // 1) the instability: kick bright, buzz, then irregular flicker
    tl.to(lightObj, { intensity: 30, duration: 0.06 }, 0)
      .to(mat, { emissiveIntensity: 2.8, duration: 0.05 }, 0)
      .call(() => playLampFlicker(), [], 0.02)
      .to(lightObj, { intensity: 6, duration: 0.06 }, 0.07)
      .to(lightObj, { intensity: 34, duration: 0.05 }, '>')
      .to(mat, { emissiveIntensity: 0.6, duration: 0.04 }, '>')
      .to(lightObj, { intensity: 4, duration: 0.06 }, '>')
      .to(lightObj, { intensity: 30, duration: 0.05 }, '>')
    // 2) the flash + the glass crack
    tl.to(lightObj, { intensity: 48, duration: 0.05 }, 0.28)
      .to(mat, { emissiveIntensity: 4.2, duration: 0.05 }, 0.28)
      .call(() => playLampPop(), [], 0.28)
    // 3) sparks burst, and the embers begin their residual life
    tl.call(() => startSparkBurst(), [], 0.28)
    tl.call(() => startResidual(), [], 0.28)
    // 4) extinction — the light dies, the room returns to normal
    tl.to(lightObj, { intensity: LIGHT_OFF, duration: 0.24, ease: 'power2.in' }, 0.33)
      .to(mat, { emissiveIntensity: 0, duration: 0.14 }, 0.33)
      .to(amb, { intensity: AMBIENT_OFF, duration: 0.7, ease: 'power1.inOut' }, 0.38)
  }, [reducedMotion, completeOverload, buildCord, hideSparks, hideResidualSparks, startSparkBurst, startResidual])

  /**
   * Task 7G/7G.1 — the replacement: a new bulb pops into the socket with a
   * small seat-click and a gentle positive spark. The freshly installed bulb
   * then turns the lamp back ON (completeReplacement → lampOn=true) — the
   * small reward. Any lingering residual embers are cleared first.
   */
  const playReplacement = useCallback(() => {
    const mat = bulbMat.current
    const bulb = bulbMesh.current
    const bead = beadRef.current
    if (!mat || !bulb) return
    onTl.current?.pause()
    offTl.current?.pause()
    fxTl.current?.kill()
    burstTween.current?.kill()
    residualTween.current?.kill()
    requestRender() // demand primer: the replacement runs on chained frames

    if (reducedMotion) {
      bulb.scale.setScalar(1)
      if (bead) bead.position.set(0, BEAD_REST_Y, 0)
      hideSparks()
      hideResidualSparks()
      completeReplacement()
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        hideSparks()
        hideResidualSparks()
        completeReplacement()
      },
    })
    fxTl.current = tl
    if (bead) {
      tl.to(bead.position, { x: 0, y: BEAD_REST_Y, duration: 0.5, ease: 'elastic.out(1, 0.35)', onUpdate: buildCord }, 0)
    }
    // the new bulb pops into the socket
    bulb.scale.setScalar(0.001)
    tl.to(bulb.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(2.2)' }, 0.05)
      .call(() => playBulbInsert(), [], 0.06)
    // a tiny warm blip — the filament is alive again, then the ON ramp takes over
    tl.to(mat, { emissiveIntensity: 0.4, duration: 0.12 }, 0.12)
      .to(mat, { emissiveIntensity: 0, duration: 0.3 }, 0.28)
    // a small positive spark, not an explosion
    tl.call(() => startSparkBurst(), [], 0.16)
  }, [reducedMotion, completeReplacement, buildCord, hideSparks, hideResidualSparks, startSparkBurst])

  // Task 7G — route the bulb states to their FX; burned visuals are
  // declarative (material props below)
  useEffect(() => {
    if (bulb === 'overloading') {
      playOverload()
      return () => {
        fxTl.current?.kill()
        burstTween.current?.kill()
        fxTl.current = null
        hideSparks()
      }
    }
    if (bulb === 'replacing') {
      playReplacement()
      return () => {
        fxTl.current?.kill()
        burstTween.current?.kill()
        fxTl.current = null
        hideSparks()
      }
    }
    return undefined
  }, [bulb, playOverload, playReplacement, hideSparks])

  // build the soft cord once mounted (and keep its sag in sync with pulls)
  useEffect(() => {
    const bead = beadRef.current
    if (!bead) return
    const n = ROPE_POINTS
    ropePts.current = Array.from({ length: n }, () => new THREE.Vector3())
    ropePrev.current = Array.from({ length: n }, () => new THREE.Vector3())
    ropePts.current[0].copy(ANCHOR)
    ropePrev.current[0].copy(ANCHOR)
    ropePts.current[n - 1].copy(bead.position)
    ropePrev.current[n - 1].copy(bead.position)
    buildCord()
  }, [buildCord])

  // cord drag: grab the bead/cord and pull DOWN to toggle the lamp. The
  // bead is driven directly, so the top of the cord never leaves the socket.
  const dragRef = useRef({ active: false, startY: 0, sensitivity: PULL_WORLD_PER_PX })

  /**
   * A gentle, SMOOTH "poke" when the pointer passes over the cord (desktop
   * hover only). Instead of per-point physics (which reads as trembling),
   * this is one scripted sine wave: the cord deflects most near the bead and
   * the bead itself swings along — the whole cord reacts as one piece, then
   * returns to rest. Skipped under reduced motion, while dragging, and while
   * a lamp sequence is animating.
   */
  const nudgeRope = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (reducedMotion || dragRef.current.active) return
    if (onTl.current?.isActive() || offTl.current?.isActive()) return
    const bead = beadRef.current
    if (!bead) return
    // Physical "collision": the cord yields AWAY from the side the cursor
    // brushes it. The surface normal at the hit points outward (toward the
    // cursor), so the push is -normal projected horizontally — brushing from
    // the left pushes the cord right, from the right pushes it left, and
    // hovering dead-center barely moves it.
    let dx = 1
    let dz = 0
    const faceNormal = e.face?.normal
    if (faceNormal) {
      const world = faceNormal.clone().transformDirection(e.object.matrixWorld)
      const len = Math.hypot(world.x, world.z)
      if (len > 0.0001) {
        dx = -world.x / len
        dz = -world.z / len
      }
    }
    ropeActive.current = true
    const pts = ropePts.current
    const proxy = { t: 0 }
    const tween = gsap.to(proxy, {
      t: 1,
      duration: ROPE_NUDGE_TIME,
      ease: 'none',
      onUpdate: () => {
        // smooth envelope 0 -> 1 -> 0; deflection grows toward the free end,
        // so the bead sways the most and the top barely moves
        const env = Math.sin(proxy.t * Math.PI)
        for (let i = 1; i < ROPE_POINTS; i++) {
          const g = i / (ROPE_POINTS - 1)
          const d = ROPE_NUDGE_AMP * env * g * g
          pts[i].x = d * dx
          pts[i].z = d * dz
        }
        // the ball follows the rope's free end — it moves with the cord
        bead.position.x = pts[ROPE_POINTS - 1].x
        bead.position.z = pts[ROPE_POINTS - 1].z
        buildCord()
      },
      onComplete: () => {
        ropeActive.current = false
      },
    })
    settleTween.current = tween
  }, [reducedMotion, buildCord])

  /**
   * Task 7C — distance-aware sensitivity for mobile. A fixed world/px value
   * feels far slower at the mobile hero (camera z ≈ 19) than on desktop.
   * We keep the bead's ON-SCREEN travel proportional to the finger's (the
   * same ~25% desktop-hero feel) by deriving the sensitivity from the
   * camera distance to the bead at drag start. Desktop/tablet keep the
   * exact existing fixed sensitivity. One computation per drag, no loop.
   */
  const mobileSensitivity = useCallback(() => {
    const bead = beadRef.current
    if (!bead || !isMobile) return PULL_WORLD_PER_PX
    const world = new THREE.Vector3()
    bead.getWorldPosition(world)
    const distance = camera.position.distanceTo(world)
    const worldPerPx = (2 * distance * Math.tan((camera.fov * Math.PI) / 180 / 2)) / size.height
    return PULL_RESPONSE * worldPerPx
  }, [isMobile, camera, size])

  const onCordPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      const bead = beadRef.current
      if (!drag.active || !bead) return
      const dy = (e.clientY - drag.startY) * drag.sensitivity
      bead.position.y = Math.max(MAX_BEAD_Y, Math.min(BEAD_REST_Y, BEAD_REST_Y - dy))
      stepRope() // the rope trails the bead with a little wave
      buildCord()
    },
    [buildCord, stepRope]
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
        // Task 7G — a burned lamp: the pull still works (the mechanism
        // clicks) but nothing lights. If the replacement bulb has been
        // found, interacting with the lamp installs it.
        if (bulb === 'burned') {
          if (bulbAcquired) {
            replaceBulb()
          } else {
            playLampDead()
            gsap.to(bead.position, {
              y: BEAD_REST_Y,
              x: 0,
              duration: 0.45,
              ease: 'elastic.out(1, 0.35)',
              onUpdate: buildCord,
            })
          }
        } else if (bulb === 'overloading' || bulb === 'replacing') {
          // Task 7G.1 — the bulb is mid-event: no toggle, no click sound —
          // just spring the bead back like a switch that does nothing
          gsap.to(bead.position, {
            y: BEAD_REST_Y,
            x: 0,
            duration: 0.45,
            ease: 'elastic.out(1, 0.35)',
            onUpdate: buildCord,
          })
        } else {
          // a tap or a real pull: turn the lamp, with the pull-click sound
          toggleLamp()
          playLampToggle()
        }
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
      startSettle() // the cord oscillates briefly, then settles back to rest
    },
    [onCordPointerMove, toggleLamp, buildCord, startSettle, bulb, bulbAcquired, replaceBulb]
  )

  const cordHover = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      document.body.style.cursor = 'pointer'
      // desktop hover only — a gentle nudge that yields away from the cursor
      if (e.pointerType === 'mouse') nudgeRope(e)
    },
    [nudgeRope]
  )
  const cordLeave = useCallback(() => {
    document.body.style.cursor = ''
  }, [])

  const onCordPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      swayRef.current?.kill()
      swayRef.current = null
      settleTween.current?.kill()
      settleTween.current = null
      ropeActive.current = true
      dragRef.current = { active: true, startY: e.clientY, sensitivity: mobileSensitivity() }
      document.body.style.cursor = 'grabbing'
      window.addEventListener('pointermove', onCordPointerMove)
      window.addEventListener('pointerup', onCordPointerUp)
      window.addEventListener('pointercancel', onCordPointerUp)
    },
    [onCordPointerMove, onCordPointerUp, mobileSensitivity]
  )

  // never leak the drag listeners if the rig unmounts mid-drag
  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onCordPointerMove)
      window.removeEventListener('pointerup', onCordPointerUp)
      window.removeEventListener('pointercancel', onCordPointerUp)
      settleTween.current?.kill()
      settleTween.current = null
      fxTl.current?.kill()
      fxTl.current = null
      burstTween.current?.kill()
      burstTween.current = null
      residualTween.current?.kill()
      residualTween.current = null
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
    // Task 7G — while the bulb is dead (overloading/burned/replacing) the ON/OFF
    // timelines do NOT run: the FX timelines own the lights until the bulb is
    // back to 'normal'. The replacement restores the lamp ON (the reward), so
    // the normal ON timeline plays from there.
    if (bulb !== 'normal') return
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
    requestRender() // demand primer: the light choreography runs from here
    startSettle() // the cord follows the bead's movement with a brief wave
  }, [lampOn, bulb, startSettle])

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
    requestRender() // demand primer: the idle sway is timer-started, so wake a frame
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
      {/* visible bulb — charred dark glass once burned (Task 7G) */}
      <mesh ref={bulbMesh} position={[0, -1.17, 0]}>
        <sphereGeometry args={[0.062, 16, 14]} />
        <meshStandardMaterial
          ref={bulbMat}
          color={bulb === 'burned' ? '#221911' : '#ffe9c0'}
          emissive={bulb === 'burned' ? '#0d0703' : '#ffb35c'}
          emissiveIntensity={0}
        />
      </mesh>
      {/* filament hint: faintly visible even in OFF (glass catching moonlight);
          hidden when burned, replaced by the broken filament below */}
      <mesh position={[0, -1.175, 0]} visible={bulb !== 'burned'}>
        <capsuleGeometry args={[0.008, 0.02, 3, 8]} />
        <meshStandardMaterial
          color="#ffe2b0"
          emissive="#ffdca4"
          emissiveIntensity={0.22}
        />
      </mesh>
      {/* burned filament — a small dark break inside the charred glass */}
      <mesh position={[0, -1.175, 0]} rotation={[0, 0, 0.35]} visible={bulb === 'burned'}>
        <capsuleGeometry args={[0.007, 0.016, 3, 8]} />
        <meshStandardMaterial color="#0f0a06" roughness={0.8} />
      </mesh>
      {/* Task 7G — the little sparks: a handful of warm glowing slivers around
          the bulb, hidden until an FX burst plays, then gone for good */}
      {spawns.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            sparkMeshes.current[i] = m
          }}
          position={[0, -1.17, 0]}
          visible={false}
        >
          <boxGeometry args={[0.006, 0.024, 0.006]} />
          <meshBasicMaterial
            color="#ffe1b0"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Task 7G.1 — residual sparks: the same warm slivers, kept firing in
          fresh random directions for several seconds after the pop, then
          settling to nothing */}
      {residualSpawns.map((_, i) => (
        <mesh
          key={`residual${i}`}
          ref={(m) => {
            residualSparkMeshes.current[i] = m
          }}
          position={[0, -1.17, 0]}
          visible={false}
        >
          <boxGeometry args={[0.006, 0.024, 0.006]} />
          <meshBasicMaterial
            color="#ffe1b0"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
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
            // mobile: a slightly stronger cold glow so the thin cord is
            // findable on a bright phone screen without resizing it
            emissiveIntensity={isMobile ? 0.35 : 0.18}
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
            emissiveIntensity={isMobile ? 0.7 : 0.45}
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
          <sphereGeometry args={[isMobile ? MOBILE_HIT_RADIUS : HIT_RADIUS, 8, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
    </group>
  )
}
