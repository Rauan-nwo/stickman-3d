# -*- coding: utf-8 -*-
"""9. Звук на титрах глав: что звучит на чёрной карточке с названием главы.

Для каждой из 8 карточек (тёмный кадр с названием, найден по яркости кадра около времени главы из описания):
- когда замолкает и возвращается голос (VAD), длина карточки;
- уровень микса/остатка на карточке (K, LUFS), пик 20 мс, ширина стерео (side − mid) на карточке и под речью рядом;
- события остатка (детектор SFX, порог 6, включая «удары петли») на карточке;
- похожесть стингов друг на друга: корреляция log-mel (64 полосы) остатка на отрезке [вход карточки − 0.4, +2.2 с];
- earshot describe по остатку на [вход − 0.4, выход + 0.2] с (теги, AudioSet) — запускать питоном earshot.
"""
import warnings

from common import *

warnings.filterwarnings("ignore")
Z = np.load(os.path.join(TMP, "blocks.npz"))
sp = np.load(os.path.join(TMP, "vad.npz"))["speech"]
M = np.load(os.path.join(TMP, "logmel64.npy")) if os.path.exists(os.path.join(TMP, "logmel64.npy")) else None
ev = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))["by_thr"]["6.0"]["events"]
dz = np.load(os.path.join(DYN, "comp.npz"))
cards = [(a / FPS, b / FPS) for a, b in runs(dz["luma"] < 6) if b - a >= 9]
lu = lambda p: -0.691 + pw_db(p)
rows = []
for t0, name in CHAPTERS[1:]:
    a, b = min(cards, key=lambda c: abs(c[1] - (t0 + 2.5)))
    # если перед названием была карточка с цитатой (одна тёмная полоса) — титр = последние ~2.1 с
    title_a = max(a, b - 2.15)
    ia, ib = int(title_a / 0.01), int(b / 0.01)
    k = ia
    while k > 0 and not sp[k]:
        k -= 1
    vstop = k * 0.01
    k = ib
    while k < len(sp) - 1 and not sp[k]:
        k += 1
    vback = k * 0.01
    near = np.r_[max(0, ia - 1000):ia - 50, ib + 50:ib + 1000]
    near = near[sp[near]]
    r = {"chapter": name, "card_dark_span": [round(a, 2), round(b, 2)], "title_in": round(title_a, 2), "title_out": round(b, 2),
         "mmss": mmss(title_a), "voice_stops": round(vstop, 2), "voice_back": round(vback, 2),
         "silence_of_voice_s": round(vback - vstop, 2),
         "mix_LUFS_on_title": round(float(lu(Z["mix_k"][ia:ib].mean())), 1),
         "rest_LUFS_on_title": round(float(lu(Z["res_k"][ia:ib].mean())), 1),
         "rest_LUFS_under_speech_±10s": round(float(lu(Z["res_k"][near].mean())), 1),
         "mix_peak_LUFS20_on_title": round(float(lu(np.convolve(Z["mix_k"][ia - 40:ib], np.ones(2) / 2, "valid")).max()), 1),
         "side_minus_mid_on_title_dB": round(float(pw_db(Z["res_side"][ia:ib].sum()) - pw_db(Z["res_mid"][ia:ib].sum())), 1),
         "side_minus_mid_rest_under_speech_dB": round(float(pw_db(Z["res_side"][near].sum()) - pw_db(Z["res_mid"][near].sum())), 1),
         "events_on_title": [{"dt": round(e["t"] - title_a, 2), "cls": e.get("cls_raw", e["cls"]), "contrast": e["contrast_db"],
                              "peak": e["peak_lufs20"]} for e in ev if title_a - 0.5 <= e["t"] <= b + 0.3]}
    # огибающая остатка вокруг входа титра: −1 … +3 с шагом 0.25 с
    r["rest_LUFS_curve_from_-1s_step_0.25"] = [round(float(lu(Z["res_k"][ia + s:ia + s + 25].mean())), 1)
                                               for s in range(-100, 300, 25)]
    rows.append(r)

sim = None
if M is not None:
    P = []
    for r in rows:
        i = int((r["title_in"] - 0.4) / 0.01)
        p = M[:, i:i + 260].astype(np.float64)
        p = p - p.mean()
        P.append(p / np.linalg.norm(p))
    sim = np.round(np.array([[float((x * y).sum()) for y in P] for x in P]), 2).tolist()

from earshot.describe import describe  # noqa: E402

for r in rows:
    d = describe(RES_WAV, start=r["title_in"] - 0.4, end=r["title_out"] + 0.2)
    r["earshot_summary"] = d.get("summary", "")[:600]
    r["earshot_top"] = [(t["term"], round(t["z"], 2)) for t in d.get("top_tags", [])[:5]]
    r["audioset"] = [(x["label"], x["p"]) for x in d.get("audioset", [])[:5]]
    print(r["chapter"], r["mmss"], r["rest_LUFS_on_title"], r["side_minus_mid_on_title_dB"], r["earshot_top"][:3], r["audioset"][:3], flush=True)
out = {"titles": rows, "sting_similarity_logmel_corr": sim,
       "definitions": {"sting_similarity": "корреляция log-mel 64 × 2.6 с остатка, выровнено по входу титра; "
                                           "> 0.8 — по сути один и тот же звук"}}
update_json("chapter_titles", out)
print(json.dumps({"sim": sim}, ensure_ascii=False))
