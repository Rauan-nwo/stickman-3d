#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
spotting.py <words.json> [--video out/raw.mp4]         (system python, from production/V002)

The spotting list of the finished picture -> SPOTTING.md + spotting_report.json.

Every row is one on-screen event that should make a sound, written down from the stills of out/raw.mp4
(spotting/sheet_*.jpg, one frame every 0.25 s) and from film.js (the cue expression of each shot and action).
The event time is resolved from the SAME cue expression film.js uses, through words.json. For each row the script
looks into cues.json for a placed sound of the named stems within +-40 ms (or anywhere inside a span for step
groups and beds) and into sourcing/cues_prepass.json for whether it had one before this pass.
With --video: frame-difference spikes of the render are measured, and every cut / hit row gets the distance to
the nearest spike.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_audio import Script, make_grids  # noqa: E402

TOL = 0.040


def rows_for(sc):
    g = make_grids(sc)
    t = sc.t
    P = g["P"]
    T41, TB = t(17, "forty-first"), t(17, "bucks")
    t_drop = g["t_drop"]
    mo, at = t(13, "moment"), t(13, "at")
    W, H, F, A, M = "переход", "удар/акцент", "фоли", "амбиенс", "музыка"
    R = []

    def add(tm, layer, seen, sound, stems, span=None, vis=None):
        R.append({"t": tm, "layer": layer, "seen": seen, "sound": sound, "stems": stems, "span": span, "vis": vis})

    # ---- hook
    add(t(1, "He"), H, "барабан уже летит из рук капитана", "последний удар барабана (музыка)", ["mus_hits"])
    add(t(1, "He") + 0.15, A, "локация A: мост над ущельем", "ветер ущелья, далёкая река", ["amb_gorge"], span=(t(1, "He"), sc.start(6)))
    add(t(1, "threw") + 0.05, W, "бросок, камера летит за барабаном", "свист броска", ["throw_whoosh"])
    add(t(1, "threw") + 0.29, F, "барабан кувыркается вдоль скалы вниз", "удары барабана всё тише и ниже, палочки, воздух", ["drum_tumble"])
    add(t(1, "threw") + 0.55, F, "рядом сыплются камни", "стук камней", ["pebble_fall"])
    add(t(1, "river") + 0.12, H, "всплеск, круги на воде", "далёкий всплеск с хвостом (запись)", ["splash_distant"])
    add(t(2, "His") - 1.0, F, "капитан отряхивает руки, ухмыляется", "два хлопка ладоней", ["hand_pat"])
    add(t(2, "colonel"), F, "рука полковника хватает воротник", "ткань: хватка", ["cloth_grab"])
    add(t(2, "collar"), F, "рывок капитана к полковнику, тряска", "ткань: рывок", ["cloth_yank"])
    add(t(2, "That"), H, "полковник орёт (реплика)", "отзвук барабана из ущелья", ["gorge_echo_drum"])
    add(t(2, "drum") + 0.12, W, "переброс вниз: круги на реке", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(2, "drum") + 0.12, F, "круги там, где утонул барабан", "бульк", ["drum_plop"])
    add(t(2, "six"), W, "переброс на колонну", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(2, "six"), F, "синие налетают друг на друга", "амуниция + тела", ["soldiers_clatter", "soldiers_bodies"])
    add(t(2, "in"), W, "переброс + наезд на рот полковника", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(3, "last"), W, "переброс на цепь", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(3, "last"), F, "звено цепи под нагрузкой", "скрип цепи (запись)", ["chain_creak"])
    add(t(4, "The"), A, "общий план ущелья", "порыв ветра", ["wind_gust"])
    add(t(4, "chain"), W, "переброс + наезд на звено и доски", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(4, "chain"), F, "звено цепи крупно", "звяканье цепи", ["chain_clink"])
    add(t(4, "gorge"), W, "переброс вниз в ущелье", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(4, "gorge"), F, "камень падает к реке", "стук камня, плеск", ["pebble_fall"])
    add(t(4, "orders"), F, "капитан поднимает руку", "рукав", ["cloth_yank"])
    add(t(4, "cross"), W, "переброс: капитан идёт «как не маршировал»", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(4, "cross"), F, "четыре ватных шага по доскам", "спотыкающиеся шаги (запись)", ["stumble_steps"])
    add(t(4, "a", 3), W, "переброс на лица солдат", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(5, "So"), F, "синие вразнобой идут по мосту", "шарканье многих ног по дереву", ["shuffle_steps", "shuffle_steps_b"])
    add(t(5, "six"), W, "переброс: кран над мостом", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(5, "looking"), W, "переброс на «ищущего туалет»", "свист камеры", ["cam_whoosh"], vis="cut")
    # ---- ridge, spyglass, valley
    add(t(6, "On"), A, "локация B: гребень холма", "открытый воздух", ["amb_open"], span=(t(6, "On"), t(6, "That's")))
    add(t(6, "On"), M, "красные далеко в долине", "далёкая дробь", ["mus_snare"])
    add(t(6, "the", 2), W, "переброс на лицо генерала", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(6, "crying"), F, "генерал хохочет до слёз", "смех (запись)", ["general_laugh"])
    add(t(6, "crying") + 0.22, F, "адъютант смеётся рядом", "второй смех (запись)", ["adjutant_laugh"])
    add(t(6, "That's"), W, "труба к глазу, пролёт сквозь линзу", "свист наезда", ["cam_push"], vis="cut")
    add(t(6, "That's"), A, "в трубе: мост издалека", "приглушённое ущелье", ["amb_lens"], span=(t(6, "That's"), sc.start(7)))
    add(t(6, "bag"), F, "синие мечутся и спотыкаются (вместо шариков)", "сбивчивые шаги", ["stumble_steps"])
    add(t(6, "spilled") + 0.5 * (sc.span(6, "spilled")[1] - t(6, "spilled")), F, "двое сталкиваются", "мягкий толчок", ["soft_bump"])
    add(t(7, "His"), A, "локация B: долина, ряды красных", "открытый воздух", ["amb_open"], span=(t(7, "His"), sc.start(8)))
    add(t(7, "His"), M, "барабанщики в строю", "марш вблизи: малый барабан (запись)", ["mus_snare"])
    add(t(7, "finest"), W, "переброс в строй", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(7, "finest"), F, "красные шагают по песку в ногу", "шаги по песку в унисон + амуниция", ["sand_step", "gear_rattle"], span=(t(7, "finest"), g["t_land"]))
    add(t(7, "two"), W, "переброс на сапоги", "свист камеры", ["cam_whoosh"], vis="cut")
    add(g["t_land"], H, "сапоги разом в песок, пыль, тряска", "удар сапог + общий удар", ["boots_h4_L", "mus_bassdrum"], vis="hit")
    # ---- onto the bridge
    add(t(8, "So"), A, "локация A: красные входят на мост", "ветер ущелья", ["amb_gorge"], span=(t(8, "So"), sc.start(11)))
    add(t(8, "So"), F, "строй идёт по доскам", "сапоги по дереву в ногу + амуниция", ["boots_h", "gear_rattle"], span=(t(8, "So"), g["steps"][0]))
    add(t(8, "in"), W, "переброс: вид сверху на ряды", "свист камеры", ["cam_whoosh"], vis="cut")
    for i, ts in enumerate(g["steps"]):
        add(ts, H, "шаг %d: сапоги крупно, склейка на слово" % (i + 1), "сапоги + удар барабана", ["boots_h3", "mus_bassdrum"], vis="cut" if i >= 2 else None)
    add(g["steps"][3] + 0.05, F, "звено цепи над ними вздрагивает", "звяканье цепи", ["chain_clink"])
    add(t(9, "A"), F, "настил начинает играть", "скрип досок", ["plank_creak"])
    add(t(9, "A"), F, "строй идёт, мост качает", "сапоги в ногу, скрип досок каждые 4 шага", ["boots_h", "plank_creak"], span=(t(9, "A"), g["t_you"]))
    add(t(9, "the"), F, "волна по цепям растёт", "скрип цепи, громче с волной", ["chain_creak"])
    add(t(9, "bounce"), W, "переброс на подпрыгивающих", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(9, "soldiers"), W, "переброс на довольных солдат", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(9, "soldiers"), F, "солдаты улыбаются, один прыгает нарочно", "смешки (запись)", ["soldiers_chuckle", "soldiers_chuckle_b"])
    add(t(10, "Some"), F, "цепи ходят сильнее", "скрип цепи", ["chain_creak"])
    add(t(10, "whistle"), F, "солдат свистит, нотки", "насвистывание (запись)", ["whistle_march"])
    add(t(10, "stomp"), W, "переброс на сапоги", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(10, "stomp"), H, "топают сильнее, пыль, тряска", "тяжёлые сапоги", ["boots_h"], span=(t(10, "stomp") - 0.2, t(10, "stomp") + 0.45))
    add(t(11, "By"), A, "вид из-под моста", "гул под настилом", ["amb_under", "bridge_rumble"], span=(t(11, "By"), t(11, "bouncing")))
    add(t(11, "By"), F, "настил ходит волной", "скрип цепи", ["chain_creak"])
    add(t(11, "bouncing"), W, "переброс: качает до колен, генерал держит шляпу", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(11, "bouncing"), F, "цепи на пределе", "скрип цепи", ["chain_creak"])
    # ---- the sign, the swing
    add(t(12, "You") - 0.02, W, "наезд на табличку ALL TROOPS MUST BREAK STEP", "свист наезда", ["cam_push"], vis="cut")
    add(t(12, "You"), H, "табличка", "«динь» + мягкий удар", ["sign_ding", "mus_hits"])
    add(t(12, "You"), A, "у въезда на мост, тихий день", "ущелье тише", ["amb_gorge"], span=(t(12, "You"), sc.start(13)))
    add(t(12, "real"), F, "офицер перед колонной", "свисток", ["officer_whistle"])
    add(t(12, "real") + 0.3, F, "офицер поднимает руку", "рукав", ["cloth_yank"])
    add(t(12, "break"), W, "переброс на колонну", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(12, "break"), F, "колонна сбивает шаг", "шаги вразнобой", ["breakstep_steps"])
    add(t(13, "Ever"), A, "локация C: луг, дерево, качели", "луг, птицы (запись)", ["amb_meadow", "bird_meadow"], span=(t(13, "Ever"), sc.start(14)))
    add(t(13, "Ever") + 0.25, F, "качели покачиваются", "скрип верёвки", ["swing_creak"], span=(t(13, "Ever"), t(13, "Tiny")))
    for i, tp in enumerate([t(13, "Tiny"), t(13, "always"), at, mo, mo + (mo - at)]):
        add(tp, F, "рука толкает качели, толчок %d" % (i + 1), "тычок + скрип верёвки", ["push_tick"])
    add(t(13, "over"), F, "ребёнок улетает выше ветки, ботинки слетают", "визг восторга (запись)", ["kid_squeal"])
    # ---- the bridge swings too
    add(t(14, "A"), A, "локация A: пустой мост качается", "ветер ущелья", ["amb_gorge"], span=(t(14, "A"), sc.t_end))
    add(t(14, "A"), F, "мост качается как качели", "большой скрип дерева (запись)", ["bridge_creak"])
    add(t(14, "two"), H, "сапоги разом, пыль, тряска", "удар сапог", ["boots_h4_L"], vis="cut")
    add(t(14, "landing") - 0.1, W, "переброс на ряды сбоку", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(14, "one"), H, "один гигантский толчок, настил проседает, тряска", "низкий толчок + запись удара + барабан", ["push_thump", "thump_real", "mus_bassdrum"], vis="cut")
    add(t(15, "His"), F, "ноги синих вразнобой по доскам", "шаги «как дождь» (из записей шагов)", ["rain_steps"])
    add(t(15, "so"), W, "переброс: ровный мост сбоку", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(15, "never"), W, "переброс на птицу на цепи", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(15, "never") + 0.15, F, "птица на цепи не шелохнулась", "чириканье (запись)", ["bird_chirp"])
    # ---- forty pushes, the forty-first
    add(t(16, "But"), F, "красные маршируют, мост ходит ходуном", "сапоги, амуниция, скрип цепи", ["boots_h", "gear_rattle", "chain_creak"], span=(t(16, "But"), t_drop))
    add(t(16, "gives"), F, "цепи растягиваются", "скрип цепи", ["chain_creak"])
    add(t(16, "forty"), W, "переброс: общий план волны", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(16, "forty"), H, "болт вылетает", "звон болта", ["bolt_ping"])
    add(t(16, "forty") + 0.06, F, "звенья тянутся", "стон металла (запись)", ["metal_groan"])
    for i, n in enumerate((38, 39, 40)):
        add(T41 + (i - 3) * P - 0.03, F, "мел: %d" % n, "чирк мела", ["chalk_tick"])
    add(t_drop, H, "склейка: сапог 41 висит в воздухе", "ОБРЫВ музыки, остаётся ветер + суб-тон вниз", ["music", "slowmo_subdrop"], vis="cut")
    add(T41 - 0.03, F, "мел: 41, подчёркнуто", "чирк мела", ["chalk_tick"])
    add(T41 + 0.5, H, "сапог 41 опускается на доску, тряска", "замедленный удар сапога", ["boot_41_slowmo"], vis="hit")
    add(TB - 0.03, W, "мост встаёт на дыбы", "свист + всасывание воздуха", ["cam_push", "riser_into_bucks"], vis="cut")
    add(TB, H, "мост подбрасывает всех (самый громкий момент)", "треск дерева (запись) + удар + барабаны", ["bridge_snap", "bridge_crack", "mus_hits"], vis="cut")
    add(t(17, "throws"), F, "небо в фигурках, шляпах и барабанах", "падающий свист", ["falling_whistle"])
    add(t(17, "into"), W, "переброс: вид сверху на реку", "свист камеры", ["cam_whoosh"], vis="cut")
    add(t(17, "into"), F, "фигурки сыплются в реку", "много мелких всплесков (записи)", ["splash_small"], span=(t(17, "into"), sc.t_end))
    add(t(17, "gorge"), H, "дальний берег: у полковника отвисла челюсть", "последний большой всплеск за кадром (запись)", ["splash_final"], vis="cut")
    add(t(17, "gorge") + 0.12, F, "капитан отряхивает руки", "два хлопка ладоней", ["hand_pat"])
    add(sc.t_end, H, "конец последнего слова", "жёсткий стоп всего звука", ["__stop__"])

    V_ = "голоса фигурок"
    add(sc.span(1, "them")[0] + 0.9 * (sc.span(1, "them")[1] - sc.span(1, "them")[0]), V_, "капитан доволен собой", "спокойное «хм»", ["captain_hm"])
    add(t(2, "His") - 0.2, V_, "полковник багровеет", "злой вдох-фырк", ["colonel_snort"])
    add(t(2, "His") + 0.12, V_, "полковник хватает за воротник, скалится", "рык, нарастающий к рывку", ["colonel_growl"])
    add(sc.span(2, "step")[1] - 0.02, V_, "полковник после крика", "яростный выдох", ["colonel_huff"])
    add(t(16, "gives"), V_, "генерал в поту, мост ходит ходуном", "испуганный вдох", ["general_gasp"])
    add(TB + 0.03, V_, "генерала подбрасывает", "крик паники и злости", ["general_yell"])
    add(t(2, "six") + 0.15, V_, "колонна в куче", "растерянный гул голосов", ["murmur"])
    add(t(5, "they"), V_, "синие бредут по мосту", "бормотание + третий слой шагов и амуниции", ["murmur", "shuffle_gen"], span=(t(5, "So"), sc.span(5)[1]))
    add(t(6, "On") + 0.1, F, "знамёна на гребне", "хлопанье ткани (запись)", ["flag_flap"])
    add(t(6, "That's") - 0.22, F, "труба вскидывается к глазу", "щелчок трубы", ["spyglass_click"])
    add(t(6, "bag") + 0.2, V_, "в трубе: синие в замешательстве", "растерянные голоса", ["murmur"])
    add(t(9, "bounce") + 0.05, V_, "ряд подпрыгивает на настиле", "общий вдох-ах", ["gasp"])
    add(t(13, "pushes"), V_, "ребёнок на качелях", "хихиканье (запись)", ["kid_giggle"])
    add(TB + 0.5, V_, "всех подбрасывает", "общий крик", ["crowd_scream"])
    add(t(17, "throws"), F, "тела, шляпы и барабаны в воздухе", "шум воздуха, вопли", ["bodies_fall"])
    add(t(10, "Some"), F, "настил стонет под шагом", "стон дерева под ритмичной нагрузкой", ["bridge_groan"], span=(t(10, "Some"), g["t_you"]))
    add(t(16, "But") + 0.3, F, "мост на пределе", "стон дерева + скрип цепи + металлические щелчки", ["bridge_groan", "metal_ping"], span=(t(16, "But"), t_drop))
    add(t(5, "six"), A, "камера взлетает над мостом", "ветер усиливается", ["wind_gust"])
    add(t(8, "in"), A, "вид сверху", "ветер усиливается", ["wind_gust"])
    add(t(17, "into"), A, "вид сверху на реку", "ветер усиливается", ["wind_gust"])

    # film.js rule: a whip survives only if >= 1 s after the previous surviving one (counted from the hook horizon)
    last = t(1, "river") + 0.12 + 0.62
    for r in R:
        if r["layer"] == W and r["stems"] == ["cam_whoosh"]:
            if r["t"] - last < 1.0:
                r["plain_cut"] = True
            else:
                last = r["t"]
    return sorted(R, key=lambda r: r["t"])


