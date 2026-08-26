import { PALETTE } from '../palette'

/**
 * Tier-1 desk props (M0.2 approved). Small, secondary, procedural.
 * Every object earns its place: keyboard/mouse = dev identity, mug = human
 * hours, headphones = focus. World-positioned on the approved desk
 * (center x .55, top surface y .815).
 */
export function DeskItems() {
  return (
    <group>
      {/* keyboard: single body + two key-row ridges (3 draw calls, reads at pixel scale) */}
      <group position={[0.08, 0.835, -0.7]} rotation={[0, 0.06, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.022, 0.16]} />
          <meshStandardMaterial color={PALETTE.techCharcoal} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.014, -0.03]}>
          <boxGeometry args={[0.46, 0.008, 0.05]} />
          <meshStandardMaterial color={PALETTE.techPanel} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.014, 0.04]}>
          <boxGeometry args={[0.46, 0.008, 0.045]} />
          <meshStandardMaterial color={PALETTE.techPanel} roughness={0.7} />
        </mesh>
      </group>

      {/* mouse */}
      <group position={[0.48, 0.84, -0.68]} rotation={[0, -0.12, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.032, 0.045, 4, 10]} />
          <meshStandardMaterial color={PALETTE.techCharcoal} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.028, -0.02]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.008, 0.02, 0.01]} />
          <meshStandardMaterial color="#3d332a" roughness={0.4} />
        </mesh>
      </group>

      {/* mug: ceramic catches the amber pool */}
      <group position={[1.02, 0, -0.78]}>
        <mesh position={[0, 0.885, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.038, 0.11, 14]} />
          <meshStandardMaterial color={PALETTE.ceramic} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.925, 0]}>
          <circleGeometry args={[0.038, 14]} />
          <meshStandardMaterial color={PALETTE.coffeeDark} roughness={0.4} />
        </mesh>
        <mesh position={[0.052, 0.89, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.026, 0.007, 6, 14]} />
          <meshStandardMaterial color={PALETTE.ceramic} roughness={0.55} />
        </mesh>
      </group>

      {/* headphones resting on the desk edge */}
      <group position={[-0.42, 0, -0.62]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.075, 0.011, 6, 18, Math.PI]} />
          <meshStandardMaterial color={PALETTE.techCharcoal} roughness={0.45} metalness={0.1} />
        </mesh>
        {([-0.075, 0.075] as const).map((x) => (
          <mesh key={x} position={[x, 0.83, 0]} castShadow>
            <cylinderGeometry args={[0.038, 0.042, 0.03, 12]} />
            <meshStandardMaterial color={PALETTE.techPanel} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
