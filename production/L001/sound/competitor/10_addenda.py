# -*- coding: utf-8 -*-
"""10. Дополнения к разделам (дёшево, только по сохранённым tmp/*.npz и JSON; стемы не нужны).

  music.sensitivity          — доля времени с музыкой при разных порогах AST (насколько цифра зависит от порога);
  music.around_chapter_titles — что делает подложка вокруг каждого титра главы (уровень остатка до/после стинга);
  per_chapter                — по главам: доля музыки, уровень остатка под речью, события детектора в минуту;
  cuts_vs_voice              — попадают ли склейки и чёрные карточки в щели между фразами (VAD), против случайных моментов;
  floor                      — самые тихие секунды остатка и микса (есть ли постоянный фон/рум-тон);
  blind_check                — итог слепой проверки 05c (кадры в моменты SFX против случайных моментов);
  mix_relations.ducking.note / music_carving.note — оговорки к разделам 07, где выборка оказалась слишком мала.
"""
from common import *

Z = np.load(os.path.join(TMP, "blocks.npz"))
sp = np.load(os.path.join(TMP, "vad.npz"))["speech"]
mu = np.load(os.path.join(TMP, "music.npz"))["music"]
NB = min(len(sp), len(mu), len(Z["res_k"]))
sp, mu = sp[:NB], mu[:NB]
rk, vk, mk = Z["res_k"][:NB], Z["voc_k"][:NB], Z["mix_k"][:NB]
lu = lambda p: -0.691 + pw_db(p)
D = load_json()


def win(p, w, h):
    c = np.concatenate([[0.0], np.cumsum(np.asarray(p, np.float64))])
    i = np.arange(0, len(p) - w + 1, h)
    return (c[i + w] - c[i]) / w, i


# ---------- музыка: чувствительность к порогу ----------
F = np.load(os.path.join(TMP, "music_feats.npz"))
pm = F["pm"]
music = D["music"]
music["sensitivity"] = {"share_frames_ast_music_ge": {f"{th:.2f}": round(float((pm >= th).mean()), 3)
                                                      for th in (0.2, 0.25, 0.3, 0.35, 0.4, 0.5)},
                        "note": "вероятность AST Music на тихой подложке (−35 LUFS) редко выше 0.5, поэтому порог 0.3 — "
                                "компромисс; честный разброс доли времени с музыкой — 0.72-0.84"}
rows = []
for t in D["chapter_titles"]["titles"]:
    a, b = t["title_in"], t["title_out"]
    ia, ib = int(a / 0.01), int(b / 0.01)
    seg = lambda x0, x1: round(float(lu(rk[max(0, int(x0 / 0.01)):int(x1 / 0.01)].mean())), 1)
    rows.append({"chapter": t["chapter"], "title_in": a,
                 "rest_LUFS_-6..-1s": seg(a - 6, a - 1), "rest_LUFS_sting_0..+1s": seg(a, a + 1),
                 "rest_LUFS_tail_+1.5..end": seg(a + 1.5, b), "rest_LUFS_after_+0.5..+5.5s": seg(b + 0.5, b + 5.5),
                 "music_mask_share_-6..-1s": round(float(mu[ia - 600:ia - 100].mean()), 2),
                 "music_mask_share_after_+0.5..+5.5s": round(float(mu[ib + 50:ib + 550].mean()), 2)})
music["around_chapter_titles"] = rows
update_json("music", music)

# ---------- по главам ----------
ev10 = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))["by_thr"]["10.0"]["events"]
ev15 = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))["by_thr"]["15.0"]["events"]
dur = NB * 0.01
pc = []
for k, (t0, name) in enumerate(CHAPTERS):
    t1 = CHAPTERS[k + 1][0] if k + 1 < len(CHAPTERS) else dur
    a, b = int(t0 / 0.01), int(t1 / 0.01)
    s, m = sp[a:b], mu[a:b]
    n10 = [e for e in ev10 if t0 <= e["t"] < t1 and e["cls"] != "music"]
    n15 = [e for e in ev15 if t0 <= e["t"] < t1 and e["cls"] != "music"]
    cls = {}
    for e in n10:
        cls[e["cls"]] = cls.get(e["cls"], 0) + 1
    pc.append({"chapter": name, "start": t0, "dur_s": round(t1 - t0, 1),
               "music_share": round(float(m.mean()), 2), "speech_share": round(float(s.mean()), 2),
               "voice_LUFS_speech": round(float(lu(vk[a:b][s].mean())), 1),
               "rest_LUFS_under_speech": round(float(lu(rk[a:b][s].mean())), 1),
               "events_per_min_thr10": round(len(n10) / ((t1 - t0) / 60), 1),
               "events_per_min_thr15": round(len(n15) / ((t1 - t0) / 60), 1),
               "top_classes_thr10": dict(sorted(cls.items(), key=lambda kv: -kv[1])[:4])})
