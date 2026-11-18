#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
music_plan.py — монтаж музыки по тактам под главы и точки попадания -> sound/music_plan.json (читает render.py).

  python sound/music_plan.py [--spec sound/music_spec.json] [--grid]     (питон: C:/dev/tools/sound-venv)

music_spec.json — что звучит где (секунды фильма считаются из cues.json: начала глав и метки, правки не нужны после перетайминга):
  {"cues": [
     {"id": "ch0", "file": "music/candidates/x.mp3", "from": "film:0", "to": "chapter:1",
      "hit": {"film": "chapter:1", "src": 64.0},       # сильная доля источника (с), которая должна попасть в точку фильма
      "src_in": 32.0,                                   # откуда брать (снапится к началу такта)
      "loop": [32.0, 64.0],                             # петля по тактам, если отрезок фильма длиннее источника
      "fade_in": 0.5, "fade_out": "bar", "gain_db": 0}
   ],
   "holds": [{"at": "video_title", "pre": 0.4, "post": 2.5, "db": -4}]}   # участки, где музыку не прижимает голос (стинги)
Точки: "film:<с>", "chapter:<n>" (начало главы n), "video_title" (название ролика), "mark:<kind>".
Сетка тактов: librosa beat_track + оценка сильной доли по 4/4 (энергия низа на долях); --grid печатает сетку всех файлов спеки.
"""
import argparse, json
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent


def grid(path, bpb=4):
    an = HERE / 'music' / 'analysis' / (Path(path).stem + '.json')   # готовый анализ (сетка, такты) — music/analysis/<id>.json
    if an.exists():
        A = json.load(open(an, encoding='utf-8'))
        if A.get('downbeats_s'):
            return {'bpm': A.get('tempo_bpm'), 'downbeats': A['downbeats_s'], 'bar': A.get('bar_s'), 'duration': A.get('duration_s'), 'from': 'analysis'}
    import librosa
    y, sr = librosa.load(str(path), sr=22050, mono=True)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time', trim=False)
    tempo = float(np.atleast_1d(tempo)[0])
    if len(beats) < 8: return {'bpm': tempo, 'beats': beats.tolist(), 'downbeats': beats[::bpb].tolist(), 'bar': 60 / max(tempo, 1) * bpb}
    # сильная доля: из 4 фаз берём ту, где больше энергии низа (бас/бочка) на долях
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512)); f = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = S[f < 200].sum(axis=0); tt = librosa.frames_to_time(np.arange(len(low)), sr=sr, hop_length=512)
    eb = np.interp(beats, tt, low)
    ph = int(np.argmax([eb[k::bpb].mean() for k in range(bpb)]))
    db = beats[ph::bpb]
    return {'bpm': round(tempo, 2), 'beats': [round(float(b), 3) for b in beats], 'downbeats': [round(float(b), 3) for b in db],
            'bar': round(float(np.median(np.diff(db))), 4) if len(db) > 2 else 60 / tempo * bpb, 'duration': round(len(y) / sr, 2)}


def snap(t, downs):
    d = np.asarray(downs); return float(d[np.argmin(np.abs(d - t))]) if len(d) else t


def resolve(p, C):
    if isinstance(p, (int, float)): return float(p)
    import re
    m = re.match(r'^(.*?:?\w*?)([+-]\d+(?:\.\d+)?)$', p) if not p.startswith('film:') else None   # «video_title-0.3», «chapter:1+0.5»
    if m and m.group(1): return resolve(m.group(1), C) + float(m.group(2))
    k, _, v = p.partition(':')
    if k == 'film': return float(v)
    if k == 'chapter': return float(next(c['start'] for c in C['chapters'] if c['ch'] == int(v)))
    if k == 'lastword':   # конец последнего слова главы (animatic/words.json)
        ch = next(c for c in C['chapters'] if c['ch'] == int(v)); W = json.load(open(HERE.parent / 'animatic/words.json', encoding='utf-8'))['words']
        return float(max(w['e'] for w in W if ch['start'] <= w['s'] < ch['end']))
    if p == 'video_title': return float(next(m['t'] for m in C['marks'] if m['kind'] == 'video_title'))
    if k == 'mark': return float(next(m['t'] for m in C['marks'] if m['kind'] == v))
    if p == 'end': return float(C['total'])
    raise ValueError(p)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--spec', default=str(HERE / 'music_spec.json')); ap.add_argument('--grid', action='store_true')
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding='utf-8')); C = json.load(open(HERE / 'cues.json', encoding='utf-8'))
    gcache, segs = {}, []
    for c in spec['cues']:
        f = c['file']
        if f not in gcache: gcache[f] = grid(HERE / f)
        G = gcache[f]; downs = G['downbeats']
        t_in, t_out = resolve(c['from'], C), resolve(c['to'], C)
        src_in = snap(c.get('src_in', downs[0] if downs else 0), downs)
        if c.get('hit'):   # точка попадания: сильная доля src попадает в кадр film -> откуда начать источник
            hf, hs = resolve(c['hit']['film'], C), (snap(c['hit']['src'], downs) if c['hit'].get('snap', True) else float(c['hit']['src']))
            src_in = hs - (hf - t_in)
            if src_in < 0: t_in -= src_in; src_in = 0.0
        L = t_out - t_in
        seg = {'id': c['id'], 'file': f, 'film_in': round(t_in, 4), 'film_out': round(t_out, 4), 'src_in': round(src_in, 4),
               'src_out': round(src_in + L, 4), 'fade_in': c.get('fade_in', .05), 'gain_db': c.get('gain_db', 0), 'bpm': G['bpm'], 'bar': G['bar']}
        fo = c.get('fade_out', .3); seg['fade_out'] = G['bar'] if fo == 'bar' else fo
        if c.get('loop') and src_in + L > G.get('duration', 1e9) - .1:
            la, lb = snap(c['loop'][0], downs), snap(c['loop'][1], downs); seg.update({'loop_to': [la, lb], 'src_out': round(lb, 4)})
        segs.append(seg)
    holds = []
    for h in spec.get('holds', []):
        t = resolve(h['at'], C); holds.append({'t0': round(t - h.get('pre', .3), 3), 't1': round(t + h.get('post', 2), 3), 'db': h.get('db', -4)})
    out = {'note': 'music_plan.py из music_spec.json — не править руками', 'segments': segs, 'holds': holds,
           'grids': {k: {kk: v for kk, v in g.items() if kk != 'beats'} for k, g in gcache.items()}}
    json.dump(out, open(HERE / 'music_plan.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for s in segs: print(f"{s['id']}: {s['file']} src {s['src_in']:.2f}->{s['src_out']:.2f} film {s['film_in']:.2f}->{s['film_out']:.2f} bpm {s['bpm']} bar {s['bar']}")
    if a.grid:
        for k, g in gcache.items(): print(k, 'bpm', g['bpm'], 'bar', g['bar'], 'downbeats', g['downbeats'][:16])


if __name__ == '__main__':
    main()
