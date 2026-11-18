# -*- coding: utf-8 -*-
"""film_energy.py — индекс энергии готовых глав финального фильма (film/out/ch*.mp4) против конкурента по тем же главам.

  python production/L001/dynamics/tools/film_energy.py <scratch dir с comp.npz/final.json> [ch0_1 ch4_6 ...]

Для каждой главы: analyze.py по видео (кэш <name>.npz в scratch), склейки — из animatic/timing.json по кадрам F0..F1 из
film/out/<name>.frames.json, дальше тот же расчёт, что final.py (рывки + появления + вспышки, скорость камеры), нормировка — по
среднему конкурента. Печатает индекс по главам рядом с конкурентом (те же сюжетные отрезки, что energy_ch.py)."""
import json, os, subprocess, sys
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')
T = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(os.path.dirname(T)); SCR = sys.argv[1]
sys.path.insert(0, T)
OUTD = os.environ.get('FILM_OUT') or os.path.join(L, 'film', 'out')   # FILM_OUT — другая папка с <имя>.mp4 + <имя>.frames.json (пробные рендеры)
D = SCR
names = sys.argv[2:] or sorted(f[:-12] for f in os.listdir(OUTD) if f.endswith('.frames.json'))
TM = json.load(open(os.path.join(L, 'animatic', 'timing.json'), encoding='utf-8'))
F = json.load(open(os.path.join(D, 'final.json'), encoding='utf-8')); C = F['res']['comp']
cc, ce, cm = np.array(C['cutsec']) * 60, np.array(C['evsec']) * 60, np.array(C['camsec']); norm = (cc.mean(), ce.mean(), cm.mean())
E = lambda c, e, m: (c / norm[0] + e / norm[1] + m / norm[2]) / 3
EC = E(cc, ce, cm)
comp_b = [0, 37.2, 53, 268, 364, 435, 549, 724, 954, 1037, 1181, len(EC)]
import importlib.util
spec = importlib.util.spec_from_file_location('final_mod', os.path.join(T, 'final.py'))
src = open(os.path.join(T, 'final.py'), encoding='utf-8').read(); src = src[:src.index('res = {}')]        # только функции анализа
mod = {}; exec(compile(src.replace("D = r'", "D_ = r'"), 'final_fn', 'exec'), mod)
for name in names:
    fr = json.load(open(os.path.join(OUTD, name + '.frames.json'), encoding='utf-8'))
    vid = os.path.join(OUTD, name + '.mp4'); npz = os.path.join(D, f'film_{name}.npz')
    if not os.path.exists(npz) or os.path.getmtime(npz) < os.path.getmtime(vid):
        subprocess.run([sys.executable, os.path.join(T, 'analyze.py'), vid, npz], check=True, capture_output=True)
    F0, F1 = fr['F0'], fr['F1']
    shots = [s for s in TM['shots'] if round(s['start'] * 30) < F1 and round(s['end'] * 30) > F0]
    sj = os.path.join(D, f'film_{name}_shots.json')
    json.dump({'shots': [{'start': max(0, s['start'] - F0 / 30), 'n': s['n'], 'ch': s['ch'], 'framing': s['framing']} for s in shots], 'trans': []}, open(sj, 'w', encoding='utf-8'))
    R = mod['analyse'](npz, sj)
    ac, ae, am = np.array(R['cutsec']) * 60, np.array(R['evsec']) * 60, np.array(R['camsec']); EA = E(ac, ae, am)
    for ch in sorted({s['ch'] for s in shots}):
        cs = [s for s in shots if s['ch'] == ch]; a = int(max(0, cs[0]['start'] - F0 / 30)); b = int(min(len(EA), cs[-1]['end'] - F0 / 30))
        if b - a < 3: continue
        c0, c1 = int(comp_b[ch]), int(comp_b[ch + 1])
        print(f"{name} гл. {ch:2d}: фильм {EA[a:b].mean():.2f} (склейки {ac[a:b].mean():4.1f}/мин, события {ae[a:b].mean():4.1f}/мин, камера {am[a:b].mean():4.1f} %/с)"
              f" | конкурент {EC[c0:c1].mean():.2f}  {'OK' if EA[a:b].mean() >= EC[c0:c1].mean() else 'ниже'}  [{b - a} с]")