update_json("per_chapter", {"definitions": "по главам из описания ролика; события — детектор sfx_density без ударов петли",
                            "chapters": pc})

# ---------- склейки против щелей голоса ----------
J = json.load(open(os.path.join(DYN, "comp_shots.json"), encoding="utf-8"))
cuts = np.array([t["t"] for t in J["trans"] if t["type"] == "hard"])
dz = np.load(os.path.join(DYN, "comp.npz"))
cards = [(a / FPS, b / FPS) for a, b in runs(dz["luma"] < 6) if b - a >= 9]
rng = np.random.default_rng(7)
rnd = rng.uniform(2, dur - 2, 20000)


def in_gap(ts, lo=-0.15, hi=0.05):
    """есть ли в окне [t+lo, t+hi] хотя бы 40 мс без голоса"""
    out = []
    for t in ts:
        a, b = int((t + lo) / 0.01), int((t + hi) / 0.01)
        out.append((~sp[max(0, a):b]).sum() >= 4)
    return np.array(out)


def next_onset(ts):
    """время от события до ближайшего начала фразы (голос включается) в [−0.3, +0.5] с"""
    on = np.nonzero(np.diff(sp.astype(np.int8)) == 1)[0] * 0.01 + 0.01
    out = []
    for t in ts:
        d = on - t
        d = d[(d >= -0.3) & (d <= 0.5)]
        if len(d):
            out.append(float(d[np.argmin(np.abs(d))]))
    return np.array(out)


g_c, g_r = in_gap(cuts), in_gap(rnd)
no = next_onset(cuts[g_c])
card_in = np.array([a for a, b in cards])
card_out = np.array([b for a, b in cards])
cv = {"definitions": {"in_gap": "в окне [−150, +50] мс от события есть >= 40 мс без голоса (VAD по стему vocals)",
                      "onset_minus_cut_ms": "начало ближайшей фразы минус склейка, для склеек в щели; плюс = голос после склейки"},
      "hard_cuts": {"n": int(len(cuts)), "share_in_voice_gap": round(float(g_c.mean()), 3)},
      "random_moments": {"n": int(len(rnd)), "share_in_voice_gap": round(float(g_r.mean()), 3)},
      "onset_minus_cut_ms": {k: round(v * 1000) for k, v in zip(("p10", "p25", "p50", "p75", "p90"),
                                                              np.percentile(no, [10, 25, 50, 75, 90]))} if len(no) else {},
      "share_cuts_with_voice_onset_within_0..+100ms": round(float(np.mean((next_onset(cuts) >= 0) & (next_onset(cuts) <= 0.1))
                                                                  * len(next_onset(cuts)) / len(cuts)), 3),
      "black_text_cards": {"n": len(cards), "share_card_in_in_voice_gap": round(float(in_gap(card_in).mean()), 3),
                           "share_card_out_in_voice_gap": round(float(in_gap(card_out).mean()), 3)}}
update_json("cuts_vs_voice", cv)

# ---------- пол (фон) ----------
r1, i1 = win(rk, 100, 50)
m1, _ = win(mk, 100, 50)
s1, _ = win(sp.astype(float), 100, 50)
u1, _ = win(mu.astype(float), 100, 50)
R1, M1 = lu(r1), lu(m1)
o = np.argsort(R1)[:10]
floor = {"definitions": "окна 1 с, шаг 0.5 с, K-уровень (LUFS); остаток = no_vocals (музыка+эффекты+фон)",
         "rest_1s_percentiles": pct(R1, (1, 5, 10, 50, 90), 1),
         "rest_1s_no_music_under_speech": pct(R1[(u1 < 0.1) & (s1 > 0.9)], (5, 10, 50, 90), 1),
         "rest_1s_music_under_speech": pct(R1[(u1 > 0.9) & (s1 > 0.9)], (5, 10, 50, 90), 1),
         "quietest_rest_1s": [{"t": round(float(i1[k] * 0.01), 1), "rest_LUFS": round(float(R1[k]), 1)} for k in sorted(o)],
         "mix_1s_min_LUFS": round(float(M1.min()), 1), "mix_1s_p1_LUFS": round(float(np.percentile(M1, 1)), 1),
         "note": "самые тихие секунды остатка −54…−56 LUFS — это пол записи; постоянного фона (рум-тон, шум зала, улица) "
                 "громче примерно −50 LUFS в ролике нет"}
update_json("floor", floor)

