# -*- coding: utf-8 -*-
"""6b. Средний уровень остатка/голоса вокруг событий картинки (event-locked average), независимо от детектора SFX.

Для каждого события: K-уровень no_vocals (и vocals как контроль) в окнах 20 мс от −1.0 до +1.0 с;
из каждой кривой вычитается её среднее на [−1.0, −0.5] с, затем медиана по событиям (дБ).
Если на склейках стоят вуши/удары, у медианы будет горб около 0; если нет — кривая плоская.
"""
from common import *

Z = np.load(os.path.join(TMP, "blocks.npz"))
J = json.load(open(os.path.join(DYN, "comp_shots.json"), encoding="utf-8"))
F = json.load(open(FINAL_JSON, encoding="utf-8"))["res"]["comp"]
dz = np.load(os.path.join(DYN, "comp.npz"))
cards = [(a / FPS, b / FPS) for a, b in runs(dz["luma"] < 6) if b - a >= 9]
sets = {"cut_hard": [t["t"] for t in J["trans"] if t["type"] == "hard"],
        "cut_styled": [t["t"] for t in J["trans"] if t["type"] != "hard"],
        "snap_zoom": [s[0] for s in F["snaps"] if s[1] == "zoom"],
        "snap_whip": [s[0] for s in F["snaps"] if s[1] == "whip"],
        "pop": F["pops"], "flash": F["flashes"],
        "card_in": [a for a, b in cards], "card_out": [b for a, b in cards]}
rng = np.random.default_rng(5)
sets["random"] = list(rng.uniform(2, J["dur"] - 2, 400))
lu = lambda p: -0.691 + pw_db(p)
k2 = lambda key: np.convolve(Z[key], np.ones(2) / 2, "same")
R, V, LF = k2("res_k"), k2("voc_k"), np.convolve(Z["res_oct8000"] + Z["res_oct4000"] + Z["res_oct2000"], np.ones(2) / 2, "same")
out = {"definitions": __doc__.strip().splitlines()[2:], "curves": {}}
offs = np.arange(-100, 101, 5)  # блоки по 10 мс → шаг 50 мс
for nm, ts in sets.items():
    cur = {"res": [], "voc": [], "res_hi": []}
    for t in ts:
        i = int(round(t / 0.01))
        if i - 100 < 0 or i + 101 > len(R):
            continue
        for key, arr in (("res", R), ("voc", V), ("res_hi", LF)):
            c = lu(arr[i + offs]) if key != "res_hi" else pw_db(arr[i + offs])
            cur[key].append(c - c[offs <= -50].mean())
    row = {"n": len(cur["res"])}
    A = np.array(cur["res"])
    win = (offs >= -30) & (offs <= 30)
    for th in (6, 10):
        row[f"share_res_rise_ge{th}dB_-300..+300ms"] = round(float((A[:, win].max(1) >= th).mean()), 3)
    for key in cur:
        A = np.array(cur[key])
        med = np.median(A, 0)
        row[key] = {f"{int(o * 10):+d}": round(float(v), 1) for o, v in zip(offs, med)}
        row[key + "_peak_-200..+300ms"] = round(float(med[(offs >= -20) & (offs <= 30)].max()), 1)
    out["curves"][nm] = row
update_json("event_locked", out)
for nm, row in out["curves"].items():
    print(f"{nm:11s} rise>=6dB {row['share_res_rise_ge6dB_-300..+300ms']:.3f}  >=10dB {row['share_res_rise_ge10dB_-300..+300ms']:.3f}  n={row['n']:4d} res peak {row['res_peak_-200..+300ms']:5.1f}  res_hi {row['res_hi_peak_-200..+300ms']:5.1f}  voc {row['voc_peak_-200..+300ms']:5.1f}")
    print("   res:", " ".join(f"{v:5.1f}" for k, v in list(row["res"].items())[10:32]))
