# -*- coding: utf-8 -*-
"""7. Отношения внутри микса: дакинг, фон/рум-тон, долгосрочный спектр по октавам, «вырезание» музыки под голос.

Входы: tmp/blocks.npz (энергии 10 мс), tmp/vad.npz (речь), tmp/music.npz (музыка), tmp/sfx_res.json (SFX, порог THR).
"""
from common import *

THR = sys.argv[1] if len(sys.argv) > 1 else "10.0"
Z = np.load(os.path.join(TMP, "blocks.npz"))
BLK = float(Z["blk"])
sp = np.load(os.path.join(TMP, "vad.npz"))["speech"]
mu = np.load(os.path.join(TMP, "music.npz"))["music"]
NB = min(len(sp), len(mu), len(Z["res_k"]))
sp, mu = sp[:NB], mu[:NB]
ev = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))["by_thr"][THR]["events"]
sfx = np.zeros(NB, bool)
for e in ev:
    a = max(0, int((e["t"] - 0.05) / BLK))
    b = min(NB, int((e["t"] + e["dur_ms"] / 1000 + 0.10) / BLK))
    sfx[a:b] = True
OCT = [float(v) for v in Z["oct"]]
ONAMES = [f"oct{int(fc) if fc >= 63 else fc}" for fc in OCT]


def lu(p):
    return -0.691 + pw_db(p)


def seg_lu(key, a, b):
    return float(lu(Z[key][max(0, a):min(NB, b)].mean()))


# ---------- (a) дакинг ----------
spr = runs(sp)
pause_runs = [(a, b) for a, b in runs(~sp) if a > 0 and b < NB]
end_traj, start_traj, end_lf, start_lf, jump, jump_lf = [], [], [], [], [], []
BINS_E = [(-100 + 10 * k, -90 + 10 * k) for k in range(0, 17)]  # от −1.0 до +0.7 с шагом 100 мс (в блоках 10 мс)
for (a, b), (c, d) in zip(spr[:-1], spr[1:]):
    # b — конец фразы, c — начало следующей; пауза [b, c)
    if c - b < 80 or b - a < 120:
        continue
    if mu[b - 100:b + 70].mean() < 0.9 or sfx[b - 20:b + 70].any():
        continue
    ref = seg_lu("res_k", b - 100, b - 20)
    end_traj.append([seg_lu("res_k", b + 10 * k - 100, b + 10 * k - 90) - ref for k in range(17)])
    reflf = seg_lu("res_lt120", b - 100, b - 20)
    end_lf.append([seg_lu("res_lt120", b + 10 * k - 100, b + 10 * k - 90) - reflf for k in range(17)])
    jump.append(seg_lu("res_k", b + 10, b + 50) - ref)
    jump_lf.append(seg_lu("res_lt120", b + 10, b + 50) - reflf)
for (a, b), (c, d) in zip(spr[:-1], spr[1:]):
    if c - b < 80 or d - c < 120:
        continue
    if mu[c - 70:c + 100].mean() < 0.9 or sfx[c - 70:c + 20].any():
        continue
    ref = seg_lu("res_k", c - 70, c - 20)
    start_traj.append([seg_lu("res_k", c + 10 * k - 70, c + 10 * k - 60) - ref for k in range(17)])
    reflf = seg_lu("res_lt120", c - 70, c - 20)
    start_lf.append([seg_lu("res_lt120", c + 10 * k - 70, c + 10 * k - 60) - reflf for k in range(17)])


def med_curve(arr, t0):
    if not arr:
        return {}
    A = np.array(arr)
    return {f"{t0 + 100 * k:+d}ms": round(float(np.median(A[:, k])), 1) for k in range(A.shape[1])}


