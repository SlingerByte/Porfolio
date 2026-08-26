# M3-C — Composition Refinement: Shelf

Fecha: 2026-08-25 · Un solo archivo modificado. Sin cambios de arquitectura, luz, lámpara ni cámara.

---

## Diagnóstico (numérico, antes de tocar nada)

- Estantería: centro x +1.6, ancho 1.9 → **borde derecho +2.53**.
- Casing de puerta: +3.1 ±0.59 → **borde izquierdo +2.51**.
- Separación real: **0.02 unidades** (~4px en pantalla) — puerta y estantería se leían como una sola estructura.
- Tablero inferior a y=0.95, dentro de la franja de silueta del escritorio (top 0.78) y tras el pedestal (hasta x+1.5) → lectura accidental de "detrás del escritorio".

## Qué cambié (`scene/furniture/Shelf.tsx`, único archivo)

| Ajuste | Antes | Después | Motivo |
|---|---|---|---|
| Centro / ancho | x+1.6 / 1.9 | x+1.42 / **1.55** | gap a la puerta ≥ **0.31u** (~70px): mueble independiente |
| Altura de tableros | 0.95 / 1.60 / crown 2.32 | **1.22 / 1.78 / 2.44** | los tableros suben sobre la línea del escritorio → se lee como mueble de pared propio, no como relleno detrás del desk |
| Uprights | partidos en 2 tramos | **de pie completo** (1.05→2.50) | silueta única continua, más artesanal |
| Back panel | no existía | panel recessed oscuro (#3a291c) | volumen de mueble; legible como objeto incluso en silueta OFF |
| Plinth | no existía | zócalo inferior | "estaba ahí desde el principio": se apoya en el suelo con su propia base |
| AI anchor | y 1.13 | y 1.37 (sigue en tablero inferior derecha) | acompanza la nueva altura |

Rango horizontal resultante: ~x +0.64..+2.19 (~62–77% del framing) — sigue dentro del mapa M0.2. No roba protagonismo: el pool cálido y el desk permanecen como jerarquía dominante; la estantería gana identidad sin ganar peso lumínico.

## Qué NO modifiqué

LampRig (jerarquía/cuerda/luz), sistema de iluminación, SceneStage, ExperienceContext, CameraRig, Room.tsx (el mueble es self-contained), palette authority, scroll, responsive, contenido.

## Validación técnica

```text
pnpm lint   ✅
pnpm test   ✅ 10/10
pnpm build  ✅ chunks estables
pnpm dev    ✅ HTTP 200
```

## Pendiente de tu ojo

Desde el encuadre principal: (1) gap estantería-puerta legible como espacio de pared; (2) en OFF, el back panel oscuro debe leerse como volumen de mueble contra la pared; (3) en ON, que la corona a 2.44 no compita con la lámpara por la atención. Detengo aquí — M3-D/E esperan tu GO.
