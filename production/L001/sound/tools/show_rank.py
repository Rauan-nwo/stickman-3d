#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""show_rank.py [need,need...]  compact table of earshot results per need (Openverse + Kenney), for picking"""
import json
import sys
from pathlib import Path

DL = Path(__file__).resolve().parent.parent / "lib" / "_dl"
ov = json.loads((DL / "rank_openverse.json").read_text(encoding="utf-8")) if (DL / "rank_openverse.json").exists() else {}
kn = json.loads((DL / "rank_kenney.json").read_text(encoding="utf-8"))
cand = json.loads((DL / "openverse" / "candidates.json").read_text(encoding="utf-8"))
meta = {}
for rows in cand.values():
    for r in rows:
        if r.get("file"):
            meta[Path(r["file"]).name] = r
only = set(sys.argv[1].split(",")) if len(sys.argv) > 1 else None
for need in sorted(set(ov) | set(kn)):
    if only and need not in only:
        continue
    print("=== %s : %s" % (need, (ov.get(need) or kn.get(need))["desc"]))
    for x in (ov.get(need) or {}).get("results", [])[:6]:
        m = meta.get(x["name"], {})
        fz = " | ".join("%.1f-%.1f z%.1f%s" % (s["start"], s["end"], s["z"], (" " + s["cut"]) if s.get("cut") else "")
                        for s in x.get("find", []))
        print("  OV %+.1f %-9s %6.1fs %-10s %-40s by %-18s %s | ~%s" % (
            x["z"], x["verdict"], x["dur"], x["name"], (m.get("title") or "")[:40], (m.get("creator") or "")[:18],
            fz, x["sounds_most_like"][:40]))
    for x in (kn.get(need) or {}).get("results", [])[:3]:
        print("  KN %+.1f %-9s %s | ~%s" % (x["z"], x["verdict"], x["name"], x["sounds_most_like"][:40]))
