# PORTFOLIO BASELINE

Known-good state of the interactive 3D portfolio **before** implementation work.
Captured 2026-08-28. This is the baseline for validating future changes.
The design audit lives separately in `PORTFOLIO-EVOLUTION-AUDIT.md` (delivered as a
conversation artifact; not yet a repo file).

---

## 1. Repository structure (portfolio-relevant)

```
Portfolio/
├─ index.html                  # Vite entry, SEO/OG meta, theme-color
├─ package.json                # scripts + deps (see §2)
├─ pnpm-lock.yaml              # pnpm 11.4.0
├─ tsconfig.json               # strict, noEmit
├─ vite.config.ts              # react() only
├─ vitest.config.ts            # jsdom + setup
├─ eslint.config.js            # typescript-eslint + react-hooks
├─ .gitignore                  # node_modules, dist, *.local, .DS_Store
├─ dist/                       # production build output (gitignored)
├─ design/                     # milestone reports M0.2–M7.1 + m10 captures
└─ src/
   ├─ content/                 # ALL copy: portfolio.ts (EN), portfolio.es.ts (ES),
   │                           # strings.ts (chrome + diegetic), types.ts, locale.ts
   ├─ scene/                   # R3F world: Room, SceneCanvas, CameraRig, cameraPoses,
   │   │                       # LampRig (lamp+cord+lights), palette, config, sound, stats, webgl
   │   └─ furniture/           # Monitor, SelectedWorksBook, Corkboard, Door, Desk,
   │                           # DeskItems, Shelf, ShelfItems, Window, Cats, Rug, boardNotes
   ├─ state/                   # ExperienceContext, narrative.ts (pure), book.ts,
   │                           # useNarrativeTracking, useReducedMotion, useContent
   ├─ styles/                  # tokens.css, global.css, spatial.css
   ├─ ui/
   │   ├─ sections/            # Hero, RoomIntro, Experience, Work, Skills, About, Contact,
   │   │                       # SectionShell, ProjectCard
   │   └─ spatial/             # SpatialLayer, MonitorInterface, BookInterface,
   │                           # SkillsInterface, projection.ts, anchors.ts, focus.ts,
   │                           # tier.ts, useScrollExit
   ├─ test/                    # 8 suites / 83 tests
   ├─ App.tsx                  # composition + ?qa= dev hook
   └─ main.tsx
```

70 source files (`*.ts|*.tsx|*.css`), ~357 KB total.

## 2. Toolchain & commands

- **Package manager:** pnpm `11.4.0` (`packageManager: pnpm@11.4.0`).
- **Scripts** (`package.json`):
  - `dev` → `vite`
  - `build` → `tsc --noEmit && vite build`
  - `preview` → `vite preview`
  - `lint` → `eslint .`
  - `test` → `vitest run`
- **Dependencies:** react 19.2, react-dom 19.2, three 0.185.1, @react-three/fiber 9.7, gsap 3.15.
- **Dev deps:** vite 8.2, vitest 4.1, typescript 5.9, eslint 10, typescript-eslint 8.68,
  @testing-library/react 16 + jest-dom, jsdom 30, @vitejs/plugin-react 6.
- **No extra config:** `vite.config.ts` is a bare react plugin; `vitest.config.ts` is minimal
  (jsdom, `src/test/setup.ts`, globals). `tsconfig` is strict with `noUnusedLocals/Parameters`.

## 3. Architecture summary (V1)

- **Concept:** scroll → narrative state (`hero → monitor → room → shelf → skills → contact`) →
  camera dollies to the active object; each object opens a full reading interface.
- **Narrative:** pure state machine in `src/state/narrative.ts` (12 unit tests). Native document
  scroll measured by `useNarrativeTracking` (rAF-throttled) → `resolveNarrative` (entry line at
  62% viewport, hold-zone restore to `room`).
- **Camera:** `CameraRig` runs one finite GSAP tween (1.7 s, `power2.inOut`) per state change;
  focus→focus routes through the `room` pose. Poses in `src/scene/cameraPoses.ts` (desktop/tablet/mobile).
- **Scene:** 100 % procedural (no GLTF/drei), pixel aesthetic via `dpr=0.5` + `antialias:false`
  + CSS `image-rendering: pixelated`. ~102 meshes / ~197 draw calls; one shadow-casting light
  (lamp point light). Diegetic text drawn into CanvasTextures (`NearestFilter`).
