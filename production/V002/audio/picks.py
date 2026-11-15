# The choices: which recording (slot, Openverse id prefix, trim in seconds) or earshot-bank sound feeds which stem.
# Read by build_overrides.py. Trims are the segments `earshot find` returned for the description of the sound.
G = {"gorge": -14}                       # a little of the canyon on sounds that happen on the bridge
PICKS = {
    # water
    "splash_final": ("splash_big", "fce993b0", 0.68, 2.54, {"gorge": -14}),
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
    # people
    "cloth_grab": ("cloth", "ed150ae8", 8.23, 8.64, {}),
    "cloth_yank": ("cloth", "d64194ff", 0.10, 1.02, {"lp": 5000}),
    "soldiers_clatter": ("collide", "aee67877", 15.30, 16.79, {}),
    "soldiers_bodies": ("collide", "80894069", 0.48, 0.97, {}),
    "soft_bump": ("collide", "e5cabe55", 0.28, 0.61, {"lp": 1800}),
    "soldiers_chuckle_b": ("chuckle", "c3b99410", 2.41, 3.13, {}),        # the recorded snicker stays as the second voice
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
    "gear_rattle": ("gear", "45e39415", 3.06, 10.19, {"fi": 0.1, "fo": 0.3, "gain_flat": 0.4}),
    "chalk_tick": ("chalk", "83fbf696", 0.51, 0.86, {"fo": 0.05}),
    "thump_real": ("collide", "e2f533b4", 0.00, 1.00, {"lp": 420, "gorge": -16}),
    # Tried and dropped after listening (NOTES.md): two recorded flute notes sequenced as a sampler (flute_note 0f462f47 C4,
    # fd50a370 D4) read WORSE as a flute than the synthetic fife (z 1.8-2.5 against 4.1); a recorded wind howl for the gorge
    # (amb_wind 257c9326) read as "howl / animal" (z 2.5 against the synthetic bed's 3.2). The river is real, as its own layer.
    "amb_river": ("amb_river", "6793c93d", 4.0, 44.0, {"lp": 1800, "fi": 0.5, "fo": 0.5}),
    "amb_open": ("amb_field", "0b1b3f20", 10.0, 50.0, {"lp": 3500, "fi": 0.5, "fo": 0.5}),
    "amb_meadow": ("amb_field", "63bebe4b", 20.0, 28.0, {"fi": 0.3, "fo": 0.4}),
    "chain_tick": ("chain", "8b05e6f9", 2.06, 2.41, {"gorge": -18, "fo": 0.1}),          # one link ticking, per accented step
    "flag_flap": ("cloth", "e484e2f1", 6.42, 7.84, {"hp": 200, "fi": 0.05, "fo": 0.3}),     # banners on the ridge
    "kid_giggle": ("kid", "9e08858d", 2.02, 3.83, {"fi": 0.01, "fo": 0.2}),
    # birds
    "bird_chirp": ("bird", "5e6e5327", 2.23, 3.62, {}),
    "bird_meadow": ("bird", "71d69c05", 1.17, 7.00, {"fi": 0.2, "fo": 0.4}),
}
BANKS = {
    "throw_whoosh": ("whoosh_fast/tight", {"anchor": "peak"}),
    "sign_ding": ("fit/bell/small_bell", {}),
    "bolt_ping": ("fit/bell/small_bell", {"gorge": -14, "pan": 0.35}),
    "push_tick": ("knock/wood", {}),
    "spyglass_click": ("fit/snap/switch_flip", {"dir": "spy"}),
    # camera moves: short, tight air (rendered with --dur / --apex so the peak sits on the cut)
    "cam_whoosh_3": ("swish/cane", {"dir": "cam", "anchor": "peak", "fo": 0.03, "hp": 700}),
    "cam_push": ("whoosh_fast/heavy", {"dir": "cam", "anchor": "peak", "fo": 0.05, "hp": 350}),
    "stick_tok": ("fit/hit/bamboo_tok", {"dir": "cam"}),          # the drum sticks in the tumble
}

