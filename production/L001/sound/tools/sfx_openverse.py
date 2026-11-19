#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sfx_openverse.py search [P]        # query Openverse for every need of priority <= P (default 2), cache JSON
sfx_openverse.py download [P]      # download the first N usable candidates per need (spot 6, amb 4)
sfx_openverse.py landing IDS.json  # fetch the Freesound landing page of each chosen id, record licence + format
sfx_openverse.py status            # calls used today, remaining (last rate-limit headers)

Run with:  python -I sfx_openverse.py ...   (nothing downloaded is ever executed; audio only)

Licences: only CC0 and Public Domain Mark are requested (license=cc0,pdm) and re-checked per item; titles / creators
that look like re-uploads of commercial libraries are dropped. Only generic search words are sent.
Anonymous Openverse: ~20 req/min, 200/day -> one request every 4 s, hard stop at BUDGET calls per day, every
response cached (a cached query is never sent again).

Layout (audio is git-ignored):
    lib/_dl/openverse/cache/<query>.json         raw API responses
    lib/_dl/openverse/<need>/<id8>.<ext>         candidates (each need its own dir)
    lib/_dl/openverse/candidates.json            need -> [{id, title, creator, landing, url, licence, ...}]
    lib/_dl/openverse/landing.json               id -> licence + format read from the landing page
    lib/_dl/openverse/calls.json                 date -> calls sent, last rate-limit headers
