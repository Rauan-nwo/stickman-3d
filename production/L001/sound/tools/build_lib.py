#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_lib.py        read lib/picks.json, cut / convert every pick into lib/rec/<cat>/<id>.wav, write lib/ledger.json
                    and LICENSES.md

Run with the sound venv python and -I. Reads audio only (downloads are never executed).

Processing (all 48 kHz, 24-bit PCM):
  spot  (cat foley)       mono; [start, end) from earshot find; leading silence cut to 3 ms before the transient
                          (1 ms fade-in; the transient is the first frame within 20 dB of the peak), trailing
                          silence below -60 dB cut, 15 ms fade-out; peak -1 dBFS.
  loop  (cat amb / tone)  amb stereo (a mono source becomes dual-mono, noted), tone mono; [start, start+L+X)
                          cut, the last X s crossfaded (equal power) into the head so the file loops seamlessly;
                          loudness -26 LUFS (amb) / -28 LUFS (tone), peak capped at -1 dBFS.

Pick fields: id, need, cat (foley | amb | tone), ov (Openverse id8) or kn (path under lib/_dl/kenney), optional
class (mixer sound class; default CLASS[need]), start / end (s), fo (fade-out ms) and on (onset threshold, dB under
the peak, default -20) for spot, len / xf / lufs / ticks for loop,
rank_need, note. Only CC0 / Public Domain Mark sources pass: an Openverse pick whose landing page was not read or
states another licence stops the build.
"""
import datetime
import json
import re
import sys
from pathlib import Path

import numpy as np
import pyloudnorm
import soundfile as sf
import soxr

HERE = Path(__file__).resolve().parent
SND = HERE.parent
LIB = SND / "lib"
DL = LIB / "_dl"
SR = 48000
CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/"

# need -> sound class of the mixer (render.py / palette); a pick may override it with "class"
CLASS = {
    "amb_restaurant": "amb.restaurant", "amb_cutlery": "amb.cutlery", "amb_rain_window": "amb.rain_window",
    "amb_rain_street": "amb.rain_street", "amb_wet_tyres": "amb.wet_tyres", "amb_rain_car": "amb.rain_car",
    "amb_office_tone": "amb.office_tone", "amb_clock": "amb.clock", "amb_drip_tiled": "amb.drip",
    "amb_birds_day": "amb.birds", "amb_bar": "amb.bar", "amb_crickets": "amb.night", "amb_diner": "amb.diner",
    "amb_dishpit": "amb.dishpit", "amb_hall_crowd": "amb.hall", "amb_hvac": "amb.hvac",
    "amb_newsroom": "amb.newsroom", "amb_phones_office": "amb.trading", "amb_port": "amb.port",
    "amb_server": "amb.servers", "amb_trucks": "amb.trucks", "amb_warehouse": "amb.warehouse",
    "fx_camera_shutter": "shutter", "fx_photo_drop": "photo.drop", "fx_folder": "folder.close",
    "fx_paper_slide": "paper.slide", "fx_stamp": "stamp", "fx_typewriter": "type.key",
    "fx_typewriter_bell": "type.bell", "fx_pen_write": "marker.write", "fx_pencil_line": "map.route",
    "fx_glass_toast": "glass.clink", "fx_box_knock": "box.tap", "fx_box_open": "box.lid", "fx_keys": "key.jingle",
    "fx_sticker": "tag.slap", "fx_lamp_switch": "switch.click", "fx_lamp_hum": "lamp.buzz",
    "fx_tape_reel": "tape.reels", "fx_headphones": "headphone", "fx_crate_down": "crate.set",
    "fx_mop_bucket": "water.splash", "fx_phone_ring": "phone.ring", "fx_phone_handset": "phone.pickup",
    "fx_string_taut": "string.pull", "fx_leather": "cloth.rustle", "fx_chair": "chair.creak",
    "fx_chair_scrape": "chair.scrape", "fx_door_slam": "door.slam", "fx_door_knock": "knock",
    "fx_steps_hard": "steps", "fx_car_door": "car.door", "fx_keyboard": "keyboard", "fx_cash_register": "cash",
    "fx_coins": "cash", "fx_flashbulb": "flash.pop", "fx_crowd_gasp": "crowd.react", "fx_applause": "crowd.react",
    "fx_radio_static": "static", "fx_scanner_beep": "beep", "fx_pushpin": "pin.push", "fx_fluor_buzz": "amb.fluor",
    "fx_ship_horn": "ship.horn",
}
OK_LICENCE = ("creative commons 0", "cc0", "public domain")
PDM_URL = "https://creativecommons.org/publicdomain/mark/1.0/"


def load(path):
    x, sr = sf.read(str(path), always_2d=True, dtype="float32")
    if sr != SR:
        x = soxr.resample(x, sr, SR, quality="VHQ").astype(np.float32)
    return x, sr


def db(v):
    return 20 * np.log10(max(float(v), 1e-12))


def env_ms(m):
    n = len(m) // 48
    return np.abs(m[:n * 48]).reshape(n, 48).max(axis=1) if n else np.abs(m)


def spot(x, start, end, fo_ms=15, on_db=-20):
    m = x.mean(axis=1)
    a = int((start or 0) * SR)
    b = int(end * SR) if end else len(m)
    m = m[max(0, a - int(0.05 * SR)):b]  # keep 50 ms before the find start, then search the transient
    e = env_ms(m)
    pk = e.max()
    # transient: first 1 ms frame within |on_db| dB of the peak and 12 dB over the local floor
    floor = np.percentile(e[:max(5, len(e) // 10)], 20)
    thr = max(pk * 10 ** (on_db / 20), floor * 4)
    on = int(np.argmax(e >= thr))
    s0 = max(0, on * 48 - int(0.003 * SR))
    m = m[s0:]
    lead_ms = (on * 48 - s0) / SR * 1000
    # trailing silence
    e = env_ms(m)
    keep = np.nonzero(e >= e.max() * 10 ** (-60 / 20))[0]
    if len(keep):
        m = m[:min(len(m), (keep[-1] + 1) * 48 + int(0.03 * SR))]
    fi, fo = int(0.001 * SR), min(int(fo_ms / 1000 * SR), len(m) // 3)
    m = m.copy()
    m[:fi] *= np.linspace(0, 1, fi)
    if fo > 0:
        m[-fo:] *= np.linspace(1, 0, fo)
    m *= 10 ** (-1 / 20) / max(np.abs(m).max(), 1e-9)
    return m[:, None], {"lead_ms": round(float(lead_ms), 1), "fade_out_ms": fo_ms, "peak_dbfs": -1.0}


def steady_start(x, span_s):
    """start (s) of the steadiest stretch of span_s seconds: least spread of 400 ms loudness, fewest spikes,
    skipping the first / last second (handling noise, fades)"""
    m = x.mean(axis=1)
    hop = int(0.1 * SR)
    win = int(0.4 * SR)
    n = max(1, (len(m) - win) // hop)
    st = np.array([10 * np.log10(np.mean(m[i * hop:i * hop + win] ** 2) + 1e-12) for i in range(n)])
    span = int(span_s / 0.1)
    best, best_s = 0.0, None
    for a in range(10, max(11, n - span - 10), 10):  # 1 s steps
        w = st[a:a + span]
        if len(w) < span * 0.9:
            break
        med = np.median(w)
        score = np.std(w) + 0.5 * max(0.0, np.percentile(w, 99.5) - med - 8)
        if best_s is None or score < best_s:
            best, best_s = a * 0.1, score
    return best


def tick_align(x, start, length):
    """for rhythmic sources (clock): loop from 50 ms before a tick to 50 ms before a later tick (an even number of
    ticks apart, so tick / tock alternation survives), so the seam falls in the quiet between ticks"""
    m = x.mean(axis=1)
    a0 = int(start * SR)
    seg = m[a0:a0 + int((length + 6) * SR)]
    e = env_ms(seg)
    thr = np.percentile(e, 99) * 0.3
    ticks, last = [], -10 ** 9
    for i in range(1, len(e)):
        if e[i] >= thr and e[i - 1] < thr and i - last > 250:
            ticks.append(i)
            last = i
    ticks = [t for t in ticks if t > 60]
    if len(ticks) < 4:
        return start, length, 2.0
    t0 = ticks[0]
    goal = t0 + length * 1000
    js = [j for j in range(2, len(ticks), 2) if ticks[j] <= goal + 1500]
    tj = ticks[js[-1]] if js else ticks[-1]
    return (a0 + (t0 - 50) * 48) / SR, (tj - t0) / 1000.0, 0.03


def loop(x, start, length, xf, stereo, lufs, ticks=False):
    if start == "auto":
        start = steady_start(x, length + xf) if len(x) > (length + xf + 2) * SR else 0.0
    if ticks:
        start, length, xf = tick_align(x, start or 0.0, length)
    if stereo and x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
        dual = True
    else:
        dual = False
    if not stereo:
        x = x.mean(axis=1, keepdims=True)
    if x.shape[1] > 2:
        x = x[:, :2]
    a = int((start or 0) * SR)
    L, X = int(length * SR), int(xf * SR)
    if a + L + X > len(x):  # shorter than asked: use what there is
        L = max(int(4 * SR), len(x) - a - X)
    seg = x[a:a + L + X].astype(np.float64)
    out = seg[:L].copy()
    t = np.linspace(0, np.pi / 2, X)[:, None]
    out[:X] = seg[:X] * np.sin(t) + seg[L:L + X] * np.cos(t)
    meter = pyloudnorm.Meter(SR)
    loud = meter.integrated_loudness(out if out.shape[1] > 1 else out[:, 0])
    g = 10 ** ((lufs - loud) / 20)
    pk = np.abs(out).max() * g
    if pk > 10 ** (-1 / 20):
        g *= 10 ** (-1 / 20) / pk
    out *= g
    return out.astype(np.float32), {"start_s": round(float(start or 0), 2), "loop_s": round(L / SR, 2),
                                    "crossfade_s": xf, "dual_mono": dual,
                                    "lufs_in": round(float(loud), 1), "gain_db": round(db(g), 1),
                                    "lufs_out": round(float(meter.integrated_loudness(out if out.shape[1] > 1 else out[:, 0])), 1)}


def main():
    picks = json.loads((LIB / "picks.json").read_text(encoding="utf-8"))
    land = json.loads((DL / "openverse" / "landing.json").read_text(encoding="utf-8")) \
        if (DL / "openverse" / "landing.json").exists() else {}
    cand = json.loads((DL / "openverse" / "candidates.json").read_text(encoding="utf-8"))
    by_id = {r["id"]: r for rows in cand.values() for r in rows}
    by_id.update({k[:8]: v for k, v in list(by_id.items())})
    land.update({k[:8]: v for k, v in list(land.items())})
    kmeta = json.loads((DL / "kenney" / "kenney_meta.json").read_text(encoding="utf-8"))
    final = json.loads((DL / "rank_final.json").read_text(encoding="utf-8")) if (DL / "rank_final.json").exists() else {}
    sys.path.insert(0, str(HERE))
    from es_rank import DESC
    rk = {}
    for name in ("rank_openverse.json", "rank_kenney.json"):
        if (DL / name).exists():
            for need, v in json.loads((DL / name).read_text(encoding="utf-8")).items():
                for x in v["results"]:
                    rk[(need, Path(x["path"]).name)] = x
    files = []
    for p in picks:
        if p.get("ov"):
            p["src"], p["ov_id"] = "openverse", p["ov"]
            p["file"] = "openverse/" + by_id[p["ov"]]["file"]
        else:
            p["src"], p["file"] = "kenney", "kenney/" + p["kn"]
        p.setdefault("desc", DESC[p["need"]])
        es = p.setdefault("earshot", {})
        hit = rk.get((p.get("rank_need", p["need"]), Path(p["file"]).name))
        if hit:
            es.setdefault("rank_z", hit["z"])
            es.setdefault("rank_verdict", hit["verdict"])
            es.setdefault("rank_query", DESC[p.get("rank_need", p["need"])])
            for sgm in hit.get("find", []):  # earshot's best moments: the one our cut lies in (or mostly covers)
                if p.get("start") is not None and p.get("end") is not None:
                    ov_ = min(p["end"], sgm["end"]) - max(p["start"], sgm["start"])
                    if ov_ > 0.5 * min(p["end"] - p["start"], sgm["end"] - sgm["start"]):
                        es.setdefault("find_z", sgm["z"])
                        es.setdefault("find_segment", [sgm["start"], sgm["end"]])
        src = DL / p["file"]
        x, sr0 = load(src)
        info0 = sf.info(str(src))
        if p["cat"] == "foley":
            y, proc = spot(x, p.get("start"), p.get("end"), p.get("fo", 15), p.get("on", -20))
        else:
            y, proc = loop(x, p.get("start", "auto"), p.get("len", 60), p.get("xf", 2.0), p["cat"] == "amb",
                           p.get("lufs", -26 if p["cat"] == "amb" else -28), p.get("ticks", False))
        out = LIB / "rec" / p["cat"] / (p["id"] + ".wav")
        out.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(out), y, SR, subtype="PCM_24")
        es = p.get("earshot", {})
        rec = {"id": p["id"], "class": p.get("class") or CLASS[p["need"]], "need": p["need"], "category": p["cat"],
               "desc": p["desc"], "z": es.get("find_z", es.get("rank_z")), "verdict": es.get("rank_verdict"),
               "path": str(out.relative_to(SND)).replace("\\", "/"),
               "duration_s": round(len(y) / SR, 3), "channels": y.shape[1], "sample_rate": SR,
               "source_file": str(src.relative_to(SND)).replace("\\", "/"),
               "segment": ([proc["start_s"], round(proc["start_s"] + proc["loop_s"] + proc["crossfade_s"], 2)]
                           if p["cat"] != "foley" else [p.get("start"), p.get("end")]),
               "processing": proc, "earshot": p.get("earshot", {}), "note": p.get("note", "")}
        if p["id"] in final:
            rec["earshot"]["final_match"] = final[p["id"]]
            rec["z_final"], rec["verdict_final"] = final[p["id"]]["z"], final[p["id"]]["verdict"]
        zs = [v for v in (rec.get("z_final"), es.get("rank_z"), es.get("find_z")) if v is not None]
        rec["weak"] = (bool(zs) and max(zs) < 2.5) or (rec.get("z_final") is not None and rec["z_final"] < 2.0)
        if p["src"] == "kenney":
            pack = p["file"].split("/")[1]
            km = kmeta[pack]
            rec.update(source="kenney.nl", page_url=km["page"], author="Kenney (Kenney Vleugels)",
                       title=Path(p["file"]).name, licence_stated=km["page_licence"] + "; License.txt: " +
                       re.search(r"License[^\n]*\n[^\n]*", km["licence_text"]).group(0).replace("\n", " ").replace("\t", ""),
                       licence_url=km["page_licence_url"], downloaded=km["downloaded"],
                       original_format="%s, %d Hz, %d ch (pack %s)" % (info0.format, sr0, info0.channels, pack),
                       download_url=km["zip"], licence_checked_on_page=True)
        else:
            r = by_id[p["ov_id"]]
            L = land.get(p["ov_id"], {})
            fi = L.get("file", {})
            orig = ", ".join(v for v in (fi.get("Type"), fi.get("Sample rate"), fi.get("Bit depth"), fi.get("Channels"))
                             if v) or ("%s %s Hz (Openverse alt_files)" % (r.get("orig_type"), r.get("orig_sr")))
            page_lic = L.get("licence_text") or []
            if not page_lic or not all(any(k in t.lower() for k in OK_LICENCE) for t in page_lic) \
                    or r["licence"] not in ("cc0", "pdm"):
                sys.exit("LICENCE STOP %s (%s): page says %r, Openverse says %r" % (p["id"], r["landing"], page_lic,
                                                                                   r["licence"]))
            rec.update(source="freesound.org (via Openverse)", openverse_id=r["id"], page_url=r["landing"],
                       author=L.get("author") or r["creator"], title=r["title"],
                       licence_stated="page: %s | Openverse: %s %s" % ("; ".join(page_lic) or "(not read)",
                                                                       r["licence"].upper(), r["licence_version"]),
                       licence_url=(L.get("licence_urls") or [r["licence_url"]])[0],
                       downloaded=p.get("downloaded") or r.get("downloaded") or datetime.date.today().isoformat(),
                       original_format=orig + " (we use the HQ preview: %s, %d Hz)" % (info0.format, sr0),
                       download_url=r["url"], licence_checked_on_page=bool(page_lic))
        files.append(rec)
        print("%-30s %6.2fs %dch  %s" % (p["id"], rec["duration_s"], rec["channels"], proc), flush=True)
    led = {"generated": datetime.date.today().isoformat(),
           "rules": "only CC0 / Public Domain Mark; licence confirmed on the landing page; see LICENSES.md",
           "files": files}
    (LIB / "ledger.json").write_text(json.dumps(led, indent=1, ensure_ascii=False), encoding="utf-8")
    write_md(files)


HEAD = """# Лицензии звуковой библиотеки L001 (записи)

