#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mask_check.py <words.json>      (system python; needs mix_stems/ written by `mix.py --stems`)

Masking of the voice, measured on the layers as they enter the master:
  * per sentence and per character line: voice level minus bed (music + effects) level in the speech band
    300-4000 Hz, mean and the worst 0.4 s window
  * per gap between sentences: music and effects level
  * transition whooshes: loudest 50 ms in 1.5-8 kHz at each camera whoosh, relative to the voice's median 20 ms
    level - the same figure measured on the reference film is -5.9 dB
Writes mask_report.json.
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_audio import SR, read_wav  # noqa: E402


def db(x):
    return 10 * np.log10(np.mean(x * x) + 1e-12)


def main():
    words = json.load(open(sys.argv[1], encoding="utf-8"))
    cues = json.load(open(HERE / "cues.json", encoding="utf-8"))
    S = HERE / "mix_stems"
    v, m, s = (read_wav(S / f).mean(axis=1) for f in ("voice.wav", "music_ducked.wav", "sfx_ducked.wav"))
    n = min(len(v), len(m), len(s))
    v, m, s = v[:n], m[:n], s[:n]
    sp = signal.butter(4, [300, 4000], "band", fs=SR, output="sos")
    hi = signal.butter(4, [1500, 8000], "band", fs=SR, output="sos")
    vb, bb = signal.sosfilt(sp, v), signal.sosfilt(sp, m + s)
    rep = {"sentences": [], "lines": [], "gaps": [], "whooshes": []}

    def snr(a, b):
        i, j = int(a * SR), int(b * SR)
        w = int(0.4 * SR)
        worst = min((db(vb[k:k + w]) - db(bb[k:k + w]) for k in range(i, max(i + 1, j - w), w // 4) if db(vb[k:k + w]) > db(vb[i:j]) - 6), default=None)   # only windows that hold real speech
        return round(db(vb[i:j]) - db(bb[i:j]), 1), None if worst is None else round(worst, 1)

    lines = sorted({w["line"] for w in words})
    span = {}
    for ln in lines:
        ws = [w for w in words if w["line"] == ln]
        span[ln] = (ws[0]["start"], ws[-1]["end"])
        mean, worst = snr(*span[ln])
        rep["sentences"].append({"sentence": ln, "t0": span[ln][0], "t1": span[ln][1], "voice_minus_bed_db": mean, "worst_0.4s_db": worst})
    for c in cues.get("character_lines", []):
        mean, worst = snr(c["t0"], c["t1"])
        rep["lines"].append({"who": c["who"], "t0": c["t0"], "t1": c["t1"], "voice_minus_bed_db": mean, "worst_0.4s_db": worst})
    for a, b in zip(lines[:-1], lines[1:]):
        t0, t1 = span[a][1], span[b][0]
        if t1 - t0 > 0.08:
            i, j = int(t0 * SR), int(t1 * SR)
            rep["gaps"].append({"after": a, "t": round(t0, 2), "dur": round(t1 - t0, 2), "music_db": round(db(m[i:j]), 1), "sfx_db": round(db(s[i:j]), 1)})
    # whooshes: measured on the FINISHED mix exactly as on the reference film (which has no stems):
    # loudest 50 ms in 1.5-8 kHz around the cue, against the mix's median 20 ms level and its median 50 ms hi-band level
    mx = read_wav(HERE / "mix_final.wav").mean(axis=1)
    h = 882
    vmed = float(np.median([db(mx[i:i + h]) for i in range(0, len(mx) - h, h)]))
    sh = signal.sosfilt(hi, mx)
    himed = float(np.median([db(sh[i:i + 2205]) for i in range(0, len(sh) - 2205, 2205)]))
    rep["mix_hi_band_median_db"] = round(himed, 1)
    for c in cues["cues"]:
        if "cam_" in c["file"] or "throw_whoosh" in c["file"]:
            t = c["time"]
            pk = max(db(sh[int((t + d) * SR):int((t + d + 0.05) * SR)]) for d in np.arange(-0.1, 0.1, 0.01))
            rep["whooshes"].append({"t": round(t, 2), "stem": Path(c["file"]).stem, "hi50_minus_voice_median_db": round(pk - vmed, 1),
                                    "hi50_over_hi_median_db": round(pk - himed, 1), "note": c["note"]})
    # the same whooshes on the layers: effect alone (1.5-8 kHz, loudest 50 ms) against the voice's own median 50 ms level in that band
    vh, shs = signal.sosfilt(hi, v), signal.sosfilt(hi, s)
    vhm = float(np.median([db(vh[i:i + 2205]) for i in range(0, n - 2205, 2205) if db(v[i:i + 2205]) > -35]))
    for w_ in rep["whooshes"]:
        t = w_["t"]
        w_["fx_hi50_minus_voice_hi_median_db"] = round(max(db(shs[int((t + d) * SR):int((t + d + 0.05) * SR)]) for d in np.arange(-0.1, 0.1, 0.01)) - vhm, 1)
    rep["whoosh_fx_vs_voice_hi_db"] = round(float(np.median([w_["fx_hi50_minus_voice_hi_median_db"] for w_ in rep["whooshes"]])), 1) if rep["whooshes"] else None
    rep["voice_median_20ms_db"] = round(vmed, 1)
    wv = [w["hi50_minus_voice_median_db"] for w in rep["whooshes"]]
    rep["whoosh_median_db"] = round(float(np.median(wv)), 1) if wv else None
    rep["reference_whoosh_db"] = -5.9
    rep["whoosh_over_hi_median_db"] = round(float(np.median([w["hi50_over_hi_median_db"] for w in rep["whooshes"]])), 1) if wv else None
    rep["reference_whoosh_over_hi_median_db"] = 6.7
    json.dump(rep, open(HERE / "mask_report.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("sentence: voice-bed dB (worst 0.4 s): " + " | ".join("%d: %.1f (%s)" % (r["sentence"], r["voice_minus_bed_db"], r["worst_0.4s_db"]) for r in rep["sentences"]))
    print("lines: " + " | ".join("%s %.1f (%s)" % (r["who"], r["voice_minus_bed_db"], r["worst_0.4s_db"]) for r in rep["lines"]))
    print("gaps music/sfx: " + " | ".join("%d: %.0f/%.0f" % (g["after"], g["music_db"], g["sfx_db"]) for g in rep["gaps"]))
    print("whooshes (n=%d): hi-band peak %.1f dB re mix median level (reference -5.9), %+.1f dB over the mix's hi-band median (reference +6.7): %s"
          % (len(wv), rep["whoosh_median_db"], rep["whoosh_over_hi_median_db"], " ".join("%.0f" % x for x in wv)))
    print("whoosh alone vs the voice's own level in 1.5-8 kHz: median %+.1f dB: %s" % (rep["whoosh_fx_vs_voice_hi_db"], " ".join("%.0f" % w_["fx_hi50_minus_voice_hi_median_db"] for w_ in rep["whooshes"])))


if __name__ == "__main__":
    main()
