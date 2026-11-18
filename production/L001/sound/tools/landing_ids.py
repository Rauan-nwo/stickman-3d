#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""landing_ids.py OUT.json id8 id8 ...  |  landing_ids.py OUT.json --picks   -> [{id, landing}] for sfx_openverse landing"""
import json
import sys
from pathlib import Path

LIB = Path(__file__).resolve().parent.parent / "lib"
cand = json.loads((LIB / "_dl" / "openverse" / "candidates.json").read_text(encoding="utf-8"))
rows = {r["id"][:8]: r for rs in cand.values() for r in rs}
if sys.argv[2] == "--picks":
    keys = [p["ov_id"][:8] for p in json.loads((LIB / "picks.json").read_text(encoding="utf-8")) if p.get("ov_id")]
else:
    keys = sys.argv[2:]
out, seen = [], set()
for k in keys:
    if k in seen:
        continue
    seen.add(k)
    out.append({"id": rows[k]["id"], "landing": rows[k]["landing"]})
Path(sys.argv[1]).write_text(json.dumps(out, indent=1), encoding="utf-8")
print(len(out), "ids")
