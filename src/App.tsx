import { Suspense, lazy, useEffect, useMemo } from 'react'
import {
  ExperienceProvider,
  useExperience,
  type FocusMode,
  type NarrativeState,
} from './state/ExperienceContext'
import { useNarrativeTracking } from './state/useNarrativeTracking'
import { CanvasErrorBoundary } from './scene/CanvasErrorBoundary'
import { Nav } from './ui/Nav'
import { HeroSection } from './ui/sections/HeroSection'
import { RoomIntro } from './ui/sections/RoomIntro'
import { Experience } from './ui/sections/Experience'
import { Work } from './ui/sections/Work'
import { Skills } from './ui/sections/Skills'
import { About } from './ui/sections/About'
import { Contact } from './ui/sections/Contact'
import { DevPanels, showDevTools } from './ui/DevPanels'
import { FallbackNotice } from './ui/FallbackNotice'
import { SpatialLayer } from './ui/spatial/SpatialLayer'

/** three/R3F/GSAP live in a separate chunk; only fetched when WebGL exists. */
const SceneCanvas = lazy(() => import('./scene/SceneCanvas'))

function Site() {
  const {
    webglFailed,
    failWebgl,
    narrative,
    sceneActive,
    setNarrative,
    setCameraSettled,
    setFocus,
    setBookScrollPage,
  } = useExperience()

  // DEV-ONLY visual QA hook: ?qa=<narrative>&settled&focus=<mode>&page=<n>
  // pins the experience to a state so it can be photographed/inspected.
  // No-op in prod (gated by showDevTools) and disables scroll tracking
  // while active.
  const qaParams = useMemo(
    () =>
      import.meta.env.DEV && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null,
    []
  )
  const qaActive = qaParams?.has('qa') ?? false

  useEffect(() => {
    if (!qaParams) return
    const qa = qaParams.get('qa') as NarrativeState | null
    const qf = qaParams.get('focus') as FocusMode | null
    const qp = qaParams.get('page')
    if (qa) setNarrative(qa)
    if (qp !== null && qp !== undefined && qp !== '') setBookScrollPage(Number(qp) || 0)
    if (!qaParams.has('settled')) return
    // re-assert: the real CameraRig writes false while its tween starts
    setCameraSettled(true)
    if (qf) setFocus(qf)
    const t = setInterval(() => setCameraSettled(true), 400)
    return () => clearInterval(t)
  }, [qaParams, setNarrative, setCameraSettled, setFocus, setBookScrollPage])

  // scroll -> narrative state (context); objects & camera react to it
  useNarrativeTracking({ enabled: !qaActive })

  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>

      {sceneActive && !qaParams?.has('freeze') && (
        <div className="scene-canvas">
          <CanvasErrorBoundary onFail={failWebgl}>
            <Suspense fallback={null}>
              <SceneCanvas />
            </Suspense>
          </CanvasErrorBoundary>
        </div>
      )}

      <Nav />

      {sceneActive && <SpatialLayer />}

      {/* Narrative order (M5.4 + M5.8): hero -> about this room -> monitor
          (experience) -> room restore -> shelf (book pages) -> corkboard
          (skills) -> door (contact). */}
      <main id="content" className="portfolio-flow" data-narrative={narrative} data-scene={sceneActive ? 'on' : 'off'}>
        <HeroSection />
        <RoomIntro />
        <Experience />
        <Work />
        <Skills />
        <About />
        <Contact />

        <footer className="site-footer">
          <p>© 2026 Emilson Oviedo — React · Three.js · one lamp.</p>
          <p>No tracking. Scene renders locally.</p>
        </footer>
      </main>

      {showDevTools() && (
        <div className="dev-tools" role="group" aria-label="Developer instrumentation">
          <DevPanels />
        </div>
      )}

      {webglFailed && <FallbackNotice />}
    </>
  )
}

export default function App() {
  return (
    <ExperienceProvider>
      <Site />
    </ExperienceProvider>
  )
}