"""
import datetime
import html as htmlmod
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent / "lib" / "_dl" / "openverse"
API = "https://api.openverse.org/v1/audio/"
UA = "audio-search-script/1.0"
ALLOWED = {"cc0", "pdm"}
BUDGET = 190
BAD = re.compile(r"(^[A-Z]{1,4}\d{1,3}[-_ ]\d{1,3}[-_ ]|\bPSE_|hollywood\s*edge|sound\s*ideas|\bbbc\b|series\s*6000|"
                 r"sound\s*dogs|soundsnap|audiojungle|pond5|epidemic|artlist|youtube audio library)", re.I)

# need: (priority, kind, queries, min s, max s)
NEEDS = {
    # ---------------- priority 1: ambiences
    "amb_restaurant": (1, "amb", ["restaurant ambience", "restaurant walla", "dinner party crowd"], 20, 1200),
    "amb_cutlery": (1, "amb", ["cutlery clinking", "restaurant dishes cutlery"], 8, 900),
    "amb_rain_window": (1, "amb", ["rain on window", "rain window indoors"], 20, 1200),
    "amb_rain_street": (1, "amb", ["heavy rain street", "rain city night"], 20, 1200),
    "amb_wet_tyres": (1, "amb", ["car passing wet road", "wet road traffic"], 4, 900),
    "amb_rain_car": (1, "amb", ["rain on car roof", "rain inside car"], 20, 1200),
    "amb_office_tone": (1, "amb", ["room tone office", "quiet room tone"], 20, 1200),
    "amb_clock": (1, "amb", ["clock ticking", "wall clock tick"], 8, 900),
    "amb_drip_tiled": (1, "amb", ["water drip bathroom", "dripping tap"], 8, 900),
    "amb_birds_day": (1, "amb", ["birds ambience morning", "birdsong light wind"], 20, 1200),
    # ---------------- priority 1: foley
    "fx_camera_shutter": (1, "spot", ["camera shutter", "film camera shutter"], 0.1, 60),
    "fx_photo_drop": (1, "spot", ["photos dropped on table", "paper drop on table"], 0.1, 60),
    "fx_folder": (1, "spot", ["folder open close", "paper folder"], 0.1, 60),
    "fx_paper_slide": (1, "spot", ["paper slide on desk", "paper sliding"], 0.1, 60),
    "fx_stamp": (1, "spot", ["rubber stamp", "stamping paper"], 0.1, 60),
    "fx_typewriter": (1, "spot", ["typewriter typing", "typewriter bell carriage return"], 0.3, 180),
    "fx_pen_write": (1, "spot", ["pen writing on paper", "marker writing"], 0.3, 120),
    "fx_glass_toast": (1, "spot", ["glasses clink toast", "wine glass clink"], 0.1, 60),
    "fx_box_knock": (1, "spot", ["knock on cardboard box", "cardboard box tap"], 0.1, 60),
    "fx_box_open": (1, "spot", ["cardboard box open", "box lid open"], 0.1, 60),
    "fx_keys": (1, "spot", ["keys jingle", "key ring"], 0.1, 60),
    "fx_sticker": (1, "spot", ["sticker", "label sticker slap"], 0.1, 60),
    "fx_lamp_switch": (1, "spot", ["lamp switch click", "light switch"], 0.05, 60),
    "fx_lamp_hum": (1, "amb", ["light bulb hum", "electrical hum"], 3, 900),
    "fx_tape_reel": (1, "amb", ["reel to reel tape", "tape recorder running"], 2, 900),
    "fx_headphones": (1, "spot", ["headphones handling", "headphones"], 0.1, 60),
    "fx_crate_down": (1, "spot", ["crate set down", "wooden box put down", "plastic crate"], 0.1, 60),
    "fx_mop_bucket": (1, "spot", ["mop bucket", "mop water"], 0.2, 90),
    "fx_phone_ring": (1, "spot", ["old telephone ringing", "rotary phone ring"], 1, 120),
    "fx_string_taut": (1, "spot", ["string pull", "rope stretch tension"], 0.1, 60),
    "fx_leather": (1, "spot", ["leather jacket", "leather creak"], 0.2, 90),
    "fx_chair": (1, "spot", ["chair creak", "chair scrape floor"], 0.2, 90),
    # ---------------- priority 2
    "fx_door_slam": (2, "spot", ["door slam"], 0.2, 60),
    "fx_door_knock": (2, "spot", ["knocking on door"], 0.2, 60),
    "fx_steps_hard": (2, "spot", ["footsteps hard floor", "high heels footsteps"], 1, 120),
    "fx_car_door": (2, "spot", ["car door close"], 0.2, 60),
    "fx_keyboard": (2, "spot", ["keyboard typing"], 1, 180),
    "fx_phone_handset": (2, "spot", ["telephone hang up", "phone pick up receiver"], 0.2, 60),
    "amb_hvac": (2, "amb", ["air conditioning hum", "ventilation hum"], 20, 1200),
    "amb_warehouse": (2, "amb", ["warehouse ambience"], 20, 1200),
    "fx_fluor_buzz": (2, "amb", ["fluorescent light buzz"], 3, 900),
    "amb_port": (2, "amb", ["harbor ambience", "port crane"], 20, 1200),
    "fx_ship_horn": (2, "spot", ["ship horn"], 1, 120),
    "amb_server": (2, "amb", ["server room"], 20, 1200),
    "amb_diner": (2, "amb", ["diner ambience", "cafe ambience"], 20, 1200),
    "amb_dishpit": (2, "amb", ["washing dishes"], 10, 900),
    "amb_hall_crowd": (2, "amb", ["crowd hall ambience", "applause"], 5, 1200),
    "amb_newsroom": (2, "amb", ["busy office ambience"], 20, 1200),
    "fx_scanner_beep": (2, "spot", ["barcode scanner beep"], 0.05, 60),
    "amb_trucks": (2, "amb", ["truck idling", "truck passing"], 5, 900),
    "amb_crickets": (2, "amb", ["crickets night"], 20, 1200),
    "amb_phones_office": (2, "amb", ["phones ringing office"], 5, 900),
    "amb_bar": (2, "amb", ["bar ambience", "pub ambience"], 20, 1200),
    "fx_cash_register": (2, "spot", ["cash register", "coins"], 0.2, 60),
    "fx_flashbulb": (2, "spot", ["camera flash", "flash bulb"], 0.05, 60),
    "fx_crowd_gasp": (2, "spot", ["crowd gasp"], 0.3, 60),
    "fx_radio_static": (2, "amb", ["radio static"], 1, 600),
    "fx_pushpin": (2, "spot", ["push pin", "cork board"], 0.05, 60),
    "fx_pencil_line": (2, "spot", ["pencil drawing"], 0.3, 120),
    # ---------------- priority 3: second round for the needs the first round left weak (new keys, so the
    # candidate lists of the first round stay as they are)
    "fx_sticker_b": (3, "spot", ["paper slap", "sticky note", "tape stick"], 0.05, 60),
    "fx_pushpin_b": (3, "spot", ["thumbtack", "pin board"], 0.05, 60),
    "fx_string_taut_b": (3, "spot", ["rope tighten", "thread pull"], 0.1, 60),
    "fx_flashbulb_b": (3, "spot", ["flash bulb pop", "camera flash pop"], 0.05, 60),
    "fx_crowd_gasp_b": (3, "spot", ["audience gasp", "crowd shock"], 0.3, 60),
    "amb_newsroom_b": (3, "amb", ["office ambience", "call center ambience", "newsroom"], 20, 1200),
    "fx_stamp_b": (3, "spot", ["date stamp", "stamp ink pad"], 0.1, 60),
    # ---------------- priority 4: L001 проход по звуку 19.11 (смех героев, ручка, пальцы, принтер)
    "fx_laugh_man": (4, "spot", ["man laughing", "male chuckle"], 0.4, 20),
    "fx_laugh_woman": (4, "spot", ["woman laughing", "female giggle"], 0.4, 20),
    "fx_laugh_group": (4, "spot", ["group laughing", "people laughing"], 1, 30),
    "fx_pen_click": (4, "spot", ["pen click", "ballpoint pen"], 0.05, 20),
    "fx_finger_tap": (4, "spot", ["finger tapping table", "fingers drumming"], 0.3, 40),
    "fx_printer": (4, "spot", ["printer printing", "dot matrix printer"], 1, 90),
}


def qfile(q):
    return ROOT / "cache" / (re.sub(r"[^a-z0-9]+", "_", q.lower()).strip("_") + ".json")


def calls_load():
    p = ROOT / "calls.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def calls_save(c):
    (ROOT / "calls.json").write_text(json.dumps(c, indent=1), encoding="utf-8")


def get(url, accept="application/json"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), dict(r.headers)


def search(prio=2):
    (ROOT / "cache").mkdir(parents=True, exist_ok=True)
    today = datetime.date.today().isoformat()
    c = calls_load()
    day = c.setdefault(today, {"calls": 0, "headers": {}})
    for need, (p, _, queries, _, _) in NEEDS.items():
        if p > prio:
            continue
        for q in queries:
            f = qfile(q)
            if f.exists():
                continue
            if day["calls"] >= BUDGET:
                print("BUDGET reached (%d calls today), stop" % day["calls"])
                calls_save(c)
                return
            url = API + "?" + urllib.parse.urlencode({"q": q, "license": "cc0,pdm", "page_size": 20})
            for attempt in range(3):
                try:
                    day["calls"] += 1
                    body, hdr = get(url)
                    f.write_bytes(body)
                    day["headers"] = {k: v for k, v in hdr.items() if "ratelimit" in k.lower()}
                    n = json.loads(body).get("result_count")
                    print("searched %-34s %5s results  [%s]" % (q, n, need), flush=True)
                    break
                except Exception as e:  # back off, never hammer
                    print("  %s: %s (wait)" % (q, e), flush=True)
                    if "429" in str(e):
                        calls_save(c)
                        time.sleep(70 * (attempt + 1))
                    else:
                        time.sleep(15 * (attempt + 1))
            calls_save(c)
            time.sleep(4.0)
    calls_save(c)


def candidates(prio=2):
    out, seen = {}, set()
    for need, (p, kind, queries, lo, hi) in NEEDS.items():
        if p > prio:
            continue
        lists = []
        for q in queries:
            f = qfile(q)
            if f.exists():
                lists.append(json.loads(f.read_text(encoding="utf-8")).get("results", []))
        rows = []
        for i in range(20):  # interleave the queries
            for L in lists:
                if i >= len(L):
                    continue
                r = L[i]
                d = (r.get("duration") or 0) / 1000.0
                txt = "%s %s" % (r.get("title") or "", r.get("creator") or "")
                if (r["id"], need) in seen or r.get("license") not in ALLOWED or not (lo <= d <= hi) \
                        or not r.get("url") or BAD.search(txt) or r.get("mature") \
                        or r.get("source") == "wikimedia_audio":  # 429 on scripted download; mostly word recordings
                    continue
                seen.add((r["id"], need))
                alt = (r.get("alt_files") or [{}])[0]
                rows.append({"id": r["id"], "title": r.get("title"), "creator": r.get("creator"),
                             "landing": r.get("foreign_landing_url"), "url": r["url"], "source": r.get("source"),
                             "licence": r["license"], "licence_version": r.get("license_version"),
                             "licence_url": r.get("license_url"), "duration": d, "filetype": r.get("filetype"),
                             "orig_type": alt.get("filetype"), "orig_sr": alt.get("sample_rate"),
                             "tags": [t.get("name") for t in (r.get("tags") or [])][:12]})
        out[need] = rows
    return out


AMB_BYTES = 5 * 1024 * 1024  # ambience previews: only the first ~5 MB (~5 min of 128 kbit/s mp3), HTTP Range


def fetch(job):
    r, f, partial = job
    if f.exists():
        return r, f, None
    try:
        h = {"User-Agent": UA, "Accept": "*/*"}
        if partial:
            h["Range"] = "bytes=0-%d" % (AMB_BYTES - 1)
        with urllib.request.urlopen(urllib.request.Request(r["url"], headers=h), timeout=300) as resp:
            data = resp.read()
        tmp = f.with_suffix(f.suffix + ".part")
        tmp.write_bytes(data)
        tmp.replace(f)
        return r, f, None
    except Exception as e:
        return r, f, str(e)


def download(prio=2, workers=4):
    from concurrent.futures import ThreadPoolExecutor
    cand = candidates(prio)
    jobs = []
    for need, rows in cand.items():
        if not all(qfile(q).exists() for q in NEEDS[need][2]):
            print("%-18s search not finished, later" % need, flush=True)
            continue
        amb = NEEDS[need][1] == "amb"
        n = 4 if amb else 6
        d = ROOT / need
        d.mkdir(parents=True, exist_ok=True)
        for r in rows[:n + 2]:  # two spares in case a link fails
            ext = (r.get("filetype") or "mp3").lower()
            if ext not in ("mp3", "ogg", "wav", "flac", "oga"):
                ext = "mp3"
            r["partial"] = bool(amb and (r.get("duration") or 0) > 330)
            jobs.append((r, d / ("%s.%s" % (r["id"][:8], ext)), r["partial"]))
        del rows[n + 2:]
    with ThreadPoolExecutor(workers) as ex:
        for r, f, err in ex.map(fetch, jobs):
            if err:
                print("  skip %s: %s" % (r["url"], err), flush=True)
                continue
            r["file"] = str(f.relative_to(ROOT)).replace("\\", "/")
            r["downloaded"] = datetime.date.today().isoformat()
            print("got %-40s %7.0f kB" % (r["file"], f.stat().st_size / 1e3), flush=True)
    (ROOT / "candidates.json").write_text(json.dumps(cand, indent=1, ensure_ascii=False), encoding="utf-8")


def parse_landing(page):
    """licence + original-file facts from a Freesound sound page"""
    t = htmlmod.unescape(page)
    lic = re.findall(r'<a title="Go to the full license text" href="([^"]+)"[^>]*>\s*([^<]+?)\s*</a>', t)
    info = {}
    for key in ("Type", "Duration", "File size", "Sample rate", "Bit depth", "Channels"):
        m = re.search(r'<p class="text-grey no-margins">\s*%s\s*</p>\s*<p class="no-margins">\s*([^<]+?)\s*</p>'
                      % re.escape(key), t)
        if m:
            info[key] = m.group(1).strip()
    title = re.search(r"<title>\s*Freesound - (.+?) by ([^<]+?)\s*</title>", t)
    return {"licence_urls": sorted(set(u for u, _ in lic)), "licence_text": sorted(set(x for _, x in lic)),
            "file": info, "author": title.group(2) if title else None,
            "sound_title": title.group(1) if title else None}


def landing(ids_json):
    ids = json.loads(Path(ids_json).read_text(encoding="utf-8"))  # [{"id":..., "landing": url}, ...]
    p = ROOT / "landing.json"
    out = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    (ROOT / "landing_html").mkdir(exist_ok=True)
    for it in ids:
        if it["id"] in out:
            continue
        try:
            body, _ = get(it["landing"], accept="text/html")
        except Exception as e:
            print("  fail %s: %s" % (it["landing"], e), flush=True)
            out[it["id"]] = {"error": str(e), "landing": it["landing"]}
            time.sleep(5)
            continue
        page = body.decode("utf-8", "replace")
        (ROOT / "landing_html" / (it["id"][:8] + ".html")).write_text(page, encoding="utf-8")
        r = parse_landing(page)
        r.update(landing=it["landing"], checked=datetime.date.today().isoformat())
        out[it["id"]] = r
        print("%s %-60s %s %s" % (it["id"][:8], it["landing"][-60:], r["licence_text"], r["file"].get("Type")),
              flush=True)
        p.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
        time.sleep(2.5)
    p.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    arg = sys.argv[2] if len(sys.argv) > 2 else None
    ROOT.mkdir(parents=True, exist_ok=True)
    if cmd == "search":
        search(int(arg or 2))
    elif cmd == "download":
        download(int(arg or 2))
    elif cmd == "landing":
        landing(arg)
    elif cmd == "status":
        print(json.dumps(calls_load(), indent=1))
    else:
        sys.exit(__doc__)
