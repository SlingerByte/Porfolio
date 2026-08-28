import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'
import { getDefaultPixelScale } from '../scene/config'
import { webglAvailable } from '../scene/webgl'
import { createOverloadTracker, recordToggle, resetOverloadTracker } from '../scene/lampOverload'
import type { Language } from '../content/locale'
import type { NarrativeState } from './narrative'
import type { FocusMode } from '../ui/spatial/focus'

export type { NarrativeState }
export type { FocusMode }

/**
 * Narrative lighting stages shared between the lamp timelines (writer)
 * and the DOM overlay (reader). The lamp drives the story; the UI follows.
 *
 *   0 off        — silhouettes, UI recessed
 *   1 pull       — cord pulled / flicker begins; nothing revealed yet
 *   2 reveal     — pool grows over floor/desk; scene gains legibility
 *   3 room       — room mostly lit; scrim + name rise
 *   4 final      — room clearly lit; tagline / CTA / scroll hint settle in
 */
export type SceneStage = 0 | 1 | 2 | 3 | 4

/**
 * Task 7G — the lamp bulb's state machine. LampRig owns the resulting
 * animations; the context owns the discrete states (deterministic, session-
 * persistent, easily reset by a replacement).
 *
 *   normal ──(10 rapid activations)──▶ overloading ──(FX end)──▶ burned
 *   burned ──(replacement bulb installed)──▶ replacing ──(FX end)──▶ normal
 */
export type LampBulbState = 'normal' | 'overloading' | 'burned' | 'replacing'

/**
 * Single owner of global experience state.
 * Scene and UI both read/write through this context — no window events,
 * no duplicated state, one direction of data flow.
 *
 * Ownership map (one writer per concern):
 *   camera        → CameraRig          (reads narrative; writes cameraSettled)
 *   lamp / lights → LampRig            (writes sceneStage)
 *   narrative     → useNarrativeTracking (writes narrative)
 *   book pages    → useNarrativeTracking writes bookScrollPage;
 *                    BookInterface writes ONLY bookPageShift;
 *                    effective page is DERIVED (state/book.ts), never stored
 *   screen        → Monitor            (animates from narrative)
 *   corkboard     → Corkboard          (animates from narrative)
 *   focus mode    → SpatialLayer       (writes focus)
 */
export interface ExperienceState {
  /** lamp sequence state; false = OFF */
  lampOn: boolean
  toggleLamp: () => void
  /** Task 7H — the initial "light first" discovery is complete (the lamp has
      been switched on at least once); the scroll gate never re-activates,
      even if the bulb is later toggled off or burns out */
  discoveryComplete: boolean
  /** deterministic OFF/reset of the lamp sequence */
  resetLamp: () => void
  /** Task 7G — bulb life-cycle (see LampBulbState above) */
  bulb: LampBulbState
  /** Task 7G — the replacement bulb has been found & taken from the drawer */
  bulbAcquired: boolean
  /** Task 7G.1 — a dropped-far bulb returns to the drawer (clears acquisition) */
  setBulbAcquired: (acquired: boolean) => void
  /** Task 7G.1 — the bulb is currently being carried (drag toward the lamp) */
  bulbCarried: boolean
  setBulbCarried: (carried: boolean) => void
  /** Task 7G — replacement drawer open/closed (owned by Desk + affordance) */
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  /** Task 7G — the user takes the bulb out of the drawer */
  acquireBulb: () => void
  /** Task 7G — burned+acquired → replacement sequence begins */
  replaceBulb: () => void
  /** Task 7G — overload FX finished → bulb burned, lamp forced off */
  completeOverload: () => void
  /** Task 7G — replacement FX finished → bulb normal, counter reset */
  completeReplacement: () => void
  /** render-scale for the pixel aesthetic */
  pixelScale: number
  setPixelScale: (scale: number) => void
  reducedMotion: boolean
  webglFailed: boolean
  failWebgl: () => void
  /** true while the 3D scene owns presentation (WebGL supported and not failed) */
  sceneActive: boolean
  /** narrative lighting stage written by LampRig, read by Overlay */
  sceneStage: SceneStage
  setSceneStage: (stage: SceneStage) => void
  /** current narrative state derived from scroll (see narrative.ts) */
  narrative: NarrativeState
  /** written ONLY by useNarrativeTracking */
  setNarrative: (state: NarrativeState) => void
  /** true while the camera holds a stable pose (written ONLY by CameraRig) */
  cameraSettled: boolean
  setCameraSettled: (settled: boolean) => void
  /** expanded contextual interface (written ONLY by SpatialLayer) */
  focus: FocusMode
  setFocus: (focus: FocusMode) => void
  /** page derived from scroll progress alone, before UI shift (ONLY tracking writes) */
  bookScrollPage: number
  setBookScrollPage: (page: number) => void
  /** UI navigation offset applied on top of the scroll page (ONLY BookInterface writes) */
  bookPageShift: number
  setBookPageShift: (shift: number) => void
  /** UI language — English by default, Spanish via the toggle */
  language: Language
  setLanguage: (lang: Language) => void
}

const ExperienceContext = createContext<ExperienceState | null>(null)

