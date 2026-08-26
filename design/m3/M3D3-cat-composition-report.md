# M3-D.3 — Cat Composition & Pose Refinement

Fecha: 2026-08-25 · Solo `Cats.tsx` + 2 líneas en `Room.tsx` (import/composición). Todo lo demás intocado.

---

## 1. Gato negro → ventana

- **Posición:** alféizar `(-2.47, 1.19, -1.91)` — el punto exacto que dejó el gato blanco.
- **Orientación:** rotado para que su eje forward apunte a la ventana (−Z), con ~17° de ángulo muerto para que una franja de perfil siga leyéndose desde la cámara. Ya no mira a la habitación.
- **Modelo:** idéntico a M3-D.2 (cero re-modelado). La silueta completa —espalda arqueada, orejas, cola envuelta— queda ahora recortada contra el moon pane: la luz fría existente dibuja el contorno sin ninguna fuente nueva.

## 2. Gato blanco → suelo, hecho bolita

- **Posición:** `(1.62, 0.01, 0.42)` — borde frontal-derecho del rug, dentro del warm spill (~1.5u del punto de luz), despejado de patas del escritorio, keyboard, mug, headphones y del espacio negativo DOM.
- **Pose:** bolita dormida — un domo (esfera escalada) + cabeza hundida e inclinada hacia abajo + puntas de orejas apenas rompiendo el redondeo + cola gris envolviendo el frente (torus parcial). Sin piezas que "cuelguen": compacto por construcción (7 meshes).
- **Identidad preservada:** exactamente las mismas 3 manchas grandes (saddle / corona+oreja / cola). Cero manchas nuevas.

Regla respetada: menos geometría que el loafing anterior (11→7 meshes); posición+pose+luz existente en vez de más detalle.

## 3. Intercambio térmico (bonus narrativo)

Los gatos intercambiaron zonas: ahora el **negro vive la frío lunar** (silueta azul) y el **blanco duerme en el cálido pool** (contraste natural blanco-sobre-madera cálida). Ambos leen mejor que antes con los mismos materiales.

## 4. Intacto

LampRig, ON/OFF, cuerda, SceneStage, ExperienceContext, CameraRig, iluminación, pixel scale 0.50, Room/Desk/Shelf/Door/Window/Monitor/Rug/props/AI signature, arquitectura M1, dependencias.

## 5. Validación

```text
pnpm lint   ✅
pnpm test   ✅ 10/10
pnpm build  ✅ index 62.9 · SceneCanvas lazy 283.3 KB gz
pnpm dev    ✅ HTTP 200
```

Draw calls/tris: sin cambio relevante (~104 / ~29k est.).

## 6. Pendiente de tu ojo

1. Negro contra la luna: ¿contorno claro? (si se funde con el pane oscuro, moverlo 0.05u hacia el borde del alféizar donde el casing corta el glow)
2. ¿Se lee "mirando afuera" y no hacia cámara?
3. Blanco: ¿"gato dormido" a primera vista o bola genérica? (el saddle + cola gris deben sugerir el animal)
4. Que ninguno compita con lámpara/cuerda en flicker.

Cierre definitivo del trabajo de gatos tras esta pasada, salvo bug real. Detengo aquí — M3-E espera tu GO.
