#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""qa_rec.py [--all]   technical check of the built library (lib/rec) against lib/ledger.json
spot (foley): mono, time from the file start to the first 1 ms frame within 30 / 20 / 12 dB of the peak and to the
              peak itself (the transient must sit < 5 ms from the start), level of the last 10 ms (faded tail), length.
loop (amb / tone): channels, length, loudness spread (std of 400 ms levels), seam step (last 50 ms vs first 50 ms).
Prints only the files that break a rule unless --all. Run with the sound venv python and -I.
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

SND = Path(__file__).resolve().parent.parent


def db(v):
    return 20 * np.log10(max(float(v), 1e-12))


def main():
    show_all = "--all" in sys.argv
    led = json.loads((SND / "lib" / "ledger.json").read_text(encoding="utf-8"))
    bad = 0
    for f in led["files"]:
        x, sr = sf.read(str(SND / f["path"]), always_2d=True, dtype="float32")
        m = x.mean(axis=1)
        dur = len(m) / sr
        flags = []
        if sr != 48000:
            flags.append("sr %d" % sr)
        if f["category"] == "foley":
            k = sr // 1000
            n = len(m) // k
            e = np.abs(m[:n * k]).reshape(n, k).max(axis=1)
            pk = e.max()
            t = {d: int(np.argmax(e >= pk * 10 ** (-d / 20))) for d in (30, 20, 12)}
            tp = int(np.argmax(e))
            tail = db(np.abs(m[-int(0.010 * sr):]).max() / pk)
            if x.shape[1] != 1:
                flags.append("not mono")
            if t[20] > 5:
                flags.append("transient late")
            if tail > -20:
                flags.append("tail not faded")
            if dur > 3.2:
                flags.append("long")
            line = "%-22s %-13s %5.2fs  -30dB@%3dms -20dB@%3dms -12dB@%3dms peak@%4dms  tail %5.1f dB" % (
                f["id"], f["class"], dur, t[30], t[20], t[12], tp, tail)
        else:
            want = 2 if f["category"] == "amb" else 1
            if x.shape[1] != want:
                flags.append("channels %d" % x.shape[1])
            w = int(0.4 * sr)
            st = np.array([10 * np.log10(np.mean(m[i:i + w] ** 2) + 1e-12) for i in range(0, len(m) - w, w)])
            a, b = m[:int(0.05 * sr)], m[-int(0.05 * sr):]
            seam = abs(10 * np.log10(np.mean(a ** 2) + 1e-12) - 10 * np.log10(np.mean(b ** 2) + 1e-12))
            jump = abs(float(m[0]) - float(m[-1]))
            if f["category"] == "amb" and not 20 <= dur <= 61 and not f.get("short_ok"):
                flags.append("length")
            if seam > 6:
                flags.append("seam level")
            line = "%-22s %-13s %5.1fs %dch  spread %4.1f dB  max-over-median %4.1f dB  seam %4.1f dB  jump %.3f" % (
                f["id"], f["class"], dur, x.shape[1], st.std(), st.max() - np.median(st), seam, jump)
        if flags or show_all:
            print(line + ("   << " + ", ".join(flags) if flags else ""))
        bad += bool(flags)
    print("%d files, %d flagged" % (len(led["files"]), bad))


if __name__ == "__main__":
    main()
