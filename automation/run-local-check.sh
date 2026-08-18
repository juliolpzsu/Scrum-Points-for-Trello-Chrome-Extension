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
# con Chrome real vía la skill "how-to-chrome" — el HTML ya viene renderizado, sin esa
# ambigüedad. Usa una carpeta de perfil de Chrome propia de este proyecto (nunca la que Julio
# usa a diario, ver más abajo por qué) y no necesita ninguna sesión iniciada: la ficha de la
# Chrome Web Store es pública. El resultado se escribe en un archivo de texto (no se comitea,
# ver .gitignore) y es lo único que lee el agente de abajo: así el agente ya no necesita
# permiso de red ni de controlar Chrome, solo Read/Write sobre los archivos de estado y git.
CDP_PORT=9223
CDP_HOST="127.0.0.1:$CDP_PORT"
export CDP_HOST  # cdp.mjs lee esta variable; así todas las llamadas de abajo usan el puerto 9223
CDP_SCRIPT=$(find "$HOME/.claude/plugins/cache" -path "*/how-to-chrome/scripts/cdp.mjs" 2>/dev/null | head -1)
STORE_URL="https://chromewebstore.google.com/detail/kffaimmdpfeleelcjibkcnbmnfdnamce?ucbcb=1"
LISTING_FILE="automation/.store-listing.txt"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
# Carpeta de perfil PROPIA de este proyecto, distinta de "CDP-Profile" (que resultó ser, en
# la práctica, la ventana de Chrome que Julio usa a diario — cerrarla le cerró su serie dos
# veces el 2026-08-18). Esta carpeta nueva nunca la abre Julio a mano, así que el proceso que
# la usa nunca puede coincidir con una ventana suya real. También va en un puerto distinto
# (9223, no 9222) para no interferir si esa otra sesión con CDP también estuviera activa.
UDD_WIN="$LOCALAPPDATA\\Google\\Chrome\\Claude-ScrumPointsTrello-Profile"

# Cierra ÚNICAMENTE los procesos de Chrome de ESTA carpeta de perfil exacta (nunca un
# taskkill genérico de chrome.exe, que afectaría a cualquier otra ventana de Chrome que
# Julio tenga abierta). Solo se usa como red de seguridad si el puerto no responde pero
# queda un proceso colgado de una ejecución anterior.
kill_own_chrome() {
  powershell.exe -NoProfile -Command "
    Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" |
      Where-Object { \$_.CommandLine -like '*Claude-ScrumPointsTrello-Profile*' } |
      ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }
  " >/dev/null 2>&1 || true
}

launch_own_chrome() {
  "$CHROME" --remote-debugging-port=$CDP_PORT "--user-data-dir=$UDD_WIN" --profile-directory=Default about:blank &
  disown
  for _ in $(seq 1 30); do
    curl -sf --max-time 1 "http://$CDP_HOST/json/version" >/dev/null 2>&1 && return 0
    sleep 0.5
  done
  return 1
}

if [ -z "$CDP_SCRIPT" ]; then
  echo "Skill how-to-chrome no encontrada en ~/.claude/plugins/cache; se omite la lectura con Chrome real esta vez." >&2
  : > "$LISTING_FILE"
else
  if ! curl -sf --max-time 1 "http://$CDP_HOST/json/version" >/dev/null 2>&1; then
    kill_own_chrome  # por si quedó un proceso colgado sin responder en el puerto
    launch_own_chrome || true
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
