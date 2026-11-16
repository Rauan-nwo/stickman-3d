# -*- coding: utf-8 -*-
"""Сверка с рисованными фонами: кадр пролёта (полный размер) рядом с соответствующим фоном GPT.
Запуск после рендера: python compare.py  ->  out/compare_<shot>.jpg (сверху кадр, снизу фон, 1920 px по ширине)."""
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, '..', '..', 'assets')
PAIRS = {  # кадр (с) -> фон
    'singapore': [('1.0', 'bg_singapore_street.png'), ('end', 'bg_singapore_street.png')],
    'washington': [('0.8', 'bg_washington_cold.png'), ('end', 'bg_washington_cold.png')],
    'taipei': [('0.8', 'bg_taipei_bar_dry.png'), ('end', 'bg_event_hall.png')],
    'final': [('0.4', 'bg_newsroom.png'), ('end', 'bg_newsroom.png')],
}
for shot, pairs in PAIRS.items():
    mp4 = os.path.join(HERE, 'out', f'city_{shot}.mp4')
    if not os.path.exists(mp4): continue
    ins, flt = [], []
    for i, (t, bg) in enumerate(pairs):
        ins += (['-sseof', '-0.05'] if t == 'end' else ['-ss', t]) + ['-i', mp4]
        ins += ['-i', os.path.join(A, bg)]
        flt.append(f'[{2*i}:v]scale=1920:1080,setsar=1[f{i}];[{2*i+1}:v]scale=1920:1080,setsar=1[b{i}];[f{i}][b{i}]hstack[r{i}]')
    flt.append(''.join(f'[r{i}]' for i in range(len(pairs))) + f'vstack={len(pairs)}[o]')
    out = os.path.join(HERE, 'out', f'compare_{shot}.jpg')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *ins, '-filter_complex', ';'.join(flt), '-map', '[o]', '-frames:v', '1', '-q:v', '3', out], check=True)
    print(out)