- **Spatial layer:** `SpatialLayer` — ROOM mode = one docked affordance button; FOCUS mode = DOM
  panel FLIP-expanding from the object's projected screen quad (`projection.ts`, pure TS).
  No HTML is ever projected onto meshes (rule M5.10 — treat as invariant).
- **Focus interfaces:** MonitorInterface (live terminal), BookInterface (GSAP page-turn leaf),
  SkillsInterface (draggable post-its). Scroll-to-exit on all three.
- **Content:** content-first; UI reads from `src/content/portfolio.ts` / `portfolio.es.ts`.
  Bilingual EN/ES. Anti-leak tests for private org names; `EvidenceLevel` on projects.
- **Fallback:** WebGL feature-detect + CanvasErrorBoundary → full DOM portfolio + notice.

## 4. Test status

`pnpm test` — **8 files / 83 tests, ALL PASS** (duration ~8 s).

| Suite | Tests | Covers |
|---|---|---|
| `app.test.tsx` | 12 | fallback render, ids/order, headings, nav, bilingual, contact, skip link |
| `book.test.tsx` | 15 | leaf direction, physical spread, scroll-exit, boardNotes model, folio |
| `cameraPoses.test.ts` | 7 | pose completeness per tier, focus distance, breakpoints, pixel ladder |
| `content.test.ts` | 6 | content shape, evidence levels, URL validity, leak guard |
| `devhud.test.tsx` | 4 | HUD, pixel scales, lamp bulb aria |
| `narrative.test.ts` | 12 | state machine purity, restores, ordering, pagination |
| `spatial.test.tsx` | 19 | FLIP math, tier parity, focus machine, terminal `py 2+2`, page turns |
| `spatial-gating.test.tsx` | 8 | M5.10 rule: no content UI over objects in ROOM beats, docked affordance |

Known test-suite noise: `Not implemented: HTMLCanvasElement's getContext()...` printed to stderr
(jsdom lacks `canvas`); harmless.

## 5. Build status

`pnpm build` (`tsc --noEmit && vite build`) — **SUCCESS**, tsc clean, exit 0.

- `index.html` 0.96 kB (gz 0.50)
- `index-*.css` 41.20 kB (gz 9.00)
- `index-*.js` 337.87 kB (gz 112.22) — DOM/state/main
- `SceneCanvas-*.js` 926.12 kB (gz 244.79) — lazy 3D chunk (three+R3F+GSAP)

One Vite warning (expected, not an error): chunk > 500 kB minified for `SceneCanvas`.

## 6. Lint / type status

- `pnpm lint` (eslint .) — **exit 0, no findings**.
- Type check is part of `pnpm build` (`tsc --noEmit`) — **clean**.
- ESLint config covers `react-hooks` only (no jsx-a11y plugin installed).

## 7. Runtime verification

- **Dev server** (`pnpm dev`, port 5199): serves, HTTP 200, title `Emilson Oviedo – Software Developer – AI`.
- **Preview server** (`pnpm preview`, port 5200, production build): serves, HTTP 200, scene canvas mounts, `data-scene="on"`.
- **Narrative states** verified in dev via the `?qa=` pin hook (DEV-only) and DOM dumps:
  - `hero` → `data-narrative="hero"`, canvas mounted, `PULL THE CORD`, `EXPLORE THE ROOM`.
  - `monitor` / `shelf` / `skills` / `contact` → each renders its state; `contact` confirms
    `data-narrative="contact"` + `mailto:` / `github.com` / LinkedIn (all three present).
- **Focus interfaces** verified via `?qa=&focus=` DOM dumps:
  - **MonitorInterface** → `role="dialog"`, `aria-modal="false"`, scrim, `role="region"`,
    terminal input present.
  - **BookInterface** → book spread, GSAP leaf, `PREV`/`NEXT`, folio, `role="status"`.
  - **SkillsInterface** → `role="dialog"`, 44 skill-note DOM nodes, AI Engineering group.
