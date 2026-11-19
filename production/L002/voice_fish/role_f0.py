# -*- coding: utf-8 -*-
"""role_f0.py — медианная высота голоса (f0, YIN) каждой роли по её репликам в готовой дорожке (дубли из fish_takes_en.json).

  python production/L002/voice_fish/role_f0.py        # печать + запись f0_track_hz в cast.json

Контроль пола и возраста по рисунку: мужские ≈ 85–165 Гц, женские ≈ 165–300 Гц (в эмоциональных репликах выше).
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fish_voice as F
from cast_probe import yin_f0

if __name__ == '__main__':
    rows = F.load('en'); takes = F.load_takes('en'); per = {}
    for r in rows:
        tk = takes.get(str(r['line']))
        if not tk: continue
        f = yin_f0(F.trimmed(tk['path']) if not tk.get('scene_mp3') else tk['path'])
        if f: per.setdefault(r['speaker'], []).append(f)
    cp = os.path.join(F.D, 'cast.json'); cast = json.load(open(cp, encoding='utf-8'))
    for sp, v in sorted(per.items(), key=lambda x: -len(x[1])):
        med = int(round(float(np.median(v))))
        cast[sp]['f0_track_hz'] = med
        print(f'{sp:14s} {cast[sp]["name"][:28]:28s} lines {len(v):3d}  f0 median {med:3d} Hz  (min {min(v)}, max {max(v)})')
    json.dump(cast, open(cp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
