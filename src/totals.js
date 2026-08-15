/*
 * Scrum Points for Trello — totals.js
 *
 * Suma puntos estimados y consumidos por lista y por tablero.
 *
 * El total por lista se inyecta en [data-testid="list-header"] (selector
 * verificado). Para el total del tablero NO existe en CLAUDE.md ningún
 * data-testid verificado de la cabecera del tablero, así que en vez de
 * adivinar uno (y arriesgarnos a anclarnos a algo no confirmado) usamos
 * un panel flotante propio, añadido como hijo directo de <body>. Al vivir
 * fuera del árbol que React controla, no puede romperse con un rediseño
 * de la cabecera del tablero.
 */
(function (global) {
  'use strict';

  var SPT = (global.SPT = global.SPT || {});

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  /**
   * Coloca el panel flotante justo por encima del contenedor de listas,
   * en vez de a una distancia fija desde arriba: la altura de la barra
   * superior de Trello no es constante (cambia con el ancho de ventana y
   * la longitud del nombre del tablero), así que un "top" fijo acababa
   * solapándose con sus propios botones.
   */
  function positionBoardTotal(panel) {
    var container = SPT.observer && SPT.observer.findListsContainer
      ? SPT.observer.findListsContainer()
      : null;

    if (container) {
      var rect = container.getBoundingClientRect();
      // rect.top ya está por debajo de la barra superior de Trello (ahí
      // es donde empiezan las listas), así que anclarse a ese punto evita
      // adivinar la altura de esa barra.
      panel.style.top = Math.max(rect.top + 6, 8) + 'px';
    } else if (!panel.style.top) {
      panel.style.top = '54px'; // valor de respaldo hasta que haya listas
    }
  }

  function sumList(listEl) {
    var totalEst = 0;
    var totalCons = 0;
    var hasEst = false;
    var hasCons = false;
    var hasUnestimated = false;

    var cards = listEl.querySelectorAll('[data-testid="list-card"]');
    for (var i = 0; i < cards.length; i++) {
      var nameEl = cards[i].querySelector('[data-testid="card-name"]');
      if (!nameEl) continue;
      var parsed = SPT.parser.parseTitle(nameEl.textContent);
      if (parsed.estimated) {
        if (parsed.estimated.unestimated) {
          hasUnestimated = true;
        } else {
          totalEst += parsed.estimated.value;
          hasEst = true;
        }
      }
      if (parsed.consumed) {
        totalCons += parsed.consumed.value;
        hasCons = true;
      }
    }

    return {
      totalEst: totalEst,
      totalCons: totalCons,
      hasEst: hasEst,
      hasCons: hasCons,
      hasUnestimated: hasUnestimated
    };
  }

  function ensureListTotal(listEl) {
    var header = listEl.querySelector('[data-testid="list-header"]');
    if (!header) return null;

    var sums = sumList(listEl);
    var existing = header.querySelector('[data-spt-list-total="1"]');

    if (!sums.hasEst && !sums.hasCons && !sums.hasUnestimated) {
      if (existing) existing.remove();
      return sums;
    }

    var sig = [sums.totalEst, sums.totalCons, sums.hasEst, sums.hasCons, sums.hasUnestimated].join('|');
    if (existing && existing.getAttribute('data-spt-sig') === sig) return sums; // idempotente

    if (existing) existing.remove();

    var el = document.createElement('div');
    el.setAttribute('data-spt-list-total', '1');
    el.setAttribute('data-spt-sig', sig);
    el.setAttribute('data-spt', '1');
    el.className = 'spt-list-total';

    if (sums.hasEst || sums.hasUnestimated) {
      var estText = round(sums.totalEst) + (sums.hasUnestimated ? '+?' : '');
      el.appendChild(SPT.domUtils.createChip('estimated', estText));
    }
    if (sums.hasCons) {
      el.appendChild(SPT.domUtils.createChip('consumed', String(round(sums.totalCons))));
    }

    header.appendChild(el);
    return sums;
  }

  function ensureBoardTotal() {
    var lists = document.querySelectorAll('[data-testid="list"]');

    var totalEst = 0;
    var totalCons = 0;
    var hasEst = false;
    var hasCons = false;
    var hasUnestimated = false;

    for (var i = 0; i < lists.length; i++) {
      var sums = sumList(lists[i]);
      totalEst += sums.totalEst;
      totalCons += sums.totalCons;
      hasEst = hasEst || sums.hasEst;
      hasCons = hasCons || sums.hasCons;
      hasUnestimated = hasUnestimated || sums.hasUnestimated;
    }

    var panel = document.getElementById('spt-board-total');

    if (lists.length === 0 || (!hasEst && !hasCons && !hasUnestimated)) {
      if (panel) panel.remove();
      return;
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'spt-board-total';
      panel.setAttribute('data-spt', '1');
      panel.className = 'spt-board-total';
      document.body.appendChild(panel);
    }

    positionBoardTotal(panel);

    var sig = [totalEst, totalCons, hasEst, hasCons, hasUnestimated].join('|');
    if (panel.getAttribute('data-spt-sig') === sig) return; // idempotente, el contenido no cambia

    panel.setAttribute('data-spt-sig', sig);
    panel.textContent = '';

    var label = document.createElement('span');
    label.className = 'spt-board-total__label';
    label.textContent = 'Tablero';
    panel.appendChild(label);

    if (hasEst || hasUnestimated) {
      var estText = round(totalEst) + (hasUnestimated ? '+?' : '');
      panel.appendChild(SPT.domUtils.createChip('estimated', estText));
    }
    if (hasCons) {
      panel.appendChild(SPT.domUtils.createChip('consumed', String(round(totalCons))));
    }
  }

  function processBoard() {
    var lists = document.querySelectorAll('[data-testid="list"]');
    for (var i = 0; i < lists.length; i++) {
      ensureListTotal(lists[i]);
    }
    ensureBoardTotal();
  }

  SPT.totals = {
    sumList: sumList,
    processBoard: processBoard
  };
})(window);
