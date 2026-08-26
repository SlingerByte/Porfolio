import { PALETTE } from '../palette'

/**
 * Structural shelf unit — independent piece of furniture.
 * M3-C refinement: narrowed and pulled off the door (≥0.31u clear gap to the
 * door casing), boards lifted above the desk silhouette line so it reads as
 * its own wall cabinet, plus a recessed dark back panel that gives it volume
 * even as an OFF-state silhouette.
 *
 * Composition map (camera authority): spans ~x +0.64..+2.19 (~62–77%).
 */
export function Shelf() {
  const W = 1.55

  return (
    <group position={[1.42, 0, -1.9]}>
      {/* recessed back panel: furniture volume, not wall decoration
          (kept in FRONT of the wall plane — it was buried at z -2.01) */}
      <mesh position={[0, 1.76, -0.055]}>
        <boxGeometry args={[W, 1.44, 0.03]} />
        <meshStandardMaterial color="#3a291c" roughness={0.9} />
      </mesh>

      {/* full-height uprights */}
      <mesh position={[-W / 2 + 0.035, 1.76, 0]} castShadow>
        <boxGeometry args={[0.07, 1.48, 0.26]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh position={[W / 2 - 0.035, 1.76, 0]} castShadow>
        <boxGeometry args={[0.07, 1.48, 0.26]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>

      {/* boards */}
      <mesh position={[0, 1.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, 0.06, 0.28]} />
        <meshStandardMaterial color={PALETTE.woodMid} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, 0.06, 0.28]} />
        <meshStandardMaterial color={PALETTE.woodMid} roughness={0.6} />
      </mesh>
      {/* crown */}
      <mesh position={[0, 2.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.08, 0.07, 0.3]} />
        <meshStandardMaterial color={PALETTE.woodMidLight} roughness={0.6} />
      </mesh>
      {/* plinth: grounds the piece, separates it from the baseboard rhythm */}
      <mesh position={[0, 1.04, 0]} castShadow>
        <boxGeometry args={[W - 0.14, 0.08, 0.24]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>

      {/*
        Props and the AI SIGNATURE live in furniture/ShelfItems.tsx
        (world-positioned against this shelf's approved boards).
      */}
    </group>
  )
}