/** persisted UI language — English unless the user chose Spanish */
function loadLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  try {
    const stored = window.localStorage.getItem('portfolio-lang')
    return stored === 'es' ? 'es' : 'en'
  } catch {
    return 'en'
  }
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [lampOn, setLampOn] = useState(false)
  const [pixelScale, setPixelScale] = useState(getDefaultPixelScale)
  const reducedMotion = useReducedMotion()
  const [webglFailed, setWebglFailed] = useState(() => !webglAvailable())
  /** feature support detected once; sceneActive = supported AND not failed */
  const [webglSupported] = useState(() => webglAvailable())
  const [sceneStage, setSceneStage] = useState<SceneStage>(0)
  const [narrative, setNarrative] = useState<NarrativeState>('hero')
  const [cameraSettled, setCameraSettled] = useState(false)
  const [focus, setFocus] = useState<FocusMode>('none')
  const [bookScrollPage, setBookScrollPage] = useState(0)
  const [bookPageShift, setBookPageShift] = useState(0)
  const [language, setLanguage] = useState<Language>(loadLanguage)
  // Task 7G — the bulb life-cycle + replacement drawer
  const [bulb, setBulb] = useState<LampBulbState>('normal')
  const [bulbAcquired, setBulbAcquired] = useState(false)
  const [bulbCarried, setBulbCarriedState] = useState(false)
  const [drawerOpen, setDrawerOpenState] = useState(false)
  const overloadTracker = useRef(createOverloadTracker())
  // Task 7H — the initial discovery gate is released once the lamp has ever
  // been switched on; a later burned bulb must not re-gate the room
  const [discoveryComplete, setDiscoveryComplete] = useState(false)

  // Task 7H — one authoritative release: the first ON is the discovery
  useEffect(() => {
    if (lampOn) setDiscoveryComplete(true)
  }, [lampOn])

  /**
   * Task 7G — the ONE canal every lamp activation goes through (cord pull,
   * tap/click, ENTER). When burned/overloading/replacing the bulb is dead:
   * toggles are ignored. Otherwise count the activation in the sliding
   * window and burn the bulb the moment abuse reaches the threshold.
   */
  const toggleLamp = useCallback(() => {
    if (bulb !== 'normal') return
    setLampOn((v) => !v)
    if (recordToggle(overloadTracker.current, Date.now())) {
      setBulb('overloading')
    }
  }, [bulb])

  const resetLamp = useCallback(() => setLampOn(false), [])
  const failWebgl = useCallback(() => setWebglFailed(true), [])
  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang)
    try {
      window.localStorage.setItem('portfolio-lang', lang)
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
  }, [])

  // Task 7G — replacement drawer / bulb actions
  const acquireBulb = useCallback(() => setBulbAcquired(true), [])
  const replaceBulb = useCallback(() => {
    setBulb((b) => (b === 'burned' ? 'replacing' : b))
  }, [])
  const completeOverload = useCallback(() => {
    setBulb('burned')
    setLampOn(false)
    // the room is dark again — the DOM overlay must follow (content recedes)
    setSceneStage(0)
  }, [])
  const completeReplacement = useCallback(() => {
    setBulb('normal')
    setBulbAcquired(false)
    setBulbCarriedState(false)
    // the spare was installed — the drawer has nothing left to hold
    setDrawerOpenState(false)
    resetOverloadTracker(overloadTracker.current)
    // Task 7G.1 — the reward: the freshly installed bulb turns the lamp on
    setLampOn(true)
  }, [])
  const setDrawerOpen = useCallback((open: boolean) => setDrawerOpenState(open), [])
  const setBulbCarried = useCallback((carried: boolean) => setBulbCarriedState(carried), [])

  // keep the document language in sync for screen readers / styling
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(
    () => ({
      lampOn,
      toggleLamp,
      resetLamp,
      discoveryComplete,
      bulb,
      bulbAcquired,
      setBulbAcquired,
      bulbCarried,
      setBulbCarried,
      drawerOpen,
      setDrawerOpen,
      acquireBulb,
      replaceBulb,
      completeOverload,
      completeReplacement,
      pixelScale,
      setPixelScale,
      reducedMotion,
      webglFailed,
      failWebgl,
      sceneActive: !webglFailed && webglSupported,
      sceneStage,
      setSceneStage,
      narrative,
      setNarrative,
      cameraSettled,
      setCameraSettled,
      focus,
      setFocus,
      bookScrollPage,
      setBookScrollPage,
      bookPageShift,
      setBookPageShift,
      language,
      setLanguage: changeLanguage,
    }),
    [
      lampOn,
      toggleLamp,
      resetLamp,
      discoveryComplete,
      bulb,
      bulbAcquired,
      setBulbAcquired,
      bulbCarried,
      setBulbCarried,
      drawerOpen,
      setDrawerOpen,
      acquireBulb,
      replaceBulb,
      completeOverload,
      completeReplacement,
      pixelScale,
      reducedMotion,
      webglFailed,
      failWebgl,
      webglSupported,
      sceneStage,
      narrative,
      setNarrative,
      cameraSettled,
      focus,
      bookScrollPage,
      bookPageShift,
      language,
      changeLanguage,
    ]
  )

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
}

export function useExperience(): ExperienceState {
  const ctx = useContext(ExperienceContext)
  if (!ctx) throw new Error('useExperience must be used inside <ExperienceProvider>')
  return ctx
}
