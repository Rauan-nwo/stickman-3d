#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_overrides.py            (system python; run with -I: the downloads are only decoded by ffmpeg, never imported)

Turns the chosen recordings (sourcing/dl/, found through the Openverse API, CC0 / Public Domain Mark only) and the
chosen earshot-bank renders (sourcing/bank/) into overrides/<stem>.wav that make_audio.py picks up:
trim -> high-pass 50 Hz -> optional tone / distance -> fades -> peak -3 dBFS. Next to each file a sidecar
<stem>.json: the sync anchor, the origin and the source (title, creator, URL, licence).
Also writes CREDITS.md from the same table, so the credits cannot drift from what is actually installed.

The trims come from `earshot find` on each file (sourcing/shortlist.json); the choice among candidates from
`earshot rank` / `match` (see NOTES.md).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_audio import SR, fade, hp, lp, irs, room, write_wav, lin, nsamp  # noqa: E402

DL, BANK, OV = HERE / "sourcing" / "dl", HERE / "sourcing" / "bank", HERE / "overrides"

# stem: (slot, id8, start s, end s, options)
#   options: fi / fo fades (s), hp / lp (Hz), gorge (wet dB: far away in the canyon), gain_flat (level the envelope),
#            anchor ("peak" | seconds | None = first sample over 10 % of the peak)
PICKS = {}
# stem: (bank id as rendered in sourcing/bank/<stem>/, options)
BANKS = {}
GENS = {}

exec((HERE / "picks.py").read_text(encoding="utf-8"))       # PICKS / BANKS live in picks.py (our own file)


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64).reshape(-1, 2)


def env(x, win=0.005):
    p = np.mean(x * x, axis=1)
    w = nsamp(win)
    return np.sqrt(np.convolve(p, np.ones(w) / w, mode="same"))


def process(x, o):
    x = hp(x, o.get("hp", 50.0), 2)                          # "hp": thin a whoosh down to its air (tight, clear of the voice's body)
    if o.get("gain_flat"):                                   # steady level: divide by a slow envelope
        e = np.maximum(env(x, o["gain_flat"]), 1e-4)
        x = x / (e / np.median(e))[:, None]
    if o.get("lp"):
        x = lp(x, o["lp"], 1)
    if o.get("ramp_db"):                                     # falling away: level and brightness drop along the sound
        u = np.linspace(0, 1, len(x))[:, None]
        dark = lp(x, o.get("lp_end", 1500), 1)
        x = (x * (1 - u) + dark * u) * lin(o["ramp_db"] * u)
    x = fade(x, o.get("fi", 0.003), o.get("fo", min(0.08, 0.15 * len(x) / SR)))
    if o.get("gorge") is not None:
        x = room(x.mean(axis=1), irs()["gorge"], o["gorge"], o.get("pan", 0.0))
    return x * (lin(-3.0) / (np.max(np.abs(x)) + 1e-12))


def anchor_of(x, o):
    a = o.get("anchor")
    if a == "peak":
        return float(np.argmax(env(x))) / SR
    if isinstance(a, (int, float)):
        return float(a)
    e = env(x, 0.003)                                        # the same onset rule check.py measures with
    return float(np.argmax(e >= 0.25 * e.max())) / SR + o.get("anchor_shift", 0.0)


