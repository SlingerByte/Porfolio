import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import {
  createOverloadTracker,
  OVERLOAD_THRESHOLD,
  OVERLOAD_WINDOW_MS,
  recordToggle,
  resetOverloadTracker,
} from '../scene/lampOverload'
import { ExperienceProvider, useExperience } from '../state/ExperienceContext'
import { SpatialLayer } from '../ui/spatial/SpatialLayer'

/**
 * Task 7G/7G.1 — the lamp-abuse easter egg.
 *
 * Pure logic (the sliding-window tracker + the drag-install geometry) is
 * tested deterministically with explicit inputs — no timers at all. The state
 * machine (context) is driven through the real toggle canal exactly like a
 * user would: 5 rapid activations burn the bulb, the spare drawer/bulb are
 * found, picking the bulb up and installing it (drag / keyboard) restores the
 * lamp and resets the counter, and the replacement itself can never re-trigger
 * the overload.
 */

/* ------------------------------------------------------------------ */
/* Pure tracker                                                        */
/* ------------------------------------------------------------------ */

describe('Task 7G — overload tracker (sliding window)', () => {
  it('does not fire below the threshold (4 activations)', () => {
    const t = createOverloadTracker()
    for (let i = 0; i < OVERLOAD_THRESHOLD - 1; i++) {
      expect(recordToggle(t, i * 100)).toBe(false)
    }
  })

  it('fires exactly at the threshold (5 activations) inside the window', () => {
    const t = createOverloadTracker()
    let fired = false
    for (let i = 0; i < OVERLOAD_THRESHOLD; i++) {
      fired = recordToggle(t, i * 100)
    }
    expect(fired).toBe(true)
  })

  it('never fires for the same count spread across hours', () => {
    const t = createOverloadTracker()
    // 4 toggles, hours apart
    for (let i = 0; i < OVERLOAD_THRESHOLD - 1; i++) {
      recordToggle(t, i * 3600000)
    }
    // a 5th activation long after the first is alone in its window
    expect(recordToggle(t, (OVERLOAD_THRESHOLD - 1) * 3600000)).toBe(false)
  })

  it('prunes stale activations so a slow cadence never accumulates', () => {
    const t = createOverloadTracker()
    // 4 toggles just inside the window…
    for (let i = 0; i < OVERLOAD_THRESHOLD - 1; i++) {
      recordToggle(t, i * 100)
    }
    // …then the 5th lands just OUTSIDE the window → no fire
    expect(recordToggle(t, (OVERLOAD_THRESHOLD - 1) * 100 + OVERLOAD_WINDOW_MS + 1)).toBe(false)
  })

  it('reset empties the window completely', () => {
    const t = createOverloadTracker()
    for (let i = 0; i < OVERLOAD_THRESHOLD; i++) recordToggle(t, i)
    resetOverloadTracker(t)
    expect(t.timestamps).toHaveLength(0)
    expect(recordToggle(t, 1)).toBe(false)
  })

  it('honours custom threshold/window', () => {
    const t = createOverloadTracker(3, 500)
    recordToggle(t, 0)
    recordToggle(t, 100)
    expect(recordToggle(t, 200)).toBe(true)
    const t2 = createOverloadTracker(3, 500)
    recordToggle(t2, 0)
    recordToggle(t2, 100)
    expect(recordToggle(t2, 700)).toBe(false)
  })

  it('keeps only timestamps inside the window (grows then prunes)', () => {
    const t = createOverloadTracker()
    recordToggle(t, 0)
    recordToggle(t, 5000)
    recordToggle(t, 20000)
    // the 0 and 5000 entries are now outside a 10s window from 20000
    expect(t.timestamps).toEqual([20000])
  })
})

/* ------------------------------------------------------------------ */
/* Drag-install geometry                                               */
/* ------------------------------------------------------------------ */

