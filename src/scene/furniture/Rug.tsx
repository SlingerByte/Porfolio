import { PALETTE } from '../palette'

/** Rug anchors the lamp's warm pool and the desk zone compositionally. */
export function Rug() {
  return (
    <group position={[0.45, 0, -0.55]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <circleGeometry args={[1.75, 28]} />
        <meshStandardMaterial color={PALETTE.rugBase} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <ringGeometry args={[1.45, 1.58, 28]} />
        <meshStandardMaterial color={PALETTE.rugBorder} roughness={0.95} />
      </mesh>
    </group>
  )
}
