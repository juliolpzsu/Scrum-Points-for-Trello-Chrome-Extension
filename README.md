# Scrum Points for Trello

Extensión de Chrome (Manifest V3) que añade insignias de puntos de
historia y tiempo consumido a las tarjetas de Trello, con totales por
lista y por tablero.

Es una **reimplementación independiente y no oficial**, escrita desde
cero, basada en la idea original de "Scrum for Trello". No está afiliada
a Trello, Atlassian, Q42 ni a Gareth J M Saunders.

## Origen y atribución

Este proyecto retoma la convención de sintaxis y la idea funcional de:

- [**Q42/TrelloScrum**](https://github.com/Q42/TrelloScrum) — extensión
  original, licencia MIT, `Copyright (c) 2015 Q42`.
- [**garethjmsaunders/scrum-for-trello**](https://github.com/garethjmsaunders/scrum-for-trello) —
  fork de la anterior, también MIT, que mantuvo parcialmente el proyecto
  hasta diciembre de 2023.

El núcleo de esta extensión (`src/`) es código nuevo, escrito en
JavaScript puro sin dependencias, porque el DOM de Trello (React con
CSS-in-JS, clases hasheadas que cambian en cada despliegue) había
cambiado lo suficiente desde 2023 como para que el código heredado ya no
funcionara de forma fiable. El proceso de investigación completo — qué
selectores siguen vivos, cómo guarda Trello el título por GraphQL, y por
qué el selector de puntos pide pulsar Enter — está en
[`DECISIONS.md`](./DECISIONS.md). La licencia MIT del proyecto original
permite este tipo de derivado; ver [`LICENSE`](./LICENSE).

## Qué hace

- **Insignias en el tablero**: si el título de una tarjeta contiene
  `(3)` (puntos estimados) o `[2]` (tiempo consumido), se muestra una
  insignia junto a la tarjeta y el marcador de texto se oculta
  visualmente en el título (el dato sigue existiendo en el título real;
  solo se oculta en pantalla, para que cualquiera sin la extensión lo
  siga viendo).
- **Totales por lista**: suma de puntos estimados y consumidos de todas
  las tarjetas de cada lista, en la cabecera de la lista.
- **Total del tablero**: un panel flotante con la suma de todo el
  tablero, posicionado dinámicamente (no a una altura fija) para no
  solaparse con la barra superior de Trello.
- **Selector en el detalle de tarjeta**: al abrir una tarjeta aparece un
  panel con botones para asignar puntos estimados/consumidos (secuencia
  Fibonacci: 0, 0.5, 1, 2, 3, 5, 8, 13, 21), marcarla como `(?)` sin
  estimar, o quitar el marcador. El botón que corresponde al valor
  actual de la tarjeta se resalta.

## Sintaxis del título

| Marcador | Significado |
|---|---|
| `(3)` | 3 puntos de historia estimados |
| `(?)` | sin estimar |
| `[2]` | 2 (horas, puntos...) de tiempo consumido |
| `(0.5)`, `(.5)` | decimales aceptados |

El marcador se puede escribir a mano en el título con cualquier número;
los botones del selector son solo un atajo para los valores más
comunes de la escala Fibonacci.

## Por qué el guardado del selector pide pulsar Enter

Trello guarda el título de la tarjeta vía GraphQL y **descarta
cualquier evento de confirmación generado por script** (`change`,
`blur`, `Enter` simulados). Solo persiste tras recargar la página si el
Enter final lo pulsa una persona de verdad. Por eso el selector no
intenta guardar solo: rellena el campo con `execCommand('insertText')` y
pide al usuario que pulse Enter. Es un paso extra respecto a un selector
de un solo clic, pero es el único método verificado que funciona de
forma fiable. Detalle completo, con la tabla de métodos probados que no
persistían, en [`DECISIONS.md`](./DECISIONS.md).

## Privacidad y seguridad

Cero recogida de datos: la extensión no declara ningún permiso de
Chrome (`permissions` no existe en `manifest.json`), no hace llamadas de
red, no usa `eval`/`innerHTML`/`document.write`, y no toca
`localStorage`, `chrome.storage` ni cookies. Toda la lógica lee el DOM
ya visible de Trello y pinta elementos propios con `textContent` y
`createElement`, nunca con HTML construido a partir de datos de la
página. Política de privacidad completa:
[`docs/index.html`](./docs/index.html) (publicada vía GitHub Pages).

## Instalación (desarrollo)

1. `chrome://extensions`
2. Activar "Modo de desarrollador"
3. "Cargar descomprimida" → seleccionar la carpeta de este repositorio

## Pruebas

[`test/test-harness.html`](./test/test-harness.html) simula el DOM de
Trello (mismos `data-testid` verificados) y carga el código real de
`src/`, sin necesidad de un tablero real. Se abre directamente en un
navegador y corre comprobaciones automáticas sobre insignias, totales y
el picker.

## Estructura

```
.
├── manifest.json
├── src/
│   ├── parser.js         parsear (3) / [2] / (?) del título
│   ├── dom-utils.js       helpers idempotentes de DOM
│   ├── badges.js          insignias en tarjetas del tablero
│   ├── totals.js          totales por lista y por tablero
│   ├── picker.js          selector en el detalle de tarjeta
│   ├── observer.js        MutationObserver acotado + debounce
│   └── main.js            arranque
├── styles.css
├── icons/
├── test/
│   └── test-harness.html  banco de pruebas manual (no se empaqueta)
├── docs/
│   └── index.html         política de privacidad (GitHub Pages)
├── publishing/            borradores para la Chrome Web Store
├── LICENSE
├── DECISIONS.md           investigación y decisiones de diseño
└── README.md
```

## Licencia

MIT — ver [`LICENSE`](./LICENSE). Conserva el aviso de copyright de Q42
2015 y añade el del autor de esta versión.
