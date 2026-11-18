#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""events.py [-g GAP_MS] [-t THR_DB] [-w A,B] need/id8 [need/id8 ...]   list the sound events of downloaded candidates
(model-free: 1 ms peak envelope, gate at THR_DB under the file peak and 8 dB over the noise floor, events closer
than GAP_MS merged). Used to cut one clean event out of a multi-event file for lib/picks.json (start / end).
Run with the sound venv python and -I. Reads audio only.
"""
import glob
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

OV = Path(__file__).resolve().parent.parent / "lib" / "_dl" / "openverse"
KN = OV.parent / "kenney"


def events(path, gap_ms=80, thr_db=-32, floor_over_db=8):
    x, sr = sf.read(str(path), always_2d=True, dtype="float32")
    m = x.mean(axis=1)
    k = max(1, sr // 1000)
    n = len(m) // k
    e = np.abs(m[:n * k]).reshape(n, k).max(axis=1)
    pk = float(e.max()) or 1e-9
    floor = float(np.percentile(e, 10))
    thr = max(pk * 10 ** (thr_db / 20), floor * 10 ** (floor_over_db / 20))
    on = e >= thr
    idx = np.nonzero(on)[0]
    ev = []
    if len(idx):
        a = b = idx[0]
        for i in idx[1:]:
            if (i - b) * k * 1000 / sr > gap_ms:
                ev.append((a, b + 1))
                a = i
            b = i
        ev.append((a, b + 1))
    out = []
    for a, b in ev:
        if b - a < 3 and e[a:b].max() < pk * 0.2:
            continue
        out.append((a * k / sr, b * k / sr, 20 * np.log10(e[a:b].max() / 1.0 + 1e-12)))  # frames are k samples, not exactly 1 ms
    return out, len(m) / sr, 20 * np.log10(pk), 20 * np.log10(floor + 1e-12), x.shape[1], sr


def main():
    args = sys.argv[1:]
    gap, thr, win = 80, -32, (0.0, 1e9)
    while args and args[0] in ("-g", "-t", "-w"):
        if args[0] == "-g":
            gap = int(args[1])
        elif args[0] == "-w":
            win = tuple(float(v) for v in args[1].split(","))
        else:
            thr = float(args[1])
        args = args[2:]
    for a in args:
        hits = glob.glob(str(OV / (a + "*"))) or glob.glob(str(KN / "**" / a), recursive=True)
        for p in hits:
            ev, dur, pk, fl, ch, sr = events(p, gap, thr)
            print("== %s  %.2fs %dch %dHz peak %.1f dB floor %.1f dB  events %d" % (a, dur, ch, sr, pk, fl, len(ev)))
            prev = 0.0
            for i, (s, e, p_) in enumerate(ev):
                if e < win[0] or s > win[1]:
                    prev = e
                    continue
                print("   %2d  %7.3f - %7.3f  len %5.0f ms  gap %5.0f ms  peak %5.1f dB" % (i, s, e, (e - s) * 1000,
                                                                                          (s - prev) * 1000, p_))
                prev = e


if __name__ == "__main__":
    main()
