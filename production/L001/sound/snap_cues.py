#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
snap_cues.py — подогнать приблизительные звуки листа к событиям настоящей картинки главы.

  python sound/snap_cues.py <cues.json> <vis.json> <out_cues.json> [--t0 X --t1 Y]

Двигаются только звуки без точного времени: фоли по словам события, поставленные в «слот» (approx: true в листе — у
события в шотлисте нет слова «на «…»», core.js ставит его на 42 %/78 % плана), и толчки камеры без вещи. Для каждого ищется
начало всплеска покадровой разницы (vis.py) в окне −0.4…+0.6 с; нашёлся уверенный — звук переезжает на этот кадр (vt и t).
Точные звуки (склейки, рывки, штампы, бирки, шаблоны, ручная постановка) не трогаются. Таблица сдвигов — в <out>.md.
"""
import argparse, json
from pathlib import Path
import numpy as np


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('cues'); ap.add_argument('vis'); ap.add_argument('out')
    ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float, default=1e9)
    a = ap.parse_args()
    C = json.load(open(a.cues, encoding='utf-8')); V = json.load(open(a.vis))
    mad = np.array(V['mad']); F0 = round(V['t0'] * 30); taken = set(); moves = []
    for c in C['cues']:
        if not (a.t0 <= c['t'] < a.t1): continue
        if not (c.get('approx') or c['snd'] == 'hit.event'): continue
        f = round(c.get('vt', c['t']) * 30) - F0; lo, hi = max(12, f - 12), min(len(mad) - 1, f + 18)
        best = None
        for k in range(lo, hi + 1):
            base = float(np.median(mad[k - 12:k - 1])); thr = max(3 * base, base + 3)
            if mad[k] > thr and mad[k - 1] <= thr and k not in taken:
                sc = (mad[k] - base) / max(base, .5) - .05 * abs(k - f)
                if best is None or sc > best[0]: best = (sc, k)
        if best and best[0] > 2:
            k = best[1]; taken.add(k); nt = (k + F0) / 30; d = nt - c.get('vt', c['t'])
            moves.append((c['id'], c['shot'], c['snd'], round(c['t'], 3), round(c['t'] + d, 3), round(d, 3), c.get('what', '')[:60]))
            c['t'] = round(c['t'] + d, 4); c['vt'] = round(nt, 4); c['frame'] = round(c['t'] * 30); c['snapped'] = round(d, 3); c['vis'] = 'motion'
    json.dump(C, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
    md = ['# Приблизительные звуки, подогнанные к картинке', '', f'Окно {a.t0:.2f}–{a.t1:.2f} с; передвинуто {len(moves)}.', '',
          '| id | план | звук | было, с | стало, с | сдвиг, с | что |', '|---|---|---|---|---|---|---|'] + [f'| {m[0]} | {m[1]} | {m[2]} | {m[3]} | {m[4]} | {m[5]:+.3f} | {m[6]} |' for m in moves]
    Path(a.out).with_suffix('.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'snap: {len(moves)} звуков подогнано к картинке')


if __name__ == '__main__':
    main()
