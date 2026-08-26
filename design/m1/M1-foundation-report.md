# M1 Foundation Report — Amber Studio

Fecha: 2026-08-25 · Base: spike M0.3 validado (GO)

---

## 1. Estado inicial (auditoría)

Spike M0.3: `App.tsx` monolítico (escena + overlay + fallback + instrumentation + estado global en useState locales), `SpikeScene.tsx` (LampRig + CameraRig + registerPlugin como side-effect de módulo), estilos planos sin tokens, sin lint/tests/packageManager declarado, lockfile npm, bundle monolito 341 KB gz, acoplamiento escena→UI vía `CustomEvent` con string mágico (`LAMP_CLICK_EVENT`).

Clasificación del código del spike:

| Parte | Decisión | Justificación |
|---|---|---|
| LampRig (timeline determinista) | KEEP + REFACTOR | comportamiento validado; extraído a módulo propio |
| CameraRig (scrub único A↔B) | KEEP + REFACTOR | único owner de cámara; extraído |
| Room primitives | KEEP + REFACTOR | baseline hasta assets M2 |
| Pixel rendering (dpr + CSS pixelated) | KEEP | mecanismo correcto, ahora con config central |
| Reduced-motion hook | KEEP + REFACTOR | movido a `state/` |
| WebGL detect + ErrorBoundary | KEEP + REFACTOR | separados en `scene/` |
| Dev panels + FPS meter | KEEP | gated por `import.meta.env.DEV \|\| ?debug` |
| Hero overlay | REFACTOR | alimentado desde capa de contenido |
| `LAMP_CLICK_EVENT` window-event | **REPLACE** | sustituido por ExperienceContext (flujo tipado, sin strings globales) |
| `styles.css` plano | REPLACE | → `tokens.css` + `global.css` |
| `@react-three/drei` | **DELETE** | instalado sin uso; se re-añade en M2 cuando haya GLTF real |

## 2. Problemas encontrados y resueltos

1. Acoplamiento escena→App por evento global → contexto React tipado.
2. Riesgo de doble `registerPlugin` → singleton `motion/gsap.ts`.
3. Bundle monolito → code splitting real (§9).
4. Sin gestión de paquetes declarada → migración a **pnpm** (`packageManager: pnpm@11.4.0`, lockfile propio, eliminado `package-lock.json`).
5. TypeScript 7.0.2 (nativo) incompatible con typescript-eslint (peer `>=4.8.4 <6.1`) → **pin TS 5.9.3**, decisión documentada; revisar upgrade cuando el ecosistema alcance TS 7.
6. Tests sin auto-cleanup entre renders (vitest sin globals) → `globals: true` en vitest config.
7. Live region con texto vacío = rol accesible inexistente para Testing Library (y para SR reales) → texto permanente "Lamp is on/off".

## 3. Decisiones arquitectónicas

- **Ownership GSAP (uno por target):** cámara → solo `CameraRig`; luz de lámpara/ambient/bombilla → solo `LampRig`; plugins registrados una vez en `motion/gsap.ts`. Ningún otro componente importa gsap directamente ni escribe sobre cámara/luces.
- **Estado global:** `ExperienceProvider` (lampOn, pixelScale, reducedMotion, webglFailed). Escena y UI leen/escriben el mismo estado; flujo unidireccional.
- **Lazy boundary:** `SceneCanvas` es default-export lazy; three/R3F/GSAP viven en su chunk. El contenido DOM nunca depende del chunk 3D.
- **StrictMode:** deliberadamente NO activado — R3F v9 documenta bugs bajo StrictMode; se reconsiderará puntualmente en M2 con la escena definitiva.
- **SSR:** fuera de alcance (SPA + prerender decidido en el reporte Fase 0); la arquitectura no lo impide (webglAvailable ya guarda `typeof window`).
- **Tailwind / Lenis:** NO introducidos — los estilos actuales son pocos y con tokens CSS bastan; Lenis llega cuando exista scroll storytelling real (M6). Sin razón fuerte, cero dependencias nuevas runtime.

## 4–5. Estructura final y archivos

```text
src/
├── main.tsx                    (mod) bootstrap + imports de estilos
├── App.tsx                     (rewrite) composition root: Provider + skip-link + lazy SceneCanvas + Overlay
├── styles/
│   ├── tokens.css              (new) paleta M0.2 + typography/spacing/radii/z-index/motion/focus + breakpoints doc
│   └── global.css              (new) base, canvas pixelated, scrim, panel/button/focus-visible, media phone
├── content/
│   ├── types.ts                (new) Profile/Project/ExperienceItem/EducationItem/SkillGroup/ContactLinks
│   └── portfolio.ts            (new) placeholders mínimos marcados CONTENT REQUIRED FROM USER (M5)
├── state/
│   ├── ExperienceContext.tsx   (new) dueño del estado global de experiencia
│   └── useReducedMotion.ts     (new)
├── motion/
│   └── gsap.ts                 (new) registro único de ScrollTrigger
├── scene/
│   ├── config.ts               (new) PIXEL_SCALES, BREAKPOINTS, CAMERA_A/B, LIGHT_OFF/ON, getDefaultPixelScale()
│   ├── webgl.ts                (new) feature-detect
│   ├── CanvasErrorBoundary.tsx (new)
│   ├── SceneCanvas.tsx         (new, lazy) Canvas completo
│   ├── Room.tsx                (refactor)
│   ├── LampRig.tsx             (refactor) interacción vía contexto
│   └── CameraRig.tsx           (refactor)
├── ui/
│   ├── Overlay.tsx             (new) capa DOM + aria-live lamp state
│   ├── Hero.tsx                (new) lee de content/
│   ├── DevPanels.tsx           (new) instrumentation gated (dev || ?debug)
│   └── FallbackNotice.tsx      (new)
└── test/
    ├── setup.ts                (new) jest-dom matchers + matchMedia stub
    ├── app.test.tsx            (new) fallback DOM sin WebGL, skip-link/main, role=status
    ├── content.test.ts         (new) shape de estructuras de contenido
    └── config.test.ts          (new) determinismo de presets cámara/pixel scales/tiers
```

