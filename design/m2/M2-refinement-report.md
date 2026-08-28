# M2 Visual Refinement Report — Amber Studio

Fecha: 2026-08-25 · Base: M1 Foundation (GO) · Revisión humana del prototype: PASS visual, pixel scale **0.50 confirmado** (no se toca).

---

## 1. Cambios realizados

1. **Silla legible** — geometría corregida (4 patas separadas en ambos ejes, menos rotación, reposicionada fuera de la sombra del escritorio).
2. **Apagado físico** — nueva secuencia OFF (~2s): caída suave → último glow cálido → flicker corto irregular → extinción → el pool desaparece gradualmente.
3. **Cuerda descubrible** — rim light frío "capturando luna" vía emissive sutil en cordón/tirador + bead más grande y claro + micro-balanceo idle (OFF only).
4. **OFF = siluetas** — ambient 0.06→0.03, moonlight 0.35→0.28, monitor 1.2→0.7 y pantalla emissive 0.9→0.55. La habitación se intuye; no se lee.
5. **UI integrada en la oscuridad** — scrim del overlay baja a opacidad 0.45 en OFF (gradiente suave, sin franja evidente); nombre al 72%; tagline/botón/hint de scroll ocultos hasta encender; hint de cuerda SIEMPRE visible (es la affordance). Reduced-motion: transiciones instantáneas.

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/scene/config.ts` | nuevos tokens: `AMBIENT_OFF/ON`, `MOON_INTENSITY`, `MONITOR_LIGHT_INTENSITY`, `SCREEN_EMISSIVE` |
| `src/scene/SceneCanvas.tsx` | luces de soporte leen config |
| `src/scene/Room.tsx` | silla reconstruida; pantalla usa `SCREEN_EMISSIVE` |
| `src/scene/LampRig.tsx` | timelines duales ON/OFF no competitivas + idle sway + bead/cord emissive |
| `src/ui/Overlay.tsx` | atributo `data-lit` |
| `src/ui/Hero.tsx` | clases `reveal` (secundarios) / hint siempre visible |
| `src/styles/global.css` | scrim dinámico por `data-lit`, `.reveal` con visibility (tab-order safe), reduced-motion instant |

Arquitectura intacta: mismo ownership (LampRig único owner de lámpara/luz), cero dependencias nuevas, cero sistemas nuevos.

## 3. OFF antes/después

- **Antes:** habitación oscura pero completamente legible; monitor dominante; scrim web evidente.
- **Después:** siluetas sugeridas — ventana azul con profundidad, monitor como promesa tenue, muebles en volumen oscuro, tirador con highlight frío + sway sutil, nombre flotando en la oscuridad. *"Siluetas de una habitación que todavía no puedo ver completamente."*

Jerarquía OFF implementada exactamente según spec: cuerda → monitor tenue → ventana → lámpara-silueta → mobiliario-silueta → props ocultos.

## 4–6. ON / Apagado / Cuerda

- **ON:** secuencia original preservada (tirón elástico → péndulo ±4° → flicker → rampa cálida). Con ambient/moon reducidos en OFF, el contraste del reveal es ahora mayor — la habitación "aparece" con más drama sin cambiar un solo keyframe del encendido.
- **Apagado:** físico y elegante (~2s): dip 34→26→21, glow sostenido, flicker 11/19/3/7, extinción → pool se disuelve en 0.8s power2.out, ambient desciende en paralelo. Termina exactamente en los valores baseline OFF.
- **Cuerda:** emissive frío (#8ea7c9 @ 0.45 bead / 0.18 cord), bead r 0.02→0.026, hit-target ampliado a r=0.1, idle sway ±0.04 rad cada 2.8s solo en OFF y no-reduced-motion. Sin glow fuerte, sin outline, sin HUD.

## 7. Determinismo y toggles

Dos timelines pausadas (`onTl`/`offTl`) que nunca corren a la vez. Toggle mid-sequence: la saliente se congela con `pause()` (preserva estado intermedio) y la entrante hace `invalidate().restart()` desde los valores congelados → ON→OFF→ON repetido consistente, sin estado residual. Guard de primer mount evita disparar OFF al cargar. Idle sway se autodestruye al encender.

## 8. Accesibilidad

- Tagline/botón ocultos en OFF usan `visibility:hidden` → salen del tab order (no hay focus invisible); reaparecen visibles y enfocables al encender.
- Nombre permanece visible (opacidad 0.72 sobre escena casi negra ≈ AA holgado); scrim nunca llega a comprometer contraste porque el fondo OFF es near-black.
- `prefers-reduced-motion`: todas las transiciones UI a ~0ms y sin sway/flicker (contrato existente intacto).
- aria-live de lámpara y operabilidad Enter/Space sin cambios.

## 9. Pixel scale

**1.00** — confirmado por revisión humana, sin cambios (default desktop actualizado implícitamente por decisión humana; nota: `getDefaultPixelScale()` sigue devolviendo 0.40 para desktop — ver decisiones abiertas).

## 10. Decisiones abiertas

1. **Default de pixel scale desktop:** la revisión aprobó 0.50 visualmente. Si 0.50 es EL valor, conviene actualizar `getDefaultPixelScale()` (desktop 0.4→0.5) en M3 para coherencia — no lo hice aquí porque fue ajuste manual por panel y podría quererse distinto por tier. Pendiente de tu confirmación.
2. Idle sway: implementado mínimo; si aún cuesta descubrir la cuerda, siguiente escalón sería hint DOM pulsante (no aplicado para no saturar).
3. Silla definitiva llegará como asset GLTF en M2-assets/M3; esta corrección vale para el prototype.

## 11–13. Validación técnica

```text
pnpm lint   ✅ 0 problemas
pnpm test   ✅ 10/10 passed
pnpm build  ✅ chunks: index 62.8 KB gz · SceneCanvas(lazy) 280.3 KB gz
pnpm dev    ✅ HTTP 200
```

## 14. Resultado de validación (checklist)

Verificado en código/build: apagado gradual con flicker ✅ · reversibilidad multi-toggle ✅ · una sola timeline activa ✅ · reduced-motion sin flicker/sway/sway-idle ✅ · cuerda operable pointer/Enter/Space ✅ · scrim sutil con contenido accesible ✅ · pixel scale intacto ✅.

Pendiente de confirmación visual humana (`pnpm dev`): atmósfera OFF subjetiva, legibilidad de la silla desde el encuadre real, sensación física del apagado. Checklist completa en §8 del brief.

## 15. Recomendación: **GO** (pendiente tu pase visual)

Los cuatro ajustes están implementados dentro del motion budget y sin expandir scope. La prueba subjetiva — *¿se siente como descubrir una habitación?* — debe fallarla tu ojo antes de continuar a M3.
