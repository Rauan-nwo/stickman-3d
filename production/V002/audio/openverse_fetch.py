#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
openverse_fetch.py search            # query the Openverse audio API for every slot, cache the JSON
openverse_fetch.py download [N]      # download the first N (default 6) usable candidates per slot

Only licences CC0 and Public Domain Mark are requested (license=cc0,pdm) and re-checked per item.
Only generic search terms are sent; no project or personal data. Anonymous access: one request every
3.5 s, every response cached in sourcing/cache/ (a cached query is never sent again).

Layout (audio files are git-ignored):
    sourcing/cache/<query>.json          raw API responses
    sourcing/dl/<slot>/<id8>.<ext>       candidates
    sourcing/candidates.json             slot -> [{id, title, creator, landing, url, licence, duration, file}]
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "sourcing"
API = "https://api.openverse.org/v1/audio/"
UA = "audio-search-script/1.0"
ALLOWED = {"cc0", "pdm"}

SLOTS = {   # slot: (queries, min s, max s)
    "splash_big": (["big water splash", "splash into water"], 0.6, 20),
    "splash_small": (["small water splash", "water plop"], 0.15, 12),
    "whistling": (["man whistling tune", "whistling melody"], 2.0, 60),
    "fife": (["fife", "piccolo flute", "tin whistle"], 1.0, 90),
    "snare_roll": (["snare drum roll", "military snare drum"], 1.0, 40),
    "snare_hit": (["snare drum hit", "marching snare"], 0.1, 20),
    "chain": (["chain creak", "chain rattle", "metal creak"], 0.4, 30),
    "wood_creak": (["wood creak", "creaking wooden plank"], 0.3, 30),
    "rope_creak": (["rope creak", "swing creak"], 0.3, 40),
    "metal_groan": (["metal groan", "metal stress creak"], 0.5, 40),
    "cloth": (["cloth grab", "fabric rustle", "clothing rustle"], 0.2, 30),
    "collide": (["body impact", "armor clatter", "equipment rattle"], 0.2, 30),
    "bird": (["bird chirp", "songbird"], 0.3, 40),
    "laugh_man": (["man laughing", "hearty laugh"], 0.8, 40),
    "chuckle": (["men chuckle", "male chuckle", "group laughing"], 0.5, 40),
    "kid": (["child squeal", "kid laughing", "child giggle"], 0.5, 40),
    # second batch: effects the listening check did not recognise either
    "wood_break": (["wood cracking breaking", "branch snap"], 0.3, 20),
    "steps_wood": (["footsteps on wooden floor", "crowd footsteps"], 1.0, 40),
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def search():
    (SRC / "cache").mkdir(parents=True, exist_ok=True)
    for slot, (queries, _, _) in SLOTS.items():
        for q in queries:
            f = SRC / "cache" / (re.sub(r"[^a-z0-9]+", "_", q) + ".json")
            if f.exists():
                continue
            url = API + "?" + urllib.parse.urlencode({"q": q, "license": "cc0,pdm", "page_size": 20})
            for attempt in range(3):
                try:
                    f.write_bytes(get(url))
                    break
                except Exception as e:                       # back off, never hammer
                    print("  %s: %s (wait)" % (q, e))
                    time.sleep(20 * (attempt + 1))
            print("searched:", q)
            time.sleep(3.5)


def candidates():
    out = {}
    seen = set()
    for slot, (queries, lo, hi) in SLOTS.items():
        rows = []
        lists = []
        for q in queries:
            f = SRC / "cache" / (re.sub(r"[^a-z0-9]+", "_", q) + ".json")
            if f.exists():
                lists.append(json.loads(f.read_text(encoding="utf-8")).get("results", []))
        for i in range(20):                                  # interleave the queries
            for L in lists:
                if i >= len(L):
                    continue
                r = L[i]
                d = (r.get("duration") or 0) / 1000.0
                if r["id"] in seen or r.get("license") not in ALLOWED or not (lo <= d <= hi) or not r.get("url"):
                    continue
                seen.add(r["id"])
                rows.append({"id": r["id"], "title": r.get("title"), "creator": r.get("creator"),
                             "landing": r.get("foreign_landing_url"), "url": r["url"], "source": r.get("source"),
                             "licence": r["license"], "licence_version": r.get("license_version"),
                             "licence_url": r.get("license_url"), "duration": d, "filetype": r.get("filetype")})
        out[slot] = rows
    return out


def download(n=6):
    cand = candidates()
    for slot, rows in cand.items():
        d = SRC / "dl" / slot
        d.mkdir(parents=True, exist_ok=True)
        got = 0
        for r in rows:
            if got >= n:
                break
            ext = (r.get("filetype") or "mp3").lower()
            if ext not in ("mp3", "ogg", "wav", "flac", "oga", "m4a"):
                ext = "mp3"
            f = d / ("%s.%s" % (r["id"][:8], ext))
            if not f.exists():
                try:
                    data = get(r["url"])
                except Exception as e:
                    print("  skip %s: %s" % (r["url"], e))
                    time.sleep(2)
                    continue
                f.write_bytes(data)
                time.sleep(1.2)
            r["file"] = str(f.relative_to(HERE)).replace("\\", "/")
            got += 1
        print("%-13s %d of %d candidates downloaded" % (slot, got, len(rows)))
    (SRC / "candidates.json").write_text(json.dumps(cand, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "search":
        search()
    elif cmd == "download":
        download(int(sys.argv[2]) if len(sys.argv) > 2 else 6)
    else:
        sys.exit(__doc__)
