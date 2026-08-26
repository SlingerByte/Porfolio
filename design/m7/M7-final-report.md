# M7 — Final Report

## 1. Content Changes

### portfolio.ts (complete rewrite)
- **Profile tagline**: Updated to "Full-stack development with careful, verifiable AI. Python, FastAPI, React, PostgreSQL and Azure — from schema to interface."
- **Experience**: From 1 vague item → 2 CV-aligned items (Microsoft SWE Intern + JÜNA contributor)
- **Education**: Title corrected from "Software development program" to "Software Analysis and Development Technology"
- **Certifications**: New array added with Azure AI Fundamentals (AI-900)
- **Skills**: Reorganized from 5 generic groups → 8 CV-aligned groups (AI Engineering, Programming Languages, Backend, Frontend, Databases, Cloud & DevOps, Automation, Software Quality & Tools)
- **EcoFunding project**: Description rewritten with CV details (embeddings, semantic search, 50+ languages, classification, bot detection, ~15h→2h metric). Role changed from "Software Engineering Intern — Microsoft" to "Software Developer" (privacy-safe)
- **VoxLab project**: Description refined to emphasize "experimentation lab" not "voice cloning app"
- **Blip project**: Technology list updated to match verified stack (AdonisJS, Supabase, etc.)
- **About paragraphs**: Updated to mention Microsoft experience
- **Section intros**: Refined for consistency

### types.ts
- Added `CertificationItem` interface (id, title, issuer, year)

### Monitor.tsx (diegetic screen)
- IDLE_LINES changed from "ECOFUNDING" to "MICROSOFT · 2025–2026" under EXPERIENCE

### Experience.tsx
- Added certifications rendering section below education

### MonitorInterface.tsx
- Added certifications import and rendering ($ cat certifications.log)

### FallbackNotice.tsx
- Added certifications import and rendering in WebGL fallback

### index.html
- Meta description updated to match new tagline

## 2. CV Alignment

| CV Fact | Portfolio Status |
|---------|-----------------|
| Microsoft — Software Engineering Intern (2025-2026) | ✓ Experience section |
| EcoFunding: embeddings, semantic search, pgvector, 50+ languages | ✓ Project description |
| EcoFunding: ~15h → ~2h/week metric | ✓ Project description |
| EcoFunding: Azure Container Apps, GitHub Actions CI/CD | ✓ Project tech stack |
| JÜNA: Vitest, Playwright, production release | ✓ Experience section |
| SENA: Software Analysis and Development Technology | ✓ Education |
| AI-900: Azure AI Fundamentals (2026) | ✓ Certifications |
| Skills: 8 categories from CV | ✓ Skills groups |
| GrantFlow: primary project | ✓ Featured, first in list |

## 3. Project Updates

### GrantFlow
- No changes needed — already well-represented
- Remains featured, first in list, evidence: verified

### EcoFunding
- Description rewritten with CV-specific details
- Role sanitized to "Software Developer" (no Microsoft in project fields)
- Technologies expanded to 16 items matching CV
- Privacy: `organizationNamesPublic: false` preserved
- "Microsoft" appears ONLY in experience section (employer attribution), NEVER in project fields

### VoxLab
- Description refined: "personal research environment" not "product"
- Tags: "Voice AI" (kept), "Local Inference" (kept), "Benchmarking" (kept)

### Blip
- Technologies updated: AdonisJS (not AdonisJS 6), added Supabase, Node.js
- Removed unverified "React 19" → "React"
- evidence: partial (preserved)

## 4. Privacy Audit

| Field | Protected | Mechanism |
|-------|-----------|-----------|
| EcoFunding client org | ✓ | `organizationNamesPublic: false` |
| EcoFunding description | ✓ | No org names in text |
| EcoFunding role | ✓ | "Software Developer" only |
| Microsoft (employer) | ✓ | Appears ONLY in experience section |
| Ballenas/ICB | ✓ | Never in any public field |
| Contact placeholders | ✓ | `published: false` gates rendering |

