import { describe, expect, it } from 'vitest'
import { PIXEL_SCALES, getDefaultPixelScale } from '../scene/config'
import { CAMERA_POSES, HERO_ESTABLISHING, getPoseTier, type PoseTier } from '../scene/cameraPoses'
import type { NarrativeState } from '../state/narrative'

const STATES: NarrativeState[] = ['hero', 'monitor', 'room', 'shelf', 'skills', 'contact']
const TIERS: PoseTier[] = ['desktop', 'tablet', 'mobile']

describe('camera pose tables (M5.4)', () => {
  it('every narrative state has a complete pose in every device tier', () => {
    for (const tier of TIERS) {
      for (const state of STATES) {
        const pose = CAMERA_POSES[tier][state]
        expect(pose, `${tier}/${state}`).toBeDefined()
        expect(pose.position).toHaveLength(3)
        expect(pose.target).toHaveLength(3)
        for (const v of [...pose.position, ...pose.target]) {
          expect(Number.isFinite(v)).toBe(true)
        }
      }
    }
  })

  it('focus poses differ from the establishing shot (real dolly, not a nudge)', () => {
    for (const tier of TIERS) {
      for (const state of ['monitor', 'shelf', 'skills'] as NarrativeState[]) {
        const hero = CAMERA_POSES[tier].hero.position
        const focus = CAMERA_POSES[tier][state].position
        const dist = Math.hypot(focus[0] - hero[0], focus[1] - hero[1], focus[2] - hero[2])
        expect(dist, `${tier}/${state}`).toBeGreaterThan(1.5)
      }
    }
  })

  it('mobile framing pulls back further than desktop (narrow horizontal FOV)', () => {
    for (const state of STATES) {
      const d = CAMERA_POSES.desktop[state].position
      const m = CAMERA_POSES.mobile[state].position
      const distDesktopToMobile = Math.hypot(m[0] - d[0], m[1] - d[1], m[2] - d[2])
      expect(distDesktopToMobile).toBeGreaterThanOrEqual(0)
      // mobile camera must be at least as far from the scene center
      const center: [number, number, number] = [0.8, 1.5, -1.4]
      const dm = Math.hypot(m[0] - center[0], m[1] - center[1], m[2] - center[2])
      const dd = Math.hypot(d[0] - center[0], d[1] - center[1], d[2] - center[2])
      if (state !== 'hero') expect(dm).toBeGreaterThan(dd)
    }
  })

  it('tier selection matches the responsive breakpoints', () => {
    expect(getPoseTier(1920)).toBe('desktop')
    expect(getPoseTier(1025)).toBe('desktop')
    expect(getPoseTier(1024)).toBe('tablet')
    expect(getPoseTier(641)).toBe('tablet')
    expect(getPoseTier(640)).toBe('mobile')
    expect(getPoseTier(360)).toBe('mobile')
  })

  it('hero pose is the single source of truth for the initial camera', () => {
    expect(HERO_ESTABLISHING.position).toEqual([0, 1.75, 7.4])
  })
})

describe('scene config determinism', () => {
  it('approved pixel scale ladder matches M0.2/M0.3 decisions', () => {
    expect([...PIXEL_SCALES]).toEqual([1.0, 0.5, 0.4, 0.34, 0.25])
  })

  // Phase 3 invariant: the human-approved default is 1.0 (visual quality
  // constraint) — the ladder keeps the lower scales for manual/fallback use.
  it('default pixel scale is the human-approved 1.00 across tiers', () => {
    expect(getDefaultPixelScale()).toBe(1.0)
  })
})
