/*
 * Scrum Points for Trello — parser.js
 *
 * Interpreta la sintaxis del título de la tarjeta:
 *   (3)   puntos de historia estimados
 *   (?)   sin estimar
 *   [2]   tiempo consumido
 *   Acepta decimales: (0.5), (.5), [1.5]
 *
 * No modifica el título: solo lo lee y devuelve dónde está cada marcador
 * (índice y longitud) para que otros módulos decidan qué hacer con eso.
 */
(function (global) {
  'use strict';

  var NUMBER_SOURCE = '\\d+(?:\\.\\d+)?|\\.\\d+';
  var ESTIMATED_RE = new RegExp('\\((' + NUMBER_SOURCE + '|\\?)\\)');
  var CONSUMED_RE = new RegExp('\\[(' + NUMBER_SOURCE + ')\\]');

  function parseMarker(title, re) {
    if (typeof title !== 'string') return null;
    var match = re.exec(title);
    if (!match) return null;

    var raw = match[0];
    var token = match[1];
    var unestimated = token === '?';

    return {
      raw: raw,
      index: match.index,
      length: raw.length,
      value: unestimated ? null : parseFloat(token),
      unestimated: unestimated
    };
  }

  /**
   * @param {string} title - título completo de la tarjeta, sin tocar.
   * @returns {{estimated: object|null, consumed: object|null}}
   */
  function parseTitle(title) {
    return {
      estimated: parseMarker(title, ESTIMATED_RE),
      consumed: parseMarker(title, CONSUMED_RE)
    };
  }

  function hasMarkers(title) {
    var parsed = parseTitle(title);
    return !!(parsed.estimated || parsed.consumed);
  }

  function formatEstimated(value) {
    if (value === null || value === undefined) return '?';
    return trimTrailingZero(value);
  }

  function formatConsumed(value) {
    return trimTrailingZero(value);
  }

  function trimTrailingZero(value) {
    var text = String(value);
    return text;
  }

  global.SPT = global.SPT || {};
  global.SPT.parser = {
    ESTIMATED_RE: ESTIMATED_RE,
    CONSUMED_RE: CONSUMED_RE,
    parseTitle: parseTitle,
    hasMarkers: hasMarkers,
    formatEstimated: formatEstimated,
    formatConsumed: formatConsumed
  };
})(window);
