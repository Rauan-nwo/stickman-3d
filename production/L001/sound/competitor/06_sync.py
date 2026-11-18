# -*- coding: utf-8 -*-
"""6. Синхрон звука с картинкой: склейки, рывки камеры (snap), появления (pop) против начала SFX.

Склейки и события картинки — из замера dynamics (comp_shots.json / final.json, 30 к/с, кадр = 33.3 мс).
SFX — tmp/sfx_res.json (sfx_density.py по no_vocals), берётся порог THR.
Для каждого события картинки: ближайшее начало SFX (смещение = SFX − событие; минус = звук раньше картинки),
доля попаданий в ±67 мс (±2 кадра) и ±150 мс; базовая линия — те же доли для случайных моментов (сколько
совпадёт «само собой» при такой плотности SFX). Вуш: время пика огибающей против склейки.
"""
import collections

from common import *

THR = sys.argv[1] if len(sys.argv) > 1 else "10.0"
DYNF = os.path.join(DYN, "comp_shots.json")
J = json.load(open(DYNF, encoding="utf-8"))
F = json.load(open(FINAL_JSON, encoding="utf-8"))["res"]["comp"]
S = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))
ev = [e for e in S["by_thr"][THR]["events"] if e["cls"] != "music"]
on = np.array([e["t"] for e in ev])
cls = np.array([e["cls"] for e in ev])
dur = J["dur"]

starts = [s["start"] for s in J["shots"]][1:]
trans = J.get("trans", [])
# тип перехода по ближайшему времени
ttype = []
for s in starts:
    best = min(trans, key=lambda t: abs(t.get("t", t.get("time", -99)) - s)) if trans else None
    ok = best is not None and abs(best.get("t", best.get("time", -99)) - s) < 0.05
    ttype.append(best["type"] if ok else "hard")
cuts = np.array(starts)
snaps = np.array([s[0] for s in F["snaps"]])
snapk = [s[1] for s in F["snaps"]]
pops = np.array(F["pops"] + F["flashes"])

rng = np.random.default_rng(1)
rand = rng.uniform(1, dur - 1, 20000)


def nearest(ts, pool=on):
    idx = np.searchsorted(pool, ts)
    lo = pool[np.clip(idx - 1, 0, len(pool) - 1)]
    hi = pool[np.clip(idx, 0, len(pool) - 1)]
    return np.where(np.abs(lo - ts) <= np.abs(hi - ts), lo - ts, hi - ts)


def stats(ts, name, pool=on):
    if not len(ts):
        return {"n": 0}
    off = nearest(np.asarray(ts), pool)
    base = nearest(rand, pool)
    w67, w150 = np.abs(off) <= 0.067, np.abs(off) <= 0.150
    r = {"n": int(len(ts)),
         "share_sfx_within_67ms": round(float(w67.mean()), 3),
         "share_sfx_within_150ms": round(float(w150.mean()), 3),
         "chance_67ms": round(float((np.abs(base) <= 0.067).mean()), 3),
         "chance_150ms": round(float((np.abs(base) <= 0.150).mean()), 3),
         "offset_ms_within_150": {**pct(off[w150] * 1000, (10, 25, 50, 75, 90), 0)},
         "share_sound_before_picture_within_150": round(float((off[w150] < 0).mean()), 3) if w150.any() else None,
         "offset_hist_ms_within_250": dict(collections.Counter(
             int(np.round(o * 1000 / 33.333)) for o in off[np.abs(off) <= 0.25])),
         }
    r["offset_hist_ms_within_250"] = {f"{k * 33}": v for k, v in sorted(r["offset_hist_ms_within_250"].items())}
    # классы SFX, попавшие в ±150 мс
    idx = np.searchsorted(on, np.asarray(ts) + off)
    idx = np.clip(idx, 0, len(on) - 1)
    r["classes_within_150ms"] = dict(collections.Counter(cls[idx[w150]]).most_common())
    return r


res = {"threshold_db": float(THR), "n_sfx": int(len(on)), "sfx_per_min": round(len(on) / (dur / 60), 1),
       "definitions": {"offset": "время начала SFX − время события картинки; минус = звук раньше",
                       "chance": "та же доля для 20000 случайных моментов при той же плотности SFX"}}
res["cuts_all"] = stats(cuts, "cuts")
for k in sorted(set(ttype)):
    res[f"cuts_{k}"] = stats(cuts[np.array(ttype) == k], k)
res["snaps_all"] = stats(snaps, "snaps")
for k in sorted(set(snapk)):
    res[f"snaps_{k}"] = stats(snaps[np.array(snapk) == k], k)
res["pops_flashes"] = stats(pops, "pops")

# вуши/райзеры у склеек: пик огибающей против склейки
W = []
for e in ev:
    if e["cls"] in ("whoosh", "riser"):
        tpk = e["ipeak"] * 0.01 + 0.01
        d = cuts - tpk
        j = int(np.argmin(np.abs(d)))
        if abs(d[j]) <= 0.5:
            W.append({"cls": e["cls"], "onset_minus_cut_ms": round((e["t"] - cuts[j]) * 1000),
                      "peak_minus_cut_ms": round((tpk - cuts[j]) * 1000)})
res["whoosh_riser_near_cut"] = {
    "n": len(W), "n_whoosh_riser_total": int(sum(e["cls"] in ("whoosh", "riser") for e in ev)),
    "peak_minus_cut_ms": pct([w["peak_minus_cut_ms"] for w in W], (10, 25, 50, 75, 90), 0),
    "onset_minus_cut_ms": pct([w["onset_minus_cut_ms"] for w in W], (10, 25, 50, 75, 90), 0)}
# какие SFX вообще стоят на склейках: доля SFX в ±150 мс от склейки
d_on = np.abs(nearest(on, np.sort(cuts)))
res["share_of_sfx_on_cuts_150ms"] = round(float((d_on <= 0.15).mean()), 3)
res["share_of_sfx_on_cut_or_snap_or_pop_150ms"] = round(float(
    ((d_on <= 0.15) | (np.abs(nearest(on, np.sort(snaps))) <= 0.15) | (np.abs(nearest(on, np.sort(pops))) <= 0.15)).mean()), 3)
by_cls = {}
for c in sorted(set(cls)):
    m = cls == c
    by_cls[c] = {"n": int(m.sum()), "share_on_cut_150ms": round(float((d_on[m] <= 0.15).mean()), 3)}
res["sfx_class_share_on_cuts"] = by_cls
update_json("sync", res)
print(json.dumps(res, indent=1, ensure_ascii=False))
