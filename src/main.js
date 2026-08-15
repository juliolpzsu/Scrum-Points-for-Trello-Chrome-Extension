/*
 * Scrum Points for Trello — main.js
 *
 * Punto de entrada. Trello es una SPA: aunque el content script se
 * inyecta en document_idle, el tablero (las listas) todavía puede no
 * existir en el DOM porque se carga después vía JS. Esperamos activamente
 * a que aparezca al menos una lista antes de arrancar el observer
 * definitivo, para no tener que observar document.body de forma
 * indiscriminada mientras tanto.
 */
(function (global) {
  'use strict';

  var SPT = global.SPT || {};

  function boot(attemptsLeft) {
    if (document.querySelector('[data-testid="list"]') || attemptsLeft <= 0) {
      // Si el tablero aún no ha aparecido tras los reintentos, arrancamos
      // igualmente: el heartbeat de observer.js reintenta enganchar el
      // contenedor de listas cada 2s, y el observer de body ya está activo.
      if (SPT.observer) SPT.observer.start();
      return;
    }
    global.setTimeout(function () {
      boot(attemptsLeft - 1);
    }, 400);
  }

  boot(15);
})(window);