Файлы лежат в `production/L001/sound/lib/rec/<категория>/<id>.wav` (48 кГц, 24 бит; эмбиенсы стерео и зациклены
кроссфейдом, точечные звуки моно и обрезаны до транзиента). Оригиналы — `lib/_dl/<источник>/...`. Машинный реестр
со всеми полями — `lib/ledger.json`. Сборка — `tools/build_lib.py` (из `lib/picks.json`).

## Правила отбора

- Берём **только CC0 1.0 и Public Domain Mark 1.0**: без атрибуции, коммерция разрешена, Content ID не запрещён.
- Лицензия каждой записи с Freesound проверена **на её странице** (не только в Openverse) в день скачивания.
- Не берём: CC BY-NC / BY-ND / BY-SA, Sampling+, BBC (RemArc), «royalty free» без текста лицензии, перезаливы
  коммерческих библиотек (серийные имена вроде «R15-32-…», «PSE_», Hollywood Edge, Sound Ideas).
- CC BY — только если ничего другого нет, с явной пометкой и строкой атрибуции. **В этой библиотеке CC BY нет.**
- С Freesound берём HQ-превью (MP3 ~128 кбит/с), потому что оригинал WAV скачивается только через вход
  на сайт или ключ API. Формат оригинала записан в таблице — при желании его можно скачать тот же файл в WAV.
