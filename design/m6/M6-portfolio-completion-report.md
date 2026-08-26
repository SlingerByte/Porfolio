# M6 — Portfolio Completion & Production Readiness

## 1. Estado Inicial

El portfolio estaba en estado M5.11: prototipo narrativo 3D avanzado con:
- 4 interfaces focales (Monitor, Book, Corkboard, Contact)
- Page turn físico con hoja giratoria
- Scroll-to-exit en todas las interfaces
- SKILLS sign en corkboard
- Resolución diegética 2×
- Navbar-safe layout
- 73 tests pasando

**Problemas detectados en auditoría:**
- ABOUT THIS ROOM posicionado a la derecha con margin-right auto y -26svh — se veía raro
- index.html sin meta description, OG tags, ni theme-color
- Experience section title decía "Timeline" inconsistente con label "EXPERIENCE"
- FallbackNotice solo mostraba "// PROJECTS" — incompleto para WebGL fallido
- Clases CSS usadas en código pero sin definición (`book-leaf-paper--left`, `book-leaf-paper--right`)

## 2. Cambios Realizados

### Hero + ABOUT THIS ROOM (Fase 2)
- **`src/styles/global.css`**: Centrado del room intro (`margin-inline: auto` en vez de `margin-right: auto; margin-left: auto`) y reducción del negative margin de -26svh a -22svh para un solapamiento más natural con el hero.

### Experience (Fase 3-4)
- **`src/ui/sections/Experience.tsx`**: Cambiado title de "Timeline" a "Experience" para consistencia con el label de sección.

### SEO / Meta (Fase 13)
- **`index.html`**: Agregados meta description, Open Graph tags (og:title, og:description, og:type), y theme-color.

### Fallback WebGL (Fase 12)
- **`src/ui/FallbackNotice.tsx`**: Reescrito para mostrar contenido completo del portfolio (experience, education, projects, skills, contact) cuando WebGL falla. Mantiene el contrato de single-h1 (hero owns h1).

### CSS Dead Code (Fase 16)
- **`src/styles/spatial.css`**: Agregadas definiciones para `.book-leaf-paper--left` y `.book-leaf-paper--right` que estaban usadas en BookInterface.tsx sin estilo.

### Tests (Fase 17)
- **`src/test/app.test.tsx`**: Actualizado matcher de fallback de `/webgl is not available/i` a `/webgl unavailable/i` para coincidir con el nuevo texto.

## 3. Contenido Completado

| Sección | Estado | Notas |
|---------|--------|-------|
| Hero | ✓ | Nombre, rol, CTAs, cord hint, scroll hint |
| ABOUT THIS ROOM | ✓ | Legend de 4 objetos, posicionamiento centrado |
| Monitor/Experience | ✓ | 1 experience item + 1 education item (datos reales) |
| Book/Projects | ✓ | 4 proyectos con previews, page turn, scroll-exit |
| Case Study | ✓ | GrantFlow: problem/approach/built/stack/evidence |
| Corkboard/Skills | ✓ | 5 familias, 22 skills, SKILLS sign |
| Contact/Door | ✓ | "COMING SOON" state (contact.published = false) |
| Footer | ✓ | Copyright + no-tracking note |

## 4. Decisiones UX

- **ABOUT THIS ROOM centrado**: En vez de alineado a la derecha, ahora está centrado horizontalmente con margin-inline: auto. Se superpone -22svh con el hero (antes -26svh) para una transición más natural.
- **Fallback completo**: Cuando WebGL falla, el usuario ve TODO el portfolio (experience, projects, skills, contact) en un panel scrollable, no solo un aviso de Projects.
- **Hero label**: Se mantiene "// AMBER STUDIO" — es la identidad de marca del estudio.
- **Contact honesto**: Sin placeholders — "COMING SOON" hasta que existan canales reales.

## 5. Cambios Responsive

Sin cambios nuevos. Se preservaron las decisiones M5:
- Mobile: nav items spread con background, brand oculto
- Mobile book: una página a la vez, sin leaf/spine
- Mobile: touch targets ≥44px
- Featured cards: span 2 columns en desktop (≥900px)

## 6. Accesibilidad

- **Headings**: h1 (hero) → h2 (secciones) → h3 (proyectos/timeline) — jerarquía correcta
- **Landmarks**: `<main>`, `<nav>`, `<section>` con aria-labelledby, `<footer>`
- **Focus**: skip-link, focus-visible en todos los controles, auto-focus en paneles focales
- **Keyboard**: Escape cierra interfaces focales, tab navigation funcional
- **ARIA**: dialog, region, status, aria-label en todos los componentes interactivos
- **Reduced motion**: respeta prefers-reduced-motion en animaciones y transiciones
- **Fallback**: contenido completo accesible sin WebGL

## 7. Performance

- **Budgets preservados**: pixel scale 0.50, lazy scene loading, DOM minimal
- **Scene chunk**: 987 kB (pre-existente, no aumentado)
- **Texturas**: resolución diegética 2× (no pixel-art HD)
- **Dependencias**: React 19, Three.js, R3F, GSAP — todas necesarias, sin adiciones

## 8. Tests

- **73/73 tests pasando** (8 archivos)
- Tests cubren: narrativa, gating, spatial, book, scroll-exit, board notes, fallback
- Test de fallback actualizado para nuevo contenido

## 9. Build

- `pnpm lint` ✓ (0 errores)
- `pnpm test` ✓ (73/73)
- `pnpm build` ✓ (warning pre-existente de chunk >500kB)

## 10. Deuda Restante

### Requiere input humano:
- **`contact.published`**: Flip a `true` cuando existan email/github/linkedin reales
- **`profile.period`**: Fechas de experiencia/educación (TODO en portfolio.ts)
- **`project.links`**: URLs de repo/demo (TODO en portfolio.ts)
- **`project.period`**: Fechas de proyectos (TODO en portfolio.ts)
- **OG image**: No existe aún — agregar cuando se tenga social preview

### Oportunidades documentadas (no implementadas):
- La referencia del canvas `id="root-canvas"` no existe en el DOM actual
- La clase `.sr-only` está definida pero nunca usada (utilidad estándar, preservar)
- El package name es "amber-studio-spike" — cambiar si se publica

## 11. Datos que Requieren Input Humano

1. **Contact real**: email, github URL, linkedin URL
2. **Períodos**: fechas de experiencia profesional, educación, proyectos
3. **Links de proyectos**: repo URLs, demo URLs
4. **OG image**: imagen de preview para redes sociales
5. **Favicon**: icono del sitio
