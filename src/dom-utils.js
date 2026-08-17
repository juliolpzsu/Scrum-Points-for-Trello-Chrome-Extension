/*
 * Scrum Points for Trello — dom-utils.js
 *
 * Helpers compartidos por badges.js, totals.js y picker.js.
 *
 * Regla de diseño: toda función que escribe en el DOM debe ser IDEMPOTENTE
 * (si el estado deseado ya está aplicado, no toca nada). Así el
 * MutationObserver puede volver a llamarlas cientos de veces por segundo
 * sin generar mutaciones nuevas cada vez ni entrar en bucle consigo mismo.
 */
(function (global) {
  'use strict';

  var SPT = (global.SPT = global.SPT || {});

  function createBadge(kind, text) {
    var span = document.createElement('span');
    span.setAttribute('data-spt', '1');
    span.className = 'spt-badge spt-badge--' + kind;
    span.textContent = text;
    return span;
  }

  function createChip(kind, text) {
    var span = document.createElement('span');
    span.setAttribute('data-spt', '1');
    span.className = 'spt-chip spt-chip--' + kind;
    span.textContent = text;
    return span;
  }

  /**
   * Comprueba si un elemento solo contiene texto plano y/o nodos que
   * nosotros mismos hemos inyectado antes (marcados con data-spt-marker).
   * Si contiene cualquier otra cosa (iconos, enlaces, spans de Trello...)
   * no tocamos su estructura: mejor dejar el marcador visible que romper
   * algo que no entendemos.
   */
  function isSafeToRebuild(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) continue;
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.hasAttribute &&
        node.hasAttribute('data-spt-marker')
      ) {
        continue;
      }
      return false;
    }
    return true;
  }

  /**
   * Oculta visualmente uno o varios rangos de texto dentro de `el` sin
   * borrar el dato ni ocultarlo de lectores de pantalla: el texto sigue
   * en el DOM (textContent no cambia), solo se envuelve en un <span> con
   * la clase spt-hidden-marker (recorte visual, sin display:none).
   *
   * @param {Element} el
   * @param {Array<{index:number, length:number}>} ranges - ordenados por index
   */
  function hideTextRanges(el, ranges) {
    if (!el) return;
    var fullText = el.textContent;

    if (!isSafeToRebuild(el)) return;

    var sig = fullText + '|' + ranges.map(function (r) {
      return r.index + ':' + r.length;
    }).join(',');

    if (el.getAttribute('data-spt-sig') === sig) return; // ya está correcto

    while (el.firstChild) el.removeChild(el.firstChild);

    var cursor = 0;
    ranges.forEach(function (r) {
      if (r.index > cursor) {
        el.appendChild(document.createTextNode(fullText.slice(cursor, r.index)));
      }
      var span = document.createElement('span');
      span.setAttribute('data-spt-marker', '1');
      span.className = 'spt-hidden-marker';
      span.textContent = fullText.slice(r.index, r.index + r.length);
      el.appendChild(span);
      cursor = r.index + r.length;
    });
    if (cursor < fullText.length) {
      el.appendChild(document.createTextNode(fullText.slice(cursor)));
    }
    el.setAttribute('data-spt-sig', sig);
  }

  SPT.domUtils = {
    createBadge: createBadge,
    createChip: createChip,
    hideTextRanges: hideTextRanges
  };
})(window);
