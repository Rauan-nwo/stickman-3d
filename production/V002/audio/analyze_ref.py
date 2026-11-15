#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analyze_ref.py <reference video/audio> [whisper_transcript.json] [--json out.json]

Measures the channel's reference sound so that the V002 mix can be designed
from numbers (nobody listens here): loudness, level distribution, spectrum over
time, bed level in the voice gaps, effect-vs-voice level, ducking speed.

Needs: numpy, scipy, ffmpeg on PATH.
"""
import argparse
import json
import re
import subprocess
import sys

import numpy as np
from scipy import signal

SR = 44100


def decode(path, ch=2):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-f", "f32le", "-acodec", "pcm_f32le",
         "-ac", str(ch), "-ar", str(SR), "pipe:1"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    return x.reshape(-1, ch)


def ebur128(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af",
                          "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:"):]
    g = lambda pat: float(re.search(pat, tail).group(1))
    return {"I": g(r"I:\s+(-?[\d.]+) LUFS"), "LRA": g(r"LRA:\s+(-?[\d.]+) LU"),
            "TP": g(r"Peak:\s+(-?[\d.]+) dBFS")}


def db(v):
    return 20 * np.log10(np.maximum(v, 1e-9))


def env(v, win, hop):
    w, h = int(win * SR), int(hop * SR)
    c = np.concatenate([[0.0], np.cumsum(v * v)])
    idx = np.arange(0, len(v) - w, h)
    return np.sqrt((c[idx + w] - c[idx]) / w), (idx + w / 2) / SR


def band(v, lo, hi, order=4):
    if lo <= 0:
        sos = signal.butter(order, hi, "low", fs=SR, output="sos")
    elif hi >= SR / 2:
        sos = signal.butter(order, lo, "high", fs=SR, output="sos")
    else:
        sos = signal.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, v)


def pmean_db(e):
    return float(db(np.sqrt(np.mean(np.square(e))))) if len(e) else float("nan")


def runs(mask):
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ref")
    ap.add_argument("transcript", nargs="?")
    ap.add_argument("--json")
    a = ap.parse_args()

    x = decode(a.ref)
    L, R = x[:, 0], x[:, 1]
    M, S = (L + R) / 2, (L - R) / 2
    R_ = {"file": a.ref, "duration": len(M) / SR}
    R_["loudness"] = ebur128(a.ref)
    R_["stereo"] = {"lr_correlation": float(np.corrcoef(L, R)[0, 1]),
                    "mid_rms_db": pmean_db(M), "side_rms_db": pmean_db(S)}

    HOP = 0.01
    e50, t = env(M, 0.05, HOP)
    d50 = db(e50)
    below = [(j - i) * HOP for i, j in runs(d50 < -40)]
    inner = (t > 0.1) & (t < len(M) / SR - 0.15)
    R_["level_50ms"] = {
        "percentiles_db": {str(p): round(float(np.percentile(d50[inner], p)), 1) for p in (1, 5, 10, 25, 50, 75, 90, 99)},
        "min_db_inside": round(float(d50[inner].min()), 1),
        "longest_below_-40dB_s": round(max(below) if below else 0.0, 3),
        "longest_below_-35dB_s": round(max([(j - i) * HOP for i, j in runs(d50[inner] < -35)] or [0]), 3),
    }

    # ---- band envelopes (20 ms frames) -------------------------------------------------
    e20, t20 = env(M, 0.02, HOP)
    sp, _ = env(band(M, 300, 3400), 0.02, HOP)       # speech band
    lo, _ = env(band(M, 0, 250), 0.02, HOP)
    mid, _ = env(band(M, 250, 4000), 0.02, HOP)
    hi, _ = env(band(M, 4000, SR / 2), 0.02, HOP)
    d20, dsp, dlo, dmid, dhi = db(e20), db(sp), db(lo), db(mid), db(hi)

    voiced = dsp > -25
    R_["voice"] = {"active_frames_share": round(float(voiced.mean()), 3),
                   "active_level_db": round(pmean_db(e20[voiced]), 1),
                   "active_level_median_db": round(float(np.median(d20[voiced])), 1)}

    # ---- spectrum over time ------------------------------------------------------------
    bands = [(0, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000),
             (4000, 8000), (8000, 16000), (16000, SR / 2)]
    benv = {f"{int(a_)}-{int(b_)}": env(band(M, a_, b_), 0.02, HOP)[0] for a_, b_ in bands}
    R_["spectrum_bands_db"] = {k: {"all": round(pmean_db(v), 1), "voiced": round(pmean_db(v[voiced]), 1)}
                               for k, v in benv.items()}
    blocks = []
    for s in range(0, int(len(M) / SR), 10):
        m = (t20 >= s) & (t20 < s + 10)
        f, p = signal.welch(M[s * SR:(s + 10) * SR], SR, nperseg=4096)
        cen = float(np.sum(f * p) / np.sum(p))
        blocks.append({"t": f"{s}-{s+10}", "full": round(pmean_db(e20[m]), 1), "low<250": round(pmean_db(lo[m]), 1),
                       "mid250-4k": round(pmean_db(mid[m]), 1), "high>4k": round(pmean_db(hi[m]), 1),
                       "centroid_hz": round(cen)})
    R_["spectrum_over_time"] = blocks
    f, p = signal.welch(M, SR, nperseg=8192)
    pd = 10 * np.log10(p + 1e-20)
    top = pd.max()
    cut = f[np.nonzero(pd > top - 70)[0][-1]]
    R_["bandwidth_hz"] = round(float(cut))

    # ---- gaps between phrases ----------------------------------------------------------
    gap_mask = dsp < -30
    gaps = [(i, j) for i, j in runs(gap_mask) if (j - i) * HOP >= 0.10 and t20[i] > 0.2 and t20[j - 1] < len(M) / SR - 0.2]
    G = []
    for i, j in gaps:
        G.append({"t0": round(float(t20[i]), 2), "dur": round((j - i) * HOP, 2), "mean_db": round(pmean_db(e20[i:j]), 1),
                  "min_db": round(float(d20[i:j].min()), 1), "low_db": round(pmean_db(lo[i:j]), 1),
                  "mid_db": round(pmean_db(mid[i:j]), 1), "high_db": round(pmean_db(hi[i:j]), 1)})
    lv = np.array([g["mean_db"] for g in G])
    R_["gaps"] = {"rule": "speech band (300-3400 Hz) below -30 dB for >= 100 ms", "count": len(G),
                  "dur_median_s": round(float(np.median([g["dur"] for g in G])), 2),
                  "dur_max_s": round(float(max(g["dur"] for g in G)), 2),
                  "mean_level_db": {"median": round(float(np.median(lv)), 1), "p10": round(float(np.percentile(lv, 10)), 1),
                                    "p90": round(float(np.percentile(lv, 90)), 1), "min": round(float(lv.min()), 1),
                                    "max": round(float(lv.max()), 1)},
                  "list": G}
    if a.transcript:
        tr = json.load(open(a.transcript, encoding="utf-8"))
        segs = tr["segments"]
        SG = []
        for s0, s1 in zip(segs[:-1], segs[1:]):
            a0, b0 = s0["end"] - 0.25, s1["start"] + 0.25
            m = (t20 >= a0) & (t20 <= b0)
            idx = np.nonzero(m)[0]
            best = None
            for i, j in runs(gap_mask[idx[0]:idx[-1] + 1]):
                if best is None or (j - i) > (best[1] - best[0]):
                    best = (i + idx[0], j + idx[0])
            if best and (best[1] - best[0]) >= 5:
                i, j = best
                SG.append({"after": s0["text"].strip()[-28:], "t0": round(float(t20[i]), 2), "dur": round((j - i) * HOP, 2),
                           "mean_db": round(pmean_db(e20[i:j]), 1), "min_db": round(float(d20[i:j].min()), 1)})
        lv2 = np.array([g["mean_db"] for g in SG])
        R_["sentence_gaps"] = {"count": len(SG), "dur_median_s": round(float(np.median([g["dur"] for g in SG])), 2),
                               "mean_level_median_db": round(float(np.median(lv2)), 1),
                               "mean_level_range_db": [round(float(lv2.min()), 1), round(float(lv2.max()), 1)], "list": SG}

    # ---- the bed alone: frames with neither speech nor sibilance -----------------------
    bed = (dsp < -36) & (dhi < -40) & inner[:len(dsp)] if len(inner) == len(dsp) else (dsp < -36) & (dhi < -40)
    R_["bed_only_frames"] = {
        "rule": "speech band < -36 dB and >4 kHz band < -40 dB (no voice, no sibilant, no bright SFX)",
        "share": round(float(bed.mean()), 3),
        "full_db": {"p10": round(float(np.percentile(d20[bed], 10)), 1), "median": round(float(np.median(d20[bed])), 1),
                    "p90": round(float(np.percentile(d20[bed], 90)), 1)},
        "low<250_median_db": round(float(np.median(dlo[bed])), 1),
        "mid250-4k_median_db": round(float(np.median(dmid[bed])), 1),
        "high>4k_median_db": round(float(np.median(dhi[bed])), 1),
    }

    # ---- effects against the voice -----------------------------------------------------
    order = np.argsort(d20)[::-1]
    ev, used = [], []
    for i in order:
        if all(abs(t20[i] - u) > 0.4 for u in used):
            used.append(t20[i])
            ev.append({"t": round(float(t20[i]), 2), "rms20_db": round(float(d20[i]), 1), "low_db": round(float(dlo[i]), 1),
                       "mid_db": round(float(dmid[i]), 1), "high_db": round(float(dhi[i]), 1)})
        if len(ev) >= 8:
            break
    vmed = float(np.median(d20[voiced]))
    for e_ in ev:
        e_["over_voice_median_db"] = round(e_["rms20_db"] - vmed, 1)
        e_["lf_dominated"] = bool(e_["low_db"] > e_["mid_db"] + 6)
    R_["loudest_events"] = ev

    # ---- ducking: how the bed behaves around phrase edges ------------------------------
    # (a) fall time of the total level at gap onsets, (b) trajectory of the low band (bed-dominant) inside gaps
    fall, traj = [], {k: [] for k in ("0-50", "50-100", "100-150", "150-250", "250-400")}
    for i, j in gaps:
        k = i
        while k > 0 and d20[k] < -20 and i - k < 40:
            k -= 1
        fall.append((i - k) * HOP)
        for name, (a0, b0) in zip(traj, ((0, 5), (5, 10), (10, 15), (15, 25), (25, 40))):
            if j - i >= b0:
                traj[name].append(pmean_db(lo[i + a0:i + b0]))
    under_voice_low = float(np.median(dlo[voiced]))
    R_["ducking"] = {
        "fall_time_-20_to_gap_ms_median": round(1000 * float(np.median(fall))),
        "low_band_in_gap_by_time_since_voice_stop_db": {k: (round(float(np.median(v)), 1), len(v)) for k, v in traj.items() if v},
        "note": "low band (<250 Hz) under the voice also contains the voice fundamental, so depth cannot be read directly; "
                "the trajectory inside gaps shows whether the bed swells back (release) after the voice stops",
        "low_band_under_voice_median_db": round(under_voice_low, 1),
        "sub80_voiced_vs_gap_median_db": [round(float(np.median(db(benv['0-60'][voiced]))), 1),
                                          round(float(np.median(db(benv['0-60'][gap_mask]))), 1)],
    }

    print(json.dumps({k: v for k, v in R_.items() if k not in ()}, indent=1, ensure_ascii=False))
    if a.json:
        json.dump(R_, open(a.json, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    sys.exit(main())