# глубина: музыка в паузах против музыки под речью, в одних и тех же музыкальных кусках (окна по 10 с)
depth = []
for s0 in range(0, NB - 1000, 1000):
    sl = slice(s0, s0 + 1000)
    m_sp = mu[sl] & sp[sl] & ~sfx[sl]
    m_pa = mu[sl] & ~sp[sl] & ~sfx[sl]
    # паузы без краёв (по 50 мс от речи)
    m_pa = m_pa & ~np.convolve(sp[sl].astype(float), np.ones(11), "same").astype(bool)
    if m_sp.sum() >= 300 and m_pa.sum() >= 40:
        depth.append({"t": s0 * BLK,
                      "full": float(lu(Z["res_k"][sl][m_pa].mean()) - lu(Z["res_k"][sl][m_sp].mean())),
                      "lt120": float(pw_db(Z["res_lt120"][sl][m_pa].mean()) - pw_db(Z["res_lt120"][sl][m_sp].mean()))})
ducking = {
    "definitions": {
        "end_trajectory": "уровень остатка (K) в окнах 100 мс от −1.0 до +0.7 с относительно конца фразы, "
                          "минус уровень в [−1.0, −0.2] с; только паузы >= 0.8 с внутри музыки, без SFX рядом",
        "start_trajectory": "то же относительно начала фразы после паузы >= 0.8 с, опора — [−0.7, −0.2] с",
        "lt120": "та же кривая по полосе < 120 Гц (бас музыки; голоса там почти нет — меньше подтёков Demucs)",
        "pause_minus_speech_10s": "в окнах 10 с: уровень музыки в паузах (без краёв 50 мс и без SFX) − под речью",
    },
    "n_phrase_ends": len(end_traj), "n_phrase_starts": len(start_traj),
    "after_phrase_end_full": med_curve(end_traj, -1000),
    "after_phrase_end_lt120": med_curve(end_lf, -1000),
    "jump_100_500ms_after_end_LU": pct(jump, (10, 25, 50, 75, 90), 1),
    "jump_100_500ms_after_end_lt120_dB": pct(jump_lf, (10, 25, 50, 75, 90), 1),
    "around_phrase_start_full": med_curve(start_traj, -700),
    "around_phrase_start_lt120": med_curve(start_lf, -700),
    "pause_minus_speech_10s_windows": {"n": len(depth), "full_LU": pct([d["full"] for d in depth], (10, 25, 50, 75, 90), 1),
                                       "lt120_dB": pct([d["lt120"] for d in depth], (10, 25, 50, 75, 90), 1)},
}

# ---------- (b) фон / рум-тон ----------
near_sp = np.convolve(sp.astype(float), np.ones(31), "same") > 0  # ±150 мс от речи
near_sfx = np.convolve(sfx.astype(float), np.ones(21), "same") > 0
amb = ~near_sp & ~mu & ~near_sfx
amb_runs = [(a, b) for a, b in runs(amb) if b - a >= 20]
amb_m = np.zeros(NB, bool)
for a, b in amb_runs:
    amb_m[a:b] = True


def tilt(mask, pref="res"):
    v = np.array([pw_db(Z[f"{pref}_{o}"][mask].mean()) for o in ONAMES])
    sel = [i for i, f in enumerate(OCT) if 63 <= f <= 8000]
    k = np.polyfit(np.log2(np.array(OCT)[sel]), v[sel], 1)[0]
    return round(float(k), 2), {o: round(float(x), 1) for o, x in zip(ONAMES, v)}


ambience = {"definitions": {"frames": "нет речи в ±150 мс, нет музыки (детектор), нет SFX в ±100 мс; куски >= 200 мс",
                            "tilt": "наклон октавного спектра 63 Гц-8 кГц, дБ/октаву (линейная регрессия)"},
            "share_of_runtime": round(float(amb_m.mean()), 4), "seconds": round(float(amb_m.sum() * BLK), 1),
            "n_spans": len(amb_runs)}
if amb_m.sum() >= 50:
    r400 = [lu(Z["res_k"][a:b].mean()) for a, b in amb_runs]
    ambience["rest_LUFS_per_span"] = pct(r400, (10, 50, 90), 1)
    ambience["mix_LUFS_per_span"] = pct([lu(Z["mix_k"][a:b].mean()) for a, b in amb_runs], (10, 50, 90), 1)
    ambience["rest_tilt_db_per_oct"], ambience["rest_octaves_dB"] = tilt(amb_m)
    ambience["spans"] = [{"t": round(a * BLK, 2), "dur": round((b - a) * BLK, 2), "rest_LUFS": round(float(lu(Z["res_k"][a:b].mean())), 1)}
                         for a, b in amb_runs][:80]
