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

$ErrorActionPreference = "Stop"

$repoWindows = "C:\Users\julio\Desktop\scrum-trello\scrum-points-trello"
$repoWsl     = "/mnt/c/Users/julio/Desktop/scrum-trello/scrum-points-trello"
$logFile     = Join-Path $repoWindows "automation\local-run.log"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Encoding utf8 -Value "`n=== Ejecución $timestamp ==="

# La lógica real vive en run-local-check.sh (no aquí embebida) para que el paso
# PowerShell -> wsl.exe no dependa de escapar bien comillas ni saltos de línea.
# Se captura la salida como texto y se escribe en UTF-8 explícito: la redirección
# nativa *>> de PowerShell 5.1 usa UTF-16LE por defecto y deja el log ilegible.
$output = wsl.exe -d Ubuntu -- bash "$repoWsl/automation/run-local-check.sh" 2>&1
$exitCode = $LASTEXITCODE
$output | Out-File -FilePath $logFile -Append -Encoding utf8

Add-Content -Path $logFile -Encoding utf8 -Value "=== Fin ejecución $timestamp (código de salida: $exitCode) ==="