# ---------- слепая проверка ----------
kp, jp = os.path.join(TMP, "blind", "key.json"), os.path.join(TMP, "blind", "judged.json")
if os.path.exists(kp) and os.path.exists(jp):
    key = json.load(open(kp, encoding="utf-8"))
    jd = json.load(open(jp, encoding="utf-8"))["judged_visible"]
    s_ = [jd[str(k["k"])] for k in key if k["kind"] == "sfx"]
    r_ = [jd[str(k["k"])] for k in key if k["kind"] == "rand"]
    update_json("blind_check", {"definitions": "05c: пары кадров (t−0.15, t+0.20 с) без подписи, что это; отмечено, видно ли "
                                               "событие на экране; порог детектора 10 дБ",
                                "sfx_moments": {"n": len(s_), "share_with_visible_event": round(float(np.mean(s_)), 2)},
                                "random_moments": {"n": len(r_), "share_with_visible_event": round(float(np.mean(r_)), 2)},
                                "note": "выборка мала (20 и 10); вывод только качественный: моменты детектора не чаще "
                                        "случайных совпадают с видимым событием"})

# ---------- оговорки к разделу 07 ----------
D = load_json()
mr = D["mix_relations"]
mr["ducking"]["note"] = ("выборка пуста: пауз >= 0.8 с внутри музыки без SFX рядом в ролике нет (все длинные паузы — титры "
                         "глав со стингом). Окна pause_minus_speech (n=8) — это титры, разница там — стинг, а не отпускание "
                         "дакинга. Единственное косвенное свидетельство — voice_vs_rest.gaps_ge_80ms: остаток в щелях "
                         "80-300 мс на 1.6 LU (медиана) громче, чем под соседней речью; это в пределах ошибки Demucs. "
                         "Вывод: дакинг не доказан и не опровергнут; подложка просто стоит низко.")
mr["music_carving"]["note"] = ("n=4 окна, и паузы в них — титры со стингом (в паузах много низа) — величины ненадёжны. "
                               "Надёжнее долгосрочный спектр: запас голос−остаток под речью 22-27 дБ во всех октавах "
                               "125 Гц-8 кГц, минимум на 1 кГц — выреза 1-4 кГц в подложке не видно.")
mr["ambience"]["note"] = ("отрезков «нет речи, музыки и SFX» всего 4 (3.4 с); два из них — хвосты стинга на титрах (−29…−30), "
                          "два — настоящий пол (−53…−54 LUFS). См. раздел floor.")
update_json("mix_relations", mr)
# ---------- SFX: минуты без басовой линии музыки и окна начала ролика ----------
import sfx_density as SD

S = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))
sx = load_json()["sfx"]
DENSE = set(range(6, 12))  # минуты 6-11: детектор считает ноты баса подложки (гарм. доля 0.83, центроид 250-400 Гц)
add = {"definitions": {"clean_minutes": "14 минут без 6:00-11:59, где события — в основном ноты баса музыкальной подложки",
                       "non_tonal": "без класса ding (короткая тональная нота — чаще нота музыки, чем эффект)",
                       "windows": "окна начала ролика — для сравнения с нашим пилотом тех же минут"},
       "clean_minutes": {}, "windows": {}}
for thr in ("10.0", "15.0"):
    ev = [e for e in S["by_thr"][thr]["events"] if e["cls"] != "music"]
    cl = [e for e in ev if int(e["t"] // 60) not in DENSE]
    mins = (dur - 360.0) / 60
    cc = {c: round(sum(e["cls"] == c for e in cl) / mins, 2) for c in SD.CLASSES}
    per = [sum(1 for e in cl if int(e["t"] // 60) == k) for k in range(20) if k not in DENSE]
    add["clean_minutes"][thr] = {"per_min": round(len(cl) / mins, 1), "per_min_median_of_minutes": float(np.median(per)),
                                 "per_min_range": [int(min(per)), int(max(per))],
                                 "non_tonal_per_min": round(sum(e["cls"] != "ding" for e in cl) / mins, 1),
                                 "class_per_min": cc}
    add.setdefault("whole_video_non_tonal_per_min", {})[thr] = round(sum(e["cls"] != "ding" for e in ev) / (dur / 60), 1)
    for a_, b_ in ((0, 41), (0, 73), (0, 120)):
        w = [e for e in ev if a_ <= e["t"] < b_]
        ts = sorted(e["t"] for e in w)
        mom = 1 + sum(1 for x, y in zip(ts[:-1], ts[1:]) if y - x > SD.MOMENT_GAP) if ts else 0
        add["windows"].setdefault(f"{a_}-{b_}s", {})[thr] = {
            "per_min": round(len(w) / ((b_ - a_) / 60), 1), "moments_per_min": round(mom / ((b_ - a_) / 60), 1),
            "non_tonal_per_min": round(sum(e["cls"] != "ding" for e in w) / ((b_ - a_) / 60), 1),
            "loop_hits_excluded": sum(1 for e in S["by_thr"][thr]["events"] if e["cls"] == "music" and a_ <= e["t"] < b_)}
sx["addenda"] = add
update_json("sfx", sx)
print(json.dumps({"sens": music["sensitivity"], "titles": rows, "per_chapter": pc, "cuts_vs_voice": cv, "floor": floor,
                  "blind": load_json().get("blind_check"), "sfx_addenda": add}, ensure_ascii=False, indent=1))
