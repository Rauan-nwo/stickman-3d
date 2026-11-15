# install.ps1 — установка всего нужного на Windows одной командой:
#   powershell -ExecutionPolicy Bypass -File install.ps1
# Ставит через winget недостающие Node.js, ffmpeg, Python, Chrome, затем запускает tools/bootstrap.mjs.
$ErrorActionPreference = 'Continue'
function Have($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
$need = @()
if (-not (Have node))   { $need += 'OpenJS.NodeJS.LTS' }
if (-not (Have ffmpeg)) { $need += 'Gyan.FFmpeg' }
if (-not (Have python)) { $need += 'Python.Python.3.12' }
if (-not (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') -and -not (Test-Path 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe')) { $need += 'Google.Chrome' }
if ($need.Count -gt 0) {
  if (-not (Have winget)) { Write-Host "Нет winget. Поставь вручную: $($need -join ', ')"; exit 1 }
  foreach ($id in $need) { Write-Host "Ставлю $id…"; winget install --id $id -e --accept-source-agreements --accept-package-agreements }
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
if (-not (Have node)) { Write-Host 'Node.js установлен, но не виден в этом окне. Открой новое окно терминала и запусти install.ps1 ещё раз.'; exit 1 }
node tools/bootstrap.mjs @args
exit $LASTEXITCODE
