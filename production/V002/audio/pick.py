#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pick.py [slot ...]      (earshot venv, run with -I: the downloads are untrusted data and are only read as audio)

For every download slot: rank the candidates against the description of the sound we need (earshot rank),
then inside the best files find the cleanest moments (earshot find) and read realness on each trim.
Writes sourcing/shortlist.json  (slot -> stem -> ranked files with trims).
"""
import json
import os
import sys

from earshot import api

HERE = os.path.dirname(os.path.abspath(__file__))
NEED = {   # slot: {stem: (query for rank/find, kind)}
    "splash_big": {"splash_final": ("a big splash of something heavy falling into water", "event")},
    "splash_small": {"splash_small": ("a small water splash", "event")},
    "whistling": {"whistle_march": ("a man whistling a cheerful tune", "texture")},
    "fife": {"fife": ("a fife or piccolo flute playing", "texture")},
    "snare_roll": {"snare_roll": ("a snare drum roll", "texture")},
    "snare_hit": {"snare_hit": ("a single snare drum hit", "event")},
    "chain": {"chain_creak": ("a metal chain creaking under tension", "auto"), "chain_clink": ("a metal chain clinking", "event")},
    "wood_creak": {"plank_creak": ("a wooden plank creaking", "auto")},
    "rope_creak": {"swing_creak": ("a rope swing creaking", "auto")},
    "metal_groan": {"metal_groan": ("a large metal structure groaning under stress", "auto")},
    "cloth": {"cloth_grab": ("a hand grabbing cloth, a quick fabric rustle", "auto")},
    "collide": {"soldiers_clatter": ("bodies bumping together with gear clattering", "auto")},
    "bird": {"bird_chirp": ("a small bird chirping", "auto")},
    "laugh_man": {"general_laugh": ("a man laughing heartily", "texture")},
    "chuckle": {"soldiers_chuckle": ("several men chuckling", "texture")},
    "kid": {"kid_squeal": ("a child squealing with delight and laughing", "texture")},
    "wood_break": {"bridge_crack": ("wood cracking and breaking", "event")},
    "steps_wood": {"shuffle_steps": ("many footsteps shuffling on a wooden floor", "texture")},
}


def main():
    only = set(sys.argv[1:])
    path = os.path.join(HERE, "sourcing", "shortlist.json")
    out = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    for slot, stems in NEED.items():
        if only and slot not in only:
            continue
        d = os.path.join(HERE, "sourcing", "dl", slot)
        if not os.path.isdir(d) or not os.listdir(d):
            continue
        out[slot] = {}
        for stem, (q, kind) in stems.items():
            try:
                rk = api.rank([d], q)
            except Exception as e:
                print(slot, "rank ERROR", e, flush=True)
                continue
            rows = []
            for r in rk["results"][:4]:
                f = r["path"]
                row = {"file": os.path.basename(f), "z": r.get("z"), "verdict": r.get("verdict"), "trims": []}
                try:
                    fd = api.find(f, q, top=3, kind=kind)
                    for s in fd.get("segments", fd.get("results", [])):
                        t = {k: s.get(k) for k in ("start", "end", "z", "verdict", "kind", "head_db", "tail_db", "cut", "peak_dbfs")}
                        try:
                            rl = api.realness(f, start=s["start"], end=s["end"])
                            t["p_real"], t["real"] = rl.get("p_real"), rl.get("verdict")
                        except Exception as e:
                            t["real"] = "n/a: %s" % e
                        row["trims"].append(t)
                except Exception as e:
                    row["find_error"] = str(e)
                rows.append(row)
                print("%-12s %-16s %s z %+.2f | %s" % (slot, stem, row["file"], row["z"] or 0, "; ".join(
                    "%.2f-%.2f z%+.1f %s p%.2f" % (t["start"], t["end"], t["z"] or 0, t.get("kind"), t.get("p_real") or 0)
                    for t in row["trims"])), flush=True)
            out[slot][stem] = {"query": q, "files": rows}
        json.dump(out, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
