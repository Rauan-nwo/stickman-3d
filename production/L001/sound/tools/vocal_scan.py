#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
vocal_scan.py — найти в звуке крики, вопли, плач и прочие «человеческие» не-речевые звуки.

  C:/dev/tools/earshot/.venv/Scripts/python.exe sound/tools/vocal_scan.py FILE... [--win 1.0 --hop 0.5] [--t0 0 --t1 10] [--json out.json]

Два независимых признака в скользящих окнах:
  1. AudioSet (AST, через earshot): вероятности классов Screaming, Shout, Yell, Children shouting, Crying/sobbing,
     Baby cry, Whimper, Wail/moan, Battle cry, Bellow, Groan, Laughter, Giggle, Child speech, Babbling, Whoop, Cheering;
  2. высота тона (librosa pyin): уверенный голос с F0 400–1500 Гц дольше 0.15 с (крик, визг, детский вопль).
Флаг окна: максимум «кричащих» классов ≥ --thr (0.15) или длинный высокий голос при AST ≥ 0.05.
"""
import argparse, json, sys
from pathlib import Path
import numpy as np
import soundfile as sf

SCREAM = ['Screaming', 'Shout', 'Yell', 'Children shouting', 'Crying, sobbing', 'Baby cry, infant cry', 'Whimper', 'Wail, moan',
          'Battle cry', 'Bellow', 'Groan', 'Whoop', 'Children playing', 'Child speech, kid speaking', 'Babbling', 'Laughter', 'Giggle',
          'Baby laughter', 'Screech', 'Squeal']


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('files', nargs='+'); ap.add_argument('--win', type=float, default=1.0); ap.add_argument('--hop', type=float, default=.5)
    ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float, default=None); ap.add_argument('--thr', type=float, default=.15)
    ap.add_argument('--json', default=None); ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    from earshot.models import ast as A
    import librosa
    m = A.get(); idx = [m.index[l] for l in SCREAM if l in m.index]; names = [l for l in SCREAM if l in m.index]
    out = {}
    for f in a.files:
        x, sr = sf.read(f, dtype='float32', always_2d=True); x = x.mean(1)
        i0 = int(a.t0 * sr); i1 = len(x) if a.t1 is None else min(len(x), int(a.t1 * sr)); x = x[i0:i1]
        if len(x) < sr * .3: continue
        x16 = librosa.resample(x, orig_sr=sr, target_sr=16000) if sr != 16000 else x
        W, H = int(a.win * 16000), int(a.hop * 16000)
        starts = list(range(0, max(1, len(x16) - W + 1), H)) or [0]
        segs = [x16[s:s + W] for s in starts]
        P = m.probs(segs, reduce='max')
        f0, vflag, vprob = librosa.pyin(x16, fmin=200, fmax=1600, sr=16000, frame_length=1024, hop_length=160)
        hits = []
        for k, s in enumerate(starts):
            p = P[k][idx]; j = int(np.argmax(p)); fr0, fr1 = s // 160, (s + W) // 160
            v = vflag[fr0:fr1] & (np.nan_to_num(f0[fr0:fr1]) >= 400) & (np.nan_to_num(f0[fr0:fr1]) <= 1500) & (vprob[fr0:fr1] > .5)
            run = 0; best = 0
            for b in v: run = run + 1 if b else 0; best = max(best, run)
            hi_voice = best * .01
            flag = p[j] >= a.thr or (hi_voice >= .15 and p[j] >= .05)
            if flag: hits.append({'t': round(a.t0 + s / 16000, 2), 'label': names[j], 'p': round(float(p[j]), 3), 'high_voice_s': round(hi_voice, 2),
                                  'f0_med': round(float(np.nanmedian(np.where(v, f0[fr0:fr1], np.nan))), 0) if v.any() else None})
        out[f] = hits
        if not a.quiet or hits: print(f'{Path(f).name}: {len(hits)} окон' + ''.join(f"\n   {h['t']:7.2f} с  {h['label']} {h['p']}  высокий голос {h['high_voice_s']} с F0 {h['f0_med']}" for h in hits[:12]), flush=True)
    if a.json: json.dump(out, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
