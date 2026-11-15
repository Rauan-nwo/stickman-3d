#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check.py <mix.wav> <words.json> [--audio-dir DIR] [--ref reference.mp4] [--no-mix] [--tag NAME]

Measures what nobody here can hear, and writes <audio-dir>/check_report[_TAG].json + spectrogram PNGs:

  * integrated LUFS / LRA / true peak (ffmpeg ebur128) of the mix (and of the .m4a next to it)
  * longest stretch below -40 dB, quietest moment
  * mean level in every gap between sentences
  * timing error of the four step hits and of every "key" cue against its cue word.
    The cue time is re-resolved here from words.json; the sound's onset is measured in the stem file as it
    sits on disk, placed where cues.json says (25 % of the local peak of a 3 ms envelope; the envelope maximum
    for whooshes). The step hits are also measured in the finished mix (35-130 Hz band).
  * clipping in music.wav, sfx.wav and every stem
  * band levels of the mix next to the reference's, L/R correlation
  * mix_spectrogram.png, ref_spectrogram.png (same scales)

--no-mix: only the cue/stem checks (used for the re-timing test).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_audio import SR, Script, read_wav, dbv  # noqa: E402

TOP10 = ["throw_whoosh", "splash_distant", "soldiers_clatter", "chain_creak", "stumble_steps", "boots_h4_L", "sign_ding",
         "push_thump", "bolt_ping", "bridge_snap"]


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-f", "f32le", "-acodec", "pcm_f32le",
                          "-ac", "2", "-ar", str(SR), "pipe:1"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64).reshape(-1, 2)


def ebur128(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:"):]
    g = lambda pat: float(re.search(pat, tail).group(1))
    return {"I": g(r"I:\s+(-?[\d.]+) LUFS"), "LRA": g(r"LRA:\s+(-?[\d.]+) LU"), "TP": g(r"Peak:\s+(-?[\d.]+) dBFS")}


def power(x):
    return np.mean(x * x, axis=1) if x.ndim == 2 else x * x


def env_db(x, win, hop):
    p = power(x)
    w, h = int(win * SR), int(hop * SR)
    c = np.concatenate([[0.0], np.cumsum(p)])
    idx = np.arange(0, len(p) - w, h)
    return 10 * np.log10(np.maximum((c[idx + w] - c[idx]) / w, 1e-18)), (idx + w / 2) / SR


def seg_db(x, a, b):
    s = x[max(0, int(a * SR)):int(b * SR)]
    return float(10 * np.log10(np.mean(power(s)) + 1e-18)) if len(s) else float("nan")


def runs(mask):
    d = np.diff(np.concatenate([[0], mask.astype(np.int8), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]))


def band(x, lo, hi, order=4):
    if lo <= 0:
        sos = signal.butter(order, hi, "low", fs=SR, output="sos")
    elif hi >= SR / 2:
        sos = signal.butter(order, lo, "high", fs=SR, output="sos")
    else:
        sos = signal.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, x, axis=0)


def onset_in(x, anchor, mode):
    """Seconds from the file start to the sound's onset: 25 % of the local peak of a 3 ms envelope
    ('onset'), or the maximum of a 30 ms envelope ('peak')."""
    a = np.sqrt(power(x))
    if mode == "peak":
        k = int(0.03 * SR)
        e = np.convolve(a, np.ones(k) / k, mode="same")
        return float(np.argmax(e)) / SR
    k = int(0.003 * SR)
    e = np.convolve(a, np.ones(k) / k, mode="same")
    i0, i1 = max(0, int((anchor - 0.06) * SR)), min(len(e), int((anchor + 0.25) * SR))
    thr = 0.25 * e[i0:i1].max()
    j0 = max(0, int((anchor - 0.03) * SR))
    j = np.nonzero(e[j0:i1] >= thr)[0]
    return (j0 + int(j[0])) / SR if len(j) else float("nan")


