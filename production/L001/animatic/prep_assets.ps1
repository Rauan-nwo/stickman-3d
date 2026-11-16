# prep_assets.ps1: лёгкие JPG-копии плейтов (1920x1080) и кадры пути коробки (15 к/с, 960x540) в tmp/ — для сборки аниматика.
# Исходники не трогаем. tmp/ в .gitignore.
$ErrorActionPreference = 'Stop'
$d = $PSScriptRoot; $L = Split-Path $d; $root = Split-Path (Split-Path $L)
$tmp = Join-Path $d 'tmp'; New-Item -ItemType Directory -Force $tmp, (Join-Path $tmp 'box') | Out-Null
$plates = @{}
Get-ChildItem (Join-Path $L 'assets') -Filter 'bg_*.png' | ForEach-Object { $plates[$_.BaseName] = $_.FullName }
$plates['restaurant'] = Join-Path $root 'production/longform/style-test/assets/plate_v2.png'
$plates['restaurant_reverse'] = Join-Path $L 'scenes/dialogue_probe/assets/plate_reverse.png'
$plates['host_office'] = Join-Path $root 'production/longform/style-test/bg_host_office.png'
foreach ($k in $plates.Keys) {
  $o = Join-Path $tmp "$k.jpg"
  if (-not (Test-Path $o)) { ffmpeg -v error -y -i $plates[$k] -vf 'scale=1920:1080:flags=lanczos' -q:v 3 $o }
}
$box = Join-Path $L 'scenes/box_path_v2/out/box_path_v2.mp4'
if (-not (Test-Path (Join-Path $tmp 'box/b0001.jpg'))) { ffmpeg -v error -y -i $box -vf 'fps=15,scale=960:540' -q:v 4 (Join-Path $tmp 'box/b%04d.jpg') }
# модуль с импортами кадров коробки
$n = (Get-ChildItem (Join-Path $tmp 'box') -Filter 'b*.jpg').Count
$js = "// сгенерировано prep_assets.ps1: кадры box_path_v2.mp4, 15 к/с`n" + ((1..$n | ForEach-Object { "import b$_ from './tmp/box/b{0:D4}.jpg';" -f $_ }) -join "`n") + "`nexport default [" + ((1..$n | ForEach-Object { "b$_" }) -join ',') + "];`n"
Set-Content (Join-Path $d 'boxframes.js') $js -NoNewline
"plates: $($plates.Count), box frames: $n"
