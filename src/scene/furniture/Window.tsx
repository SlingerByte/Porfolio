import { PALETTE } from '../palette'

/**
 * Structural window (left ~15% of the composition).
 * Recessed pane + protruding casing + sill: depth that survives both
 * silhouette-OFF and warm-ON reads.
 */
export function Window() {
  const w = 1.35
  const h = 1.95

  return (
    <group position={[-2.9, 2.25, -1.98]}>
      {/* recessed moon pane — 8mm in front of the wall plane to avoid z-fighting */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={PALETTE.moonPane}
          emissive="#243650"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* muntins */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.055, h]} />
        <meshStandardMaterial color={PALETTE.moonFrame} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w, 0.055]} />
        <meshStandardMaterial color={PALETTE.moonFrame} />
      </mesh>
      {/* casing with depth */}
      {([
        [0, h / 2 + 0.05, w + 0.22, 0.1],
        [0, -h / 2 - 0.05, w + 0.22, 0.1],
      ] as const).map(([x, y, bw, bh]) => (
        <mesh key={`h${y}`} position={[x, y, 0.02]} castShadow>
          <boxGeometry args={[bw, bh, 0.09]} />
          <meshStandardMaterial color={PALETTE.wallWarm} />
        </mesh>
      ))}
      {([
        [-(w / 2 + 0.05)],
        [w / 2 + 0.05],
      ] as const).map(([x]) => (
        <mesh key={`v${x}`} position={[x, 0, 0.02]} castShadow>
          <boxGeometry args={[0.1, h + 0.2, 0.09]} />
          <meshStandardMaterial color={PALETTE.wallWarm} />
        </mesh>
      ))}
      {/* sill */}
      <mesh position={[0, -h / 2 - 0.12, 0.06]} castShadow>
        <boxGeometry args={[w + 0.34, 0.07, 0.16]} />
        <meshStandardMaterial color={PALETTE.woodMid} />
      </mesh>
    </group>
  )
}
