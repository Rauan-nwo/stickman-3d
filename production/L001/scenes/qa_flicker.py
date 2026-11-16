# -*- coding: utf-8 -*-
"""Тест мерцания для 3D-сцен L001: python qa_flicker.py <video.mp4> [--cuts 6.0,9.5,...]
Кадры уменьшаются до 320x180. Для каждого кадра — средняя яркость и средняя разница с соседями.
Мерцание = «туда-обратно»: кадр n отличается и от n-1, и от n+1 сильнее порога, а n-1 и n+1 похожи между собой
(одиночный выброс), либо яркость кадра скачет на > 4 уровня и возвращается. Склейки (--cuts, в секундах) не считаются.
Печатает таблицу подозрительных кадров и итог PASS/FAIL."""
import subprocess, sys, json
import numpy as np

def frames(path, w=320, h=180):
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-vf', f'scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.uint8).reshape(-1, h, w, 3).astype(np.float32)
    return a

def main():
    path = sys.argv[1]
    cuts = []
    if '--cuts' in sys.argv: cuts = [float(x) for x in sys.argv[sys.argv.index('--cuts') + 1].split(',') if x]
    fps = 30
    a = frames(path); n = len(a)
    Y = (a * [.299, .587, .114]).sum(-1).mean((1, 2))
    d = np.abs(a[1:] - a[:-1]).mean((1, 2, 3))                       # d[i] = |f[i+1]-f[i]|
    cutF = set()
    for c in cuts:
        f = round(c * fps)
        cutF.update(range(f - 2, f + 3))
    bad = []
    for i in range(1, n - 1):
        if i in cutF: continue
        dp, dn = d[i - 1], d[i]
        skip = np.abs(a[i + 1] - a[i - 1]).mean()
        spike = min(dp, dn) > 3.0 and skip < .5 * min(dp, dn)          # одиночный выброс
        lum = abs(Y[i] - Y[i - 1]) > 4 and abs(Y[i + 1] - Y[i]) > 4 and np.sign(Y[i] - Y[i - 1]) != np.sign(Y[i + 1] - Y[i]) and abs(Y[i + 1] - Y[i - 1]) < 2
        if spike or lum: bad.append((i, round(i / fps, 2), round(float(dp), 2), round(float(dn), 2), round(float(skip), 2), round(float(Y[i]), 1)))
    print(f'{path}: {n} frames, mean luma {Y.mean():.1f} (min {Y.min():.1f}, max {Y.max():.1f}), median frame diff {np.median(d):.2f}, max {d.max():.2f} at f{int(d.argmax())+1}')
    for b in bad: print('  suspect frame %d (%.2fs): d_prev %.2f d_next %.2f skip %.2f luma %.1f' % b)
    print('FLICKER:', 'PASS' if not bad else f'FAIL ({len(bad)} frames)')

main()
