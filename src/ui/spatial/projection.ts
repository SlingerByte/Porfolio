/**
 * Camera projection math for the focus layer's FLIP origin — pure
 * TypeScript, NO three.js import. The scene lives in a lazy chunk; the DOM
 * layer must stay tiny, so we replicate the perspective projection by hand.
 *
 * M5.10: this module NO LONGER projects DOM onto meshes (embedded UI is
 * gone). Its single remaining job: given a named pose (the same tables
 * CameraRig uses) and a world-space anchor rect, return the screen AABB
 * an object occupies so the focused panel can GROW OUT of it.
 */

export interface Vec2 {
  x: number
  y: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface CamView {
  position: [number, number, number]
  target: [number, number, number]
  /** vertical FOV in degrees */
  fovY: number
}

/** Project a world point to CSS pixels. Returns null when behind the camera. */
export function projectPoint(p: Vec3, cam: CamView, width: number, height: number): Vec2 | null {
  const [px, py, pz] = cam.position
  const [tx, ty, tz] = cam.target

  // orthonormal basis (up = +Y)
  let fx = tx - px
  let fy = ty - py
  let fz = tz - pz
  const fl = Math.hypot(fx, fy, fz)
  if (fl === 0) return null
  fx /= fl
  fy /= fl
  fz /= fl

  // right = normalize(cross(forward, up))
  let rx = -fz
  const ry = 0
  let rz = fx
  const rl = Math.hypot(rx, ry, rz)
  if (rl === 0) return null
  rx /= rl
  rz /= rl

  // up' = cross(right, forward)
  const ux = ry * fz - rz * fy
  const uy = rz * fx - rx * fz
  const uz = rx * fy - ry * fx

  const dx = p.x - px
  const dy = p.y - py
  const dz = p.z - pz

  const z = dx * fx + dy * fy + dz * fz // depth along view axis
  if (z <= 0.001) return null

  const x = dx * rx + dy * ry + dz * rz
  const y = dx * ux + dy * uy + dz * uz

  const tanHalf = Math.tan((cam.fovY * Math.PI) / 360)
  const aspect = width / height
  const ndcX = x / (z * tanHalf * aspect)
  const ndcY = y / (z * tanHalf)

  return {
    x: ((ndcX + 1) / 2) * width,
    y: ((1 - ndcY) / 2) * height,
  }
}

/** World-space rectangle facing the camera (axis-aligned plane, normal ±Z-ish). */
export interface WorldRect {
  center: Vec3
  halfWidth: number
  halfHeight: number
}

/** Corners ordered TL, TR, BR, BL as seen by our cameras (looking ≈ −Z, up +Y). */
export function worldRectCorners(r: WorldRect): [Vec3, Vec3, Vec3, Vec3] {
  const { center, halfWidth: hw, halfHeight: hh } = r
  return [
    { x: center.x - hw, y: center.y + hh, z: center.z },
    { x: center.x + hw, y: center.y + hh, z: center.z },
    { x: center.x + hw, y: center.y - hh, z: center.z },
    { x: center.x - hw, y: center.y - hh, z: center.z },
  ]
}

export type ScreenQuad = [Vec2, Vec2, Vec2, Vec2]

/** Project a world rect to a screen quad; null when any corner is behind the camera. */
export function projectWorldRect(
  r: WorldRect,
  cam: CamView,
  width: number,
  height: number
): ScreenQuad | null {
  const quad = worldRectCorners(r).map((c) => projectPoint(c, cam, width, height))
  if (quad.some((q) => q === null)) return null
  return quad as unknown as ScreenQuad
}

/** Axis-aligned bounding box of a screen quad, in CSS px. */
export function quadAabb(quad: ScreenQuad): { left: number; top: number; width: number; height: number } {
  const xs = quad.map((q) => q.x)
  const ys = quad.map((q) => q.y)
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top }
}