def main():
    OV.mkdir(exist_ok=True)
    cand = json.load(open(HERE / "sourcing" / "candidates.json", encoding="utf-8"))
    by_id = {r["id"][:8]: r for rows in cand.values() for r in rows}
    fits = {}
    cf = Path("C:/dev/tools/earshot/docs/CREDITS_FIT.md")
    if cf.exists():
        for line in cf.read_text(encoding="utf-8").splitlines():
            c = [s.strip() for s in line.split("|")]
            if len(c) > 5 and c[1].startswith("`fit/"):
                fits[c[1].strip("`")] = {"title": c[2], "creator": c[3], "url": c[4][c[4].find("(") + 1:c[4].rfind(")")], "licence": c[5]}
    credits, rows = {}, []
    for f in list(OV.glob("*.wav")) + list(OV.glob("*.json")):
        f.unlink()                                           # the table below is the single source of truth
    for stem, (slot, id8, t0, t1, o) in PICKS.items():
        src = next((DL / slot).glob(id8 + ".*"))
        r = by_id[id8]
        x = decode(src)
        x = x[int(t0 * SR):int(t1 * SR)] if t1 else x[int(t0 * SR):]
        extra = []
        if o.get("mix"):                                     # a second recording under the first (river under the wind)
            sl2, id2, a2, b2, g2, lp2 = o["mix"]
            y2 = lp(decode(next((DL / sl2).glob(id2 + ".*")))[int(a2 * SR):int(b2 * SR)], lp2, 1)
            m_ = min(len(x), len(y2))
            x = x[:m_] * (lin(-3.0) / (np.sqrt(np.mean(x[:m_] ** 2)) * 8 + 1e-12))
            x = x + y2[:m_] * (lin(g2) * np.sqrt(np.mean(x ** 2)) / (np.sqrt(np.mean(y2[:m_] ** 2)) + 1e-12))
            extra.append((by_id[id2], a2, b2))
        x = process(x, {k_: v_ for k_, v_ in o.items() if k_ != "mix"})
        write_wav(OV / (stem + ".wav"), x)
        for r2, a2, b2 in extra:
            lic2 = {"cc0": "CC0 1.0", "pdm": "Public Domain Mark 1.0"}[r2["licence"]]
            credits.setdefault(r2["id"], (r2, lic2, []))[2].append("%s (%.2f–%.2f с, слой)" % (stem, a2, b2))
        lic = {"cc0": "CC0 1.0", "pdm": "Public Domain Mark 1.0"}[r["licence"]]
        meta = {"anchor": round(anchor_of(x, o), 4), "origin": "recording", "trim": [t0, t1], "process": {k_: (list(v_) if isinstance(v_, tuple) else v_) for k_, v_ in o.items()},
                "source": {"title": r["title"], "creator": r["creator"], "url": r["landing"], "licence": lic,
                           "licence_url": r.get("licence_url"), "file_url": r["url"], "via": "Openverse API (%s)" % r.get("source"),
                           "openverse_id": r["id"]}}
        json.dump(meta, open(OV / (stem + ".json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        credits.setdefault(r["id"], (r, lic, []))[2].append("%s (%.2f–%.2f с)" % (stem, t0, t1 or len(decode(src)) / SR))
        rows.append((stem, "recording", r["title"], len(x) / SR))
    for stem, (bid, o) in BANKS.items():
        src = BANK / o.get("dir", stem) / (bid.replace("/", "__") + o.get("suffix", "") + ".wav")
        x = decode(src)
        if o.get("end"):
            x = x[:int(o["end"] * SR)]
        x = process(x, o)
        write_wav(OV / (stem + ".wav"), x)
        meta = {"anchor": round(anchor_of(x, o), 4), "origin": "earshot-bank", "process": o,
                "source": {"bank_id": bid, "bank": "earshot 0.4.1 (MIT), rendered from code", "fitted_from": fits.get(bid)}}
        json.dump(meta, open(OV / (stem + ".json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        rows.append((stem, "earshot-bank", bid, len(x) / SR))

    GEN = HERE / "gen"
    glog = json.load(open(GEN / "gen_log.json", encoding="utf-8")) if (GEN / "gen_log.json").exists() else []
    gen_rows = []
    for stem, (pref, t0, t1, o) in GENS.items():
        e = next(q for q in glog if q["name"] == pref)
        x = decode(GEN / e["wav"])
        x = process(x[int(t0 * SR):int(t1 * SR)], o)
        write_wav(OV / (stem + ".wav"), x)
        meta = {"anchor": round(anchor_of(x, o), 4), "origin": "elevenlabs", "trim": [t0, t1], "process": o,
                "source": {"generator": "ElevenLabs Sound Effects API", "prompt": e["prompt"], "duration_seconds": e["duration_seconds"],
                           "file": "gen/" + e["wav"], "date": e["date"]}}
        json.dump(meta, open(OV / (stem + ".json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        rows.append((stem, "elevenlabs", pref, len(x) / SR))
        gen_rows.append("| %s | `gen/%s` (%.2f–%.2f с) | %s |" % (stem, e["wav"], t0, t1, e["prompt"].replace("|", "/")))

    L = ["# V002 — источники звука (CREDITS)", "",
         "Все записи найдены через Openverse API (`https://api.openverse.org/v1/audio/`, фильтр `license=cc0,pdm`) и взяты",
         "только с лицензией **CC0 1.0** или **Public Domain Mark** — без обязательной атрибуции и без запрета на",
         "коммерческое использование. Авторы указаны из вежливости. Лицензия записана так, как её отдаёт Openverse;",
         "на странице источника она вручную не перечитывалась (см. NOTES.md, «Что не проверено»).",
         "Обработка каждой записи: обрезка, фейды, нормализация (у «далёких» — затемнение и реверберация ущелья).",
         "Файл генерируется `build_overrides.py` из `picks.py`; руками не править.", "",
         "## Записи (Openverse → Freesound и др.)", "",
         "| Название | Автор | Источник | Лицензия | Файл-превью | Куда пошло (стем, обрезка) |", "|---|---|---|---|---|---|"]
    for rid, (r, lic, used) in sorted(credits.items(), key=lambda kv: kv[1][2][0]):
        L.append("| %s | %s | %s | %s | %s | %s |" % (str(r["title"]).replace("|", "/"), r["creator"], r["landing"], lic, r["url"], "; ".join(used)))
    L += ["", "## Банк earshot (звуки, сделанные кодом; MIT)", "",
          "Не записи: рендер рецептов из `C:/dev/tools/earshot` (earshot 0.4.1, лицензия MIT). Звуки `fit/...` — модели,",
          "снятые с записей CC0 (источник указан по `docs/CREDITS_FIT.md` репозитория earshot).", "",
          "| Стем | id в банке | Снято с записи (CC0 1.0) |", "|---|---|---|"]
    for stem, (bid, o) in BANKS.items():
        ft = fits.get(bid)
        L.append("| %s | `%s` | %s |" % (stem, bid, "%s — %s, %s" % (ft["title"], ft["creator"], ft["url"]) if ft else "—"))
    L += ["", "## Сгенерировано ElevenLabs Sound Effects", "",
          "Не записи: звук сгенерирован по текстовому описанию (`engine/tools/sfx_eleven.py`, журнал `gen/gen_log.json`).",
          "**Условия использования**: ключ бесплатного тарифа. Разрешает ли он коммерческое использование без указания",
          "ElevenLabs — не подтверждено (см. `SFX_SOURCES.md`); до публикации на монетизируемом канале это надо закрыть.", "",
          "| Стем | Файл и обрезка | Описание (prompt) |", "|---|---|---|"] + gen_rows
    L += ["", "## Голос", "", "Диктор, полковник и генерал — синтез ElevenLabs (см. `cast.json`), не входит в этот список.", ""]
    (HERE / "CREDITS.md").write_text("\n".join(L), encoding="utf-8")
    for r in rows:
        print("%-18s %-13s %-48s %.2f s" % (r[0], r[1], str(r[2])[:48], r[3]))


if __name__ == "__main__":
    main()
