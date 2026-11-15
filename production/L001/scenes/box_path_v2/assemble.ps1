# assemble.ps1: рисованная часть v2 (0–13.3 с) + понравившийся хвост полностью 3D-версии ../box_path/ (кадры 392–539,
# т. е. с 13.07 с: темнота у коробки -> крупно серийник -> отъезд в проход дата-центра) без изменений.
# Пересборка целиком:
#   python make_assets.py
#   node engine/tools/build.mjs production/L001/scenes/box_path_v2
#   node engine/tools/render.mjs production/L001/scenes/box_path_v2/out/film.html production/L001/scenes/box_path_v2/out/painted.mp4
#   pwsh production/L001/scenes/box_path_v2/assemble.ps1
$d = $PSScriptRoot
$tail = Join-Path $d '..\box_path\out\box_path.mp4'
ffmpeg -loglevel error -y -i (Join-Path $d 'out\painted.mp4') -i $tail -filter_complex `
  "[1:v]trim=start_frame=392,setpts=PTS-STARTPTS[t];[0:v]setpts=PTS-STARTPTS[p];[p][t]concat=n=2:v=1:a=0,format=yuv420p[v]" `
  -map "[v]" -r 30 -c:v libx264 -crf 16 -preset slow (Join-Path $d 'out\box_path_v2.mp4')
