# M5 — Portfolio Content UI Report

Fecha: 2026-08-25 · El proyecto abre por primera vez como **portfolio real**, no como prototype de escena.

---

## 1. Arquitectura implementada

```text
App (ExperienceProvider)
├── skip-link → #content
├── SceneCanvas (lazy, fixed, solo si WebGL)   ← intocado
├── Nav (fixed: brand + 01–04 anchors + active state)
├── main#content  ← flujo real del documento (CameraRig lee contra #content)
│   ├── HeroSection      (data-stage · scrim dinámico · cord/scroll hints)
│   ├── Work             (SectionShell + projects-grid + ProjectCard×4)
│   ├── About            (aboutParagraphs)
│   ├── Skills           (dl por grupos)
│   ├── Experience       (timeline + Education & Certifications)
│   ├── Contact          (gated por contact.published)
│   └── footer
├── DevPanels (fixed, dev/?debug únicamente)
└── FallbackNotice (fuera de main; h2 para respetar single-h1)
```

Ownership intacto: CameraRig único writer de cámara (ahora con 3 beats sobre `#content`), LampRig único writer de luz, ExperienceContext dueño del estado, escena lazy. `#scroll-space` eliminado — el scroll real del contenido dirige la cámara.

## 2. Componentes nuevos/modificados

Nuevos: `ui/Nav.tsx`, `ui/sections/{SectionShell,HeroSection,Work,ProjectCard,About,Skills,Experience,Contact}.tsx`.
Modificados: `App.tsx` (composición), `scene/CameraRig.tsx` (BEATS + trigger `#content`), `state/ExperienceContext.tsx` (webglFailed inicializa con feature-detect — fix real: antes el fallback no aparecía si WebGL faltaba desde el inicio), `content/{types,portfolio}.ts` (`published`, `aboutParagraphs`, `sectionIntros`), `styles/global.css` (reescritura para flujo de portfolio).
Eliminados: `ui/Overlay.tsx`, `ui/Hero.tsx`.

## 3. Jerarquía de proyectos

GrantFlow = card featured a doble columna con `<details>` "HOW IT WORKS" (expansión inline accesible nativa — decisión: cero routing). EcoFunding/VoxLab cards estándar; Blip con chip `CODE AVAILABLE ON REQUEST` (sin git/demo pública). Proyectos sin URL muestran status chip honesto (`PUBLIC LINK COMING SOON`) — nunca enlaces falsos. Evidence badge textual por nivel. Números 01–04 según orden narrativo (star primero).

## 4. Navegación / scroll storytelling

Nav fija con anchors reales (funciona sin JS); IntersectionObserver **solo** mejora el marcador activo (guard si no existe IO); skills mapea a ABOUT. Smooth scroll vía CSS `scroll-behavior` + anulación bajo reduced-motion + `scroll-padding-top`. Cámara: hero→desk→shelf→door en una única timeline scrubbed — la habitación acompaña sin secuestrar la navegación.

## 5. Accesibilidad

Skip-link, landmarks (`main`/`section aria-labelledby`), un solo h1 + h2 por sección + h3 en cards/timeline, focus ring ámbar global, CTAs reales como `<a>`, `<details>` keyboard-native, contact gated por `published` (cero placeholders renderizados), reduced-motion: sin smooth-scroll ni transiciones. Test anti-leak de atribución ampliado al DOM completo.

## 6. Performance

| | M4.2 | M5 |
|---|---|---|
| DOM inicial | 65 KB gz | **67.5 KB gz** (+copy/UI, escena sigue lazy 283 KB) |
| CSS | 2.8 | 2.8 KB gz |
| Tests | 12 | **18** |

Sin dependencias nuevas. Sin listeners globales por frame (IO puntual + rAF solo en dev panel).

## 7. Bugs encontrados y corregidos durante M5

1. **Identificador duplicado `Experience`** (import de sección vs componente local en App): causaba OOM/recursión en Vitest SSR → renombrado a `Site`.
2. **Fallback nunca aparecía si WebGL faltaba desde el inicio**: provider inicializaba `webglFailed=false`; ahora usa feature-detect.
3. FallbackNotice degradado a h2 (contrato single-h1).

## 8. Responsive

Mobile ≤640px: brand oculto (el hero ya nombra), nav compacta full-width, sections/cards apiladas, dev-tools ocultas, `overflow-x hidden`. Desktop/tablet: grid auto-fit, featured span-2 ≥900px. Pendiente verificación humana en dispositivos reales (ver abajo).

## 9. TODOs que dependen de información faltante

`contact.published=false` (flipping a true activa email/GitHub/LinkedIn/CV sin tocar componentes) · links de los 4 proyectos (`links:null` hoy) · fechas/periods · nombre exacto SENA · idioma definitivo (copy EN draft).

## 10. Validación

```text
pnpm lint   ✅
pnpm test   ✅ 18/18 (secciones, ids, nav↔anchors, 4 proyectos star-first,
            anti-leak EcoFunding en DOM, jerarquía headings, contacto gated,
            fallback, skip-link)
pnpm build  ✅ 67.5 + 283.4 KB gz lazy
pnpm dev    ✅ HTTP 200
```

Verificación visual humana pendiente: framing desktop/mobile reales, comportamiento de nav activa al scrollear, beats de cámara con contenido largo, contraste de panels sobre la escena encendida.
