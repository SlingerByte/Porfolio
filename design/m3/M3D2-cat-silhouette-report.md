# M3-D.2 — Cat Silhouette Refinement

Fecha: 2026-08-25 · Un solo archivo modificado (`Cats.tsx`). Posiciones, composición, cámara, lámpara, iluminación y arquitectura intactos.

---

## Diagnóstico del "efecto piezas separadas"

La versión anterior mezclaba **materiales distintos por pieza** (cuerpo r0.82 vs cabeza r0.62, dos tonos) — a pixel 0.50 esas diferencias crean costuras visuales que rompen la fusión de volúmenes. Además la cabeza flotaba sobre un cuello inexistente y la cola era un arco suelto tras el cuerpo.

## Estrategia del refinamiento

**Una pieza = un material:** cada gato usa UN solo material compartido (mismo color/roughness en todos sus meshes), así los volúmenes solapados se funden en una sola silueta al renderizarse a media resolución.

### Gato negro (12 meshes, antes 6)

| Zona | Construcción |
|---|---|
| Ancas | esfera escalada (1, 1.08, 1) — el volumen que grita "gato sentado" |
| Torso→pecho | capsule inclinada (-0.42 rad) con arco sutil |
| Cuello | capsule corta que ENLAZA torso y cabeza (antes no existía) |
| Cabeza | esfera egg-shaped + hocico corto box + orejas cónicas 4-lados más altas (0.068) claramente visibles |
| Patas delanteras | 2 capsules verticales bajo el pecho |
| Patas traseras | 2 boxes insinuadas junto a las ancas |
| Cola | torus parcial continuo (arc 1.35π) barriendo alrededor de las patas delanteras |

Material: **un único #17130f r0.68 m0.04** — el roughness moderado deja que el rim existente dibuje el contorno sin volverse marrón bajo el warm light (el highlight especular queda casi neutro). Sin emissive, sin luz nueva.

### Gato blanco/gris (11 meshes, antes 7)

Loafing legible: cuerpo compacto → cabeza apoyada fundida en la línea → 2 patitas asomando → cola plegada al flanco. Manchas reducidas a exactamente **3 grandes**: (1) saddle en el lomo, (2) corona gris cubriendo nuca+una oreja, (3) cola gris entera. Fuera las manchas pequeñas.

## Coste

| | Antes | Después |
|---|---|---|
| Meshes gatos | 13 | **23** |
| Draw calls escena (est.) | ~94 | ~104 |
| Triángulos (est.) | ~27k | ~29k |

Crecimiento contenido; geometría trivial (esferas/capsules/cones ≤14 segmentos). Verificable en dev panel.

## Validación

```text
pnpm lint   ✅
pnpm test   ✅ 10/10
pnpm build  ✅ index 62.9 · SceneCanvas lazy 283.3 KB gz
pnpm dev    ✅ HTTP 200
```

## Pendiente de tu ojo (OFF · flicker · ON · scroll)

1. **Negro en OFF:** con material unificado r0.68 la silueta depende del rim del monitor/spill — si se pierde, el siguiente escalón es subir metalness a ~0.08 (no añadir luz).
2. **Primera lectura "gato":** entrecerrar ojos — ¿silueta felina o primitivas? El arco torso-cuello-cabeza ahora es una línea continua.
3. Orejas del negro: altura 0.068 deliberadamente visible — si dominan, bajar a 0.058.
4. Cola del negro: verificar que el barrido frontal no toca el keyboard visualmente desde la cámara principal.
5. Blanco: confirmar que las 3 manchas se distinguen como patrón y no como ruido.

Detengo aquí — M3-E espera tu GO.
