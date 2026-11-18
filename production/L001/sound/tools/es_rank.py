#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
es_rank.py kenney        rank the Kenney files that could cover a need  -> lib/_dl/rank_kenney.json
es_rank.py openverse     rank (and find best moments in) the Openverse candidates -> lib/_dl/rank_openverse.json
es_rank.py final         match every built file in lib/rec against its description -> lib/_dl/rank_final.json

Run with the earshot venv python (models load once per process). Reads audio only; nothing downloaded is executed.
"""
import glob
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIB = HERE.parent / "lib"
DL = LIB / "_dl"
KEN = DL / "kenney"

DESC = {
    "amb_restaurant": "an upscale restaurant ambience, indistinct murmur of many diners talking, no clear words",
    "amb_cutlery": "cutlery and plates clinking at restaurant tables",
    "amb_rain_window": "rain pattering on a window glass, heard from indoors",
    "amb_rain_street": "heavy rain pouring on a city street",
    "amb_wet_tyres": "a car driving past on a wet road, tyres hissing through water",
    "amb_rain_car": "rain drumming on a car roof, heard from inside the car",
    "amb_office_tone": "quiet room tone of an empty office, faint steady air hum",
    "amb_clock": "a wall clock ticking",
    "amb_drip_tiled": "water dripping in a tiled bathroom",
    "amb_birds_day": "daytime outdoor ambience with birds singing and a light wind",
    "fx_camera_shutter": "a mechanical film camera shutter click",
    "fx_photo_drop": "a few photographs dropped onto a wooden table, paper slap",
    "fx_folder": "a cardboard paper folder being opened and closed",
    "fx_paper_slide": "a sheet of paper sliding across a desk",
    "fx_stamp": "a rubber stamp thumped onto paper on a desk",
    "fx_typewriter": "mechanical typewriter keystrokes",
    "fx_typewriter_bell": "a typewriter carriage return with a bell ding",
    "fx_pen_write": "a pen writing on paper",
    "fx_glass_toast": "two wine glasses clinking together in a toast",
    "fx_box_knock": "knuckles tapping on a cardboard box",
    "fx_box_open": "opening the lid of a cardboard box",
    "fx_keys": "a bunch of metal keys jingling",
    "fx_sticker": "a sticker label slapped onto a surface",
    "fx_lamp_switch": "a desk lamp switch clicking on",
    "fx_lamp_hum": "the steady electrical hum of a lamp",
    "fx_tape_reel": "a reel-to-reel tape recorder running, motor and tape noise",
    "fx_headphones": "headphones being picked up and handled",
    "fx_crate_down": "a crate set down on the floor with a thud",
    "fx_mop_bucket": "a mop dropped into a bucket of water, splash",
    "fx_phone_ring": "an old bell telephone ringing",
    "fx_string_taut": "a string pulled taut",
    "fx_leather": "a leather jacket rustling and creaking",
    "fx_chair": "a wooden chair creaking",
    "fx_chair_scrape": "a chair scraping on the floor",
    "fx_door_slam": "a door slamming shut",
    "fx_door_knock": "knocking on a wooden door",
    "fx_steps_hard": "footsteps walking on a hard floor",
    "fx_car_door": "a car door closing",
    "fx_keyboard": "typing on a computer keyboard",
    "fx_phone_handset": "a telephone handset picked up and hung up",
    "amb_hvac": "a steady air conditioning ventilation hum",
    "amb_warehouse": "the ambience of a large empty warehouse",
    "fx_fluor_buzz": "the buzz of a fluorescent light",
    "amb_port": "a harbour ambience with water, gulls and distant machinery",
    "fx_ship_horn": "a distant ship horn",
    "amb_server": "the steady fan noise of a server room",
    "amb_diner": "a busy diner ambience, people talking, dishes clinking",
    "amb_dishpit": "washing dishes in a sink, water running and plates clattering",
    "amb_hall_crowd": "a crowd murmuring in a large hall",
    "fx_applause": "an audience applauding",
    "amb_newsroom": "a busy office ambience, people talking, phones and typing",
    "fx_scanner_beep": "a barcode scanner beep",
    "amb_trucks": "a large truck engine idling and driving past",
    "amb_crickets": "crickets chirping at night",
    "amb_phones_office": "many telephones ringing in an office",
    "amb_bar": "a bar ambience with people talking and glasses clinking",
    "fx_cash_register": "an old cash register drawer opening with a bell",
    "fx_coins": "coins jingling and dropped on a counter",
    "fx_flashbulb": "an old camera flash bulb popping",
    "fx_crowd_gasp": "a crowd gasping in surprise",
    "fx_radio_static": "radio static and tuning noise",
    "fx_pushpin": "a push pin pressed into a cork board",
    "fx_pencil_line": "a pencil drawing a line on paper",
    # second search round (same sounds, other queries)
    "fx_sticker_b": "a sticker label slapped onto a surface",
    "fx_pushpin_b": "a push pin pressed into a cork board",
    "fx_string_taut_b": "a string pulled taut",
    "fx_flashbulb_b": "an old camera flash bulb popping",
    "fx_crowd_gasp_b": "a crowd gasping in surprise",
    "amb_newsroom_b": "a busy office ambience, people talking, phones and typing",
    "fx_stamp_b": "a rubber stamp thumped onto paper on a desk",
}

# need -> Kenney globs (relative to lib/_dl/kenney)
KGLOB = {
    "fx_photo_drop": ["casino-audio/x/**/card-place-*", "casino-audio/x/**/card-fan-*", "casino-audio/x/**/card-shove-*"],
    "fx_paper_slide": ["casino-audio/x/**/card-slide-*", "casino-audio/x/**/card-shove-*"],
    "fx_folder": ["rpg-audio/x/**/book*"],
    "fx_box_open": ["casino-audio/x/**/cards-pack-*", "rpg-audio/x/**/bookOpen*"],
    "fx_chair": ["rpg-audio/x/**/creak*"],
    "fx_leather": ["rpg-audio/x/**/cloth*", "rpg-audio/x/**/dropLeather*", "rpg-audio/x/**/handleSmallLeather*",
                   "rpg-audio/x/**/beltHandle*"],
    "fx_keys": ["rpg-audio/x/**/handleCoins*", "rpg-audio/x/**/metalClick*", "rpg-audio/x/**/metalLatch*",
                "rpg-audio/x/**/beltHandle*"],
    "fx_lamp_switch": ["ui-audio/x/**/switch*", "interface-sounds/x/**/switch*", "interface-sounds/x/**/toggle*",
                       "ui-audio/x/**/click*"],
    "fx_crate_down": ["impact-sounds/x/**/impactWood_heavy*", "impact-sounds/x/**/impactPlank_medium*",
                      "impact-sounds/x/**/impactSoft_heavy*", "impact-sounds/x/**/impactWood_medium*"],
    "fx_box_knock": ["impact-sounds/x/**/impactSoft_medium*", "impact-sounds/x/**/impactGeneric_light*",
                     "impact-sounds/x/**/impactWood_light*"],
    "fx_glass_toast": ["impact-sounds/x/**/impactGlass_light*", "impact-sounds/x/**/impactGlass_medium*",
                       "interface-sounds/x/**/glass*"],
    "fx_stamp": ["impact-sounds/x/**/impactSoft_heavy*", "impact-sounds/x/**/impactGeneric_light*",
                 "impact-sounds/x/**/impactPunch_medium*", "rpg-audio/x/**/bookPlace*"],
    "fx_sticker": ["casino-audio/x/**/card-place-*", "impact-sounds/x/**/impactSoft_medium*"],
    "fx_mop_bucket": ["rpg-audio/x/**/metalPot*"],
    "fx_door_slam": ["rpg-audio/x/**/doorClose*"],
    "fx_steps_hard": ["impact-sounds/x/**/footstep_concrete*", "impact-sounds/x/**/footstep_wood*",
                      "rpg-audio/x/**/footstep*"],
    "fx_coins": ["rpg-audio/x/**/handleCoins*", "casino-audio/x/**/chips-handle-*"],
    "fx_door_knock": ["impact-sounds/x/**/impactWood_light*", "impact-sounds/x/**/impactPlank_medium*"],
}

# needs that reuse another need's downloads
SHARE = {"fx_typewriter_bell": "fx_typewriter", "fx_chair_scrape": "fx_chair", "fx_applause": "amb_hall_crowd",
         "fx_coins": "fx_cash_register"}

AMB_KINDS = {"fx_lamp_hum", "fx_tape_reel", "fx_fluor_buzz", "fx_radio_static", "fx_applause"}


def is_amb(need):
    return need.startswith("amb_") or need in AMB_KINDS


def compact(rows):
    return [{k: r[k] for k in ("name", "path", "z", "verdict", "sounds_most_like")} for r in rows]


def run_kenney(api):
    out = {}
    for need, globs in KGLOB.items():
        files = sorted({f for g in globs for f in glob.glob(str(KEN / g), recursive=True)
                        if f.lower().endswith((".ogg", ".wav"))})
        if not files:
            continue
        r = api.rank(files, DESC[need])
        out[need] = {"desc": DESC[need], "summary": r["summary"], "results": compact(r["results"][:8])}
        print("%-16s %s" % (need, r["summary"][:220]), flush=True)
    (DL / "rank_kenney.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")


def run_openverse(api, only=None):
    ov = DL / "openverse"
    cand = json.loads((ov / "candidates.json").read_text(encoding="utf-8"))
    p_out = DL / "rank_openverse.json"
    out = json.loads(p_out.read_text(encoding="utf-8")) if p_out.exists() else {}
    from earshot import audio
    needs = list(DESC)
    for need in needs:
        if only and need not in only:
            continue
        if need in out and not only:
            continue
        src = SHARE.get(need, need)
        rows = [r for r in cand.get(src, []) if r.get("file")]
        files = [str(ov / r["file"]) for r in rows if (ov / r["file"]).exists()]
        if not files:
            continue
        t0 = time.time()
        r = api.rank(files, DESC[need])
        res = compact(r["results"])
        for i, x in enumerate(res):
            x["dur"] = round(audio.duration(x["path"]), 2)
            try:
                # ambiences: the loop stretch is chosen model-free in build (steadiest window); spot: best
                # moments only in the 3 best-ranked files (CPU is shared)
                if not is_amb(need) and x["dur"] > 2.5 and i < 3:
                    f = api.find(x["path"], DESC[need], top=3, kind="auto")
                    x["find"] = [{k: s[k] for k in ("start", "end", "z", "verdict", "kind", "cut", "peak_dbfs")}
                                 for s in f["segments"]]
            except Exception as e:  # a bad file never stops the batch
                x["find_error"] = str(e)[:200]
        out[need] = {"desc": DESC[need], "summary": r["summary"], "results": res}
        print("%-18s %4.0fs %s" % (need, time.time() - t0, r["summary"][:200]), flush=True)
        p_out.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")


def run_final(api):
    led = json.loads((LIB / "ledger.json").read_text(encoding="utf-8"))
    out = {}
    for it in led["files"]:
        p = HERE.parent / it["path"]
        m = api.match(str(p), it["desc"])
        out[it["id"]] = {"z": m["z"], "verdict": m["verdict"], "near": [c["term"] for c in m["closest_vocab"][:3]]}
        print("%-28s z %+.2f %-9s %s" % (it["id"], m["z"], m["verdict"], out[it["id"]]["near"]), flush=True)
    (DL / "rank_final.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    from earshot import api
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "kenney":
        run_kenney(api)
    elif cmd == "openverse":
        run_openverse(api, set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None)
    elif cmd == "final":
        run_final(api)
    else:
        sys.exit(__doc__)
