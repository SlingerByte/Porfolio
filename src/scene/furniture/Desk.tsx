import { PALETTE } from '../palette'

/** Desk + drawer pedestal, centered under the lamp pool. */
export function Desk() {
  return (
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
      {/* drawer pedestal (right) */}
      <group position={[0.68, 0, 0.02]}>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.52, 0.72, 0.88]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
        </mesh>
        {([0.52, 0.24] as const).map((y) => (
          <group key={y}>
            <mesh position={[0, y, 0.45]}>
              <boxGeometry args={[0.42, 0.18, 0.02]} />
              <meshStandardMaterial color={PALETTE.woodMid} roughness={0.7} />
            </mesh>
            <mesh position={[0, y, 0.465]}>
              <sphereGeometry args={[0.022, 10, 8]} />
              <meshStandardMaterial color={PALETTE.brass} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>
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