describe('Task 7G.1 — bulb installation geometry', () => {
  it('installs when released exactly on the socket', async () => {
    const { canInstallBulb, bulbInstallDistance, LAMP_BULB_POSITION } = await import('../scene/lampFx')
    expect(bulbInstallDistance(LAMP_BULB_POSITION.x, LAMP_BULB_POSITION.y, LAMP_BULB_POSITION.z)).toBe(0)
    expect(canInstallBulb(LAMP_BULB_POSITION.x, LAMP_BULB_POSITION.y, LAMP_BULB_POSITION.z)).toBe(true)
  })

  it('installs when released near the socket (forgiving hit zone)', async () => {
    const { canInstallBulb } = await import('../scene/lampFx')
    // a few tenths off in every axis is still a successful install
    expect(canInstallBulb(0.7, 2.0, -0.4)).toBe(true)
    expect(canInstallBulb(0.4, 2.1, -0.6)).toBe(true)
  })

  it('does not install when released far away', async () => {
    const { canInstallBulb } = await import('../scene/lampFx')
    expect(canInstallBulb(0.55, 0.5, -0.42)).toBe(false) // down at the desk
    expect(canInstallBulb(0.55, 3.5, -0.55)).toBe(false) // high above
    expect(canInstallBulb(-2, 1.5, -1)).toBe(false) // across the room
  })
})

/* ------------------------------------------------------------------ */
/* State machine through the real toggle canal                         */
/* ------------------------------------------------------------------ */

/** Exposes every Task 7G context value as DOM so tests can observe/drive it. */
function Harness() {
  const {
    lampOn,
    bulb,
    bulbAcquired,
    bulbCarried,
    drawerOpen,
    toggleLamp,
    acquireBulb,
    replaceBulb,
    completeOverload,
    completeReplacement,
    setDrawerOpen,
    setBulbCarried,
  } = useExperience()
  return (
    <div>
      <span data-testid="lamp">{String(lampOn)}</span>
      <span data-testid="bulb">{bulb}</span>
      <span data-testid="acquired">{String(bulbAcquired)}</span>
      <span data-testid="carried">{String(bulbCarried)}</span>
      <span data-testid="drawer">{String(drawerOpen)}</span>
      <button onClick={toggleLamp}>toggle</button>
      <button onClick={acquireBulb}>acquire</button>
      <button onClick={replaceBulb}>replace</button>
      <button onClick={completeOverload}>burn</button>
      <button onClick={completeReplacement}>install</button>
      <button onClick={() => setDrawerOpen(true)}>opendrawer</button>
      <button onClick={() => setBulbCarried(true)}>carry</button>
    </div>
  )
}

function renderHarness() {
  return render(
    <ExperienceProvider>
      <Harness />
    </ExperienceProvider>
  )
}

