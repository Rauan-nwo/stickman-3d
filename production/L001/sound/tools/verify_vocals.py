#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_vocals.py — нет ли в начале микса не-речевых голосов (крик, вопль, плач, визг, «мяу», сирена) кроме нашего голоса.

  C:/dev/tools/earshot/.venv/Scripts/python.exe sound/tools/verify_vocals.py sound/out/ch0_1 [--t1 10] [--hop .25] [--rest-only] [--json out.json]

Слушает AudioSet (AST) окнами 1 с с шагом 0.25 с: микс и сумму «всё, кроме голоса» (музыка + эффекты + подложка).
Прохождение: в обоих по каждому окну human < 0.10, animal < 0.10, siren < 0.10 (речь нашего диктора — класс Speech, не в счёт);
смех (гул зала) — только в отчёте.
"""
import argparse, json, sys
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from library_scan import GROUPS  # noqa: E402


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('--t1', type=float, default=10.0); ap.add_argument('--json', default=None)
    ap.add_argument('--thr', type=float, default=.10); ap.add_argument('--hop', type=float, default=.25)
    ap.add_argument('--rest-only', action='store_true', help='только сумма без голоса (для целой главы)')
    a = ap.parse_args()
    import librosa
    from earshot.models import ast as A
    m = A.get(); d = Path(a.dir); res = {}
    rd = lambda k: sf.read(str(d / f'{k}.wav'), dtype='float32', always_2d=True)
    mix, sr = rd('mix'); rest = sum(rd(k)[0] for k in ('music', 'sfx', 'amb'))
    for name, x in ((() if a.rest_only else (('mix', mix),)) + (('без голоса', rest),)):
        x16 = librosa.resample(x.mean(1)[:int(a.t1 * sr)], orig_sr=sr, target_sr=16000)
        hop = a.hop if len(x16) <= 120 * 16000 else max(a.hop, 1.0)   # длинная глава — окна 1 с встык (каждая секунда, вдвое дешевле)
        st = list(range(0, len(x16) - 16000 + 1, int(hop * 16000))); P = m.probs([x16[s:s + 16000] for s in st], reduce='max')
        rows = []
        for k, s in enumerate(st):
            g = {}
            for grp in ('human', 'animal', 'siren', 'laugh'):
                ii = [m.index[l] for l in GROUPS[grp] if l in m.index]; j = int(np.argmax(P[k][ii])); g[grp] = (GROUPS[grp][j] if GROUPS[grp][j] in m.index else '?', round(float(P[k][ii][j]), 3))
            top = [(m.labels[i], round(float(P[k][i]), 2)) for i in np.argsort(-P[k])[:3]]
            rows.append({'t': round(s / 16000, 2), **{k2: v for k2, v in g.items()}, 'top': top})
        worst = {grp: max(rows, key=lambda r: r[grp][1]) for grp in ('human', 'animal', 'siren', 'laugh')}
        ok = all(worst[g][g][1] < a.thr for g in worst if g != 'laugh')   # смех зала — только отчёт
        res[name] = {'ok': ok, 'worst': {g: {'t': worst[g]['t'], 'label': worst[g][g][0], 'p': worst[g][g][1]} for g in worst}, 'windows': rows}
        print(f"{name}: {'ЧИСТО' if ok else 'ЕСТЬ'} — " + '; '.join(f"{g} max {worst[g][g][1]} ({worst[g][g][0]} @{worst[g]['t']} с)" for g in worst))
    if a.json: json.dump(res, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
