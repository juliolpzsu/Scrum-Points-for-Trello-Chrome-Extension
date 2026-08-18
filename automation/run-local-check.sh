#!/bin/bash
# Invocado por automation/weekly-local-check.ps1 (Programador de tareas de Windows) o a mano
# para probar. Vive como archivo aparte (en vez de una línea de comando embebida en el .ps1)
# para que el paso PowerShell -> bash no dependa de escapar bien comillas ni saltos de línea.
set -euo pipefail
cd "$(dirname "$0")/.."

# Invocado por el Programador de tareas: shell no interactivo y no de login, así que no
# carga ~/.bashrc y el PATH no incluye ~/.local/bin, donde vive el binario `claude`. Sin
# esta línea el script fallaba con "claude: command not found".
export PATH="$HOME/.local/bin:$PATH"

git pull --ff-only

# --- Lectura de la ficha de la Chrome Web Store con Chrome real (2026-08-18) ---
#
# Antes esto lo hacía el propio agente de Claude con WebFetch dentro del prompt de abajo,
# pero WebFetch no ejecuta JavaScript y la ficha es una SPA: varias veces devolvió "0
# reseñas / sin puntuación" de forma ambigua incluso habiendo reseñas reales, y el agente
# tenía que adivinar si eso era un dato real o una carga vacía. Se sustituye por una lectura
# con Chrome real (perfil dedicado CDP-Profile, cuenta de Julio López) vía la skill
# "how-to-chrome" — el HTML ya viene renderizado, sin esa ambigüedad. El resultado se escribe
# en un archivo de texto (no se comitea, ver .gitignore) y es lo único que lee el agente de
# abajo: así el agente ya no necesita permiso de red ni de controlar Chrome, solo Read/Write
# sobre los dos archivos de estado y git.
CDP_PORT=9222
CDP_SCRIPT=$(find "$HOME/.claude/plugins/cache" -path "*/how-to-chrome/scripts/cdp.mjs" 2>/dev/null | head -1)
STORE_URL="https://chromewebstore.google.com/detail/kffaimmdpfeleelcjibkcnbmnfdnamce?ucbcb=1"
LISTING_FILE="automation/.store-listing.txt"

if [ -z "$CDP_SCRIPT" ]; then
  echo "Skill how-to-chrome no encontrada en ~/.claude/plugins/cache; se omite la lectura con Chrome real esta vez." >&2
  : > "$LISTING_FILE"
else
  if ! curl -sf --max-time 1 "http://127.0.0.1:$CDP_PORT/json/version" >/dev/null 2>&1; then
    CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
    UDD="$LOCALAPPDATA/Google/Chrome/CDP-Profile"
    # Perfil dedicado (no el Chrome normal de Julio) con --profile-directory=Default, que en
    # ese perfil dedicado es la cuenta de Julio López (verificado a mano el 2026-08-18: la
    # otra cuenta guardada ahí, "Profile 1"/Locust, NO debe usarse nunca para esto).
    # No se mata ningún proceso de Chrome existente aquí a propósito: hacerlo con un taskkill
    # genérico afecta también al Chrome normal del usuario si lo tiene abierto en ese momento.
    "$CHROME" --remote-debugging-port=$CDP_PORT "--user-data-dir=$UDD" --profile-directory=Default about:blank &
    disown
    for _ in $(seq 1 30); do
      curl -sf --max-time 1 "http://127.0.0.1:$CDP_PORT/json/version" >/dev/null 2>&1 && break
      sleep 0.5
    done
  fi

  NAV_OUT=$(node "$CDP_SCRIPT" nav "$STORE_URL" 2>&1) || NAV_OUT=""
  TAB_ID=$(printf '%s\n' "$NAV_OUT" | sed -n 's/.*tabId: //p')
  if [ -n "$TAB_ID" ]; then
    sleep 1.5
    node "$CDP_SCRIPT" text "$TAB_ID" > "$LISTING_FILE" 2>/dev/null || : > "$LISTING_FILE"
    # No se cierra la pestaña (evitar tocar el proceso de Chrome); se manda a about:blank
    # para no dejar la ficha cargada indefinidamente.
    node "$CDP_SCRIPT" nav "about:blank" "$TAB_ID" >/dev/null 2>&1 || true
  else
    echo "No se pudo abrir/leer la ficha con Chrome real esta vez (¿Chrome no arrancó a tiempo?)." >&2
    : > "$LISTING_FILE"
  fi
fi

# --dangerously-skip-permissions: sin esto, al ejecutarse desde el Programador de tareas
# de Windows (sin sesión interactiva) Claude Code deniega el permiso de escritura aunque
# esté en --allowedTools. Es seguro aquí porque el prompt (local-check-prompt.txt) está muy
# acotado: solo toca automation/reviews-state.json y automation/store-stats.json, y solo
# hace `git pull`/`add`/`commit`/`push` sobre este repo. Ya no incluye WebFetch: la lectura
# de la ficha ya está hecha arriba, con Chrome real.
cat automation/local-check-prompt.txt | claude -p \
  --allowedTools "Read,Write,Bash(git pull:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git status:*),Bash(sha256sum:*)" \
  --dangerously-skip-permissions
