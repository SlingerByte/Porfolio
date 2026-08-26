# M3-D — Material & Prop Refinement Report

Fecha: 2026-08-25 · Sin cambios en LampRig/iluminación/SceneStage/cámara/arquitectura. Pixel scale 0.50 intacto.

---

## 1. Resumen de cambios

**Materiales:** roughness/metalness diferenciados para que la luz ámbar "agarre" — madera mate con brillo sutil donde el pool cae, metal de lámpara con highlights controlados, brass discreto, tela más mate que la madera.

| Superficie | Antes | Después |
|---|---|---|
| Desk top | rough 0.7 | **0.55** (lee el pool) |
| Shelf boards/crown | 0.75 | 0.6 |
| Door slab / panels | 0.75/0.8 | 0.58 / 0.85 (contraste slab-panel) |
| Door knob brass | m 0.6 / r 0.35 | **m 0.75 / r 0.3**, tono #d9a748 |
| Lamp shade metal | m 0.35 / r 0.45 | **m 0.5 / r 0.38** |
| Lamp rim torus | m 0.4 / r 0.4 | m 0.5 / r 0.32 |
| Monitor bezel | r 0.5 | r 0.42 + m 0.15 |
| Chair fabric | r 0.9 | 0.95 (más mate que la madera) |

Cero texturas nuevas; cero glossy de videojuego.

## 2–3. Props añadidos (procedurales, todos justificados)

| Prop | Archivo | Razón de existir | Meshes |
|---|---|---|---|
| Keyboard (+2 key ridges) | `DeskItems.tsx` | identidad dev | 3 |
| Mouse | `DeskItems.tsx` | dev identity | 2 |
| Mug cerámica + café | `DeskItems.tsx` | horas humanas; lee el pool ámbar | 3 |
| Headphones | `DeskItems.tsx` | foco/trabajo nocturno | 3 |
| 5 libros inclinado final | `ShelfItems.tsx` | About/Education | 5 |
| Photo frame + stack 2 libros | `ShelfItems.tsx` | capa personal | 4 |
| **AI signature v-concept** | `ShelfItems.tsx` | objeto personal-tech del dueño | 4 |
| Corkboard + 3 post-its sin texto | `Corkboard.tsx` | ancla Skills | 4 |
| Planta maceta (ventana) | `Plant.tsx` | calidez + escala tercio izquierdo | 5 |

Total: ~33 meshes nuevos. Estantes siguen respirando (mayoría vacía).

**AI signature:** cuerpo charcoal + face plate inclinada + UN punto emissive ámbar (eco de la lámpara — único emissive nuevo, deliberadamente no RGB/cyberpunk) + pie brass. Reemplaza al placeholder cúbico; el diseño definitivo sigue abierto.

## 4. Performance antes vs después

| | M3-C (antes) | M3-D (después) |
|---|---|---|
| Draw calls (est.) | ~58 | **~91** |
| Triángulos (est.) | ~18k | **~26k** |
| Texturas / geometrías pesadas | 0 | 0 |

Crecimiento contenido (~+33 calls, geometría trivial). Verificable en vivo con el dev panel (`calls · tris · geo · tex`). Sigue siendo ligero para mobile; la auditoría formal es M3-E. Bundle JS sin cambio relevante (+1 KB gz en chunk escena).

## 5. Validación

```text
pnpm lint   ✅
pnpm test   ✅ 10/10
pnpm build  ✅ index 62.9 · SceneCanvas lazy 282.8 KB gz
pnpm dev    ✅ HTTP 200
```

Interacción ON/OFF/interrupciones intacta por construcción: nada de lo modificado toca timelines, refs ni luces dinámicas.

## 6. Decisiones para revisión humana

1. **AI signature concept**: ¿lee como "objeto personal construido" o aún genérico? El punto ámbar es el único elemento vivo — validar intensidad (0.55).
2. **Planta junto a ventana**: mejora el tercio izquierdo, pero si compite con el espacio negativo del DOM hero, se elimina sin coste (prueba de los 3 props).
3. **Mug blanca cerámica**: el objeto más claro de la escena bajo el pool — verificar que no robe mirada del teclado/monitor.
4. Post-its del corkboard intencionalmente ilegibles (contenido real llega con M5).

**Prueba criterio:** sin DOM, la escena ahora tiene dueño — desorden justo, objetos con historia, un solo acento vivo. Detengo aquí — M3-E (responsive/performance audit) espera tu GO.
