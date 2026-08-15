/*
 * Scrum Points for Trello — observer.js
 *
 * Riesgo documentado en CLAUDE.md: Trello re-renderiza constantemente.
 * Un MutationObserver mal acotado se dispara miles de veces por segundo
 * y tira el rendimiento del navegador. Medidas aplicadas aquí:
 *
 *   1. Observar el contenedor de listas (calculado dinámicamente), NUNCA
 *      document.body con subtree profundo + characterData.
 *   2. Debounce con requestAnimationFrame: por muchas mutaciones que
 *      lleguen en una ráfaga, solo se procesa una vez por frame.
 *   3. Todas las funciones de pintado (badges/totals/picker) son
 *      idempotentes: si el DOM ya está en el estado deseado no escriben
 *      nada, así que una ráfaga de mutaciones no se realimenta a sí misma
 *      indefinidamente.
 *   4. Un segundo observer, mucho más barato (solo childList, sin
 *      characterData), vigila document.body para detectar la aparición
 *      del diálogo de detalle de tarjeta, que Trello monta como overlay
 *      fuera del contenedor de listas.
 */
(function (global) {
  'use strict';

  var SPT = (global.SPT = global.SPT || {});

  var listsObserver = null;
  var bodyObserver = null;
  var observedContainer = null;
  var pending = false;
  var navHooked = false;
  var lastHref = location.href;

  function findListsContainer() {
    var lists = document.querySelectorAll('[data-testid="list"]');
    if (lists.length === 0) return null;

    var container = lists[0].parentElement;
    while (container && container !== document.body) {
      if (container.querySelectorAll('[data-testid="list"]').length >= lists.length) {
        return container;
      }
      container = container.parentElement;
    }
    return document.body;
  }

  function processAll() {
    var start = global.performance ? performance.now() : 0;

    SPT.badges.processBoard();
    SPT.totals.processBoard();
    SPT.picker.processDialogs();

    if (global.SPT_DEBUG && global.performance) {
      var elapsed = performance.now() - start;
      if (elapsed > 50) {
        console.warn('[Scrum Points] processAll: ' + elapsed.toFixed(1) + 'ms');
      }
    }
  }

  function scheduleProcess() {
    if (pending) return;
    pending = true;
    global.requestAnimationFrame(function () {
      pending = false;
      processAll();
    });
  }

  function attachListsObserver() {
    var container = findListsContainer();
    if (!container) return false;
    if (container === observedContainer && listsObserver) return true;

    if (listsObserver) listsObserver.disconnect();
    observedContainer = container;
    listsObserver = new MutationObserver(scheduleProcess);
    listsObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
    return true;
  }

  function attachBodyObserver() {
    if (bodyObserver) return;
    bodyObserver = new MutationObserver(scheduleProcess);
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function heartbeat() {
    if (!observedContainer || !observedContainer.isConnected) {
      attachListsObserver();
    }
    if (location.href !== lastHref) {
      lastHref = location.href;
      attachListsObserver();
    }
    scheduleProcess();
  }

  function hookHistoryNavigation() {
    if (navHooked) return;
    navHooked = true;

    ['pushState', 'replaceState'].forEach(function (method) {
      var original = history[method];
      history[method] = function () {
        var result = original.apply(this, arguments);
        global.setTimeout(heartbeat, 300);
        return result;
      };
    });
    global.addEventListener('popstate', function () {
      global.setTimeout(heartbeat, 300);
    });
  }

  function start() {
    hookHistoryNavigation();
    attachListsObserver();
    attachBodyObserver();
    scheduleProcess();
    global.setInterval(heartbeat, 2000);
  }

  SPT.observer = {
    start: start,
    findListsContainer: findListsContainer
  };
})(window);
