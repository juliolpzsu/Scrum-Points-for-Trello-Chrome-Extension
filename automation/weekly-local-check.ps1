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
Add-Content -Path $logFile -Value "`n=== Ejecución $timestamp ==="

$bashCommand = @"
cd '$repoWsl' && \
git pull --ff-only && \
cat automation/local-check-prompt.txt | claude -p --allowedTools 'WebFetch,Read,Write,Bash(git pull:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git status:*),Bash(sha256sum:*)'
"@

wsl.exe -d Ubuntu -- bash -lc $bashCommand *>> $logFile

Add-Content -Path $logFile -Value "=== Fin ejecución $timestamp (código de salida: $LASTEXITCODE) ==="
