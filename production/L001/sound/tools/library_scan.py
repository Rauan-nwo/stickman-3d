#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
library_scan.py — проверить каждый звук библиотеки на крики, вопли, плач, визг, «мяуканье», сирены и смех (AudioSet, AST).

  C:/dev/tools/earshot/.venv/Scripts/python.exe sound/tools/library_scan.py [--out sound/lib/vocal_scan.json] [--synth]

Скан (вход 48 кГц): короткий звук — одним окном целиком, подложка (> 6 с) — окнами 5 с встык; максимум по группам классов:
  human  — Screaming, Shout, Yell, Children shouting, Crying/sobbing, Baby cry, Whimper, Wail/moan, Groan, Battle cry, Bellow, Whoop;
  animal — Meow, Caterwaul, Howl, Squeal, Bark, Yip, Whimper (dog), Cat, Owl, Bleat, Sheep, Goat;
  siren  — Siren, Police car, Ambulance, Fire engine, Emergency vehicle, Civil defense siren;
  laugh  — Laughter, Baby laughter, Giggle, Belly laugh, Chuckle, Snicker.
Убрать (verdict remove): human ≥ 0.15 или animal ≥ 0.15 или siren ≥ 0.20 (в подложках интерьера — ≥ 0.12); смех — только отчёт.
--synth: заодно отрендерить и проверить каждый класс синтеза (synth.py, 2 варианта) и составные слои.
"""
import argparse, json, sys
from pathlib import Path
import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
GROUPS = {
    'human': ['Screaming', 'Shout', 'Yell', 'Children shouting', 'Crying, sobbing', 'Baby cry, infant cry', 'Whimper', 'Wail, moan', 'Groan', 'Battle cry', 'Bellow', 'Whoop'],
    'animal': ['Meow', 'Caterwaul', 'Howl', 'Squeal', 'Bark', 'Yip', 'Whimper (dog)', 'Cat', 'Owl', 'Bleat', 'Sheep', 'Goat'],
    'siren': ['Siren', 'Police car (siren)', 'Ambulance (siren)', 'Fire engine, fire truck (siren)', 'Emergency vehicle', 'Civil defense siren'],
    'laugh': ['Laughter', 'Baby laughter', 'Giggle', 'Belly laugh', 'Chuckle, chortle', 'Snicker'],
}
INTERIOR = ('restaurant', 'cutlery', 'office', 'clock', 'drip', 'bar', 'diner', 'dishpit', 'hall', 'hvac', 'newsroom', 'trading', 'servers', 'warehouse', 'fluor')


def scan(m, x, sr, win=1.0, hop=.5):
    """x — моно с частотой sr. earshot AST.probs ждёт 48 кГц и сам переводит в 16 кГц (до 2026-11-18 сюда шли 16 кГц —
    классификатор слышал всё в 3 раза выше и быстрее; все оценки до исправления недействительны)."""
    import librosa
    x48 = librosa.resample(x, orig_sr=sr, target_sr=48000) if sr != 48000 else x
    W, H = int(win * 48000), int(hop * 48000)
    if len(x48) < W: x48 = np.r_[x48, np.zeros(W - len(x48), np.float32)]
    starts = list(range(0, len(x48) - W + 1, H)); P = m.probs([x48[s:s + W] for s in starts], reduce='max')
    res = {}
    for g, labs in GROUPS.items():
        ii = [m.index[l] for l in labs if l in m.index]; sub = P[:, ii]; k = np.unravel_index(int(np.argmax(sub)), sub.shape)
        res[g] = {'p': round(float(sub[k]), 3), 'label': [l for l in labs if l in m.index][k[1]], 't': round(starts[k[0]] / 48000, 2)}
    return res


def verdict(name, r):
    sir = .12 if any(w in name for w in INTERIOR) else .20
    why = [f"{g} {r[g]['label']} {r[g]['p']} @{r[g]['t']}s" for g, thr in (('human', .15), ('animal', .15), ('siren', sir)) if r[g]['p'] >= thr]
    return ('remove' if why else 'ok'), why


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=str(HERE / 'lib' / 'vocal_scan.json')); ap.add_argument('--synth', action='store_true')
    ap.add_argument('--only', default=None, help='подстрока пути')
    a = ap.parse_args()
    from earshot.models import ast as A
    m = A.get(); out = {}
    files = sorted((HERE / 'lib' / 'rec').rglob('*.wav')) + sorted((HERE / 'lib' / 'cand').rglob('*.wav'))
    if a.only: files = [f for f in files if a.only in str(f)]
    for f in files:
        x, sr = sf.read(str(f), dtype='float32', always_2d=True); long_ = len(x) > 6 * sr
        dur = len(x) / sr   # короткий звук — одним окном целиком (AudioSet размечен клипами по 10 с), подложка — окна 5 с встык
        r = scan(m, x.mean(1), sr, *((5.0, 5.0) if long_ else (max(dur, .5), max(dur, .5)))); v, why = verdict(f.stem, r)
        out[str(f.relative_to(HERE)).replace('\\', '/')] = {'verdict': v, 'why': why, **r}
        if v != 'ok' or r['laugh']['p'] >= .2: print(f'{v:6s} {f.relative_to(HERE)}  {"; ".join(why)}  (смех {r["laugh"]["p"]})', flush=True)
    if a.synth:
        import synth
        for k in synth.GEN:
            for seed in (1, 2):
                try: y = synth.make(k, seed, 1.2)
                except Exception: continue
                y = np.asarray(y, np.float32); r = scan(m, y, synth.SR, max(len(y) / synth.SR, .5), 99); v, why = verdict(k, r); out[f'synth:{k}:{seed}'] = {'verdict': v, 'why': why, **r}
                if v != 'ok': print(f'{v:6s} synth:{k}:{seed}  {"; ".join(why)}', flush=True)
    json.dump(out, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    bad = [k for k, v in out.items() if v['verdict'] == 'remove']
    print(f'проверено {len(out)}, убрать {len(bad)}')


if __name__ == '__main__':
    main()