# Generated with ElevenLabs Sound Effects (engine/tools/sfx_eleven.py; prompts and cost in gen/gen_log.json).
# stem: (file prefix in gen/, start s, end s, options). Each one was kept only where it scored better than what it replaces.
GENS = {
    "splash_distant": ("drum_fall_a", 1.70, 3.95, {"fi": 0.002, "fo": 0.5}),     # the big splash, DRY: the canyon reverb turned it into a "bang" (z 2.7 against 4.2)
    "drum_tumble": ("drum_tumble_only", 0.03, 1.10, {"ramp_db": -10, "lp_end": 2500, "fo": 0.2}),   # dry too (reverb: z 1.6; dry with the fall-away ramp: 3.0)
    "soldiers_chuckle": ("chuckles", 0.00, 1.72, {"fi": 0.005, "fo": 0.2}),
    "general_laugh": ("general_laugh", 0.40, 1.95, {"fi": 0.01, "fo": 0.15}),
    "bridge_crack": ("bridge_snap_b", 0.00, 1.70, {"fo": 0.7}),          # dry (with reverb: z 3.8, under the recording it replaced)
    "splash_many": ("bodies_splashes", 2.20, 3.30, {"fi": 0.01, "fo": 0.2}),
    "bodies_fall": ("bodies_splashes", 0.00, 1.00, {"fi": 0.01, "fo": 0.3}),
    # the red march: single unison stomps cut out of two generated marches, re-timed onto the film's step grid
    "sand_step_0": ("march_sand", 0.08, 0.52, {"fo": 0.1}),
    "sand_step_1": ("march_sand", 0.55, 0.99, {"fo": 0.1}),
    "sand_step_2": ("march_sand", 1.01, 1.45, {"fo": 0.1}),
    "sand_step_3": ("march_sand", 1.46, 1.90, {"fo": 0.1}),
    "sand_step_4": ("march_sand", 1.94, 2.40, {"fo": 0.1}),
    "boot_wood_0": ("march_wood", 0.21, 0.63, {"fo": 0.1}),
    "boot_wood_1": ("march_wood", 0.69, 1.11, {"fo": 0.1}),
    "boot_wood_2": ("march_wood", 1.17, 1.59, {"fo": 0.1}),
    "boot_wood_3": ("march_wood", 1.62, 2.00, {"fo": 0.08}),
    "boot_wood_4": ("march_wood", 2.03, 2.50, {"fo": 0.1}),
    "boot_wood_5": ("march_wood", 2.55, 2.98, {"fo": 0.1}),
    "shuffle_gen": ("shuffle_wood", 0.00, 3.00, {"fi": 0.02, "fo": 0.4}),
    "murmur": ("murmur", 0.20, 1.90, {"fi": 0.1, "fo": 0.4}),
    # the figures' own voices (non-verbal)
    # the colonel's rage as a build: snort -> growl that rises under "His colonel grabs him by the collar" -> (his line) -> huff
    "colonel_snort": ("rage_build_b", 0.00, 0.60, {"fi": 0.01, "fo": 0.12}),
    "colonel_growl": ("rage_build_a", 0.00, 1.62, {"rise_db": 9, "fi": 0.03, "fo": 0.06}),
    "colonel_huff": ("rage_huff_a", 0.00, 0.90, {"fi": 0.005, "fo": 0.15}),
    # the enemy general when the bridge turns on them
    "general_gasp": ("general_gasp", 0.00, 0.78, {"fi": 0.005, "fo": 0.1}),
    "general_yell": ("general_yell_b", 0.00, 1.32, {"fi": 0.005, "fo": 0.15}),
    "captain_hm": ("captain_hm", 0.00, 0.50, {"fi": 0.005, "fo": 0.08}),
    "gasp": ("gasp", 0.00, 0.60, {"fi": 0.003, "fo": 0.15}),
    "adjutant_laugh": ("aide_giggle", 0.20, 1.20, {"fi": 0.01, "fo": 0.15}),
    "crowd_scream": ("crowd_scream", 0.00, 2.00, {"fi": 0.02, "fo": 0.5}),
    # the bridge as a character
    "bridge_groan": ("bridge_groan", 0.09, 3.56, {"fi": 0.05, "fo": 0.5}),
    "metal_ping": ("metal_ping", 0.50, 0.95, {"gorge": -14, "fo": 0.15}),
    "cam_whoosh_0": ("whoosh_tight_a", 0.04, 0.34, {"anchor": "peak", "hp": 400, "fi": 0.01, "fo": 0.05}),
    "cam_whoosh_1": ("whoosh_tight_b", 0.12, 0.42, {"anchor": "peak", "hp": 400, "fi": 0.02, "fo": 0.06}),
    "cam_whoosh_2": ("whoosh_tight_a", 0.04, 0.34, {"anchor": "peak", "hp": 700, "fi": 0.01, "fo": 0.05}),
}
