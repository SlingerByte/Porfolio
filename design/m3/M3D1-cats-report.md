# M3-D.1 — Personal Signature: Cats

Fecha: 2026-08-25 · Un archivo nuevo, uno eliminado, dos editados. Sin tocar LampRig/luz/SceneStage/cámara/arquitectura. Pixel scale 0.50 intacto.

---

## 1. Planta eliminada

`scene/furniture/Plant.tsx` borrado + su composición en `Room.tsx`. El tercio izquierdo no queda huérfano: el vacío lo hereda el **gato blanco en el alféizar de la ventana**, que ocupa esa zona con lectura fría (moon rim) en vez de cálida.

## 2. Posiciones finales

| Gato | Posición | Justificación compositiva |
|---|---|---|
| **Negro** | rug, borde derecho `(1.38, 0.01, 0.12)`, sentado, cola envuelta, cabeza girada a la sala | ancla viva del pool sin tapar desk/silla (están detrás/izquierda); altura ~0.42 → nunca compite |
| **Blanco/gris** | alféizar ventana `(-2.42, 1.19, -1.88)`, loafing | llena el tercio izquierdo que dejó la planta; contraluz lunar = momento firma en OFF; fondo lejano → no roba jerarquía |

No están juntos; cada uno habita una temperatura distinta de la habitación (cálido / frío).

## 3. Geometría añadida

Procedural, prioridad silueta>postura>orejas>cola>color:

- **Negro (6 meshes):** cuerpo cónico, pecho esférico suavizado, cabeza girada, 2 orejas cónicas, cola torus parcial envolviendo la base. Anti-bloque-negro: cuerpo r0.82 vs cabeza r0.62 + tono #17130f/#211b15 — variación sutil sin emissive ni luz nueva.
- **Blanco/gris (7 meshes):** body capsule (loafing), saddle patch gris (esfera achatada), cabeza apoyada, 2 orejas (una blanca una gris), cola gris colgando del alféizar. Patches: 2 deliberadas, patrón no ruidoso.

Sin ojos emisivos, sin accesorios, sin idle animation, sin físicas.

## 4. Draw calls / triángulos

| | M3-D | M3-D.1 |
|---|---|---|
| Draw calls (est.) | ~91 | **~94** (+13 gatos, −5 planta, −1 hit residual n/a) |
| Triángulos (est.) | ~26k | ~27k |

Verificable en dev panel. Bundle estable.

## 5. Validación

```text
pnpm lint   ✅
pnpm test   ✅ 10/10
pnpm build  ✅ index 62.9 · SceneCanvas lazy 283.1 KB gz
pnpm dev    ✅ HTTP 200
```

Interacción ON/OFF/interrupciones intacta (nada tocado fuera de Room/palette).

## 6. Pendiente de revisión humana

1. **Gato negro en OFF**: debe leerse por silueta+roughness variance contra el rug — si desaparece demasiado, primer ajuste sería moverlo 0.15u hacia el spill del monitor (no añadir luz).
2. **Gato blanco vs jerarquía**: respaldado por la ventana puede atraer mirada en OFF — si compite con la cuerda/monitor, reducir tamaño 8–10% antes que tocar contraste.
3. Pose del negro (girada hacia la sala) y del blanco (loafing orientado a cámara): naturalidad subjetiva.
4. Vacío compositivo tras quitar la planta: verificar que el alféizar habitado resuelve el hueco.

Criterio: *"ah, este lugar pertenece a alguien"* — dos residentes quietos, cada uno en su temperatura. Detengo aquí — M3-E espera tu GO.
