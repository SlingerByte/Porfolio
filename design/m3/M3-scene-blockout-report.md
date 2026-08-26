# M3 — Scene Blockout Report (M3-A + M3-B)

Fecha: 2026-08-25 · Alcance: structural blockout + materiales/iluminación real. **M3-C/D/E pendientes tras revisión humana.**

---

## 1. Assets creados

Modelado **procedural propio** — decisión justificada: la escena es de formas simples y proporciones específicas ancladas a la cámara existente; assets externos genéricos romperían la estética low-poly y obligarían a adaptar la composición. Sin licencias que gestionar, sin peso de descarga, iteración instantánea.

| Asset | Archivo | Elementos |
|---|---|---|
| Window | `scene/furniture/Window.tsx` | recessed pane lunar + muntins + casing con profundidad + sill |
| Door | `scene/furniture/Door.tsx` | casing, slab, 2 inset panels, knob brass |
| Shelf | `scene/furniture/Shelf.tsx` | 2 uprights, 3 boards, crown, conectores, **AI-signature mount point** |
| Desk | `scene/furniture/Desk.tsx` | top, apron, slab leg, drawer pedestal con frentes + knobs brass |
| Chair | `scene/furniture/Desk.tsx` | asiento, respaldo reclinado, 4 patas separadas en ambos ejes |
| Monitor | `scene/furniture/Monitor.tsx` | bezel, neck, base, pantalla emissive + prompt phosphor diegético |
| Rug | `scene/furniture/Rug.tsx` | círculo + anillo borde, ancla del pool |
| Lamp (refine) | `LampRig.tsx` JSX | ceiling rose, doble cono (metal oscuro / interior reflectante), rim torus, socket, bulb + filamento |

## 2. Jerarquía de escena

```text
Room
├── shell: floor · back wall · baseboard
├── Window   (-2.9, 2.25)   ~16% horizontal
├── Shelf    (+1.6)          ~60–78%  └─ ai-signature-anchor (Tier 3)
├── Door     (+3.1)          ~87%
├── Desk     (+0.55)         bajo el pool
├── Chair    (-0.55)         separada del desk, 4 patas visibles
├── Monitor  (+0.55)         sobre el desk
└── Rug      (+0.45)         ancla del pool

LampRig (jerarquía intacta: group/pullGroup/light/bulbMat/ambient/hit-targets)
CameraRig · StatsBridge (nuevo, instrumentation)
```

Los muebles se colocaron **para encajar en la cámara existente** (visible ≈8.4u en la pared al fov 35): no se tocó CameraRig.

## 3–4. Escala y materiales

Escala humana real (desk alto 0.81, door 2.32, silla asiento 0.48). Materiales `meshStandardMaterial`, colores sólidos de `scene/palette.ts` (única fuente), roughness 0.35–1 según material; metalness solo en lamp/knobs (0.35–0.6). Cero texturas. Fósforo exclusivamente diegético (pantalla).

## 5. Cambios en Room

Reescrito como compositor de módulos por mueble (`scene/furniture/*`). Shell mantiene floor/wall + baseboard nuevo. La lámpara se refinó **dentro** de la jerarquía de LampRig sin tocar refs, pivote ni hit-targets (rose, doble cono, rim torus, socket, bulb reposicionada, filamento).

## 6. Métricas (estimación analítica + instrumentación instalada)

~58 draw calls estimados, ~15–20k triángulos, 0 texturas. `StatsBridge` (500ms poll de `gl.info`) expone calls/tris/geometries/textures reales en el dev panel — valores exactos visibles en runtime.

## 7. Problemas encontrados

- Drei (RoundedBox habría dado bevels) fue retirado en M1; los bevels se simulan con composición de volúmenes — suficiente para blockout.
- El pool de la lámpara se recolocó con la bombilla (light y −1.06→−1.16) para alinear sombras con la nueva campana.

## 8. Referencias visuales

Los SVG de M0.2 siguen siendo la referencia de intención (`design/m02/frame-*.svg`). Screenshots reales requieren navegador — checklist §17 del brief aplicable.

## 9. Pendiente para M3-C

Tier 1 props (teclado, mouse, taza, headphones) como módulos nuevos en `scene/furniture/`; nada más. Tier 2/3 bloqueado hasta tu aprobación del blockout.

---

**Criterio M3-A/B:** *"¿La habitación ya parece un lugar personal donde alguien trabaja?"* — la composición sigue M0.2 al 100%, pero el veredicto es tuyo tras abrir `pnpm dev`.

**Validación:** lint ✅ · tests 10/10 ✅ · build ✅ · dev HTTP 200 ✅

Detengo aquí — sin pasar a M3-C.
