# Decisiones de diseño y hallazgos técnicos

Este documento recoge el proceso de investigación y las decisiones
tomadas al construir Scrum Points for Trello: por qué el proyecto existe,
qué se investigó del DOM de Trello antes de escribir una sola línea de
selector, y qué alternativas se descartaron y por qué.

## Origen del proyecto

"Scrum for Trello" (Q42, 2015) y su fork mantenido por Gareth J M
Saunders hasta finales de 2023 dejaron de funcionar de forma fiable
contra la versión actual de Trello. Las reseñas negativas de 2024
("the estimated and consumed selection bars have been hidden for a
while now") tienen una causa concreta: Gareth arregló en diciembre de
2023 solo los selectores que él usaba personalmente, y Trello siguió
cambiando su DOM después.

| Función | Estado en el fork (verificado 2026) | Motivo |
|---|---|---|
| Insignias de puntos en tarjetas | Funciona | Selectores migrados en 2023 |
| Totales por lista y tablero | Funciona | idem |
| Selector de puntos en el detalle | Roto | Selectores de la Trello antigua |
| Recalcular totales al filtrar | Roto | Selectores basados en clases obsoletas |
| Integración "Burndown for Trello" | Roto | Dependía de otra extensión de terceros |
| Exportar a Excel | Roto | Llamaba a la API REST clásica de Trello |

Esto llevó a la decisión de **reescribir el núcleo desde cero** en
JavaScript puro (~300 líneas), en vez de parchear el código heredado de
38 KB que incluía jQuery 2.2.4 (con CVEs de XSS sin corregir en esa
versión).

## Situación legal

- Q42/TrelloScrml: licencia MIT, `Copyright (c) 2015 Q42`. Permite
  derivados, modificación y uso comercial; la única obligación es
  conservar el aviso de copyright y el texto de la licencia.
- El fork de Gareth J M Saunders hereda la misma licencia MIT.
- El `LICENSE` de este proyecto conserva la línea de copyright de Q42 y
  añade la del nuevo autor. El `README` atribuye explícitamente a ambos.
- Publicar una alternativa con nombre e icono propios no infringe la
  política antispam de la Chrome Web Store (que sí penaliza la
  suplantación del nombre o icono original).
- Estrategia de privacidad adoptada: **cero recogida de datos**, sin
  ningún permiso de Chrome declarado, para que la ficha de privacidad de
  la store se pueda rellenar entera en negativo y no haya nada que un
  revisor pueda encontrar contradictorio entre el dashboard, la política
  publicada y el comportamiento real del código.

## Hallazgos sobre el DOM de Trello

Trello usa React con CSS-in-JS: las clases son hashes generados en
compilación (p. ej. `_KoEFBSkwMZjeV`) y cambian en cada despliegue. Esto
explica por qué el proyecto original, anclado a clases como
`.window-header` o `.card-detail-title`, se rompía cada dos años.

**Regla de anclaje: siempre `data-testid`, nunca clases.**

### Selectores vivos (verificados en 2026)

Tablero: `[data-testid="list"]`, `[data-testid="list-header"]`,
`[data-testid="list-cards"]`, `[data-testid="list-card"]`,
`[data-testid="card-name"]`, `[data-testid="card-front-badges"]`.
Nota: `[data-testid="list-card-gap"]` es un separador vacío entre
tarjetas, no una tarjeta real — hay que excluirlo explícitamente.

Detalle de tarjeta: `[data-testid="card-back-header"]`,
`[data-testid="card-back-title-input"]` (el textarea del título, solo
presente en modo edición), `[role="dialog"]` como contenedor del
diálogo. En modo lectura el título es un `<h2>` sin `data-testid`.

### Cómo Trello guarda el título de una tarjeta

El título se guarda por GraphQL (`POST /gateway/api/graphql`), no por la
API REST clásica. La secuencia real capturada de una edición humana es:

```
mousedown → focus → keydown → beforeinput → input → keyup
→ keydown(Enter) → change → blur → focusout → POST /gateway/api/graphql
```

El commit lo dispara el evento `change`, no `input`. Se probaron varios
métodos para escribir el título por script; todos escriben en el DOM,
pero solo uno persiste tras recargar la página:

| Método | Persiste tras recargar |
|---|---|
| `textarea.value = x` | No |
| Setter nativo + `_valueTracker.setValue('')` + evento `input` | No |
| Invocar `props.onChange` del fiber de React | No |
| `document.execCommand('insertText')` solo | No |
| `insertText` + eventos sintéticos de Enter/change/blur | No |
| `insertText` + **Enter pulsado por el usuario** | **Sí** |

Conclusión: React descarta cualquier evento de confirmación sintético.
El guardado solo ocurre con una pulsación de teclado real.

Esto determina el diseño del selector de puntos: rellena el título con
`execCommand('insertText')`, dejando el foco dentro del campo, y muestra
un aviso pidiendo al usuario que pulse Enter — es un paso extra frente a
un selector de un solo clic, pero es el único comportamiento que
funciona de forma fiable y que no depende de trucos frágiles de React
que un futuro cambio pueda romper.

## Otras decisiones

- **Sin jQuery**: el fork empaquetaba jQuery 2.2.4 (84 KB, con CVEs de
  XSS sin corregir) solo para funciones que ya no se usan.
- **Sin el permiso `storage`**: el código heredado lo usaba para una
  secuencia de puntos personalizable. En la v1 la secuencia va fija
  (Fibonacci: 0, 0.5, 1, 2, 3, 5, 8, 13, 21) y el `manifest.json` no
  declara ningún permiso. El marcador de texto en el título acepta
  cualquier número igualmente; el selector con botones es solo un atajo
  para los valores más comunes.
- **Sin integración con "Burndown for Trello" ni exportación a Excel**:
  dependían de otra extensión de terceros y de acceso a la API de
  Trello respectivamente, lo que habría exigido pedir permisos justo
  cuando el objetivo era llegar a revisión sin ninguno.
- **MutationObserver acotado**: Trello re-renderiza constantemente. El
  observer se ancla al contenedor de listas (calculado dinámicamente,
  no a una clase fija) en vez de a `document.body`, con debounce por
  `requestAnimationFrame`, y todas las funciones de pintado son
  idempotentes para no realimentar el propio observer.

## Sintaxis de usuario

- `(3)` — puntos de historia estimados
- `(?)` — sin estimar
- `[2]` — tiempo consumido
- Decimales: `(0.5)`, `(.5)`

Las insignias ocultan visualmente el marcador del título, pero no lo
borran: el dato sigue en el título real de la tarjeta, para que
cualquiera sin la extensión lo siga viendo con normalidad.
