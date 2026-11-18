#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
layers.py — составные звуки (слои: атака + тело + хвост), как делают в студии: один слой даёт щелчок/узнаваемость,
второй — вес (низ), третий — хвост/пространство. Каждый слой выровнен по своей атаке, со своим срезом частот.

  C:/dev/tools/sound-venv/Scripts/python.exe sound/tools/layers.py      -> sound/lib/cand/<класс>/layer_<имя>.wav
Затем tools/audition.py берёт layer_*.wav кандидатами наравне с синтезом и банком.
"""
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy import signal

HERE = Path(__file__).resolve().parent.parent; L = HERE.parent
sys.path.insert(0, str(HERE))
import synth  # noqa: E402
SR = synth.SR


def load(p):
    x, sr = sf.read(str(L / p), dtype='float64', always_2d=True); x = x.mean(axis=1)
    return signal.resample_poly(x, SR, sr) if sr != SR else x


def onset(y):
    e = np.abs(y); return int(np.argmax(e > .1 * e.max()))


def filt(y, hp=None, lp=None):
    if hp: y = synth.hp(y, hp, 4)
    if lp: y = synth.lp(y, lp, 4)
    return y


def build(parts):
    """parts: [(массив, gain_dB, сдвиг атаки мс, hp, lp)] — все атаки совмещаются в одну точку (+сдвиг)"""
    pre = int(.05 * SR); out = np.zeros(int(6 * SR))
    for y, g, ms, hp, lp in parts:
        y = filt(np.asarray(y, float), hp, lp); y = y / (np.abs(y).max() + 1e-12) * 10 ** (g / 20)
        o = pre + int(ms / 1000 * SR) - onset(y)
        if o < 0: y = y[-o:]; o = 0
        out[o:o + len(y)] += y[:len(out) - o]
    nz = np.nonzero(np.abs(out) > 1e-4)[0]; out = out[:nz[-1] + 1] if len(nz) else out
    return synth.norm(out, .9)


def main():
    C = lambda cls, name: f'sound/lib/cand/{cls}/{name}.wav'
    R = {
        'sting.title': {
            'boom_chord': [(load(C('sting.title', 'bank_impact_deep')), 0, 0, None, None),
                           (synth.chord_hit(3.5, 73.42, 4, 'minor9', .3), -5, 10, 60, 6000),
                           (synth.reverse_swell(.01, 1)[:1] * 0, -99, 0, None, None)],
            'boom_chord_air': [(load(C('sting.title', 'bank_impact_deep')), 0, 0, None, 8000),
                               (synth.chord_hit(3.5, 73.42, 4, 'minor9', .3), -6, 10, 60, 6000),
                               (synth.shimmer(1.5, 3), -18, 40, 3000, None)],
        },
        'stamp': {
            'tap_body_paper': [(load(C('stamp', 'bank_tap_table')), 0, 0, 200, None),
                               (synth.thump(.35, 150, 70, .07, 0, 5, 1500, .3), -4, 2, None, 600),
                               (synth.paper(.25, 6, 'slap'), -8, 4, 500, None)],
            'syn_body_tap': [(synth.stamp_synth(1), 0, 0, None, None), (load(C('stamp', 'bank_tap_table')), -3, 0, 300, None)],
            'rec_body': [(load('sound/lib/rec/foley/stamp_01.wav'), 0, 0, 120, None), (synth.thump(.35, 150, 70, .07, 0, 5, 1500, .3), -5, 2, None, 500)],
            'rec_body_tap': [(load('sound/lib/rec/foley/stamp_01.wav'), 0, 0, 120, None), (synth.thump(.35, 150, 70, .07, 0, 5, 1500, .3), -6, 2, None, 500),
                             (load(C('stamp', 'bank_tap_table')), -8, 0, 400, None)],
        },
        'hit.card': {
            'deep_sub': [(load(C('hit.card', 'bank_pro_impact_deep')), 0, 0, None, None), (synth.thump(1.0, 70, 36, .3, 0, 2, 400, .2), -3, 0, None, 300)],
        },
        'sting.chapter': {
            'swell_chord': [(load(C('sting.chapter', 'bank_impact_swell')), 0, 0, None, None),
                            (synth.chord_hit(2.4, 65.41, 2, 'minor9', .4), -4, 15, 60, 6000)],
        },
        'shutter': {
            'snap_mirror': [(load(C('shutter', 'bank_shutter_snap')), 0, 0, None, None), (load(C('shutter', 'bank_shutter_mirror')), -6, 35, 400, None)],
        },
    }
    for cls, d in R.items():
        for name, parts in d.items():
            y = build([p for p in parts if p[1] > -90])
            p = HERE / f'lib/cand/{cls}/layer_{name}.wav'; sf.write(str(p), y.astype(np.float32), SR, subtype='PCM_24'); print(p.name, round(len(y) / SR, 2))


if __name__ == '__main__':
    main()
