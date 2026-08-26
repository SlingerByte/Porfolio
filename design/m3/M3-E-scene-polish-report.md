# M3-E — Final Scene Polish Report

Fecha: 2026-08-25 · Cierre de M3. Pulir, no expandir: 4 fixes reales, cero expansión.

---

## 1. Cambios reales (auditoría analítica de coordenadas vs plano de pared z=−2.0)

La revisión se hizo por coordenadas mundo, no a ojo — encontró **3 artefactos de clipping/z-fighting reales**:

| # | Artefacto | Causa | Fix |
|---|---|---|---|
| 1 | **Window pane coplanar con la pared** (z=−2.000) → z-fighting/parpadeo en OFF | pane local −0.02 sobre grupo −1.98 | pane a −0.012 (z mundo −1.992): recessed pero siempre delante del muro |
| 2 | **Shelf back panel ENTERRADO tras la pared** (z=−2.010) → invisible; el "volumen de mueble" de M3-C no existía en render | local −0.11 sobre grupo −1.90 | panel a −0.055 (z −1.955), dentro de la profundidad de tableros y delante del muro |
| 3 | **Cola del gato negro atravesando la pared** (alcance z=−2.084) | cat centrado z−1.91 + alcance torus 0.174 | gato a z−1.82 → alcance −1.994, sin clip |

## 2. Decisión abierta cerrada

`getDefaultPixelScale()` ahora devuelve **0.50 en todos los tiers** (valor aprobado por revisión humana en M2; antes desktop defaulteaba 0.40 y tablet 0.45). En mobile el mismo valor sirve como render más tosco = ahorro GPU. Test de config actualizado en consecuencia.

## 3. Verificación de materiales/iluminación con geometría definitiva

Revisión analítica (sin cambios necesarios — documentado como estado, no como trabajo):

- Diferenciación madera(0.55–0.6)/tela(0.92–0.95)/metal(m0.5 r0.38)/brass(m0.75 r0.3)/cerámica(0.55) ✓
- Monitor glow diegético intacto; fósforo solo en escena ✓
- Door/Shelf/Desk no se fusionan: separaciones ≥0.31u verificadas en M3-C ✓
- Único emissive no-diegético fuera de pantalla: status dot del AI signature (ámbar 0.55, eco de la lámpara) ✓
- Sombras: una sola luz con sombra (lámpara, PCFSoft 1024², bias −0.002) — coherente con todos los fixes ✓
- Timelines ON/OFF/interrupciones: sin writers nuevos; comportamiento preservado ✓

## 4. Métricas

| Métrica | Valor (est. analítico / verifiable en dev panel) |
|---|---|
| Draw calls | ~104 |
| Triángulos | ~29k |
| Geometrías/texturas | ~40 / **0 texturas** |
| Bundle escena (lazy) | 283.3 KB gz · DOM inicial 62.9 KB gz |
| FPS | instrumentado (FpsMeter); objetivo 60 desktop / ≥30 mid-mobile — sin tuning prematuro |

Optimización documentada NO aplicada (deuda): `shadow.autoUpdate=false` + refresh puntual durante las timelines ahorraria re-render de sombras cada frame — requiere tocar LampRig (prohibido aquí).

## 5. Responsive — comprobación básica (no fase completa)

- **Desktop:** composición completa, framing M0.2 íntegro.
- **Viewport estrecho (~1024):** fov vertical constante recorta laterales; ventana/puerta salen parcialmente de frame pero desk+lámpara+shelf permanecen — aceptable como baseline.
- **Móvil (portrait):** ancho visible ~2.2u → recorte severo de la composición diorama. **Limitación conocida y documentada**: la experiencia móvil requerirá su propio framing/estrategia (fase posterior dedicada). Sin WebGL-fallback issues detectados (ErrorBoundary + feature-detect ya cubren).
- Posiciones nunca hardcodeadas a resolución: todo el layout escénico es world-space con cámara autoridad.

## 6. Deuda visual/documentada (no abrir iteraciones)

1. Gatos: poses/modelo final congelados hasta post-MVP (decisión humana).
2. AI signature: diseño definitivo pendiente (concept actual funcional).
3. Corkboard/post-its sin contenido (llega con copy real M5+).
4. Shadow autoUpdate optimizable (ver §4).
5. Framing móvil: fase propia pendiente.
6. Bevels simulados por composición de volúmenes (RoundedBox/drei se reintroducirá solo si un asset lo justifica).

## 7. Validación

```text
pnpm lint   ✅
pnpm test   ✅ 10/10 (incluye nuevo assert pixel baseline 0.50)
pnpm build  ✅ index 62.9 · SceneCanvas lazy 283.3 KB gz
pnpm dev    ✅ HTTP 200
Re-auditoría numérica post-fix: pane −1.992 ok · backpanel −1.955 ok · cola −1.994 ok
```

## 8. Veredicto

> **READY FOR PORTFOLIO CONTENT** ✅

La habitación funciona como escenario definitivo: composición establecida, materiales diferenciados, iluminación narrativa determinista, artefactos de geometría resueltos, performance razonable y fallback garantizado. El siguiente milestone puede concentrarse en el portfolio real sin trabajo estructural previo.

Detengo aquí — M4 (scroll storytelling / camera beats) a la espera de tu GO.
