# Склеивает готовые сцены L001 в один просмотровый ролик out/progress_reel.mp4 (с подписью сцены в углу).
$ErrorActionPreference = 'Stop'
$S = 'C:\dev\projects\youtube-video\production\L001\scenes'
$list = @(
  @('dialogue_probe\out\dialogue_probe.mp4', 'Ресторан: тост, 6 планов'),
  @('city\out\city_singapore.mp4',          '3D: пролёт над Сингапуром'),
  @('city\out\city_washington.mp4',         '3D: пролёт над Вашингтоном'),
  @('desk3d\out\desk3d.mp4',                '3D: вашингтонский стол'),
  @('kitchen\out\kitchen.mp4',              'Кухня (черновая версия, дорабатывается)'),
  @('conveyor\out\conveyor.mp4',            '3D: конвейер STOP'),
  @('city\out\city_taipei.mp4',             '3D: пролёт над Тайбэем'),
  @('box_path_v2\out\box_path_v2.mp4',      'Путь коробки'),
  @('dc_inspection\out\dc_inspection.mp4',  'Проверка дата-центра'),
  @('hq_corridor\out\hq_corridor.mp4',      'Коридор штаб-квартиры'),
  @('templates_demo\out\templates_demo.mp4','Шаблоны')
)
$tmp = Join-Path $S '..\out\reel_tmp'; New-Item -ItemType Directory -Force $tmp | Out-Null
$cat = Join-Path $tmp 'list.txt'; '' | Set-Content $cat
$i = 0
foreach ($e in $list) {
  $src = Join-Path $S $e[0]; if (-not (Test-Path $src)) { Write-Host "нет: $src"; continue }
  $i++; $o = Join-Path $tmp ("{0:d2}.mp4" -f $i)
  $lab = $e[1] -replace ':', '\:'
  ffmpeg -v error -y -i $src -f lavfi -i anullsrc=r=48000:cl=stereo -shortest -vf "scale=1920:1080,fps=30,drawtext=fontfile='C\:/Windows/Fonts/segoeui.ttf':text='$lab':x=24:y=24:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=10" -map 0:v -map 1:a -c:v libx264 -crf 20 -preset veryfast -c:a aac $o
  "file '$o'" | Add-Content $cat
}
ffmpeg -v error -y -f concat -safe 0 -i $cat -c copy (Join-Path $S '..\out\progress_reel.mp4')
Write-Host 'готово'
