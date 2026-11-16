# assemble.ps1: рисованная часть v2 (0–13.3 с) + свой 3D-хвост tail/ (4.6 с: темнота -> крупно наклейка SERIAL под фонариком
# -> отъезд в проход дата-центра, лампы загораются рядами). Раньше хвост брали кадрами 392–539 из ../box_path/out/box_path.mp4.
# Пересборка целиком:
#   python make_assets.py
#   node engine/tools/build.mjs production/L001/scenes/box_path_v2
#   node engine/tools/render.mjs production/L001/scenes/box_path_v2/out/film.html production/L001/scenes/box_path_v2/out/painted.mp4
#   node engine/tools/build.mjs production/L001/scenes/box_path_v2/tail
#   node engine/tools/render.mjs production/L001/scenes/box_path_v2/tail/out/film.html production/L001/scenes/box_path_v2/tail/out/tail.mp4
#   pwsh production/L001/scenes/box_path_v2/assemble.ps1
$d = $PSScriptRoot
$tail = Join-Path $d 'tail\out\tail.mp4'
ffmpeg -loglevel error -y -i (Join-Path $d 'out\painted.mp4') -i $tail -filter_complex `
  "[1:v]setpts=PTS-STARTPTS[t];[0:v]setpts=PTS-STARTPTS[p];[p][t]concat=n=2:v=1:a=0,format=yuv420p[v]" `
  -map "[v]" -r 30 -c:v libx264 -crf 16 -preset slow (Join-Path $d 'out\box_path_v2.mp4')
