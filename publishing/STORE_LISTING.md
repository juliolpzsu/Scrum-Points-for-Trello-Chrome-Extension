# Ficha para la Chrome Web Store

Borrador de todos los textos que pide el dashboard al crear la ficha.
Cópialos y pégalos directamente; ajusta lo que quieras.

---

## Nombre de la extensión

```
Scrum Points for Trello
```

No usar "Scrum for Trello" a secas (ver `DECISIONS.md`, apartado legal:
sería suplantación del nombre original).

---

## Descripción corta (máx. 132 caracteres)

```
Insignias de puntos de historia y tiempo consumido en tarjetas de Trello. Sin permisos ni recogida de datos.
```

(108 caracteres)

---

## Descripción detallada

```
Scrum Points for Trello añade insignias de puntos de historia y tiempo
consumido directamente sobre las tarjetas de Trello, con totales
automáticos por lista y por tablero. Pensada para equipos que hacen
scrum o cualquier estimación por puntos y quieren verlo de un vistazo,
sin salir de Trello.

CÓMO SE USA
Escribe en el título de la tarjeta:
• (3) → 3 puntos de historia estimados
• (?) → sin estimar todavía
• [2] → 2 (horas, puntos...) de tiempo consumido
• Decimales: (0.5), (.5)

La extensión detecta el marcador, pinta la insignia correspondiente y
oculta visualmente el texto del marcador en el título (el dato sigue
estando en el título real, así que cualquier persona sin la extensión
lo sigue viendo con normalidad).

También puedes abrir el detalle de cualquier tarjeta y usar el selector
integrado para asignar puntos con un clic, en vez de escribir el
marcador a mano.

PRIVACIDAD
Cero recogida de datos. La extensión no pide ningún permiso de Chrome,
no tiene servidor propio y no envía nada fuera de tu navegador. Toda la
lógica se ejecuta localmente sobre la página de Trello que ya tienes
abierta. Política de privacidad completa: [URL DE GITHUB PAGES]

ORIGEN
Esta es una reimplementación independiente y no oficial, escrita desde
cero, inspirada en la extensión original "Scrum for Trello" de Q42
(github.com/Q42/TrelloScrum, licencia MIT) y en el fork mantenido por
Gareth J M Saunders. No está afiliada a Trello, Atlassian, Q42 ni a
Gareth J M Saunders. Código fuente: [URL DEL REPOSITORIO]
```

---

## Categoría

```
Productividad
```

---

## Idioma

```
Español (y funciona igual en cualquier idioma de la interfaz de Trello,
ya que no depende de texto visible, solo de atributos data-testid)
```

---

## Justificación de propósito único (single purpose)

Campo que pide el dashboard aunque no haya permisos declarados:

```
Mostrar insignias de puntos de historia y tiempo consumido sobre las
tarjetas de Trello, a partir de un marcador de texto en el título de la
propia tarjeta, y ofrecer un selector para asignarlo. No hace nada más.
```

---

## Justificación del permiso de host

El dashboard trata el `matches: ["https://trello.com/*"]` de los
content scripts como un permiso de host, aunque `manifest.json` no
tenga un bloque `permissions` separado. Justificación:

```
La extensión necesita ejecutarse sobre https://trello.com/* para leer
el título de las tarjetas visibles en el tablero que el usuario tiene
abierto, mostrar insignias de puntos e insertar el selector en el
detalle de la tarjeta. No se solicita acceso a ningún otro dominio ni
se envían datos fuera del navegador.
```

---

## Justificación de uso de código remoto

La extensión no usa código remoto; el dashboard pide declararlo igual:

```
La extensión no ejecuta código remoto. Todo el JavaScript está
empaquetado dentro de la propia extensión (carpeta src/); no se
descarga, genera dinámicamente ni evalúa ningún script externo en
tiempo de ejecución.
```

---

## Pestaña de privacidad del dashboard

Al no declarar ningún permiso, la mayoría de las casillas de recogida
de datos deben quedar en "No". Enlaza la URL pública de `docs/index.html`
(publicada vía GitHub Pages) como política de privacidad.

---

## Capturas de pantalla (pendiente, hay que hacerlas tú)

Sugerencia de qué capturar contra un tablero real, una vez lo pruebes:

1. Tablero con varias tarjetas mostrando insignias y el total de una
   lista.
2. El panel flotante de total del tablero, esquina superior derecha.
3. El detalle de una tarjeta con el picker abierto.
4. Antes/después: el mismo título con y sin la extensión activada,
   para que se vea que el marcador se oculta pero no se borra.

Tamaño recomendado por Chrome Web Store: 1280x800 o 640x400.

---

## Instrucciones de la prueba (dashboard → Acceso)

Le explica al revisor cómo probar la extensión, ya que no funciona por
sí sola: necesita un tablero real de Trello.

```
La extensión funciona sobre trello.com y necesita una tarjeta con un
marcador en el título para mostrar algo.

1. Instala la extensión.
2. Ve a https://trello.com e inicia sesión (una cuenta gratuita es
   suficiente).
3. Abre cualquier tablero, o crea uno nuevo.
4. Crea una tarjeta con este título exacto: Prueba (3) [1]
5. En la vista del tablero debería aparecer una insignia junto a la
   tarjeta (3 estimado, 1 consumido), y el marcador de texto desaparece
   visualmente del título (el dato sigue en el título real).
6. Abre el detalle de esa tarjeta (clic sobre ella): debajo del título
   aparece un selector con botones para asignar puntos con un clic.
```

---

## Distribución (dashboard → Compilación → Distribución)

- Visibilidad: **Público**.
- Precio: gratis (no se activa monetización).
- Regiones: todas, salvo que se prefiera limitarlo.