# пол голосовой дорожки в паузах (шум записи / подтёки)
pz = ~near_sp
ambience["vocals_stem_in_pauses_LUFS"] = round(float(lu(Z["voc_k"][pz].mean())), 1)
# пол музыки в паузах (музыка есть, SFX нет)
mp = ~near_sp & mu & ~near_sfx
ambience["music_only_pauses"] = {"seconds": round(float(mp.sum() * BLK), 1), "rest_LUFS": round(float(lu(Z["res_k"][mp].mean())), 1)}
ambience["music_only_pauses"]["tilt_db_per_oct"], ambience["music_only_pauses"]["octaves_dB"] = tilt(mp)

# ---------- (c) долгосрочный спектр ----------
spec = {}
for name in ("mix", "voc", "res"):
    v = np.array([pw_db(Z[f"{name}_{o}"].mean()) for o in ONAMES])
    spec[name] = {o: round(float(x), 1) for o, x in zip(ONAMES, v)}
    spec[name + "_rel_to_1k"] = {o: round(float(x - v[ONAMES.index("oct1000")]), 1) for o, x in zip(ONAMES, v)}
spec["voc_minus_res_under_speech_by_octave"] = {
    o: round(float(pw_db(Z[f"voc_{o}"][sp & mu].mean()) - pw_db(Z[f"res_{o}"][sp & mu].mean())), 1) for o in ONAMES}
spec["tilt_db_per_oct"] = {n: round(float(np.polyfit(np.log2(np.array(OCT)[1:9]),
                                                      [spec[n][o] for o in ONAMES[1:9]], 1)[0]), 2) for n in ("mix", "voc", "res")}

# ---------- (d) вырезание 1-4 кГц ----------
carve = []
for s0 in range(0, NB - 1000, 1000):
    sl = slice(s0, s0 + 1000)
    m_sp = mu[sl] & sp[sl] & ~sfx[sl]
    m_pa = mu[sl] & ~near_sp[sl] & ~near_sfx[sl]
    if m_sp.sum() >= 300 and m_pa.sum() >= 40:
        d = {}
        for o in ONAMES + ["b1k_4k", "lt120"]:
            d[o] = float(pw_db(Z[f"res_{o}"][sl][m_sp].mean()) - pw_db(Z[f"res_{o}"][sl][m_pa].mean()))
        d["full"] = float(pw_db(Z["res_mid"][sl][m_sp].mean()) - pw_db(Z["res_mid"][sl][m_pa].mean()))
        carve.append(d)
carving = {"definitions": {"delta": "в окнах 10 с с музыкой: уровень полосы остатка под речью − в паузах (дБ); "
                                    "carve_index = Δ(1-4 кГц) − Δ(125-500 Гц): < 0 — середина под голосом проваливается "
                                    "сильнее, чем низ (признак EQ/динамического EQ под голос)",
                           "caveat": "Demucs подмешивает в no_vocals хвосты голоса (поднимает 1-4 кГц под речью) и "
                                     "сам вырезает музыку в полосе голоса (опускает) — знак индекса надёжнее величины"},
           "n_windows": len(carve)}
if carve:
    for o in ONAMES + ["b1k_4k", "lt120", "full"]:
        carving[f"delta_{o}_dB"] = pct([c[o] for c in carve], (25, 50, 75), 1)
    ci = [c["b1k_4k"] - (c["oct250"] + c["oct500"]) / 2 for c in carve]
    carving["carve_index_dB"] = pct(ci, (10, 25, 50, 75, 90), 1)

# стерео остатка и голоса
stereo = {n: round(float(pw_db(Z[f"{n}_side"].sum()) - pw_db(Z[f"{n}_mid"].sum())), 1) for n in ("mix", "voc", "res")}

out = {"ducking": ducking, "ambience": ambience, "spectrum_octaves": spec, "music_carving": carving,
       "side_minus_mid_dB": stereo}
update_json("mix_relations", out)
print(json.dumps(out, indent=1, ensure_ascii=False)[:9000])
