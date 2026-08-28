import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { setSagGoal, ropeEnergy, ROPE_POINTS } from '../scene/LampRig'

const ANCHOR = new THREE.Vector3(0, -1.08, 0)
const BEAD = new THREE.Vector3(0, -1.48, 0)
const SAG = 0.06

describe('Task 7F — flexible cord (pure rope math)', () => {
  it('the sag goal starts at the anchor and ends at the bead', () => {
    const out = new THREE.Vector3()
    setSagGoal(out, ANCHOR, BEAD, 0, SAG)
    expect(out.x).toBeCloseTo(ANCHOR.x, 5)
    expect(out.y).toBeCloseTo(ANCHOR.y, 5)
    setSagGoal(out, ANCHOR, BEAD, ROPE_POINTS - 1, SAG)
    expect(out.x).toBeCloseTo(BEAD.x, 5)
    expect(out.y).toBeCloseTo(BEAD.y, 5)
  })

  it('interior points bow downward from the straight line (hanging sag)', () => {
    const out = new THREE.Vector3()
    setSagGoal(out, ANCHOR, BEAD, Math.floor(ROPE_POINTS / 2), SAG)
    // straight line at that t
    const t = Math.floor(ROPE_POINTS / 2) / (ROPE_POINTS - 1)
    const lineY = ANCHOR.y + (BEAD.y - ANCHOR.y) * t
    // the goal dips below the line by the sag at the middle
    expect(out.y).toBeLessThan(lineY - SAG * 0.9)
  })

  it('ropeEnergy is zero when the points are at rest (no motion)', () => {
    const pts = Array.from({ length: ROPE_POINTS }, (_, i) => new THREE.Vector3(i, 0, 0))
    const prev = pts.map((p) => p.clone())
    expect(ropeEnergy(pts, prev)).toBe(0)
  })
})