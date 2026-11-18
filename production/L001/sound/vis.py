#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
vis.py <video.mp4> <out.json> [--t0 0] — покадровые признаки картинки для сверки звука с событиями.

Для каждого кадра (30 к/с, 320×180, яркость): mad — средняя абсолютная разница с предыдущим кадром (0..255),
luma — средняя яркость, red — доля «красных» пикселей (штампы, бирки), zoom — оценка масштабирования кадра
относительно предыдущего (по центральной части: какой из масштабов 0.94…1.06 даёт наименьшую разницу).
Нужен ffmpeg и numpy. Время кадра f = t0 + f/30 (секунды фильма).
"""
import json, subprocess, sys, argparse
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('out'); ap.add_argument('--t0', type=float, default=0.0)
a = ap.parse_args()
W, H = 320, 180
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.video, '-vf', f'fps=30,scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
                     capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32)
Y = fr @ np.array([.299, .587, .114], np.float32)
red = ((fr[..., 0] > 150) & (fr[..., 1] < 90) & (fr[..., 2] < 90)).mean(axis=(1, 2))
mad = np.r_[0, np.abs(np.diff(Y, axis=0)).mean(axis=(1, 2))]

def zoom_of(p, c):
    """масштаб c относительно p по центру кадра (1 — нет зума)"""
    best, bz = 1e9, 1.0
    cy, cx, h, w = H // 2, W // 2, H // 3, W // 3
    ref = c[cy - h // 2:cy + h // 2, cx - w // 2:cx + w // 2]
    for z in (0.94, 0.96, 0.98, 1.0, 1.02, 1.04, 1.06, 1.08, 1.1, 1.13):
        hh, ww = int(h / z), int(w / z)
        if hh // 2 * 2 >= H or ww // 2 * 2 >= W: continue
        crop = p[cy - hh // 2:cy + hh // 2, cx - ww // 2:cx + ww // 2]
        yi = (np.arange(ref.shape[0]) * crop.shape[0] / ref.shape[0]).astype(int)
        xi = (np.arange(ref.shape[1]) * crop.shape[1] / ref.shape[1]).astype(int)
        e = np.abs(crop[yi][:, xi] - ref).mean()
        if e < best: best, bz = e, z
    return bz

zoom = [1.0] + [zoom_of(Y[i - 1], Y[i]) for i in range(1, len(Y))]
out = {'video': a.video, 't0': a.t0, 'fps': 30, 'n': int(len(Y)),
       'mad': [round(float(x), 2) for x in mad], 'luma': [round(float(x), 1) for x in Y.mean(axis=(1, 2))],
       'red': [round(float(x), 4) for x in red], 'zoom': zoom}
json.dump(out, open(a.out, 'w'), separators=(',', ':'))
print(f'{len(Y)} frames -> {a.out}')