# ---- spectrogram picture (numpy + PIL only) ------------------------------------------------
def spectrogram_png(x, path, title, t_max=None, width=1560, height=420):
    from PIL import Image, ImageDraw, ImageFont
    m = x.mean(axis=1)
    f, t, Z = signal.stft(m, SR, nperseg=4096, noverlap=4096 - 512, window="hann", padded=False, boundary=None)
    P = (np.abs(Z) * 2) ** 2                              # a full-scale sine reads 0 dB
    t_max = t_max or len(m) / SR
    cols = np.clip((t / t_max * width).astype(int), 0, width - 1)
    Pc = np.zeros((P.shape[0], width))
    cnt = np.zeros(width)
    np.add.at(Pc.T, cols, P.T)
    np.add.at(cnt, cols, 1)
    Pc[:, cnt > 0] /= cnt[cnt > 0]
    f_lo, f_hi = 30.0, 20000.0
    edges = f_lo * (f_hi / f_lo) ** (np.arange(height + 1) / height)
    img = np.zeros((height, width))
    for r in range(height):
        a, b = edges[r], edges[r + 1]
        i0, i1 = np.searchsorted(f, a), np.searchsorted(f, b)
        if i1 > i0:
            row = Pc[i0:i1].max(axis=0)
        else:
            fr = (np.sqrt(a * b) - f[i0 - 1]) / (f[i0] - f[i0 - 1])
            row = Pc[i0 - 1] * (1 - fr) + Pc[i0] * fr
        img[height - 1 - r] = row
    d = 10 * np.log10(img + 1e-20)
    lo_db, hi_db = -100.0, -18.0
    u = np.clip((d - lo_db) / (hi_db - lo_db), 0, 1)
    stops = np.array([(0, 0, 4), (40, 11, 84), (101, 21, 110), (159, 42, 99), (212, 72, 66), (245, 125, 21), (250, 193, 39),
                      (252, 255, 164)], dtype=float)
    lut = np.stack([np.interp(np.linspace(0, 1, 256), np.linspace(0, 1, len(stops)), stops[:, c]) for c in range(3)], axis=1)
    rgb = lut[(u * 255).astype(int)].astype(np.uint8)

    ML, MT, MB, STRIP = 64, 34, 30, 120
    W, H = ML + width + 16, MT + height + 14 + STRIP + MB
    can = Image.new("RGB", (W, H), (18, 18, 22))
    can.paste(Image.fromarray(rgb, "RGB"), (ML, MT))
    dr = ImageDraw.Draw(can)
    try:
        font = ImageFont.load_default(size=13)
        big = ImageFont.load_default(size=15)
    except TypeError:
        font = big = ImageFont.load_default()
    fg, grid = (225, 225, 230), (70, 70, 80)
    dr.text((ML, 8), title, fill=fg, font=big)
    for fq in (50, 100, 200, 500, 1000, 2000, 5000, 10000):
        y = MT + height - 1 - int(np.log(fq / f_lo) / np.log(f_hi / f_lo) * height)
        dr.line([(ML - 5, y), (ML, y)], fill=fg)
        lab = "%dk" % (fq // 1000) if fq >= 1000 else str(fq)
        dr.text((ML - 9 - dr.textlength(lab, font=font), y - 7), lab, fill=fg, font=font)
    dr.text((4, MT - 16), "Hz", fill=fg, font=font)
    # level strip: 50 ms RMS in dBFS
    e, te = env_db(x, 0.05, 0.01)
    y0 = MT + height + 14
    top_db, bot_db = 0.0, -60.0
    yy = lambda v: y0 + int((top_db - v) / (top_db - bot_db) * STRIP)
    dr.rectangle([ML, y0, ML + width, y0 + STRIP], fill=(28, 28, 34))
    for v, col in ((-14, (90, 140, 90)), (-28, grid), (-40, (170, 80, 80))):
        dr.line([(ML, yy(v)), (ML + width, yy(v))], fill=col)
        dr.text((ML - 9 - dr.textlength(str(v), font=font), yy(v) - 7), str(v), fill=fg, font=font)
    pts = [(ML + int(tt / t_max * width), yy(max(bot_db, min(top_db, v)))) for tt, v in zip(te, e) if tt <= t_max]
    dr.line(pts, fill=(250, 193, 39), width=1)
    dr.text((4, y0 + STRIP // 2 - 14), "dBFS", fill=fg, font=font)
    for s in range(0, int(t_max) + 1, 5):
        xx = ML + int(s / t_max * width)
        dr.line([(xx, MT + height), (xx, MT + height + 5)], fill=fg)
        dr.line([(xx, y0 + STRIP), (xx, y0 + STRIP + 5)], fill=fg)
        dr.text((xx - 8, y0 + STRIP + 8), "%ds" % s, fill=fg, font=font)
    can.save(path)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mix", nargs="?")
    ap.add_argument("words")
    ap.add_argument("--audio-dir", default=str(HERE))
    ap.add_argument("--narration")
    ap.add_argument("--ref")
    ap.add_argument("--no-mix", action="store_true")
    ap.add_argument("--tag", default="")
    a = ap.parse_args(argv)
    if a.no_mix and a.mix and not a.words:
        a.words, a.mix = a.mix, None

    A = Path(a.audio_dir)
    words = json.load(open(a.words, encoding="utf-8"))
    nar = Path(a.narration) if a.narration else HERE.parent / "narration.txt"
    sc = Script(words, nar.read_text(encoding="utf-8"))
    meta = json.load(open(A / "cues.json", encoding="utf-8"))
    rep = {"words": str(a.words), "duration": round(sc.t_end, 3), "tempo": {k: meta["tempo"][k] for k in ("beat_period_s", "bpm")}}

    # ---------------- cue timing: stems on disk vs cue words ----------------
    cache = {}

    def stem(file):
        if file not in cache:
            cache[file] = read_wav(A / file)
        return cache[file]

    rows = []
    for c in meta["cues"]:
        if not c.get("key") or c["track"] != "sfx" or c.get("measure") == "none":
            continue
        cue = c["cue"]
        want = sc.at(cue) + (cue.get("beat") or 0) * cue.get("beat_period", 0.0)
        x = stem(c["file"])
        got = c["start"] + onset_in(x, c["anchor"], c["measure"])
        rows.append({"sound": Path(c["file"]).stem, "cue": "%d:%s" % (cue["sentence"], cue["word"]) + ("#%d" % cue["occ"] if cue.get("occ", 1) > 1 else ""),
                     "cue_time": round(want, 4), "onset": round(got, 4), "error_ms": round(1000 * (got - want), 1),
                     "how": c["measure"], "featured": c["featured"]})
    step_cues = [r for r in rows if r["cue"].startswith("8:") and r["sound"].startswith("boots_")]
    top = [next(r for r in rows if r["sound"] == nm) for nm in TOP10 if any(r["sound"] == nm for r in rows)]
    rep["timing"] = {"tolerance_ms": 20, "step_hits_stem": step_cues, "top10": top,
                     "other_key": [r for r in rows if r not in step_cues and r not in top],
                     "max_abs_error_ms_steps": max(abs(r["error_ms"]) for r in step_cues),
                     "max_abs_error_ms_top10": max(abs(r["error_ms"]) for r in top),
                     "max_abs_error_ms_all_key": max(abs(r["error_ms"]) for r in rows),
                     "all_within_tolerance": bool(all(abs(r["error_ms"]) <= 20 for r in rows))}

    # music events measured in the music stems
    mus = []
    for c in meta["cues"]:
        if c["track"] != "music" or not c.get("key"):
            continue
        cue = c["cue"]
        want = sc.at(cue) + (cue.get("beat") or 0) * cue.get("beat_period", 0.0)
        if c["file"] == "music.wav":                       # the dead cut: last sample of music above -60 dBFS before the hole
            x = stem("music.wav")
            e = np.sqrt(power(x))
            i0, i1 = int((want - 0.3) * SR), int((want + 0.3) * SR)
            j = np.nonzero(e[i0:i1] > 1e-3)[0]
            hole = runs(e[i0:int((want + 0.9) * SR)] < 1e-3)
            hole = max(hole, key=lambda r: r[1] - r[0]) if hole else (0, 0)
            got = (i0 + hole[0]) / SR
            mus.append({"event": c["note"], "cue": "%d:%s" % (cue["sentence"], cue["word"]), "cue_time": round(want, 4),
                        "measured": round(got, 4), "error_ms": round(1000 * (got - want), 1),
                        "silence_after_ms": round(1000 * (hole[1] - hole[0]) / SR)})
            continue
        x = stem(c["file"])
        i0, i1 = max(0, int((want - 0.08) * SR)), int((want + 0.25) * SR)
        seg = x[i0:i1]
        if "tune" in c["note"]:                            # a soft-attack fife under drums: measure the fife stem itself
            pass
        got = i0 / SR + onset_in(seg, want - i0 / SR, "onset")
        mus.append({"event": c["note"][:70], "cue": "%d:%s" % (cue["sentence"], cue["word"]) + ("+%gbeat" % cue["beat"] if cue.get("beat") else ""),
                    "cue_time": round(want, 4), "measured": round(got, 4), "error_ms": round(1000 * (got - want), 1)})
    rep["timing"]["music_events"] = mus

    # hard stop: last non-silent sample of music.wav / sfx.wav against the end of the last word
    hs = {}
    for nm in ("music.wav", "sfx.wav"):
        x = stem(nm)
        nz = np.nonzero(np.sqrt(power(x)) > 1e-4)[0]
        hs[nm] = {"file_length_s": round(len(x) / SR, 4), "last_audible_sample_s": round(float(nz[-1]) / SR, 4) if len(nz) else None,
                  "end_of_last_word_s": round(sc.t_end, 4)}
    rep["hard_stop"] = hs

    # ---------------- clipping ----------------
    clip = []
    for p in [A / "music.wav", A / "sfx.wav"] + sorted((A / "stems").glob("*.wav")):
        x = read_wav(p)
        clip.append({"file": p.relative_to(A).as_posix(), "peak_dbfs": round(float(dbv(np.max(np.abs(x)))), 2),
                     "samples_at_full_scale": int(np.sum(np.abs(x) >= 0.9999))})
    rep["clipping"] = {"files": len(clip), "max_peak_dbfs": max(c["peak_dbfs"] for c in clip),
                       "clipped_files": [c["file"] for c in clip if c["samples_at_full_scale"] > 0], "list": clip}

    # ---------------- the mix ----------------
    if not a.no_mix and a.mix:
        x = decode(a.mix)
        rep["mix"] = {"file": str(a.mix), "duration_s": round(len(x) / SR, 3), "loudness": ebur128(a.mix)}
        m4a = Path(a.mix).with_suffix(".m4a")
        if m4a.exists():
            rep["mix"]["loudness_m4a"] = ebur128(m4a)
        rep["mix"]["lr_correlation"] = round(float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]), 3)
        rep["mix"]["sample_peak_dbfs"] = round(float(dbv(np.max(np.abs(x)))), 2)
        n_end = int(sc.t_end * SR)
        e, te = env_db(x[:n_end], 0.05, 0.01)
        e20, te20 = env_db(x[:n_end], 0.02, 0.01)
        below = [(te[i], (j - i) * 0.01) for i, j in runs(e < -40)]
        worst = max(below, key=lambda r: r[1]) if below else (None, 0.0)
        rep["mix"]["silence"] = {
            "window": "50 ms RMS, 10 ms hop, from 0 to the end of the last word",
            "longest_below_-40dB_s": round(worst[1], 3), "at_s": None if worst[0] is None else round(float(worst[0]), 2),
            "quietest_50ms_db": round(float(e.min()), 1), "quietest_at_s": round(float(te[np.argmin(e)]), 2),
            "longest_below_-35dB_s": round(max([(j - i) * 0.01 for i, j in runs(e < -35)] or [0.0]), 3),
            "longest_below_-40dB_20ms_window_s": round(max([(j - i) * 0.01 for i, j in runs(e20 < -40)] or [0.0]), 3),
            "percentiles_50ms_db": {str(p): round(float(np.percentile(e, p)), 1) for p in (1, 5, 10, 25, 50, 75, 90, 99)}}
        # gaps: between narration sentences, plus sentence breaks inside a line (pauses >= 0.3 s)
        gaps = []
        tk = sc.tok
        for i in range(len(tk) - 1):
            g = tk[i + 1]["start"] - tk[i]["end"]
            if tk[i + 1]["s"] != tk[i]["s"] or g >= 0.3:
                gaps.append({"after_sentence": tk[i]["s"], "between": "%s | %s" % (tk[i]["w"], tk[i + 1]["w"]),
                             "t0": round(tk[i]["end"], 2), "dur_s": round(g, 2),
                             "mean_db": round(seg_db(x, tk[i]["end"], tk[i + 1]["start"]), 1),
                             "min_50ms_db": round(float(e[(te >= tk[i]["end"]) & (te <= tk[i + 1]["start"])].min()), 1) if g > 0.06 else None})
        lv = np.array([g["mean_db"] for g in gaps])
        rep["mix"]["gaps"] = {"count": len(gaps), "median_db": round(float(np.median(lv)), 1), "min_db": round(float(lv.min()), 1),
                              "max_db": round(float(lv.max()), 1),
                              "inside_-20..-28": int(np.sum((lv <= -20) & (lv >= -28))), "list": gaps}
        act = np.zeros(len(x), dtype=bool)
        for w in words:
            act[int(float(w["start"]) * SR):int(float(w["end"]) * SR) + 1] = True
        rep["mix"]["level_under_words_db"] = round(float(10 * np.log10(np.mean(power(x)[act]))), 1)
        # step hits in the finished mix: 35-130 Hz band, 50 % of the local maximum of a 5 ms envelope
        lf = band(x.mean(axis=1), 35, 130)
        k = int(0.005 * SR)
        el = np.sqrt(np.convolve(lf * lf, np.ones(k) / k, mode="same"))
        sm = []
        for i, ts in enumerate(meta["tempo"]["step_times"]):
            want = [sc.t(8, "left", 1), sc.t(8, "right", 1), sc.t(8, "left", 2), sc.t(8, "right", 2)][i]
            i0, i1 = int((want - 0.07) * SR), int((want + 0.13) * SR)
            thr = 0.25 * el[i0:i1].max()
            j0 = int((want - 0.05) * SR)
            # walk back from the local maximum to where the burst starts
            jm = i0 + int(np.argmax(el[i0:i1]))
            j = jm
            while j > j0 and el[j] >= thr:
                j -= 1
            sm.append({"step": i + 1, "word_time": round(want, 4), "lf_onset": round(j / SR, 4), "error_ms": round(1000 * (j / SR - want), 1),
                       "lf_peak_db": round(float(dbv(el[jm])), 1)})
        rep["timing"]["step_hits_in_mix"] = sm
        # spectrum by band
        mono = x.mean(axis=1)
        bands = [(0, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
        rep["mix"]["bands_db"] = {"%d-%d" % b: round(float(10 * np.log10(np.mean(band(mono, *b) ** 2) + 1e-18)), 1) for b in bands}
        f, p = signal.welch(mono, SR, nperseg=4096)
        rep["mix"]["centroid_hz"] = round(float(np.sum(f * p) / np.sum(p)))
        spectrogram_png(x, A / ("mix_spectrogram%s.png" % a.tag),
                        "V002 mix  |  %.1f LUFS, LRA %.1f, TP %.1f dBFS  |  top: spectrogram 30 Hz-20 kHz (log), bottom: 50 ms RMS"
                        % (rep["mix"]["loudness"]["I"], rep["mix"]["loudness"]["LRA"], rep["mix"]["loudness"]["TP"]), t_max=65.0)
    if a.ref:
        xr = decode(a.ref)
        lr = ebur128(a.ref)
        spectrogram_png(xr, A / "ref_spectrogram.png",
                        "Reference: How Mine Salting Worked  |  %.1f LUFS, LRA %.1f, TP %.1f dBFS  |  same scales as the mix"
                        % (lr["I"], lr["LRA"], lr["TP"]), t_max=65.0)
        rep["reference"] = {"file": str(a.ref), "loudness": lr}

    out = A / ("check_report%s.json" % a.tag)
    json.dump(rep, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

    # ---------------- console summary ----------------
    T = rep["timing"]
    print("tempo %.1f bpm (beat %.1f ms), duration %.3f s" % (rep["tempo"]["bpm"], 1000 * rep["tempo"]["beat_period_s"], rep["duration"]))
    print("TIMING (stem onset vs cue word, ms; tolerance +-20):")
    for r in T["step_hits_stem"] + T["top10"]:
        print("  %-18s %-16s cue %7.3f  onset %7.3f  %+6.1f ms  [%s]" % (r["sound"], r["cue"], r["cue_time"], r["onset"], r["error_ms"], r["how"]))
    print("  other key cues: " + ", ".join("%s %+.1f" % (r["sound"], r["error_ms"]) for r in T["other_key"]))
    print("  max |error|: steps %.1f ms, top-10 %.1f ms, all key cues %.1f ms -> %s"
          % (T["max_abs_error_ms_steps"], T["max_abs_error_ms_top10"], T["max_abs_error_ms_all_key"],
             "OK" if T["all_within_tolerance"] else "OUT OF TOLERANCE"))
    for r in T["music_events"]:
        print("  music: %-58s %-18s %+6.1f ms" % (r["event"][:58], r["cue"], r["error_ms"]))
    for nm, h in rep["hard_stop"].items():
        print("  hard stop %-9s last audible %.4f s, end of last word %.4f s" % (nm, h["last_audible_sample_s"], h["end_of_last_word_s"]))
    C_ = rep["clipping"]
    print("CLIPPING: %d files, hottest peak %.2f dBFS, clipped: %s" % (C_["files"], C_["max_peak_dbfs"], C_["clipped_files"] or "none"))
    if "mix" in rep:
        M = rep["mix"]
        print("MIX: %.1f LUFS, LRA %.1f, TP %.1f dBFS" % (M["loudness"]["I"], M["loudness"]["LRA"], M["loudness"]["TP"])
              + (" | m4a %.1f LUFS, LRA %.1f, TP %.1f" % (M["loudness_m4a"]["I"], M["loudness_m4a"]["LRA"], M["loudness_m4a"]["TP"])
                 if "loudness_m4a" in M else ""))
        s = M["silence"]
        print("  longest below -40 dB: %.3f s (quietest 50 ms: %.1f dB at %.2f s); below -35 dB: %.3f s"
              % (s["longest_below_-40dB_s"], s["quietest_50ms_db"], s["quietest_at_s"], s["longest_below_-35dB_s"]))
        g = M["gaps"]
        print("  gaps: %d, mean level median %.1f dB (min %.1f, max %.1f), inside -20..-28: %d"
              % (g["count"], g["median_db"], g["min_db"], g["max_db"], g["inside_-20..-28"]))
        for q in g["list"]:
            print("    after S%-2d %-22s t=%6.2f dur %.2f  mean %6.1f dB  min50 %s" % (q["after_sentence"], q["between"][:22], q["t0"], q["dur_s"], q["mean_db"], q["min_50ms_db"]))
        print("  level under words %.1f dB | L/R corr %.3f | centroid %d Hz" % (M["level_under_words_db"], M["lr_correlation"], M["centroid_hz"]))
        print("  bands:", M["bands_db"])
        for r in T["step_hits_in_mix"]:
            print("  step %d in the mix (35-130 Hz): word %.3f, LF onset %.3f, %+.1f ms, LF peak %.1f dB" % (r["step"], r["word_time"], r["lf_onset"], r["error_ms"], r["lf_peak_db"]))
    print("report:", out)


if __name__ == "__main__":
    main()
