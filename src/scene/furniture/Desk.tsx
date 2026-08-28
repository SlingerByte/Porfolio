import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { gsap } from '../../motion/gsap'
import { useExperience } from '../../state/ExperienceContext'
import { PALETTE } from '../palette'
import { playDrawerSlide } from '../sound'
import { requestRender } from '../invalidate'
import { canInstallBulb } from '../lampFx'

/**
 * Desk + drawer pedestal, centered under the lamp pool.
 * The RIGHT pedestal (Task 7G) carries the spare bulb: once the lamp burns
 * out, its top drawer becomes openable, and inside sits a replacement bulb
 * the user can pick up and physically drag to the lamp socket (Task 7G.1).
 */
export function Desk() {
  return (
    <>
      <group position={[0.55, 0, -0.95]}>
        {/* top: matte wood with a whisper of sheen so the warm pool reads on it */}
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.95, 0.07, 0.95]} />
          <meshStandardMaterial color={PALETTE.woodMid} roughness={0.55} />
        </mesh>
        {/* apron */}
        <mesh position={[0, 0.71, 0]}>
          <boxGeometry args={[1.85, 0.08, 0.8]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        {/* slab legs */}
        <mesh position={[-0.86, 0.36, 0]} castShadow>
          <boxGeometry args={[0.08, 0.74, 0.8]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>

        <DrawerPedestal />
      </group>
      {/* world-space carried bulb (follows the pointer while dragging) */}
      <CarriedBulb />
    </>
  )
}

/**
 * Shared between the drawer bulb (grab) and the world-space carried bulb
 * (drag): the world position the grab started at and the camera-facing plane
 * the carried bulb slides on. One instance of each component, so a module
 * singleton (like invalidate.ts) is safe and keeps the interaction loop-free.
 */
const bulbCarryStore = {
  startWorld: new THREE.Vector3(),
  plane: new THREE.Plane(),
}

/** how far the top drawer's tray slides out when opened (world units) */
const DRAWER_OPEN_Z = 0.25
/** the burned-lamp discovery cue: the drawer face juts forward a couple cm */
const DRAWER_AJAR_Z = 0.018

/**
 * Task 7G/7G.1 — the right pedestal with TWO drawers. The bottom one is
 * decorative; the TOP one is the spare-bulb drawer (a pull-out tray):
 *
 *   normal lamp        → drawer face shut, tray hidden, not interactive
 *   bulb burned        → the face juts forward a couple cm (subtle ajar cue)
 *                        and the knob glints warm; clicking the face (or the
 *                        docked OPEN DRAWER affordance) slides the tray out
 *   tray open          → the replacement bulb rides on the tray, clearly in
 *                        front of the drawer; GRAB it (pointer down) to pick
 *                        it up — the CarriedBulb then follows the pointer
 *   bulb carried       → the bulb is in the user's hand, dragged toward the
 *                        lamp; releasing near the socket installs it
 *
 * The pedestal body stays solid (the approved look); the tray emerges from
 * the slot between the two drawer faces, so the bulb is never occluded from
 * the front camera.
 */
