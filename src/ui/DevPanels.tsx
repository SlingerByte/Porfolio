/**
 * Dev instrumentation (M5.9): a discreet edge HUD instead of floating panels.
 *
 * Collapsed: one thin strip pinned to the bottom-right corner — DEV, fps,
 * dpr, calls. Expanded (hover intent or click): the full inspector —
 * render scale buttons and scene draw stats. The lamp lives in its own
 * pixel-art bulb widget whose secondary controls hide in a small popover.
 *
 * Visible in dev mode or with ?debug in the URL; stripped from normal prod.
 */
import { useEffect, useState } from 'react'
import { useExperience } from '../state/ExperienceContext'
import { PIXEL_SCALES } from '../scene/config'
import { sceneStats } from '../scene/stats'

export function showDevTools(): boolean {
  if (import.meta.env.DEV) return true
  return new URLSearchParams(window.location.search).has('debug')
}

/** Minimal live FPS readout (spike instrumentation). */
function FpsMeter() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = (t: number) => {
      frames++
      if (t - last >= 1000) {
        setFps(Math.round((frames * 1000) / (t - last)))
        frames = 0
        last = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <span>{fps}</span>
}

/** Pixel-art bulb: ON/OFF at a glance; click toggles the lamp. */
function LampBulb() {
  const { lampOn, toggleLamp, resetLamp, reducedMotion } = useExperience()
  const [open, setOpen] = useState(false)

  return (
    <div className="lamp-widget">
      <button
        type="button"
        className={`lamp-bulb${lampOn ? ' is-on' : ''}`}
        onClick={toggleLamp}
        aria-pressed={lampOn}
        aria-label={`lamp ${lampOn ? 'on' : 'off'} — click to toggle`}
      >
        <svg viewBox="0 0 8 10" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
          {/* glass */}
          <rect x="2" y="1" width="4" height="1" />
          <rect x="1" y="2" width="6" height="3" />
          <rect x="2" y="5" width="4" height="1" />
          {/* filament gap shows only when lit */}
          <rect className="bulb-glow" x="3" y="3" width="2" height="1" />
          {/* base */}
          <rect x="2" y="6" width="4" height="1" />
          <rect x="3" y="7" width="2" height="1" />
        </svg>
      </button>

      <button
        type="button"
        className="lamp-more"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="lamp-popover"
        aria-label="More lamp controls"
      >
        ⋯
      </button>

      {open && (
        <div id="lamp-popover" className="panel lamp-pop" role="group" aria-label="Lamp control">
          <button aria-pressed={lampOn} onClick={toggleLamp}>
            {lampOn ? 'Turn off' : 'Turn on the light'}
          </button>
          <button onClick={resetLamp}>Reset sequence</button>
          <span className="lamp-motion">reduced motion: {reducedMotion ? 'ON' : 'off'}</span>
        </div>
      )}
    </div>
  )
}

export function DevPanels() {
  const { pixelScale, setPixelScale } = useExperience()
  const [open, setOpen] = useState(false)

  return (
    <>
      <LampBulb />

      <div className={`dev-hud${open ? ' is-open' : ''}`}>
        <button
          type="button"
          className="dev-hud-tab"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="dev-hud-body"
          aria-label="Developer hud — toggle full render stats"
        >
          <span className="dev-hud-tag">DEV</span>
          <span className="dev-hud-mini">
            <FpsMeter /> fps
          </span>
        </button>

        {open && (
          <div id="dev-hud-body" className="panel dev-hud-body">
            <p className="dev-hud-title">RENDER SCALE</p>
            <div role="group" aria-label="Render scale">
              {PIXEL_SCALES.map((s) => (
                <button key={s} aria-pressed={pixelScale === s} onClick={() => setPixelScale(s)}>
                  {s.toFixed(2)}
                </button>
              ))}
            </div>
            <p className="dev-hud-title">SCENE</p>
            <span className="dev-hud-stat">
              <FpsMeter /> fps · dpr {pixelScale}
            </span>
            <span className="dev-hud-stat">
              {sceneStats.calls > 0
                ? `${sceneStats.calls} calls · ${sceneStats.triangles} tris · ${sceneStats.geometries} geo · ${sceneStats.textures} tex`
                : 'scene not mounted'}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
