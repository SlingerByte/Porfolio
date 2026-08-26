import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'
import { getDefaultPixelScale } from '../scene/config'
import { webglAvailable } from '../scene/webgl'
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
  /** deterministic OFF/reset of the lamp sequence */
  resetLamp: () => void
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

  const toggleLamp = useCallback(() => setLampOn((v) => !v), [])
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

  // keep the document language in sync for screen readers / styling
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(
    () => ({
      lampOn,
      toggleLamp,
      resetLamp,
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
