import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { PALETTE } from '../palette'

/** Low-res pane texture: the moonlit blue with a very subtle violet cast in
    the upper part of the window (the "sky" fades violet-blue → blue). Soft
    LinearFilter blend; matches the pane's 1.35×1.95 ≈ 0.69 aspect. */
function drawPaneTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 184
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 184)
  g.addColorStop(0, '#382f6f') // faint violet at the top
  g.addColorStop(0.5, '#2d3462')
  g.addColorStop(1, '#27365a') // current blue at the bottom
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 184)
  return canvas
}

/**
 * Structural window (left ~15% of the composition).
 * Recessed pane + protruding casing + sill: depth that survives both
 * silhouette-OFF and warm-ON reads.
 */
export function Window() {
  const w = 1.35
  const h = 1.95

  const paneTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(drawPaneTexture())
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
  useEffect(() => () => paneTexture.dispose(), [paneTexture])

  return (
    <group position={[-2.9, 2.25, -1.98]}>
      {/* recessed moon pane — 8mm in front of the wall plane to avoid z-fighting */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={PALETTE.moonPane}
          map={paneTexture}
          emissiveMap={paneTexture}
          emissive="#ffffff"
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