- **Scroll→narrative transitions** could NOT be driven headlessly: hash anchors
  (`#experience`, `#work`, …) leave narrative at `hero` because CSS smooth-scroll does not
  advance under Edge `--virtual-time-budget`. This is a **headless artifact, not an app defect**:
  the pure resolver is unit-tested (narrative.test.ts), and the QA-hook dumps confirm the
  downstream rendering reacts correctly to each state. **Manual scroll verification in a real
  browser is recommended before/after any change to scroll or narrative code.**

## 8. Known warnings / errors

- Vite build warning: `SceneCanvas` chunk > 500 kB minified (gzip 244.79 kB). Accepted since M1.
- Runtime console (dev log): `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using
  PCFShadowMap instead.` (three 0.185 — soft shadows silently fall back to PCF).
- Runtime console (dev log): `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`
- Test stderr: jsdom `canvas` `getContext()` not-implemented notices (harmless).
- No favicon; no `og:image` in `index.html` (SEO TODO from M7).

## 9. Baseline metrics

| Metric | Value |
|---|---|
| Tests | 83 / 83 pass (8 suites) |
| Lint | 0 findings, exit 0 |
| Type check | clean (`tsc --noEmit`) |
| Build | success, ~0.6 s |
| Main JS | 337.87 kB (112.22 gz) |
| 3D chunk | 926.12 kB (244.79 gz) — lazy |
| CSS | 41.20 kB (9.00 gz) |
| Source files | 70 (ts/tsx/css), ~357 KB |
| Render scale | `dpr` default 0.5, `PIXEL_SCALES` [1.0, 0.5, 0.4, 0.34, 0.25] |
| `frameloop` | unset → R3F default `'always'` |
| Sounds | synthesized Web Audio (knock, lamp, page-turn) — no asset files |

## 10. Git state

- Working tree **clean** (no modified/staged/untracked files).
- Single commit: `8a4308d feat: interactive 3D portfolio — a room you can walk through`.
- `dist/` and `node_modules/` are gitignored (built artifacts are not committed).

## 11. Validation commands (post-change gate)

```bash
pnpm lint          # eslint — expect exit 0
pnpm test          # vitest run — expect 83 passing
pnpm build         # tsc --noEmit + vite build — expect success, same metric profile
pnpm dev           # smoke test at http://localhost:5173 (or custom port)
pnpm preview       # production build smoke test
```

Runtime smoke checklist: canvas mounts (`data-scene="on"`), skip link present, hero renders,
monitor/book/corkboard affordance appears on their beats, contact channels present, EN/ES toggle
works, WebGL-fallback path renders when the canvas is forced to fail.

## 12. Sensitive files / systems (treat as high-risk when changing)

Future phases should modify these only incrementally and re-run the §11 gate:

- **`src/ui/spatial/SpatialLayer.tsx` + `projection.ts` + `anchors.ts` + `focus.ts` + `tier.ts`**
  — the M5.10 rule (no DOM on meshes) and the FLIP spatial contract; pinned by `spatial-gating.test.tsx`.
- **`src/state/narrative.ts` + `cameraPoses.ts` + `CameraRig.tsx` + `useNarrativeTracking.ts`**
  — the scroll→state→camera chain; pinned by `narrative.test.ts` / `cameraPoses.test.ts`.
- **`src/state/ExperienceContext.tsx`** — single global context; changes ripple everywhere.
- **`src/scene/furniture/SelectedWorksBook.tsx` (645 lines)** — book 3D + page state; coupled to
  `state/book.ts` and the DOM `BookInterface`.
- **`src/scene/LampRig.tsx` (470 lines)** — lamp/cord/lighting narrative and `sceneStage` contract.
- **`src/content/*`** — all copy EN/ES; anti-leak + link-integrity tests enforce integrity.
- **`src/ui/spatial/MonitorInterface.tsx` / `BookInterface.tsx` / `SkillsInterface.tsx`**
  — full reading interfaces; accessibility surface (`role`, focus, scroll-exit).
- **`src/styles/tokens.css` / `global.css` / `spatial.css`** — design tokens + visibility switching
  (`[data-scene='on'] .section-panel { visibility: hidden }`).
- **`src/App.tsx`** — composition, lazy scene chunk, dev `?qa=` hook.
- **`index.html`** — SEO/OG metadata.

---

*Report scope: verification only. No application behavior was changed; the working tree is clean.
`docs/` and this file are new (untracked) additions.*