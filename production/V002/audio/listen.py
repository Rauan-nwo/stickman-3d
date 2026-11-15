#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
listen.py <stems dir> <out.json>          (run with the earshot venv: C:/dev/tools/earshot/.venv/Scripts/python)

Machine listening of the effect stems with earshot (CLAP + AudioSet tagger, CPU). For every important effect:
  * match  - how well the description of what it is MEANT to be fits (calibrated z; best of 2-3 phrasings)
             verdicts: z >= 3 strong, 2.5-3 plausible, 2-2.5 weak, < 2 no match
  * describe - what it actually sounds most like (top vocabulary tags) and the top AudioSet labels
  * realness - p_real (real / pro-produced vs code-synthesized)
Nothing is uploaded; the models run locally.
"""
import json
import os
import sys

from earshot import api

SYN = ["a synthesizer blip", "a white noise burst", "a video game sound effect"]
EXPECT = {   # stem: (what it is meant to be, phrasings, realistic confusions)
    "splash_distant": ("далёкий всплеск", ["a splash of something falling into water", "a distant water splash", "an object plunging into a river"], ["a bubble pop", "an explosion"] + SYN),
    "splash_final": ("финальный всплеск", ["a big water splash", "a splash of something falling into water", "a person falling into water"], ["a bubble pop", "an explosion"] + SYN),
    "splash_small_0": ("мелкий всплеск", ["a small water splash", "a water plop", "something small dropping into water"], ["a bubble pop"] + SYN),
    "whistle_march": ("насвистывание", ["a person whistling a tune", "a man whistling a melody", "human whistling"], ["a flute", "a sine wave tone", "a bird singing"]),
    "chain_creak": ("скрип цепи", ["a metal chain creaking under tension", "rusty metal creaking", "a metal squeak"], ["an insect buzzing", "an electric buzz", "a door hinge squeak"]),
    "chain_clink": ("звяканье цепи", ["a metal chain clinking", "metal links rattling", "a chain rattle"], ["a glass ting", "a bell"] + SYN),
    "plank_creak_0": ("скрип доски", ["a wooden plank creaking", "a creaking wooden floorboard", "wood creaking"], ["an insect buzzing", "a door hinge squeak", "an electric buzz"]),
    "swing_creak_fwd": ("скрип качелей", ["a rope swing creaking", "a creaking rope", "a swing creaking back and forth"], ["an insect buzzing", "a door hinge squeak", "an electric buzz"]),
    "bridge_creak": ("скрип моста", ["a large wooden structure creaking", "heavy wood and metal creaking", "a ship hull creaking"], ["an insect buzzing", "an engine", "an electric buzz"]),
    "metal_groan": ("стон металла", ["metal groaning under stress", "a large metal structure groaning", "metal creaking and straining"], ["an engine", "an electric buzz", "a low synth drone"]),
    "cloth_grab": ("рывок за воротник", ["a hand grabbing cloth", "fabric rustling quickly", "clothing being grabbed and pulled"], ["a whoosh", "a punch"] + SYN),
    "soldiers_clatter": ("столкновение солдат", ["people bumping into each other with gear clattering", "a clatter of wooden and metal objects", "equipment rattling and falling"], ["a drum fill", "typing on a keyboard"] + SYN),
    "bird_chirp": ("птица на цепи", ["a small bird chirping", "a songbird singing", "a bird tweet"], ["a synthesizer beep", "a video game blip", "a whistle"]),
    "bird_meadow": ("птицы у качелей", ["a small bird chirping", "a songbird singing", "birds singing in a meadow"], ["a synthesizer beep", "a video game blip", "a whistle"]),
    "general_laugh": ("смех генерала", ["a man laughing heartily", "a man laughing out loud", "male laughter"], ["a man coughing", "a man crying", "speech"]),
    "soldiers_chuckle": ("смешки солдат", ["several men chuckling", "a group of men laughing", "people laughing"], ["a crowd talking", "a man coughing", "speech"]),
    "kid_squeal": ("визг восторга ребёнка", ["a child squealing with delight", "a child laughing", "a kid giggling happily"], ["a child crying", "a scream", "a bird"]),
    # the rest of the ten main effects and other load-bearing ones
    "throw_whoosh": ("свист броска", ["a fast whoosh through the air", "a quick swoosh", "something thrown through the air"], ["a wind gust"] + SYN),
    "drum_tumble": ("барабан катится", ["a hollow drum tumbling and knocking", "a wooden object tumbling", "hollow knocks"], ["a door knock"] + SYN),
    "marbles": ("шарики (убраны из фильма)", ["glass marbles spilling and bouncing", "marbles rolling on a hard floor", "small glass balls bouncing"], ["coins dropping", "a glass ting"] + SYN),
    "stumble_steps": ("спотыкающиеся шаги (вместо шариков)", ["scattered stumbling footsteps on wood", "footsteps on a wooden floor", "a person walking unevenly"], ["knocking on a door", "a horse walking"] + SYN),
    "soft_bump": ("мягкий толчок", ["a soft body bump", "a muffled thud", "two people bumping into each other"], ["a kick drum", "a door closing"] + SYN),
    "bridge_crack": ("треск дерева (запись, слой)", ["wood cracking and breaking", "a wooden structure collapsing", "a loud wooden crack"], ["an explosion", "a gunshot"] + SYN),
    "cam_whoosh_0": ("свист камеры (переброс)", ["a short fast whoosh", "a quick swish through the air", "a whip pan whoosh transition"], ["a wind gust"] + SYN),
    "cam_push": ("свист наезда", ["a short fast whoosh", "a quick swish through the air", "a whip pan whoosh transition"], ["a wind gust"] + SYN),
    "drum_plop": ("бульк барабана", ["a small water plop", "a small water splash", "something small dropping into water"], ["a bubble pop"] + SYN),
    "shuffle_steps": ("шарканье", ["many footsteps shuffling on wood", "a crowd walking on a wooden floor", "footsteps on wooden planks"], ["knocking on a door", "a horse walking"] + SYN),
    "boots_h4_L": ("сапоги разом", ["many boots stomping at once", "a heavy stomp on wooden planks", "soldiers marching one step"], ["a kick drum", "a door slam"] + SYN),
    "sign_ding": ("динь таблички", ["a small bell ding", "a single bell chime", "a desk bell"], ["a glass ting"] + SYN),
    "officer_whistle": ("свисток офицера", ["a referee whistle", "a pea whistle blowing", "a police whistle"], ["a bird", "a kettle"] + SYN),
    "push_thump": ("низкий толчок", ["a deep low thump", "a heavy low impact", "a deep boom"], ["a kick drum", "an explosion"] + SYN),
    "rain_steps": ("шаги-дождь", ["light footsteps pattering on wood", "many light taps on wood", "rain drops on a wooden surface"], ["typing on a keyboard", "popcorn popping"] + SYN),
    "bolt_ping": ("болт", ["a metal ping", "a small metal object snapping and ringing", "a metallic ting"], ["a glass ting", "a bell"] + SYN),
    "bridge_snap": ("мост ломается", ["wood cracking and breaking", "a wooden structure collapsing", "a loud wooden crack"], ["an explosion", "a gunshot"] + SYN),
    "falling_whistle": ("свист падения", ["a falling whistle with descending pitch", "a cartoon falling sound", "something falling through the air whistling"], ["a siren", "a slide whistle"] + SYN),
    "boot_41_slowmo": ("сапог 41, замедление", ["a heavy slow stomp", "a deep low thud", "a heavy boot stomp on wood"], ["a kick drum", "an explosion"] + SYN),
    "mus_snare": ("малый барабан, марш", ["a snare drum playing a march cadence", "a military snare drum", "a marching drum beat"], ["white noise bursts", "a drum machine", "a hi-hat"]),
    "mus_fife": ("флейта-пикколо, тема", ["a fife playing a march tune", "a flute melody", "a piccolo playing"], ["a sine wave synthesizer melody", "a person whistling", "a chiptune melody"]),
}


def main():
    d, out = sys.argv[1], sys.argv[2]
    only = set(sys.argv[3:])
    res = {}
    for name, (ru, qs, alts) in EXPECT.items():
        if only and name not in only:
            continue
        f = os.path.join(d, name + ".wav")
        if not os.path.exists(f):
            res[name] = {"meant": ru, "missing": True}
            continue
        try:
            m = api.match(f, qs, alts=alts)
            ds = api.describe(f, top=4)
            rl = api.realness(f)
            aset = ds.get("audioset") or []
            res[name] = {
                "meant": ru, "query": m["query"], "z": m["z"], "verdict": m["verdict"], "p_vs_alts": m.get("p_vs_alts"),
                "all_z": {r["query"]: r["z"] for r in m["results"]},
                "sounds_like": [(t["term"], t["z"]) for t in ds.get("top_tags", [])[:3]],
                "audioset": [(a_.get("label") or a_.get("name"), round(a_.get("p", a_.get("score", 0)), 2)) for a_ in aset[:3]] if aset and isinstance(aset[0], dict) else aset[:3],
                "p_real": rl.get("p_real"), "real_verdict": rl.get("verdict"), "duration": ds.get("duration"),
            }
            r = res[name]
            print("%-17s z %+5.2f %-9s | like: %s | AS: %s | p_real %.2f" % (
                name, r["z"], r["verdict"], "; ".join("%s %+.1f" % (t, z) for t, z in r["sounds_like"][:2]),
                ", ".join("%s %s" % (a_[0], a_[1]) for a_ in r["audioset"][:2]) if r["audioset"] else "-", r["p_real"] or 0), flush=True)
        except Exception as e:                                   # one unreadable stem must not stop the run
            res[name] = {"meant": ru, "error": str(e)}
            print(name, "ERROR", e, flush=True)
    json.dump(res, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