- Kenney: лицензия CC0 указана на странице набора и в `License.txt` внутри архива (оба текста — в
  `lib/_dl/kenney/kenney_meta.json`).

"""


def write_md(files):
    cats = {"amb": "эмбиенс", "tone": "гул / тон", "foley": "фоли"}
    lines = [HEAD]
    mb = sum((SND / f["path"]).stat().st_size for f in files) / 1e6
    lines.append("Всего файлов: **%d** (%.0f МБ), из них Freesound — %d, Kenney — %d. Колонка «класс» — звуковой класс "
                 "микшера (`render.py`), «z» — оценка earshot: насколько файл похож на описание нужного звука "
                 "(от 3 — уверенно, 2–3 — правдоподобно; «слабый» — ниже 2.5 по исходнику или ниже 2 по готовому "
                 "файлу).\n" % (len(files), mb, sum(f["source"] != "kenney.nl" for f in files),
                                sum(f["source"] == "kenney.nl" for f in files)))
    for src, title in (("freesound.org (via Openverse)", "Freesound (найдено через Openverse)"),
                       ("kenney.nl", "Kenney (kenney.nl)")):
        rows = [f for f in files if f["source"] == src]
        if not rows:
            continue
        lines.append("## %s — %d файлов\n" % (title, len(rows)))
        lines.append("| id | класс | z | файл | кат. | автор | страница | лицензия (как указана) | URL лицензии | скачано | оригинал |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|---|")
        for f in sorted(rows, key=lambda r: (r["category"], r["id"])):
            z = f.get("z_final") if f.get("z_final") is not None else f.get("z")
            lines.append("| %s | `%s` | %s | `%s` | %s | %s | [%s](%s) | %s | %s | %s | %s |" % (
                f["id"], f["class"], ("%.1f" % z if z is not None else "—") + (" слабый" if f.get("weak") else ""),
                f["path"], cats.get(f["category"], f["category"]), f["author"],
                (f["title"] or "")[:40].replace("|", "/"), f["page_url"], f["licence_stated"].replace("|", "/"),
                f["licence_url"], f["downloaded"], f["original_format"].replace("|", "/")))
        lines.append("")
    if any(f["source"] == "kenney.nl" for f in files):
        lines.append("Kenney: страницы наборов — " + ", ".join(sorted({"[%s](%s)" % (f["page_url"].split("/")[-1],
                                                                                    f["page_url"]) for f in files
                                                                       if f["source"] == "kenney.nl"})) + ".\n")
    extra = LIB / "licences_extra.md"
    if extra.exists():
        lines.append(extra.read_text(encoding="utf-8").rstrip() + "\n")
    extra = SND / "LICENSES_extra.md"   # синтез, банк earshot, музыка — ведётся вручную, вставляется перед Sources
    if extra.exists():
        lines.append(extra.read_text(encoding="utf-8").rstrip() + "\n")
    lines.append("## Sources\n\n- `production/L001/sound/lib/ledger.json`\n- `production/L001/sound/lib/_dl/openverse/landing.json`"
                 "\n- `production/L001/sound/lib/_dl/kenney/kenney_meta.json`\n")
    (SND / "LICENSES.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
