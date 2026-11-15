# The choices: which recording (slot, Openverse id prefix, trim in seconds) or earshot-bank sound feeds which stem.
# Read by build_overrides.py. Trims are the segments `earshot find` returned for the description of the sound.
G = {"gorge": -14}                       # a little of the canyon on sounds that happen on the bridge
PICKS = {
    # water
    "splash_final": ("splash_big", "fce993b0", 0.68, 2.54, {"gorge": -14}),
    "splash_distant": ("splash_big", "56bb430b", 1.01, 2.67, {"lp": 6000, "gorge": -9, "pan": -0.1}),
    "splash_small_0": ("splash_small", "db489ef4", 0.03, 0.93, {"lp": 4500, "gorge": -9, "pan": -0.5}),
    "splash_small_1": ("splash_small", "c6e56f1c", 0.01, 0.47, {"lp": 4500, "gorge": -9, "pan": 0.4}),
    "splash_small_2": ("splash_small", "d34abd9e", 0.16, 1.56, {"lp": 4500, "gorge": -9, "pan": -0.2}),
    "splash_small_3": ("splash_big", "34db007b", 0.24, 1.78, {"lp": 4500, "gorge": -9, "pan": 0.6}),
    # whistling soldiers
    "whistle_march": ("whistling", "5e776b1c", 11.75, 15.45, {"fi": 0.01, "fo": 0.15}),
    # field drum (used inside the music)
    "snare_roll": ("snare_roll", "9cc5ec07", 0.15, 7.80, {"gain_flat": 0.2, "fi": 0.01, "fo": 0.05}),
    "snare_hit_1": ("snare_roll", "e43b2b3d", 8.926, 9.390, {"fi": 0.002, "fo": 0.12}),
    "snare_hit_2": ("snare_roll", "e43b2b3d", 6.418, 6.883, {"fi": 0.002, "fo": 0.12}),
    "snare_hit_3": ("snare_roll", "e43b2b3d", 7.521, 7.986, {"fi": 0.002, "fo": 0.12}),
    "snare_hit_4": ("snare_roll", "e43b2b3d", 1.565, 2.204, {"fi": 0.002, "fo": 0.12}),
    # chain, planks, metal
    "chain_creak": ("chain", "2155381d", 2.36, 3.48, {"gorge": -16, "pan": -0.2, "fi": 0.003, "fo": 0.2}),
    "chain_clink": ("chain", "8b05e6f9", 0.78, 1.94, {"gorge": -16, "pan": 0.2}),
    "plank_creak_0": ("wood_creak", "6b26ddfa", 0.01, 0.36, {}),
    "plank_creak_1": ("wood_creak", "84658657", 0.36, 0.68, {}),
    "plank_creak_2": ("wood_creak", "2eb447ed", 0.00, 0.53, {}),
    "plank_creak_3": ("wood_creak", "84658657", 0.68, 0.89, {}),
    "bridge_creak": ("wood_creak", "05ee6729", 1.58, 3.29, {"gorge": -14, "fi": 0.03, "fo": 0.3}),
    "swing_creak_fwd": ("rope_creak", "6ae1e276", 2.62, 3.45, {"fi": 0.01, "fo": 0.25}),      # a rope under load, not the metal swing set
    "swing_creak_back": ("rope_creak", "6ae1e276", 20.82, 21.60, {"fi": 0.01, "fo": 0.25}),
    "metal_groan": ("metal_groan", "4669386e", 0.00, 1.34, {"gorge": -13, "pan": -0.2, "fi": 0.02}),
    "bridge_crack": ("wood_break", "93438db4", 0.75, 2.74, {"gorge": -12}),
    # people
    "cloth_grab": ("cloth", "ed150ae8", 8.23, 8.64, {}),
    "cloth_yank": ("cloth", "d64194ff", 0.10, 1.02, {"lp": 5000}),
    "soldiers_clatter": ("collide", "aee67877", 15.30, 16.79, {}),
    "soldiers_bodies": ("collide", "80894069", 0.48, 0.97, {}),
    "soft_bump": ("collide", "e5cabe55", 0.28, 0.61, {"lp": 1800}),
    "general_laugh": ("laugh_man", "69e07131", 9.31, 10.74, {"fi": 0.005}),
    "soldiers_chuckle": ("chuckle", "c3b99410", 2.41, 3.13, {}),          # AudioSet: Snicker / Chuckle (the first pick read as throat clearing)
    "soldiers_chuckle_b": ("chuckle", "9dc4903f", 7.90, 8.61, {}),
    "adjutant_laugh": ("laugh_man", "07e41743", 0.00, 1.00, {"fi": 0.005, "fo": 0.2}),
    "kid_squeal": ("kid", "9e08858d", 4.18, 4.81, {}),
    # feet
    "shuffle_steps": ("steps_wood", "f2a9b40e", 5.43, 9.05, {"fi": 0.01, "fo": 0.35}),
    "shuffle_steps_b": ("steps_wood", "6400bcb9", 9.98, 13.97, {"fi": 0.05, "fo": 0.35}),
    "stumble_steps": ("steps_wood", "010335f8", 0.50, 1.90, {"fi": 0.005, "fo": 0.25}),
    "breakstep_steps": ("steps_wood", "6400bcb9", 3.99, 7.00, {"fi": 0.03, "fo": 0.3}),
    "drum_plop": ("splash_small", "c6e56f1c", 0.01, 0.47, {"lp": 3500, "gorge": -10}),
    "step_single_1": ("steps_wood", "010335f8", 3.87, 4.15, {"fo": 0.06}),    # single steps: the "rain" of feet is scattered from these
    "step_single_2": ("steps_wood", "010335f8", 3.40, 3.85, {"fo": 0.06}),
    "step_single_3": ("steps_wood", "010335f8", 0.55, 0.76, {"fo": 0.05}),
    "step_single_4": ("steps_wood", "b1ef049e", 9.25, 9.79, {"fo": 0.06}),
    "sand_step": ("steps_sand", "e43ccf34", 6.77, 7.08, {"fo": 0.08}),
    "gear_rattle": ("gear", "45e39415", 3.06, 10.19, {"fi": 0.1, "fo": 0.3, "gain_flat": 0.4}),
    "chalk_tick": ("chalk", "83fbf696", 0.51, 0.86, {"fo": 0.05}),
    "thump_real": ("collide", "e2f533b4", 0.00, 1.00, {"lp": 420, "gorge": -16}),
    # Tried and dropped after listening (NOTES.md): two recorded flute notes sequenced as a sampler (flute_note 0f462f47 C4,
    # fd50a370 D4) read WORSE as a flute than the synthetic fife (z 1.8-2.5 against 4.1); a recorded wind howl for the gorge
    # (amb_wind 257c9326) read as "howl / animal" (z 2.5 against the synthetic bed's 3.2). The river is real, as its own layer.
    "amb_river": ("amb_river", "6793c93d", 4.0, 44.0, {"lp": 1800, "fi": 0.5, "fo": 0.5}),
    "amb_open": ("amb_field", "0b1b3f20", 10.0, 50.0, {"lp": 3500, "fi": 0.5, "fo": 0.5}),
    "amb_meadow": ("amb_field", "63bebe4b", 20.0, 28.0, {"fi": 0.3, "fo": 0.4}),
    # birds
    "bird_chirp": ("bird", "5e6e5327", 2.23, 3.62, {}),
    "bird_meadow": ("bird", "71d69c05", 1.17, 7.00, {"fi": 0.2, "fo": 0.4}),
}
BANKS = {
    "throw_whoosh": ("whoosh_fast/tight", {"anchor": "peak"}),
    "sign_ding": ("fit/bell/small_bell", {}),
    "bolt_ping": ("fit/bell/small_bell", {"gorge": -14, "pan": 0.35}),
    "push_tick": ("knock/wood", {}),
    # camera moves: short, tight air (rendered with --dur / --apex so the peak sits on the cut)
    "cam_whoosh_0": ("swish/stick", {"dir": "cam", "suffix": "_b", "anchor": "peak", "fo": 0.03, "hp": 700}),
    "cam_whoosh_1": ("swish/stick", {"dir": "cam", "anchor": "peak", "fo": 0.03, "hp": 700}),
    "cam_whoosh_2": ("swish/cane", {"dir": "cam", "suffix": "_b", "anchor": "peak", "fo": 0.03, "hp": 700}),
    "cam_whoosh_3": ("swish/cane", {"dir": "cam", "anchor": "peak", "fo": 0.03, "hp": 700}),
    "cam_push": ("whoosh_fast/heavy", {"dir": "cam", "anchor": "peak", "fo": 0.05, "hp": 350}),
    "stick_tok": ("fit/hit/bamboo_tok", {"dir": "cam"}),          # the drum sticks in the tumble
}
