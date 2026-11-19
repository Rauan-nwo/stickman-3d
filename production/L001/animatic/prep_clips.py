# -*- coding: utf-8 -*-
"""prep_clips.py: кадры готовых 3D-сцен (scenes/*/out/*.mp4, только чтение) -> animatic/tmp/clips/<ключ>/cNNNN.jpg (12 к/с,
960x540) и модуль clipframes.js (импорты кадров) — для вклейки настоящих рендеров в аниматик вместо заглушек.
  python production/L001/animatic/prep_clips.py
Какой план берёт какой кусок клипа — CLIP_OF в film.js."""
import os, subprocess, glob
D = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(os.path.dirname(D), 'scenes')
FPS = 12
CLIPS = {'kitchen': 'kitchen/out/kitchen.mp4', 'city_singapore': 'city/out/city_singapore.mp4', 'city_washington': 'city/out/city_washington.mp4',
         'city_taipei': 'city/out/city_taipei.mp4', 'city_final': 'city/out/city_final.mp4', 'desk3d': 'desk3d/out/desk3d.mp4', 'city_sg_out': 'city/out/city_sg_out.mp4',
         'conveyor': '../animatic/tmp/conv/conveyor_dur.mp4',   # перерендер с --set dur=<длина плана>
         'city_towers': 'city/out/city_towers.mp4', 'city_towers_5t': 'city/out/city_towers_5t.mp4', 'city_alaska': 'city/out/city_alaska.mp4', 'dc': 'dc_inspection/out/dc_inspection.mp4', 'hq': 'hq_corridor/out/hq_corridor.mp4',
         'probe': 'dialogue_probe/out/dialogue_probe.mp4'}
lines = ['// сгенерировано prep_clips.py: кадры готовых 3D-сцен, 12 к/с', f'export const CLIP_FPS = {FPS};']
exp = []
for k, rel in CLIPS.items():
    out = os.path.join(D, 'tmp', 'clips', k); os.makedirs(out, exist_ok=True)
    if not glob.glob(os.path.join(out, 'c*.jpg')):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(S, rel), '-vf', f'fps={FPS},scale=960:540', '-q:v', '9', os.path.join(out, 'c%04d.jpg')], check=True)
    fs = sorted(glob.glob(os.path.join(out, 'c*.jpg')))
    for i, f in enumerate(fs): lines.append(f"import {k}_{i} from './tmp/clips/{k}/{os.path.basename(f)}';")
    exp.append(f"  {k}: [{', '.join(f'{k}_{i}' for i in range(len(fs)))}],")
    print(k, len(fs))
lines.append('export default {'); lines += exp; lines.append('};')
open(os.path.join(D, 'clipframes.js'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
