#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audition_bank.py            (run with the earshot venv)

Renders candidates from the earshot sound bank for our cues and scores each one, and the current synthetic stem,
against the description of what the cue is meant to be (earshot match, best of the phrasings).
Writes sourcing/bank/<stem>/<id>.wav and sourcing/bank_audition.json.
"""
import json
import os
import sys

from earshot import api

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from listen import EXPECT  # noqa: E402

EXTRA = {
    "push_tick": ("толчок качелей", ["a light knock on wood", "a hand tapping a wooden seat", "a soft wooden tap"], ["a mouse click", "a synthesizer blip"]),
    "slowmo_subdrop": ("суб-спад", ["a sub bass drop", "a deep falling bass tone", "a low downward sweep"], ["a kick drum", "an engine"]),
    "riser_into_bucks": ("вдох перед ударом", ["a short riser building tension", "air being sucked in", "a reverse swell"], ["a wind gust", "white noise"]),
}
CAND = {
    "cloth_grab": ["swipe/cloth", "swipe/flick", "swipe/paper", "swipe/glide", "swipe/velvet", "swish/soft", "whoosh_fast/sleeve"],
    "throw_whoosh": ["whoosh_fast/crisp", "whoosh_fast/heavy", "whoosh_fast/tight", "whoosh_fast/sleeve", "whoosh_fast/whip",
                     "fit/whoosh.short/bamboo_swish", "swish/cane", "swish/stick"],
    "sign_ding": ["notify/m0", "notify/m1", "notify/m2", "notify/m4", "notify/m5", "fit/bell/small_bell", "mallet/glock", "pro_notify/ding_2045"],
    "push_thump": ["impact/punch", "pro_impact/deep", "pro_impact/short", "cut_hit/rumble", "cut_hit/punch", "sub_drop/punch"],
    "bolt_ping": ["fit/bell/small_bell", "pro_click/tink", "knock/snap", "shutter/snap", "notify/m5"],
    "splash_small_0": ["drip/drop", "drip/bubble", "drip/bloop", "drip/plink"],
    "push_tick": ["knock/wood", "knock/desk", "fit/land.light/finger_wood", "tap/knuckle", "fit/hit/bamboo_tok"],
    "slowmo_subdrop": ["pro_sub_drop/ref", "pro_sub_drop/low", "sub_drop/long", "downlifter/sub_sink"],
    "riser_into_bucks": ["riser/dark", "riser/snatch", "reverse_swell/breath", "reverse_swell/dark", "reverse_swell/short"],
    "bridge_snap": ["impact/classic", "impact/blast", "impact/metal", "pro_impact/rumble"],
    "boots_h4_L": ["cut_hit/punch", "pro_pop_in/deep", "knock/desk", "impact/punch"],
}


def main():
    exp = dict(EXPECT)
    exp.update(EXTRA)
    out = {}
    for stem, ids in CAND.items():
        ru, qs, alts = exp[stem]
        rows = []
        cur = os.path.join(HERE, "before_stems", stem + ".wav")
        files = [("synth (current)", cur)] if os.path.exists(cur) else []
        d = os.path.join(HERE, "sourcing", "bank", stem)
        os.makedirs(d, exist_ok=True)
        for i in ids:
            f = os.path.join(d, i.replace("/", "__") + ".wav")
            if not os.path.exists(f):
                api.sfx_render(i, f, sr=44100)
            files.append((i, f))
        for label, f in files:
            m = api.match(f, qs, alts=alts)
            rl = api.realness(f)
            rows.append({"id": label, "file": f, "z": m["z"], "verdict": m["verdict"], "query": m["query"], "p_real": rl.get("p_real")})
        rows.sort(key=lambda r: -r["z"])
        out[stem] = {"meant": ru, "rows": rows}
        print("%-17s %s" % (stem, " | ".join("%s %+.2f" % (r["id"], r["z"]) for r in rows)), flush=True)
    json.dump(out, open(os.path.join(HERE, "sourcing", "bank_audition.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
