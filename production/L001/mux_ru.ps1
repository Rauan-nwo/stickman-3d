# mux_ru.ps1 — русский черновой голос поверх аниматика L001 (видео копируется, без перекодирования).
#   pwsh production/L001/mux_ru.ps1
# Сначала: draft_voice_ru.py -> out/voice_ru.mp3. Перезапускать после каждого рендера аниматика.
$ErrorActionPreference = 'Stop'
$L = $PSScriptRoot
$voice = Join-Path $L 'out/voice_ru.mp3'
$dir = Join-Path $L 'animatic/out'
if (-not (Test-Path $voice)) { throw "нет $voice — сначала запусти draft_voice_ru.py" }
foreach ($p in @(@('animatic_nodebug.mp4', 'animatic_ru.mp4'), @('animatic.mp4', 'animatic_ru_debug.mp4'))) {
  $src = Join-Path $dir $p[0]; $dst = Join-Path $dir $p[1]
  if (-not (Test-Path $src)) { Write-Warning "нет $src, пропуск"; continue }
  ffmpeg -v error -y -i $src -i $voice -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k -shortest $dst
  if ($LASTEXITCODE) { throw "ffmpeg: $dst" }
  $dv = ffprobe -v error -show_entries format=duration -of csv=p=0 $src
  $dd = ffprobe -v error -show_entries format=duration -of csv=p=0 $dst
  Write-Output ("{0}: {1:N3} s (видео {2:N3} s)" -f $p[1], [double]$dd, [double]$dv)
}
