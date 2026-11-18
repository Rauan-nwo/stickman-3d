# -*- coding: utf-8 -*-
"""5d. Сводка SFX по порогам: в минуту, по классам, «звуковые моменты», отдельно во времени с музыкой и без.

Пересчитывает сводки из сохранённых событий tmp/sfx_res.json той же функцией summarize() из sfx_density.py
(чтобы цифры совпадали с тем, что напечатает детектор на наших стемах), и делит время по маске музыки
(tmp/music.npz): без музыки остаток = эффекты + фон, там детектор почти не путает SFX с нотами музыки.
"""
from common import *
import sfx_density as SD

S = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))
dur = S["duration_s"]
mu = np.load(os.path.join(TMP, "music.npz"))["music"]
sp = np.load(os.path.join(TMP, "vad.npz"))["speech"]
dz = np.load(os.path.join(DYN, "comp.npz"))
cards = [(a / FPS, b / FPS) for a, b in runs(dz["luma"] < 6) if b - a >= 9]
nomus_s = float((~mu).sum() * 0.01)
mus_s = float(mu.sum() * 0.01)
res = {"definitions": {"per_min": "события детектора (без ударов музыкальной петли) в минуту",
                       "moments": "события ближе 0.4 с слиты в один «звуковой момент»",
                       "no_music": f"время без музыки по маске 04b ({round(nomus_s, 1)} с) — там счёт честнее",
                       "music": f"время с музыкой ({round(mus_s, 1)} с) — там детектор ловит и ноты/удары музыки "
                                "(верхняя граница)"},
       "floor_lufs20": S["floor_lufs20"], "by_thr": {}}
for thr, r in S["by_thr"].items():
    ev = r["events"]
    summ = SD.summarize(ev, dur)
    r["summary"] = summ
    sfx = [e for e in ev if e["cls"] != "music"]
    inmu = [e for e in sfx if mu[min(len(mu) - 1, int(e["t"] / 0.01))]]
    nomu = [e for e in sfx if not mu[min(len(mu) - 1, int(e["t"] / 0.01))]]
    sn = SD.summarize(nomu, nomus_s) if nomus_s > 0 else None
    sm = SD.summarize(inmu, mus_s) if mus_s > 0 else None
    row = {k: summ[k] for k in ("n", "per_min", "moments_per_min", "n_music_loop_hits_excluded", "class_per_min")}
    row["no_music"] = {"n": len(nomu), "per_min": round(len(nomu) / (nomus_s / 60), 1) if nomus_s else None,
                       "moments_per_min": sn["moments_per_min"] if sn else None,
                       "class_per_min": sn["class_per_min"] if sn else None}
    row["music"] = {"n": len(inmu), "per_min": round(len(inmu) / (mus_s / 60), 1) if mus_s else None,
                    "moments_per_min": sm["moments_per_min"] if sm else None}
    row["inside_black_text_cards_per_min"] = round(sum(1 for e in sfx if any(a <= e["t"] <= b for a, b in cards))
                                                   / (sum(b - a for a, b in cards) / 60), 1)
    row["during_speech_share"] = round(float(np.mean([sp[min(len(sp) - 1, int(e["t"] / 0.01))] for e in sfx])), 3)
    row["peak_lufs20"] = pct([e["peak_lufs20"] for e in sfx], (10, 50, 90), 1)
    row["contrast_db"] = pct([e["contrast_db"] for e in sfx], (10, 50, 90), 1)
    row["per_minute_n"] = [p["n"] for p in summ["per_minute"]]
    res["by_thr"][thr] = row
json.dump(S, open(os.path.join(TMP, "sfx_res.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
update_json("sfx", res)
print(json.dumps(res, indent=1, ensure_ascii=False))