function DrawerPedestal() {
  const {
    bulb,
    bulbAcquired,
    drawerOpen,
    setDrawerOpen,
    acquireBulb,
    setBulbCarried,
    reducedMotion,
  } = useExperience()
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera

  const drawerRef = useRef<THREE.Group>(null)
  const faceRef = useRef<THREE.Group>(null)
  const bulbGroup = useRef<THREE.Group>(null)
  const openTween = useRef<gsap.core.Tween | null>(null)
  const ajarTween = useRef<gsap.core.Tween | null>(null)
  const popTween = useRef<gsap.core.Tween | null>(null)

  /** the drawer is openable only while the lamp is burned and the bulb is
      still inside */
  const interactive = bulb === 'burned' && !bulbAcquired

  // slide the tray out / back in
  useEffect(() => {
    const g = drawerRef.current
    if (!g) return
    requestRender() // demand primer: the slide runs on chained frames
    openTween.current?.kill()
    if (reducedMotion) {
      g.position.z = drawerOpen ? DRAWER_OPEN_Z : 0
      return
    }
    openTween.current = gsap.to(g.position, {
      z: drawerOpen ? DRAWER_OPEN_Z : 0,
      duration: 0.45,
      ease: drawerOpen ? 'power2.out' : 'power2.inOut',
    })
    return () => {
      openTween.current?.kill()
    }
  }, [drawerOpen, reducedMotion])

  // the ajar cue: while the lamp is burned and the bulb is still inside, the
  // drawer face sits slightly forward (a quiet "this opens" hint)
  useEffect(() => {
    const g = faceRef.current
    if (!g) return
    requestRender() // demand primer: the ajar nudge runs on chained frames
    ajarTween.current?.kill()
    if (reducedMotion) {
      g.position.z = interactive ? DRAWER_AJAR_Z : 0
      return
    }
    ajarTween.current = gsap.to(g.position, {
      z: interactive ? DRAWER_AJAR_Z : 0,
      duration: 0.4,
      ease: 'power2.inOut',
    })
    return () => {
      ajarTween.current?.kill()
    }
  }, [interactive, reducedMotion])

  // reveal the bulb on the tray when the drawer opens; pop it in gently
  useEffect(() => {
    const g = bulbGroup.current
    if (!g) return
    const show = drawerOpen && !bulbAcquired
    if (!show) {
      g.visible = false
      return
    }
    g.visible = true
    requestRender() // demand primer: the reveal pop runs on chained frames
    if (reducedMotion) {
      g.scale.setScalar(1)
      return
    }
    g.scale.setScalar(0.001)
    popTween.current?.kill()
    popTween.current = gsap.to(g.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.35,
      ease: 'back.out(2)',
    })
    return () => {
      popTween.current?.kill()
    }
  }, [drawerOpen, bulbAcquired, reducedMotion])

  // grabbing the bulb picks it up: record where it started and the plane the
  // carry will slide on, then mark it as taken + carried (the CarriedBulb
  // component drives the drag from here). The drawer stays open.
  const grabBulb = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!interactive || !drawerOpen || bulbAcquired) return
      const g = bulbGroup.current
      if (!g) return
      g.getWorldPosition(bulbCarryStore.startWorld)
      const normal = new THREE.Vector3()
      camera.getWorldDirection(normal)
      bulbCarryStore.plane.setFromNormalAndCoplanarPoint(normal, bulbCarryStore.startWorld)
      acquireBulb()
      setBulbCarried(true)
      requestRender() // demand primer: the carried bulb's first frame
    },
    [interactive, drawerOpen, bulbAcquired, acquireBulb, setBulbCarried, camera]
  )

  // open/close the drawer by clicking its face (or the affordance, which
  // just calls setDrawerOpen(true) through the same canal)
  const faceClick = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!interactive) return
      setDrawerOpen(!drawerOpen)
      playDrawerSlide()
    },
    [interactive, drawerOpen, setDrawerOpen]
  )

  const hover = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      document.body.style.cursor = interactive ? 'pointer' : 'auto'
    },
    [interactive]
  )
  const unhover = useCallback(() => {
    document.body.style.cursor = 'auto'
  }, [])

  // keep tweens honest if the pedestal unmounts mid-animation
  useEffect(
    () => () => {
      openTween.current?.kill()
      ajarTween.current?.kill()
      popTween.current?.kill()
    },
    []
  )

  return (
    <group position={[0.68, 0, 0.02]}>
      {/* solid pedestal body — the approved block */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.72, 0.88]} />
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
      </mesh>

      {/* bottom drawer — decorative, always shut */}
      <mesh position={[0, 0.24, 0.45]}>
        <boxGeometry args={[0.42, 0.18, 0.02]} />
        <meshStandardMaterial color={PALETTE.woodMid} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.24, 0.465]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshStandardMaterial color={PALETTE.brass} metalness={0.6} roughness={0.35} />
      </mesh>

      {/* top drawer face — stays put (the "pull-out shelf" look); juts
          forward as the ajar cue while the lamp is burned */}
      <group ref={faceRef}>
        <mesh
          position={[0, 0.52, 0.45]}
          castShadow
          onPointerOver={hover}
          onPointerOut={unhover}
          onClick={faceClick}
        >
          <boxGeometry args={[0.42, 0.18, 0.02]} />
          <meshStandardMaterial color={PALETTE.woodMid} roughness={0.7} />
        </mesh>
        {/* the knob catches a warm glint while the drawer is interactive —
            the only "look here" affordance */}
        <mesh
          position={[0, 0.52, 0.465]}
          onPointerOver={hover}
          onPointerOut={unhover}
          onClick={faceClick}
        >
          <sphereGeometry args={[0.022, 10, 8]} />
          <meshStandardMaterial
            color={PALETTE.brass}
            metalness={0.6}
            roughness={0.35}
            emissive="#ffd9a0"
            emissiveIntensity={interactive ? 0.55 : 0}
          />
        </mesh>
      </group>

      {/* the sliding tray: a low shelf that carries the replacement bulb and
          emerges from the slot below the top drawer face */}
      <group ref={drawerRef}>
        <mesh position={[0, 0.4, 0.05]} castShadow>
          <boxGeometry args={[0.4, 0.04, 0.44]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
        </mesh>
        {/* the replacement bulb — a small warm glass bulb on the tray's front;
            grab it (pointer down) to pick it up and drag it to the lamp.
            An invisible oversized grab zone rides with it so mobile never
            needs pixel-perfect aim (same pattern as the lamp cord) */}
        <group
          ref={bulbGroup}
          position={[0, 0.455, 0.26]}
          visible={false}
          onPointerOver={hover}
          onPointerOut={unhover}
          onPointerDown={grabBulb}
        >
          <mesh castShadow>
            <sphereGeometry args={[0.035, 12, 10]} />
            <meshStandardMaterial
              color="#ffe9c0"
              emissive="#ffd9a0"
              emissiveIntensity={0.5}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, -0.012, 0]}>
            <capsuleGeometry args={[0.005, 0.014, 3, 8]} />
            <meshStandardMaterial color="#3d2c1a" roughness={0.5} />
          </mesh>
          {/* invisible grab zone — generous, still smaller than the drawer */}
          <mesh>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/**
 * Task 7G.1 — the bulb while it's being carried. Rendered at world origin,
 * it snaps to the grab point and follows the pointer on a camera-facing
 * plane (established at grab time). Releasing near the lamp socket installs
 * it; releasing anywhere else returns it to the drawer.
 *
 * The drag is purely pointer-driven (like the lamp cord): window listeners
 * only while carried, `requestRender()` per move — no loop, and once the
 * bulb settles (installed or returned) the scene goes quiet.
 */
