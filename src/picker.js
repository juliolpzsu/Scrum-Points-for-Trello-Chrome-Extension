/*
 * Scrum Points for Trello — picker.js
 *
 * Selector de puntos en el detalle de tarjeta.
 *
 * Punto crítico documentado en CLAUDE.md: Trello guarda el título por
 * GraphQL y DESCARTA cualquier evento de confirmación sintético (change,
 * blur, keydown(Enter) simulados). El único gesto que persiste tras F5 es
 * "insertText" + una pulsación real de Enter por parte del usuario.
 *
 * Por eso este picker NUNCA dispara el guardado por su cuenta:
 *   1. Sustituye el texto seleccionado con execCommand('insertText', ...).
 *   2. Deja el foco dentro del textarea.
 *   3. Muestra un aviso pidiendo al usuario que pulse Enter.
 *   4. Es el usuario quien guarda, con su propia tecla.
 */
(function (global) {
  'use strict';

  var SPT = (global.SPT = global.SPT || {});

  var SEQUENCE = [0, 0.5, 1, 2, 3, 5, 8, 13, 21];

  function formatValue(v) {
    return String(v);
  }

  function findTitleTextarea(dialog) {
    return dialog.querySelector('[data-testid="card-back-title-input"]');
  }

  /**
   * En modo lectura el título es un <h2> sin data-testid dentro de
   * card-back-header (CLAUDE.md). Si el textarea de edición no está
   * presente todavía, intentamos entrar en modo edición haciendo clic
   * en ese <h2> y reintentamos un par de veces dando tiempo a React a
   * re-renderizar.
   */
  function ensureTitleTextarea(dialog, callback, attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 6;

    var textarea = findTitleTextarea(dialog);
    if (textarea) {
      callback(textarea);
      return;
    }

    if (attemptsLeft <= 0) {
      callback(null);
      return;
    }

    var header = dialog.querySelector('[data-testid="card-back-header"]');
    if (header) {
      var heading = header.querySelector('h2');
      if (heading) heading.click();
    }

    global.setTimeout(function () {
      ensureTitleTextarea(dialog, callback, attemptsLeft - 1);
    }, 100);
  }

  function setMarkerInTitle(title, existingMarker, newRaw) {
    if (existingMarker) {
      var before = title.slice(0, existingMarker.index);
      var after = title.slice(existingMarker.index + existingMarker.length);
      if (newRaw === null) {
        var joined = before.replace(/[ \t]+$/, '') +
          (after.replace(/^[ \t]+/, '') ? ' ' + after.replace(/^[ \t]+/, '') : after);
        return joined.replace(/[ \t]+$/, '');
      }
      return before + newRaw + after;
    }
    if (newRaw === null) return title;
    var trimmed = title.replace(/[ \t]+$/, '');
    return trimmed + (trimmed ? ' ' : '') + newRaw;
  }

  function showSaveHint(container, textarea) {
    var hint = container.querySelector('[data-spt-hint="1"]');
    if (!hint) {
      hint = document.createElement('div');
      hint.setAttribute('data-spt-hint', '1');
      hint.setAttribute('data-spt', '1');
      hint.className = 'spt-save-hint';
      container.appendChild(hint);
    }
    hint.textContent = 'Pulsa Enter para guardar';
    hint.classList.add('spt-save-hint--visible');

    global.clearTimeout(hint._sptTimer);
    hint._sptTimer = global.setTimeout(function () {
      hint.classList.remove('spt-save-hint--visible');
    }, 6000);

    function hide() {
      hint.classList.remove('spt-save-hint--visible');
      textarea.removeEventListener('keydown', onKeydown);
      textarea.removeEventListener('blur', hide);
    }
    function onKeydown(ev) {
      if (ev.key === 'Enter') hide();
    }
    textarea.addEventListener('keydown', onKeydown);
    textarea.addEventListener('blur', hide);
  }

  function applyMarker(dialog, panel, kind, newRaw) {
    ensureTitleTextarea(dialog, function (textarea) {
      if (!textarea) {
        var hint = panel.querySelector('[data-spt-hint="1"]') || (function () {
          var h = document.createElement('div');
          h.setAttribute('data-spt-hint', '1');
          h.setAttribute('data-spt', '1');
          h.className = 'spt-save-hint';
          panel.appendChild(h);
          return h;
        })();
        hint.textContent = 'Haz clic en el título de la tarjeta y vuelve a intentarlo.';
        hint.classList.add('spt-save-hint--visible', 'spt-save-hint--error');
        return;
      }

      var currentTitle = textarea.value;
      var parsed = SPT.parser.parseTitle(currentTitle);
      var existingMarker = kind === 'estimated' ? parsed.estimated : parsed.consumed;
      var newTitle = setMarkerInTitle(currentTitle, existingMarker, newRaw);

      if (newTitle === currentTitle) return;

      textarea.focus();
      textarea.setSelectionRange(0, currentTitle.length);
      document.execCommand('insertText', false, newTitle);
      textarea.setSelectionRange(newTitle.length, newTitle.length);

      showSaveHint(panel, textarea);
    });
  }

  function buildRow(dialog, panel, kind, label) {
    var row = document.createElement('div');
    row.className = 'spt-picker-row';

    var labelEl = document.createElement('span');
    labelEl.className = 'spt-picker-row__label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    SEQUENCE.forEach(function (value) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spt-picker-btn';
      btn.textContent = formatValue(value);
      btn.addEventListener('click', function () {
        var raw = kind === 'estimated' ? '(' + value + ')' : '[' + value + ']';
        applyMarker(dialog, panel, kind, raw);
      });
      row.appendChild(btn);
    });

    if (kind === 'estimated') {
      var unestBtn = document.createElement('button');
      unestBtn.type = 'button';
      unestBtn.className = 'spt-picker-btn spt-picker-btn--unestimated';
      unestBtn.textContent = '?';
      unestBtn.addEventListener('click', function () {
        applyMarker(dialog, panel, kind, '(?)');
      });
      row.appendChild(unestBtn);
    }

    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'spt-picker-btn spt-picker-btn--clear';
    clearBtn.textContent = 'Quitar';
    clearBtn.addEventListener('click', function () {
      applyMarker(dialog, panel, kind, null);
    });
    row.appendChild(clearBtn);

    return row;
  }

  /**
   * Resalta el botón que corresponde al valor actual del título, para que
   * se vea de un vistazo qué hay puesto sin tener que leer el texto.
   */
  function refreshActiveState(dialog, panel) {
    var textarea = findTitleTextarea(dialog);
    if (!textarea) return;
    var parsed = SPT.parser.parseTitle(textarea.value);
    var rows = panel.querySelectorAll('.spt-picker-row');
    var byKind = { estimated: rows[0], consumed: rows[1] };

    ['estimated', 'consumed'].forEach(function (kind) {
      var row = byKind[kind];
      if (!row) return;
      var marker = parsed[kind];
      var targetText = marker ? (marker.unestimated ? '?' : formatValue(marker.value)) : null;
      var buttons = row.querySelectorAll('.spt-picker-btn:not(.spt-picker-btn--clear)');
      for (var i = 0; i < buttons.length; i++) {
        var isActive = targetText !== null && buttons[i].textContent === targetText;
        buttons[i].classList.toggle('spt-picker-btn--active', isActive);
      }
    });
  }

  function ensurePicker(dialog) {
    var header = dialog.querySelector('[data-testid="card-back-header"]');
    if (!header) return;

    var panel = header.querySelector('[data-spt-picker="1"]');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'spt-picker-panel';
      panel.setAttribute('data-spt-picker', '1');
      panel.setAttribute('data-spt', '1');
      panel.className = 'spt-picker-panel';

      panel.appendChild(buildRow(dialog, panel, 'estimated', 'Estimado'));
      panel.appendChild(buildRow(dialog, panel, 'consumed', 'Consumido'));

      header.appendChild(panel);
    }

    refreshActiveState(dialog, panel);
  }

  function processDialogs() {
    var dialogs = document.querySelectorAll('[role="dialog"]');
    for (var i = 0; i < dialogs.length; i++) {
      if (dialogs[i].querySelector('[data-testid="card-back-header"]')) {
        ensurePicker(dialogs[i]);
      }
    }
  }

  SPT.picker = {
    processDialogs: processDialogs
  };
})(window);