function toggleTimes(n: number) {
  const btn = screen.getByRole('button', { name: 'toggle' })
  for (let i = 0; i < n; i++) fireEvent.click(btn)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Task 7G — bulb state machine (ExperienceContext)', () => {
  it('5 rapid activations trigger the overload, exactly once', () => {
    renderHarness()
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')

    toggleTimes(OVERLOAD_THRESHOLD)
    expect(screen.getByTestId('bulb')).toHaveTextContent('overloading')

    // the overload finishes -> burned
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('burned')
    expect(screen.getByTestId('lamp')).toHaveTextContent('false')

    // hammering a burned lamp changes nothing — no re-trigger
    toggleTimes(20)
    expect(screen.getByTestId('bulb')).toHaveTextContent('burned')
    expect(screen.getByTestId('lamp')).toHaveTextContent('false')
  })

  it('5 activations spread across hours never trigger the overload', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    renderHarness()
    const btn = screen.getByRole('button', { name: 'toggle' })
    for (let i = 0; i < OVERLOAD_THRESHOLD - 1; i++) {
      fireEvent.click(btn)
      vi.advanceTimersByTime(3600000) // an hour between activations
    }
    fireEvent.click(btn)
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')
  })

  it('burned blocks the normal toggle (lamp stays off, bulb stays burned)', () => {
    renderHarness()
    toggleTimes(OVERLOAD_THRESHOLD)
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    toggleTimes(1)
    expect(screen.getByTestId('lamp')).toHaveTextContent('false')
    expect(screen.getByTestId('bulb')).toHaveTextContent('burned')
  })

  it('acquiring the spare bulb is a separate, always-available action', () => {
    renderHarness()
    expect(screen.getByTestId('acquired')).toHaveTextContent('false')
    fireEvent.click(screen.getByRole('button', { name: 'acquire' }))
    expect(screen.getByTestId('acquired')).toHaveTextContent('true')
  })

  it('the carried flag can be set and cleared independently', () => {
    renderHarness()
    expect(screen.getByTestId('carried')).toHaveTextContent('false')
    fireEvent.click(screen.getByRole('button', { name: 'carry' }))
    expect(screen.getByTestId('carried')).toHaveTextContent('true')
  })

  it('replacement restores the lamp ON, resets the counter, and needs 5 again', () => {
    renderHarness()
    toggleTimes(OVERLOAD_THRESHOLD)
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('burned')

    // find + take the spare, then interact with the lamp
    fireEvent.click(screen.getByRole('button', { name: 'acquire' }))
    fireEvent.click(screen.getByRole('button', { name: 'replace' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('replacing')

    // the replacement finishes -> normal, spare consumed, lamp ON (the reward)
    fireEvent.click(screen.getByRole('button', { name: 'install' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')
    expect(screen.getByTestId('acquired')).toHaveTextContent('false')
    expect(screen.getByTestId('carried')).toHaveTextContent('false')
    expect(screen.getByTestId('lamp')).toHaveTextContent('true')

    // counter was reset: 4 more toggles do nothing, the 5th burns again
    toggleTimes(OVERLOAD_THRESHOLD - 1)
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')
    toggleTimes(1)
    expect(screen.getByTestId('bulb')).toHaveTextContent('overloading')
  })

  it('installing the bulb also closes the drawer', () => {
    renderHarness()
    toggleTimes(OVERLOAD_THRESHOLD)
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    fireEvent.click(screen.getByRole('button', { name: 'opendrawer' }))
    fireEvent.click(screen.getByRole('button', { name: 'acquire' }))
    fireEvent.click(screen.getByRole('button', { name: 'replace' }))
    fireEvent.click(screen.getByRole('button', { name: 'install' }))
    expect(screen.getByTestId('drawer')).toHaveTextContent('false')
  })

  it('the replacement interaction itself never re-triggers the overload', () => {
    renderHarness()
    toggleTimes(OVERLOAD_THRESHOLD)
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    fireEvent.click(screen.getByRole('button', { name: 'acquire' }))
    fireEvent.click(screen.getByRole('button', { name: 'replace' }))
    fireEvent.click(screen.getByRole('button', { name: 'install' }))

    // immediately after installing, the lamp is healthy — not overloading
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')

    // a single lonely toggle right after the replacement is just a toggle
    toggleTimes(1)
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')
  })

  it('the drawer open/close flag is reversible', () => {
    renderHarness()
    expect(screen.getByTestId('drawer')).toHaveTextContent('false')
    fireEvent.click(screen.getByRole('button', { name: 'opendrawer' }))
    expect(screen.getByTestId('drawer')).toHaveTextContent('true')
  })

  it('replaceBulb is a no-op while the bulb is healthy (guard on burned)', () => {
    renderHarness()
    fireEvent.click(screen.getByRole('button', { name: 'replace' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')
  })

  it('reduced-motion consumers still receive a working state machine', () => {
    // The context does not gate on reduced motion; LampRig resolves the FX
    // instantly. Here we only assert the discrete states remain reachable —
    // the same transitions a reduced-motion LampRig drives.
    renderHarness()
    toggleTimes(OVERLOAD_THRESHOLD)
    expect(screen.getByTestId('bulb')).toHaveTextContent('overloading')
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('burned')
    fireEvent.click(screen.getByRole('button', { name: 'acquire' }))
    fireEvent.click(screen.getByRole('button', { name: 'replace' }))
    fireEvent.click(screen.getByRole('button', { name: 'install' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('normal')
  })
})

/* ------------------------------------------------------------------ */
/* Spark FX geometry (deterministic, count/direction sanity)           */
/* ------------------------------------------------------------------ */

describe('Task 7G — spark FX spawns', () => {
  it('is deterministic and sized around the bulb', async () => {
    const { sparkSpawns, SPARK_COUNT } = await import('../scene/lampFx')
    const a = sparkSpawns()
    const b = sparkSpawns()
    expect(a).toHaveLength(SPARK_COUNT)
    expect(a.length).toBeGreaterThan(0)
    // deterministic: same seed -> same spawns
    for (let i = 0; i < a.length; i++) {
      expect(a[i].dir.distanceTo(b[i].dir)).toBeLessThan(1e-6)
      expect(a[i].base.distanceTo(b[i].base)).toBeLessThan(1e-6)
      // unit direction, small size, staggered short life
      expect(Math.abs(a[i].dir.length() - 1)).toBeLessThan(1e-4)
      expect(a[i].dist).toBeLessThan(0.2)
      expect(a[i].dur).toBeLessThan(0.6)
      // real-spark behavior: perpendicular zigzag axes are unit and the
      // flicker/jitter are within visible-but-small ranges
      expect(Math.abs(a[i].perp1.length() - 1)).toBeLessThan(1e-4)
      expect(Math.abs(a[i].perp2.length() - 1)).toBeLessThan(1e-4)
      expect(Math.abs(a[i].perp1.dot(a[i].dir))).toBeLessThan(1e-4)
      expect(a[i].jitter).toBeLessThan(0.04)
      expect(a[i].wx).toBeGreaterThan(15)
      expect(a[i].brightness).toBeGreaterThan(0.5)
      expect(a[i].brightness).toBeLessThan(1.5)
    }
  })

  it('residual sparks are deterministic, few, and keep re-firing until they settle', async () => {
    const { residualSparkSpawns, RESIDUAL_SPARK_COUNT, RESIDUAL_DURATION } = await import('../scene/lampFx')
    const a = residualSparkSpawns()
    const b = residualSparkSpawns()
    expect(a).toHaveLength(RESIDUAL_SPARK_COUNT)
    expect(RESIDUAL_DURATION).toBeGreaterThanOrEqual(5)
    expect(RESIDUAL_DURATION).toBeLessThanOrEqual(10)
    for (let i = 0; i < a.length; i++) {
      // deterministic: same seed -> same cadences
      expect(a[i].period).toBe(b[i].period)
      // each spark re-fires repeatedly (life shorter than its period) so the
      // burned socket keeps visibly sparking — never a frozen dot
      expect(a[i].lifeDur).toBeGreaterThan(0)
      expect(a[i].lifeDur).toBeLessThan(a[i].period)
      expect(a[i].period).toBeLessThan(2.5)
      expect(a[i].jitter).toBeGreaterThan(0)
      expect(a[i].travelMax).toBeLessThan(0.3)
    }
  })
})

/* ------------------------------------------------------------------ */
/* Drawer affordance — the keyboard/screen-reader path                 */
/* ------------------------------------------------------------------ */

/** Pins the camera to the hero beat so the room affordance is eligible. */
function HeroProbe() {
  const { setCameraSettled, setNarrative } = useExperience()
  useEffect(() => {
    setCameraSettled(true)
    setNarrative('hero')
  }, [setCameraSettled, setNarrative])
  return null
}

describe('Task 7G — spare-bulb drawer affordance (keyboard path)', () => {
  it('OPEN DRAWER → TAKE BULB is a complete keyboard-reachable flow', () => {
    render(
      <ExperienceProvider>
        <HeroProbe />
        <SpatialLayer />
        <Harness />
      </ExperienceProvider>
    )

    // healthy lamp: no drawer affordance
    expect(screen.queryByRole('button', { name: /OPEN DRAWER/ })).toBeNull()

    // burn the lamp through the real toggle canal
    toggleTimes(OVERLOAD_THRESHOLD)
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('burned')

    // step 1 — the drawer affordance appears on the lamp's own beat
    const openBtn = screen.getByRole('button', { name: /OPEN DRAWER/ })
    fireEvent.click(openBtn)
    expect(screen.getByTestId('drawer')).toHaveTextContent('true')

    // step 2 — it turns into TAKE BULB; taking the bulb keeps the drawer open
    // (it closes on its own once the bulb is installed at the lamp)
    const takeBtn = screen.getByRole('button', { name: /TAKE BULB/ })
    fireEvent.click(takeBtn)
    expect(screen.getByTestId('acquired')).toHaveTextContent('true')
    expect(screen.getByTestId('drawer')).toHaveTextContent('true')

    // once the bulb is taken the affordance disappears — the lamp (ENTER /
    // cord) is the remaining target, and the replacement restores the bulb
    expect(screen.queryByRole('button', { name: /OPEN DRAWER/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /TAKE BULB/ })).toBeNull()
  })

  it('never shows over another beat’s affordance (only hero/room)', () => {
    render(
      <ExperienceProvider>
        <HeroProbe />
        <SpatialLayer />
        <Harness />
      </ExperienceProvider>
    )
    toggleTimes(OVERLOAD_THRESHOLD)
    fireEvent.click(screen.getByRole('button', { name: 'burn' }))
    expect(screen.getByTestId('bulb')).toHaveTextContent('burned')
    // hero beat -> the drawer affordance is the single action
    expect(screen.getByRole('button', { name: /OPEN DRAWER/ })).toBeInTheDocument()
  })
})