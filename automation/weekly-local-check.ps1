# Chequeo semanal local de reseñas de "Scrum Points for Trello" en la Chrome Web Store.
#
# Por qué existe este script: la rutina programada que corre en la nube cada lunes NO puede
# acceder a chromewebstore.google.com (el sandbox cloud bloquea ese dominio por política de
# red). Este PC sí tiene acceso normal a internet, así que este script hace esa parte y deja
# los datos en el repo (carpeta automation/) para que la rutina en la nube los recoja horas
# después y actúe sobre ellos (arreglos de código, PRs, informe semanal por email).
#
# Lo ejecuta el Programador de tareas de Windows cada lunes. También se puede lanzar a mano
# haciendo doble clic o desde PowerShell, por ejemplo para probarlo.
#
# 2026-08-18: este PC dejó de tener WSL/Ubuntu instalado (migración a shell nativo de
# Windows), así que este script ya no delega en `wsl.exe -d Ubuntu`. La lógica real sigue
# viviendo en run-local-check.sh sin cambios: se invoca directamente con Git Bash (viene
# con Git for Windows, que ya estaba instalado) en vez de con bash de una distro Linux.

$ErrorActionPreference = "Stop"

$repoWindows = "C:\Users\julio\Desktop\scrum-trello\scrum-points-trello"
$gitBash     = "C:\Program Files\Git\bin\bash.exe"
$logFile     = Join-Path $repoWindows "automation\local-run.log"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Encoding utf8 -Value "`n=== Ejecución $timestamp ==="

# La lógica real vive en run-local-check.sh (no aquí embebida) para no depender de escapar
# bien comillas ni saltos de línea al pasar por PowerShell. Se captura la salida como texto
# y se escribe en UTF-8 explícito: la redirección nativa *>> de PowerShell 5.1 usa UTF-16LE
# por defecto y deja el log ilegible.
$scriptPath = (Join-Path $repoWindows "automation\run-local-check.sh") -replace '\\', '/'

# git escribe líneas normales de progreso (p.ej. "From https://github.com/...") en stderr.
# Con $ErrorActionPreference = "Stop", PowerShell convierte cada línea de stderr de un
# comando nativo en un error terminante y corta el script ahí mismo, aunque el comando en
# sí acabe bien. Se baja a "Continue" solo para esta llamada para poder capturar stderr
# como texto normal sin que aborte la ejecución.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$output = & $gitBash $scriptPath 2>&1 | ForEach-Object { $_.ToString() }
$exitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEAP
$output | Out-File -FilePath $logFile -Append -Encoding utf8

Add-Content -Path $logFile -Encoding utf8 -Value "=== Fin ejecución $timestamp (código de salida: $exitCode) ==="