function CarriedBulb() {
  const { bulb, bulbCarried, setBulbCarried, setBulbAcquired, replaceBulb, reducedMotion } =
    useExperience()
  const { camera, size } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const returnTween = useRef<gsap.core.Tween | null>(null)

  /** visible only while a burned lamp is being carried */
  const visible = bulbCarried && bulb === 'burned'

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.visible = visible
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const g = groupRef.current
    if (!g) return

    // snap to where the grab happened, then follow the pointer
    g.position.copy(bulbCarryStore.startWorld)
    requestRender() // demand primer: the carry runs from here

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const hit = new THREE.Vector3()
    const probe = new THREE.Vector3()

    const onMove = (e: PointerEvent) => {
      ndc.set((e.clientX / size.width) * 2 - 1, -(e.clientY / size.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      if (raycaster.ray.intersectPlane(bulbCarryStore.plane, hit)) {
        g.position.copy(hit)
        requestRender()
      }
    }

    const drop = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', drop)
      window.removeEventListener('pointercancel', drop)
      g.getWorldPosition(probe)
      if (canInstallBulb(probe.x, probe.y, probe.z)) {
        // close enough — it snaps into the socket
        replaceBulb()
        setBulbCarried(false)
      } else {
        // too far — the bulb returns safely to the drawer
        const target = bulbCarryStore.startWorld
        if (reducedMotion) {
          g.position.copy(target)
          setBulbCarried(false)
          setBulbAcquired(false)
        } else {
          returnTween.current?.kill()
          returnTween.current = gsap.to(g.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration: 0.3,
            ease: 'power2.out',
            onComplete: () => {
              setBulbCarried(false)
              setBulbAcquired(false)
            },
          })
        }
        requestRender() // demand primer: the return tween (or snap) draws a frame
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', drop)
    window.addEventListener('pointercancel', drop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', drop)
      window.removeEventListener('pointercancel', drop)
    }
  }, [visible, camera, size, replaceBulb, setBulbCarried, setBulbAcquired, reducedMotion])

  // never leave the return tween running if the component unmounts
  useEffect(
    () => () => {
      returnTween.current?.kill()
    },
    []
  )

  return (
    <group ref={groupRef} visible={false}>
      <mesh castShadow>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshStandardMaterial
          color="#ffe9c0"
          emissive="#ffd9a0"
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, -0.012, 0]}>
        <capsuleGeometry args={[0.005, 0.014, 3, 8]} />
        <meshStandardMaterial color="#3d2c1a" roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Chair: four legs separated on BOTH axes so the main framing always reads a complete chair. */
export function Chair() {
  return (
    <group position={[-0.55, 0, -0.3]} rotation={[0, 0.32, 0]}>
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 0.05, 0.44]} />
        <meshStandardMaterial color={PALETTE.fabricDark} roughness={0.9} />
      </mesh>
      {/* backrest with slight recline + rear posts */}
      <mesh position={[0, 0.79, -0.19]} rotation={[-0.06, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.58, 0.05]} />
        <meshStandardMaterial color={PALETTE.fabricBack} roughness={0.9} />
      </mesh>
      {([
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ] as const).map(([lx, lz]) => (
        <mesh
          key={`${lx}${lz}`}
          position={[lx, 0.23, lz]}
          rotation={[lz > 0 ? 0.04 : -0.04, 0, lx > 0 ? 0.03 : -0.03]}
          castShadow
        >
          <cylinderGeometry args={[0.021, 0.019, 0.46, 6]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}
    </group>
  )
}