Eliminados: `src/SpikeScene.tsx`, `src/styles.css`, `package-lock.json`.

## 6. Dependencias

- Eliminadas: `@react-three/drei` (sin uso).
- Añadidas dev-only: eslint 10 + @eslint/js + typescript-eslint + eslint-plugin-react-hooks; vitest 4 + jsdom + @testing-library/{react,dom,jest-dom}.
- Cambiada: typescript 7.0.2 → 5.9.3 (compatibilidad ecosistema; ver §2.5).
- Runtime runtime sin cambios (react/react-dom/three/r3f/gsap). Cero dependencias nuevas en runtime.

## 7. Accessibility decisions

Skip-link primero en tabulación; landmark `<main id="content">`; focus ring tokenizado visible en todos los interactivos; lámpara operable por teclado vía botón (equivalencia Enter/Space garantizada); `aria-live="polite"` anuncia estado de lámpara; reduced-motion mantiene contrato M0.3 (sin flicker/swing/cámara-scroll); fallback WebGL mantiene todo el contenido; scrim de contraste formalizado en `.overlay-bottom`.

## 8. Responsive strategy (foundation)

Breakpoints canónicos en `scene/config.ts` (phone ≤640, tablet ≤1024) + media query phone en CSS (overlay apilado). Pixel scale por tier implementado: desktop 0.40 / tablet 0.45 / phone 0.50 como defaults iniciales, sobreescribibles por el dev panel. Camera framing por tier: estructura lista (CAMERA_A/B presets) pero aún un solo framing — se expande en M2/M7.

## 9. Performance decisions

Code splitting real medido:

```text
dist/assets/index.js          197.29 kB │ gzip:  62.72 kB   ← payload inicial
dist/assets/SceneCanvas.js  1,001.12 kB │ gzip: 280.00 kB   ← lazy, solo con WebGL
```

El chunk pesado solo se descarga si (a) existe WebGL y (b) tras first paint del contenido. Advertencia de chunk >500KB esperada y aceptada (three.js es irreducible sin métricas reales; optimización fina queda para M9).

## 10–11. Motion / Scene–UI strategy

Ver §3 ownership. Contrato preservado del spike: timeline única por rig, `play(0)`/`pause(0)` deterministas, kill limpio en cleanup de efectos, scrub único para scroll.

## 12–13. Tests ejecutados y resultados

```text
pnpm lint        ✅ 0 errors, 0 warnings
pnpm test        ✅ 10/10 passed (3 files): fallback DOM, landmarks/skip-link,
                 live region, shapes de contenido, determinismo de config
pnpm build       ✅ tsc strict + vite build OK (chunks arriba)
dev server       ✅ HTTP 200      preview server ✅ HTTP 200
```

Pendiente de verificación humana (requiere navegador real): escena con WebGL activo, emulación reduced-motion en DevTools, navegación por teclado visual, pixel scale en caliente. Checklist: `design/m03/M0.3-report.md §Cómo verificar`.

## 14. Deuda técnica restante

1. Chunk escena 280 KB gz — optimización fina en M9 (tree-shaking, minified libs, Draco/KTX2 cuando haya assets).
2. Responsive: solo foundation; framing/franja tablet-mobile sin diseñar (M7).
3. Un solo beat de cámara A↔B (por diseño; beats completos en M4/M6).
4. DevPanels visibles con `?debug` en producción (útil para QA; retirar en M10 si molesta).
5. StrictMode off — validar compatibilidad al introducir assets definitivos.
6. Sin tests de integración de la escena 3D (requeriría WebGL mock; coste/beneficio bajo ahora).

## 15. Riesgos restantes

- Ecosistema TS7: pendiente migrar cuando typescript-eslint soporte (riesgo bajo, pin estable).
- R3F v9 + React 19.2: sin incidencias en build/tests; riesgo residual solo en runtime visual (mitigado con checklist humana pre-M2).
- Crecimiento del chunk 3D con assets GLTF reales (M2) — presupuesto vigente <1.5MB assets, medido desde M2.

## 16. Recomendación: **GO hacia M2**

**Respuesta a la pregunta criterio:** *"Si mañana empezamos a modelar la habitación definitiva y construir Projects/About/Experience/Contact, ¿la arquitectura actual nos permitirá hacerlo sin refactor arquitectónico importante?"*

**Sí.** La habitación definitiva entra sustituyendo `Room.tsx` por loaders GLTF dentro de `scene/` sin tocar UI/estado/motion; las secciones nuevas son componentes en `ui/` leyendo de `content/`; los beats de scroll son extensiones del preset de cámaras dentro del único owner (`CameraRig`). Ninguna de esas rutas requiere reorganizar capas.
