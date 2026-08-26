# Emilson Oviedo — Portfolio

An interactive 3D portfolio that turns a room into a story. Scroll to walk a
workspace where each object holds a different part of the journey: the
monitor reads my experience, the book turns through selected projects, the
corkboard pins my skills, and the door opens the way to reach me.

Built with **React**, **Three.js** (react-three-fiber) and **GSAP**, with a
warm, low-poly, pixel-art aesthetic. Fully bilingual (English default,
Spanish via the nav toggle) and responsive on mobile.

## Run it

```bash
pnpm install
pnpm dev        # local dev server
pnpm build      # type-check + production build
pnpm test       # vitest suite
pnpm lint       # eslint
```

## What's inside

- **3D room**: a lamp you can pull to turn on the light, a black cat at the
  window, a door that answers your knock, and a camera that dollies through
  the room as you scroll.
- **Focused interfaces**: the monitor becomes a live terminal (type
  commands, try `py 2+2`), the book opens with real page-turn physics, and
  the corkboard shows pinned, draggable skill notes.
- **Content-first**: all copy lives in `src/content` (`portfolio.ts` for
  English, `portfolio.es.ts` for Spanish) — the UI reads from it, never the
  other way around.
- **Accessible**: reduced-motion support, keyboard focus, semantic markup.

## Structure

```
src/
  content/     # all text (en + es) and the content model
  scene/       # three.js world, furniture, camera, sounds
  state/       # global experience state + language
  styles/      # global + spatial (focus interfaces) CSS
  ui/          # DOM sections and the focused interfaces
  test/        # vitest suite (83 tests)
```