def frame_spikes(video):
    w, h = 90, 160
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vf", "scale=%d:%d,format=gray" % (w, h), "-f", "rawvideo", "pipe:1"],
                         capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h * w).astype(np.float32)
    d = np.concatenate([[0.0], np.mean(np.abs(np.diff(fr, axis=0)), axis=1)])
    return d


def hit(cues, r):
    out = []
    for c in cues:
        nm = Path(c["file"]).stem
        if not any(nm.startswith(s_) or (s_ == "music" and c["file"] == "music.wav") for s_ in r["stems"]):
            continue
        if r["span"]:
            if r["span"][0] - TOL <= c["time"] <= r["span"][1] + TOL:
                out.append((0.0, nm))
        elif abs(c["time"] - r["t"]) <= TOL + 0.001:
            out.append((c["time"] - r["t"], nm))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words")
    ap.add_argument("--video")
    ap.add_argument("--fps", type=float, default=30.0)
    a = ap.parse_args()
    words = json.load(open(a.words, encoding="utf-8"))
    sc = Script(words, (HERE.parent / "narration.txt").read_text(encoding="utf-8"))
    import make_audio
    g0 = make_audio.make_grids
    rows = rows_for(sc)
    now = json.load(open(HERE / "cues.json", encoding="utf-8"))["cues"]
    pre = json.load(open(HERE / "sourcing" / "cues_prepass.json", encoding="utf-8"))["cues"]
    d = frame_spikes(a.video) if a.video else None
    thr = None
    if d is not None:
        thr = float(np.median(d) + 6 * np.median(np.abs(d - np.median(d))))
    n_need = n_ok = n_new = 0
    L = ["# V002 — спотинг по готовой картинке", "",
         "Источник: кадры `out/raw.mp4` каждые 0.25 с (`audio/spotting/sheet_01…07.jpg`) + `film.js` (выражение метки каждого",
         "плана и действия). Время события считается из той же метки, что в `film.js`, через `words.json`. Генерируется",
         "`spotting.py`; руками не править.", "",
         "«Звук» = в `cues.json` есть звук названных стемов в ±40 мс от события (для групп шагов и фонов — внутри отрезка).",
         "«Был» = то же по `sourcing/cues_prepass.json` (состояние до этого прохода). «Кадр» = расстояние от события до",
         "самого сильного всплеска межкадровой разницы рендера в ±0.2 с (для склеек и ударов; всплеск = больше удвоенного движения внутри плана). Кадр = 33 мс, поэтому ±33 мс — это «тот же кадр».", "",
         "| t, с | Слой | Что в кадре | Что оживляет момент (звук) | Стемы | Звук, мс | Был | Кадр, мс |", "|---|---|---|---|---|---|---|---|"]
    rep = []
    for r in rows:
        if r.get("plain_cut"):
            L.append("| %.2f | %s | %s | — (в фильме этот стык — обычная склейка: правило «переброс не чаще раза в секунду») | — | — | — | — |" % (r["t"], r["layer"], r["seen"]))
            rep.append({"t": round(r["t"], 3), "seen": r["seen"], "plain_cut": True})
            continue
        if r["stems"] == ["__stop__"]:
            L.append("| %.2f | %s | %s | %s | music.wav, sfx.wav | см. check.py | да | — |" % (r["t"], r["layer"], r["seen"], r["sound"]))
            continue
        n_need += 1
        h1, h0 = hit(now, r), hit(pre, r)
        ok = bool(h1)
        n_ok += ok
        n_new += (ok and not h0)
        vis = "—"
        if d is not None and r["vis"]:
            f = r["t"] * a.fps
            f0 = int(round(f))
            lo, hi = max(1, f0 - 6), min(len(d) - 1, f0 + 7)           # +-0.2 s around the event
            base = float(np.median(d[max(0, f0 - 20):f0 + 20]))
            k = lo + int(np.argmax(d[lo:hi]))
            if d[k] > max(2.0 * base + 4.0, 8.0) or d[k] > thr:      # a spike over the shot's own motion
                vis = "%+.0f" % ((k - f) / a.fps * 1000)
            else:
                vis = "нет всплеска"
        err = "span" if (ok and r["span"]) else ("%+.0f" % (min(h1, key=lambda x: abs(x[0]))[0] * 1000) if ok else "**НЕТ**")
        L.append("| %.2f | %s | %s | %s | %s | %s | %s | %s |" % (r["t"], r["layer"], r["seen"], r["sound"], ", ".join(sorted({x[1] for x in h1})) or ", ".join(r["stems"]), err, "да" if h0 else "нет", vis))
        rep.append({"t": round(r["t"], 3), "layer": r["layer"], "seen": r["seen"], "sound": r["sound"], "has_cue": ok, "had_before": bool(h0),
                    "err_ms": None if (not ok or r["span"]) else round(min(h1, key=lambda x: abs(x[0]))[0] * 1000, 1), "frame_ms": vis})
    L += ["", "Итого: событий со звуком **%d**, из них со звуком в допуске **%d**, не было звука до этого прохода: **%d**. Стыков без переброса (обычные склейки): %d."
          % (n_need, n_ok, n_new, sum(1 for r in rows if r.get("plain_cut"))), ""]
    # no shot may be carried by the music alone: every shot of the render must hold a non-ambience effect
    cf = HERE.parent / "out" / "raw.cues.json"
    bare = []
    if cf.exists():
        cuts = [0.0] + sorted(json.load(open(cf, encoding="utf-8"))) + [sc.t_end]
        L += ["## Планы: звук в каждом", "",
              "Границы планов — `out/raw.cues.json`. Считаются эффекты (не музыка и не амбиенс), которые звучат внутри плана.", "",
              "| План, с | Эффектов | Какие |", "|---|---|---|"]
        for a_, b_ in zip(cuts[:-1], cuts[1:]):
            if b_ - a_ < 0.05:
                continue
            inside = sorted({Path(c["file"]).stem for c in now if c["track"] == "sfx" and not c["note"].startswith("AMBIENCE")
                             and c["time"] < b_ - 0.02 and c["time"] + c.get("length", 0.3) > a_ + 0.02})
            if not inside:
                bare.append((round(a_, 2), round(b_, 2)))
            L.append("| %.2f–%.2f | %d | %s |" % (a_, b_, len(inside), (", ".join(inside[:9]) + (" …" if len(inside) > 9 else "")) if inside else "**НЕТ**"))
        L += ["", "Планов без эффектов: **%d**." % len(bare), ""]
    (HERE / "SPOTTING.md").write_text("\n".join(L), encoding="utf-8")
    json.dump({"events": n_need, "with_cue": n_ok, "new_in_this_pass": n_new, "shots_without_effects": bare, "rows": rep}, open(HERE / "spotting_report.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("shots without effects:", bare)
    print("events %d | with cue %d | had none before %d | missing: %s" % (n_need, n_ok, n_new, [(round(r["t"], 2), r["stems"]) for r in rows if not r.get("plain_cut") and r["stems"] != ["__stop__"] and not hit(now, r)]))


if __name__ == "__main__":
    main()
