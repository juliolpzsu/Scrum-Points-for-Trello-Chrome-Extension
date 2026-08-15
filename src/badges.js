/*
 * Scrum Points for Trello — badges.js
 *
 * Pinta las insignias de puntos estimados / consumidos en cada tarjeta
 * del tablero, y oculta visualmente el marcador "(3)" / "[2]" del título
 * (el texto sigue existiendo en el título real; solo se oculta en pantalla).
 *
 * Selectores usados (verificados en CLAUDE.md, todos data-testid):
 *   [data-testid="list-card"]           cada tarjeta del tablero
 *   [data-testid="card-name"]           título en el tablero
 *   [data-testid="card-front-badges"]   contenedor de insignias de Trello
 */
(function (global) {
  'use strict';

  var SPT = (global.SPT = global.SPT || {});

  function badgeSignature(parsed) {
    var e = parsed.estimated
      ? 'e:' + (parsed.estimated.unestimated ? '?' : parsed.estimated.value)
      : '';
    var c = parsed.consumed ? 'c:' + parsed.consumed.value : '';
    return e + '|' + c;
  }

  function ensureCardBadges(card) {
    var nameEl = card.querySelector('[data-testid="card-name"]');
    if (!nameEl) return;

    var title = nameEl.textContent;
    var parsed = SPT.parser.parseTitle(title);

    var ranges = [];
    if (parsed.estimated) ranges.push(parsed.estimated);
    if (parsed.consumed) ranges.push(parsed.consumed);
    ranges.sort(function (a, b) { return a.index - b.index; });
    SPT.domUtils.hideTextRanges(nameEl, ranges);

    var badgesContainer = card.querySelector('[data-testid="card-front-badges"]');
    if (!badgesContainer) return;

    var existing = badgesContainer.querySelector('[data-spt-badge-group="1"]');

    if (!parsed.estimated && !parsed.consumed) {
      if (existing) existing.remove();
      return;
    }

    var sig = badgeSignature(parsed);
    if (existing && existing.getAttribute('data-spt-sig') === sig) return; // idempotente

    if (existing) existing.remove();

    var group = document.createElement('span');
    group.setAttribute('data-spt-badge-group', '1');
    group.setAttribute('data-spt-sig', sig);
    group.setAttribute('data-spt', '1');
    group.className = 'spt-badge-group';

    if (parsed.estimated) {
      var kind = parsed.estimated.unestimated ? 'unestimated' : 'estimated';
      var text = SPT.parser.formatEstimated(parsed.estimated.value);
      group.appendChild(SPT.domUtils.createBadge(kind, text));
    }
    if (parsed.consumed) {
      var consumedText = SPT.parser.formatConsumed(parsed.consumed.value);
      group.appendChild(SPT.domUtils.createBadge('consumed', consumedText));
    }

    badgesContainer.appendChild(group);
  }

  function processBoard() {
    var cards = document.querySelectorAll('[data-testid="list-card"]');
    for (var i = 0; i < cards.length; i++) {
      ensureCardBadges(cards[i]);
    }
  }

  SPT.badges = {
    processBoard: processBoard
  };
})(window);
