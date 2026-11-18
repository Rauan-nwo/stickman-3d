# -*- coding: utf-8 -*-
"""5b. Калибровка порога SFX по картинке: какая доля найденных событий стоит на событии картинки.

Событие картинки = склейка, рывок камеры, появление/вспышка (замер dynamics) или вход/выход чёрной карточки.
Для каждого порога и для «удары петли» (music) против остальных: доля событий в ±150 мс от события картинки,
против доли для случайных моментов (шанс). Чем выше превышение над шансом — тем больше среди найденного
нарочных, привязанных к картинке звуков. Оценка точности: (доля − шанс) / (1 − шанс) — нижняя граница доли
«привязанных» SFX (эффекты бывают и не на событии картинки, напр. под слово).
"""
from common import *

S = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))
J = json.load(open(os.path.join(DYN, "comp_shots.json"), encoding="utf-8"))
F = json.load(open(FINAL_JSON, encoding="utf-8"))["res"]["comp"]
dz = np.load(os.path.join(DYN, "comp.npz"))
cards = [(a / FPS, b / FPS) for a, b in runs(dz["luma"] < 6) if b - a >= 9]
pic = np.sort(np.array([t["t"] for t in J["trans"]] + [s[0] for s in F["snaps"]] + F["pops"] + F["flashes"]
                       + [a for a, b in cards] + [b for a, b in cards]))
dur = J["dur"]
rng = np.random.default_rng(3)
rand = rng.uniform(1, dur - 1, 20000)


def dmin(ts):
    ts = np.asarray(ts)
    idx = np.searchsorted(pic, ts)
    lo = pic[np.clip(idx - 1, 0, len(pic) - 1)]
    hi = pic[np.clip(idx, 0, len(pic) - 1)]
    return np.minimum(np.abs(ts - lo), np.abs(ts - hi))


chance = float((dmin(rand) <= 0.15).mean())
res = {"picture_events": int(len(pic)), "picture_events_per_min": round(len(pic) / (dur / 60), 1),
       "chance_within_150ms": round(chance, 3), "by_thr": {}}
for thr, r in S["by_thr"].items():
    ev = r["events"]
    row = {}
    for name, sel in (("sfx", [e for e in ev if e["cls"] != "music"]), ("music_loop", [e for e in ev if e["cls"] == "music"])):
        if not sel:
            continue
        hit = dmin([e["t"] for e in sel]) <= 0.15
        row[name] = {"n": len(sel), "per_min": round(len(sel) / (dur / 60), 1), "share_on_picture_150ms": round(float(hit.mean()), 3),
                     "excess_over_chance": round(float((hit.mean() - chance) / (1 - chance)), 3)}
    # по классам
    cl = {}
    for c in sorted(set(e["cls"] for e in ev)):
        sel = [e for e in ev if e["cls"] == c]
        hit = dmin([e["t"] for e in sel]) <= 0.15
        cl[c] = {"n": len(sel), "share_on_picture_150ms": round(float(hit.mean()), 3)}
    row["by_class"] = cl
    # по контрасту
    bins = [(6, 10), (10, 15), (15, 20), (20, 99)]
    row["by_contrast"] = {}
    for lo, hi in bins:
        sel = [e for e in ev if lo <= e["contrast_db"] < hi and e["cls"] != "music"]
        if sel:
            row["by_contrast"][f"{lo}-{hi}dB"] = {"n": len(sel), "share_on_picture_150ms": round(float((dmin([e["t"] for e in sel]) <= 0.15).mean()), 3)}
    res["by_thr"][thr] = row
update_json("sfx_calibration", res)
print(json.dumps(res, indent=1, ensure_ascii=False))
