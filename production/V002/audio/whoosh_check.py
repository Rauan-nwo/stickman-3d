#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
whoosh_check.py        (earshot venv)

Are the camera whooshes heard as whooshes inside the finished mix? `earshot timeline` tags only the 96 most
prominent events of a file, so its whoosh COUNT moves with everything else in the mix (9 -> 4 between two builds
that only made the whooshes louder). This asks the question directly instead: for every whoosh cue the 0.5 s of
the finished mix around it is matched against "a whoosh" (calibrated z, best of three phrasings), and the same
is done for control windows half-way between whooshes, and for the reference film at the moments its own
timeline called a whoosh and at control moments. Writes whoosh_report.json.
"""
import json
import os

import numpy as np
from earshot import api

A = os.path.dirname(os.path.abspath(__file__))
Q = ["a short fast whoosh", "a whip pan whoosh transition", "a quick swish through the air"]
ALTS = ["a spoken word", "a drum hit", "a breath"]


def zs(path, times, dur):
    out = []
    for t in times:
        a, b = max(0.0, t - 0.2), min(dur - 0.01, t + 0.3)
        if b - a < 0.3:
            continue
        out.append(round(api.match(path, Q, alts=ALTS, start=a, end=b)["z"], 2))
    return out


def stat(v):
    v = np.array(v)
    return {"n": int(len(v)), "median_z": round(float(np.median(v)), 2), "share_z_ge_2": round(float(np.mean(v >= 2.0)), 2),
            "share_z_ge_2.5": round(float(np.mean(v >= 2.5)), 2)}


def main():
    cues = json.load(open(os.path.join(A, "cues.json"), encoding="utf-8"))
    mix = os.path.join(A, "mix_final.wav")
    tw = sorted(c["time"] for c in cues["cues"] if "cam_" in c["file"] or "throw_whoosh" in c["file"])
    ctl = [(a + b) / 2 for a, b in zip(tw[:-1], tw[1:]) if b - a > 1.2]
    rep = {"ours_at_whooshes": stat(zs(mix, tw, cues["duration"])), "ours_control": stat(zs(mix, ctl, cues["duration"]))}
    rt = os.path.join(A, "sourcing", "ref_timeline.json")
    if os.path.exists(rt):
        r = json.load(open(rt, encoding="utf-8"))
        ref = r["file"]
        rw = sorted({round(e["t"], 1) for e in r["events"] if e.get("kind") == "WHOOSH"})
        rc = [(a + b) / 2 for a, b in zip(rw[:-1], rw[1:]) if b - a > 1.2]
        rep["reference_at_its_tagged_whooshes"] = stat(zs(ref, rw, r["duration"]))
        rep["reference_control"] = stat(zs(ref, rc, r["duration"]))
    json.dump(rep, open(os.path.join(A, "whoosh_report.json"), "w", encoding="utf-8"), indent=1)
    for k, v in rep.items():
        print(k, v)


if __name__ == "__main__":
    main()
