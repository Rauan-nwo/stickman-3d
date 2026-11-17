# -*- coding: utf-8 -*-
"""Проверка пролётов на мерцание и скачки: python check.py [shot ...]
- d1: средняя разница соседних кадров (плавное движение -> гладкая кривая; скачок = вспышка/«поп»);
- pop: доля пикселей, у которых |f[t-1] - 2 f[t] + f[t+1]| > 40 (на 480x270) — мерцание окон, всплывающие слои;
  при плавном пролёте близка к нулю (дождь даёт свой фон — сравнивать по форме кривой, а не по абсолюту).
Печатает худшие кадры и проходит/нет по порогам."""
import os, sys, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 480, 270
for shot in (sys.argv[1:] or ['singapore', 'washington', 'taipei', 'final', 'towers', 'towers_5t', 'alaska']):
    mp4 = os.path.join(HERE, 'out', f'city_{shot}.mp4')
    if not os.path.exists(mp4): continue
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', mp4, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
    d1 = np.abs(np.diff(f, axis=0)).mean((1, 2))
    pop = (np.abs(f[:-2] - 2 * f[1:-1] + f[2:]) > 40).mean((1, 2)) * 100
    med = np.median(d1[1:-1]) + 1e-3
    jump = d1 / np.maximum(med, np.convolve(d1, np.ones(5) / 5, 'same'))
    worst = np.argsort(-jump)[:3]
    ok = jump.max() < 2.5          # pop — справочно: движение камеры само даёт вторую разность
    print(f'{shot:11s} кадров {len(f)}  d1 med {med:.2f} max {d1.max():.2f}  скачок max x{jump.max():.2f} (кадры {list(map(int, worst + 1))})  '
          f'pop med {np.median(pop):.3f}% max {pop.max():.3f}% (кадр {int(pop.argmax()) + 1})  -> {"OK" if ok else "ПРОВЕРИТЬ"}')
