import { PALETTE } from '../palette'

/**
 * Tier-2 shelf props: few books, two personal objects, AI signature concept.
 * Shelves stay mostly empty — breathing room is part of the composition.
 * World-positioned for the approved shelf (center x 1.42, boards y 1.25/1.81).
 */

const BOOK_TONES = [PALETTE.bookA, PALETTE.bookB, PALETTE.bookC, PALETTE.bookD, PALETTE.bookE]

/** Leaning row of books, lower board left side. */
export function ShelfBooks() {
  return (
    <group position={[1.02, 1.25, -1.9]}>
      {[
        [0.045, 0.26],
        [0.038, 0.24],
        [0.05, 0.27],
        [0.04, 0.235],
        [0.046, 0.255],
      ].map(([w, h], i) => (
        <mesh
          key={i}
          position={[i * 0.052 - 0.11, h / 2, 0]}
          rotation={[0, 0, i === 4 ? -0.12 : 0]}
          castShadow
        >
          <boxGeometry args={[w, h, 0.19]} />
          <meshStandardMaterial color={BOOK_TONES[i]} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** Framed photo + horizontal book stack: the personal layer. Upper board. */
export function PersonalObjects() {
  return (
    <group position={[1.62, 1.81, -1.9]}>
      {/* frame leaning against the back */}
      <group position={[-0.28, 0.115, -0.06]} rotation={[0, 0.18, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.17, 0.22, 0.015]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.13, 0.17]} />
          <meshStandardMaterial color="#8d8577" roughness={0.9} />
        </mesh>
      </group>
      {/* small stack of two books laid flat */}
      <mesh position={[0.16, 0.022, 0.01]} rotation={[0, -0.14, 0]} castShadow>
        <boxGeometry args={[0.2, 0.04, 0.15]} />
        <meshStandardMaterial color={PALETTE.bookB} roughness={0.85} />
      </mesh>
      <mesh position={[0.155, 0.06, 0]} rotation={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.185, 0.035, 0.14]} />
        <meshStandardMaterial color={PALETTE.bookD} roughness={0.85} />
      </mesh>
    </group>
  )
}

/**
 * AI SIGNATURE — first conceptual pass, NOT the final design.
 * A quiet personal device: charcoal body, tilted dark face, single warm
 * amber status dot (the only emissive, echoing the lamp — deliberately no
 * RGB/cyberpunk). Reads as "something the owner built". Replace later.
 */
export function AiSignature() {
  return (
    <group name="ai-signature-anchor" position={[2.02, 1.25, -1.9]}>
      {/* body */}
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.16, 0.26, 0.13]} />
        <meshStandardMaterial color={PALETTE.techCharcoal} roughness={0.5} />
      </mesh>
      {/* tilted face plate */}
      <mesh position={[0, 0.15, 0.072]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.11, 0.18, 0.012]} />
        <meshStandardMaterial color={PALETTE.techPanel} roughness={0.42} metalness={0.2} />
      </mesh>
      {/* single warm status dot */}
      <mesh position={[0, 0.09, 0.083]} rotation={[0.12, 0, 0]}>
        <circleGeometry args={[0.011, 10]} />
        <meshStandardMaterial color="#ffdca4" emissive="#ffb35c" emissiveIntensity={0.55} />
      </mesh>
      {/* brass foot detail */}
      <mesh position={[0, 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.03, 12]} />
        <meshStandardMaterial color={PALETTE.brass} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}