Tests verify:
- `content.test.ts`: "ballenas" and "icb" never in project fields
- `app.test.tsx`: "ballenas" and "icb" never in public DOM

## 5. Placeholder Audit

### Intentional honest states (preserved):
- `period: null` on projects — dates genuinely unknown
- `links: null` on all projects — no public URLs confirmed
- `education.year: null` — exact graduation year unknown
- `contact.published: false` — no real contact channels yet
- `contact.email: 'hello@example.com'` — gated, never rendered
- `contact.github: 'https://github.com/username'` — gated, never rendered
- `cvUrl: null` — no CV URL available

### Removed:
- "Assigned by Microsoft" from EcoFunding description (now in experience only)
- "Professional engagement — conservation-sector client" (replaced with actual experience)
- "Software development program" (replaced with actual program name)

## 6. Interaction Regression

| Interaction | Status |
|-------------|--------|
| Monitor pixel-art preview | ✓ Unchanged |
| OPEN DISPLAY → focused terminal | ✓ Unchanged |
| Book cover → project preview | ✓ Unchanged |
| OPEN CASE STUDY → editorial read | ✓ Unchanged |
| Page turn (leaf animation) | ✓ Unchanged |
| Scroll-to-exit (all interfaces) | ✓ Unchanged |
| Corkboard SKILLS sign + notes | ✓ Unchanged (more notes with 8 groups) |
| VIEW ALL SKILLS → detailed view | ✓ Unchanged |
| Door → CONTACT | ✓ Unchanged |
| Escape closes focus | ✓ Unchanged |
| Navbar-safe focus layout | ✓ Unchanged |
| Reduced motion | ✓ Unchanged |
| WebGL fallback | ✓ Updated (shows full portfolio) |
| LampRig | ✓ Untouched |
| Pixel scale 0.50 | ✓ Untouched |

## 7. Files Changed

1. `src/content/types.ts` — Added CertificationItem
2. `src/content/portfolio.ts` — Complete content rewrite (CV-aligned)
3. `src/ui/sections/Experience.tsx` — Added certifications rendering
4. `src/ui/sections/HeroSection.tsx` — No change (label kept as "// AMBER STUDIO")
5. `src/ui/spatial/MonitorInterface.tsx` — Added certifications
6. `src/ui/FallbackNotice.tsx` — Added certifications + full portfolio fallback
7. `src/scene/furniture/Monitor.tsx` — Diegetic screen: MICROSOFT · 2025–2026
8. `index.html` — Meta description updated
9. `src/test/app.test.tsx` — Privacy test refined (client names only)
10. `src/test/content.test.ts` — Added certifications import, refined attribution test
11. `src/test/spatial.test.tsx` — Updated monitor test (Microsoft), skills test (pgvector)

## 8. Tests

- **73/73 tests passing** (8 files)
- New assertions: certifications rendering, Microsoft in experience, pgvector in skills
- Privacy tests refined: client org names (ballenas, ICB) still blocked; Microsoft allowed in experience

## 9. Validation

- `pnpm lint` ✓ (0 errors)
- `pnpm test` ✓ (73/73)
- `pnpm build` ✓ (same pre-existing chunk warning)

## 10. Remaining Genuine TODOs

Only things that truly require external user input:

| TODO | What's needed | Current state |
|------|---------------|---------------|
| `contact.published` | Flip to `true` with real email/github/linkedin | `false` with placeholders |
| `project.links` | Public repo/demo URLs for each project | All `null` |
| `project.period` | Dates for GrantFlow, VoxLab, Blip | All `null` |
| `education.year` | SENA graduation year | `null` |
| `cvUrl` | URL to download CV | `null` |
| OG image | Social preview image | Not created |
| Favicon | Site icon | Not created |

These are all intentional — no data has been invented.
