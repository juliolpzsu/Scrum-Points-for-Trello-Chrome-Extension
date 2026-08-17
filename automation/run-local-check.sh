#!/bin/bash
# Invocado por automation/weekly-local-check.ps1 (Programador de tareas de Windows) o a mano
# para probar. Vive como archivo aparte (en vez de una línea de comando embebida en el .ps1)
# para que el paso a través de PowerShell -> wsl.exe no dependa de escapar comillas ni saltos
# de línea correctamente.
set -euo pipefail
cd "$(dirname "$0")/.."

# Invocado por el Programador de tareas via `wsl.exe -- bash script.sh`: shell no
# interactivo y no de login, así que no carga ~/.bashrc y el PATH no incluye
# ~/.local/bin, donde vive el binario `claude`. Sin esta línea el script fallaba
# con "claude: command not found" y el Programador de tareas lo marcaba como error.
export PATH="$HOME/.local/bin:$PATH"

git pull --ff-only

# --dangerously-skip-permissions: sin esto, al ejecutarse desde el Programador de tareas
# de Windows (sin sesión interactiva) Claude Code deniega el permiso de escritura aunque
# esté en --allowedTools, probablemente por no encontrar la sesión/credenciales igual que
# en un terminal normal. Es seguro aquí porque el prompt (local-check-prompt.txt) está muy
# acotado: solo toca automation/reviews-state.json y automation/store-stats.json, y solo
# hace `git pull`/`add`/`commit`/`push` sobre este repo.
cat automation/local-check-prompt.txt | claude -p \
  --allowedTools "WebFetch,Read,Write,Bash(git pull:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git status:*),Bash(sha256sum:*)" \
  --dangerously-skip-permissions
