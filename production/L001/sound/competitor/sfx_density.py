# -*- coding: utf-8 -*-
"""Плотность звуковых эффектов (SFX) в дорожке БЕЗ голоса: события в минуту и грубые классы.

    python sfx_density.py <audio_residual.wav> [--thr X] [--floor F] [--json out.json] [--multi 6,10,15]

Один и тот же детектор для стема конкурента (Demucs no_vocals) и для наших стемов (музыка+эффекты без голоса),
чтобы сравнение было яблоки к яблокам. Работает на любой частоте дискретизации (внутри приводится к 48 кГц).

Детектор (всё по моно (L+R)/2):
  1. K-взвешенная огибающая (BS.1770) в окнах 20 мс, шаг 10 мс → уровень «LUFS-20мс».
  2. Кандидаты — пики спектрального потока (log-mel 64, 24 кГц, шаг 10 мс) по перкуссивной части HPSS.
  3. Контраст = max уровня в [t, t+300 мс] − медиана уровня в [t−400, t−40] мс. Событие принимается, если
     контраст >= --thr дБ (по умолчанию 10) и пик >= --floor LUFS-20мс (по умолчанию −40).
  4. События ближе 120 мс друг к другу сливаются (остаётся с большим контрастом); время уточняется до 2.5 мс.
  5. Фильтр петли: отпечаток log-mel (64 полосы × 170 мс от начала) сравнивается с кандидатами (контраст >= 6 дБ)
     в 0.4-12 с; если >= 3 из них совпадают с корреляцией >= 0.9 — это повторяющийся удар музыки (бочка, бас,
     перкуссия) → класс music, в плотность SFX не входит (печатается отдельно).
  Длина события — от начала до спада ниже max(пик − 12 дБ, фон + 30 % контраста) или до следующего события.
Классы (эвристика по форме огибающей и спектру; проверены на слух earshot и по кадру — см. COMPETITOR_AUDIO.md):
  riser   — нарастание >= 600 мс (или длинное событие с ростом центроида);
  whoosh  — шумовое (flatness высокая), атака 60-600 мс, длина 150-1500 мс;
  click   — щелчок/тик/машинка: длина <= 90 мс, центроид >= 1500 Гц (typewriter = серия из >= 4 щелчков);
  shutter — ровно два щелчка 40-250 мс друг от друга;
  hit     — удар: атака <= 30 мс, низ (<150 Гц) >= 30 % или центроид < 800 Гц, длина >= 100 мс;
  sting   — тональный аккорд/удар: гармоническая доля >= 0.6, длина >= 800 мс, атака <= 80 мс;
  ding    — короткая тональная нота (динь, щипок, колокольчик): гармоническая доля >= 0.55, длина < 800 мс;
  paper   — шумовое короткое 80-500 мс с центроидом 2-8 кГц и быстрой атакой;
  other   — всё остальное.
"""
import argparse
import json
import sys

import numpy as np
from scipy import signal

SR = 48000
HOP = 0.01


def k_weight(x):
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x))


def load_mono(path):
    import soundfile as sf
    x, sr = sf.read(path, dtype="float32", always_2d=True)
    m = x.mean(1).astype(np.float64)
    if sr != SR:
        from math import gcd
        g = gcd(SR, sr)
        m = signal.resample_poly(m, SR // g, sr // g)
    return m


def blocks(v, b):
    n = len(v) // b
    return (v[:n * b] ** 2).reshape(n, b).mean(1)


def spectral_features(m):
    """по кадрам 10 мс на 24 кГц: поток перкуссивной части, гарм. доля, центроид, flatness, низ/верх доли"""
    import librosa
    y = signal.resample_poly(m, 1, 2).astype(np.float32)
    sr, hop, nfft = 24000, 240, 1024
    n_fr = len(y) // hop + 1
    out = {k: np.zeros(n_fr, np.float32) for k in ("flux", "harm", "cent", "flat", "low", "high", "pe")}
    out["mel"] = np.full((64, n_fr), -100, np.float32)  # log-mel полного сигнала — для проверки «повтора петли»
    freqs = librosa.fft_frequencies(sr=sr, n_fft=nfft)
    mel = librosa.filters.mel(sr=sr, n_fft=nfft, n_mels=64, fmin=40, fmax=11000)
    CH, OV = 60 * sr, 4 * sr
    for s in range(0, len(y), CH):
        a, b = max(0, s - OV), min(len(y), s + CH + OV)
        S = np.abs(librosa.stft(y[a:b], n_fft=nfft, hop_length=hop, center=True))
        H, P = librosa.decompose.hpss(S, kernel_size=(31, 31))
        Pp = P ** 2
        lm = librosa.power_to_db(mel @ Pp, ref=1.0, top_db=None)
        fl = np.concatenate([[0], np.maximum(0, np.diff(lm, axis=1)).mean(0)])
        S2 = S ** 2 + 1e-12
        lmf = np.maximum(librosa.power_to_db(mel @ (S ** 2), ref=1.0, top_db=None), -100)
        tot = S2.sum(0)
        cent = (freqs[:, None] * S2).sum(0) / tot
        flat = np.exp(np.mean(np.log(S2[1:]), 0)) / np.mean(S2[1:], 0)
        low = S2[freqs < 150].sum(0) / tot
        high = S2[freqs > 3000].sum(0) / tot
        harm = (H ** 2).sum(0) / ((H ** 2).sum(0) + Pp.sum(0) + 1e-12)
        i0 = (s - a) // hop
        n = min(CH // hop, S.shape[1] - i0, n_fr - s // hop)
        sl_out, sl_in = slice(s // hop, s // hop + n), slice(i0, i0 + n)
        for k, v in (("flux", fl), ("harm", harm), ("cent", cent), ("flat", flat), ("low", low), ("high", high),
                     ("pe", Pp.sum(0))):
            out[k][sl_out] = v[sl_in]
        out["mel"][:, sl_out] = lmf[:, sl_in]
    return out


def _patch(M, i):
    p = M[:, max(0, i - 2):i + 15].astype(np.float64)
    if p.shape[1] < 17:
        p = np.pad(p, ((0, 0), (0, 17 - p.shape[1])), mode="edge")
    p = p - p.mean()
    return p / (np.linalg.norm(p) + 1e-9)


def loop_counts(events, pool, M, corr=0.9, span=12.0):
    """сколько событий из пула в 0.4-12 с от события имеют тот же спектральный отпечаток (log-mel 64 × 170 мс,
    корреляция >= corr). Повторяющийся удар — элемент музыкальной петли (бочка, бас, перкуссия), а не SFX."""
    pi = np.array([e["i"] for e in pool])
    PP = np.stack([_patch(M, i) for i in pi]) if len(pi) else np.zeros((0, 64, 17))
    for e in events:
        sel = np.nonzero((np.abs(pi - e["i"]) <= span / HOP) & (np.abs(pi - e["i"]) >= 0.4 / HOP))[0]
        c = (PP[sel] * _patch(M, e["i"])).sum((1, 2)) if len(sel) else np.zeros(0)
        e["loop"] = int((c >= corr).sum())
    return events


def detect(m, thr=10.0, floor=-40.0, feats=None, env=None):
    import librosa
    if env is None:
        env = envelopes(m)
    e20 = env["e20"]
    F = feats if feats is not None else spectral_features(m)
    n = min(len(e20), len(F["flux"]))
    flux = F["flux"][:n].astype(np.float64)
    fz = (flux - np.median(flux)) / (np.percentile(flux, 90) - np.median(flux) + 1e-9)
    cand = librosa.util.peak_pick(fz, pre_max=3, post_max=3, pre_avg=10, post_avg=10, delta=0.3, wait=5)
    ev = []
    for i in cand:
        if i < 41 or i > n - 31:
            continue
        pre = float(np.median(e20[i - 40:i - 4]))
        j = i + int(np.argmax(e20[i:i + 30]))
        post = float(e20[j])
        c = post - pre
        if c >= thr and post >= floor:
            ev.append([i, j, c, post, pre])
    # слияние < 120 мс
    merged = []
    for e in ev:
        if merged and e[0] - merged[-1][0] < 12:
            if e[2] > merged[-1][2]:
                merged[-1] = e
        else:
            merged.append(e)
    e25 = env["e25"]
    out = []
    for i, j, c, post, pre in merged:
        # уточнение: макс. рост 2.5-мс огибающей в [t−40, t+40] мс
        a, b = max(1, i * 4 - 16), min(len(e25) - 1, i * 4 + 16)
        d = np.diff(e25[a - 1:b + 1])
        t0 = (a + int(np.argmax(d))) * 0.0025
        out.append({"t": round(t0, 4), "i": int(i), "ipeak": int(j), "contrast_db": round(c, 1),
                    "peak_lufs20": round(post, 1), "bed_lufs20": round(pre, 1)})
    return out


def envelopes(m):
    y = k_weight(m)
    p10 = blocks(y, int(SR * HOP))
    c = np.concatenate([[0.0], np.cumsum(p10)])
    e20 = -0.691 + 10 * np.log10(np.maximum((c[2:] - c[:-2]) / 2, 1e-12))  # окно 20 мс, индекс i — начало
    e20 = np.concatenate([e20, [e20[-1]]])
    p25 = blocks(y, int(SR * 0.0025))
    e25 = 10 * np.log10(np.maximum(np.convolve(p25, np.ones(3) / 3, "same"), 1e-12))
    return {"e20": e20, "e25": e25}


def classify(events, env, F):
    e20 = env["e20"]
    n = len(e20)
    times = np.array([e["t"] for e in events])
    for k, e in enumerate(events):
        i = e["i"]
        nxt = events[k + 1]["i"] if k + 1 < len(events) else n
        lim = min(n, i + 300, max(nxt, i + 8))
        seg = e20[i:lim]
        jp = int(np.argmax(seg[:max(1, min(len(seg), 150))]))
        pk = seg[jp]
        bed = e["bed_lufs20"]
        below = np.nonzero(seg[jp:] < max(pk - 12, bed + 0.3 * (pk - bed)))[0]  # спад: −12 дБ, но не ниже фона+30 % контраста
        dur = (jp + (below[0] if len(below) else len(seg) - jp)) * HOP
        # подъём до события: рос ли уровень последние 600 мс
        pre = e20[max(0, i - 60):i + 1]
        prerise = float(pre[-1] - pre.min()) if len(pre) > 5 else 0.0
        rise_ms = jp * 10
        sl = slice(i, i + max(2, int(round(dur / HOP))))
        cent = float(np.median(F["cent"][sl]))
        cs = F["cent"][sl]
        cslope = float(np.log2(max(cs[-1], 50) / max(cs[0], 50)) / max(dur, 0.05)) if len(cs) > 2 else 0.0
        flat = float(np.median(F["flat"][sl]))
        harm = float(np.mean(F["harm"][sl]))
        low = float(np.median(F["low"][sl]))
        high = float(np.median(F["high"][sl]))
        near = times[(np.abs(times - e["t"]) <= 1.0)]
        dt = np.diff(np.sort(near))
        train = int((dt[(dt >= 0.04) & (dt <= 0.2)]).size + 1) if len(dt) else 1
        pair = np.sort(np.abs(times - e["t"]))
        two = len(times) > 1 and 0.04 <= pair[1] <= 0.25 and (len(pair) < 3 or pair[2] > 0.4)
        f = dict(dur_ms=round(dur * 1000), rise_ms=rise_ms, prerise_db=round(prerise, 1), cent_hz=round(cent),
                 cent_slope_oct_s=round(cslope, 2), flat=round(flat, 3), harm=round(harm, 2), low=round(low, 2),
                 high=round(high, 2), train=train)
        if rise_ms >= 600 or (prerise >= 10 and dur >= 0.6) or (dur >= 1.2 and cslope > 1.0 and rise_ms >= 300):
            cls = "riser"
        elif dur <= 0.09 and cent >= 1500:
            cls = "click" if not two else "shutter"
        elif harm >= 0.6 and dur >= 0.8 and rise_ms <= 80:
            cls = "sting"
        elif flat >= 0.12 and 60 <= rise_ms <= 600 and 0.15 <= dur <= 1.5:
            cls = "whoosh"
        elif rise_ms <= 30 and (low >= 0.3 or cent < 800) and dur >= 0.1:
            cls = "hit"
        elif harm >= 0.55 and dur < 0.8:
            cls = "ding"
        elif flat >= 0.12 and rise_ms <= 40 and 0.08 <= dur <= 0.5 and 2000 <= cent <= 8000:
            cls = "paper"
        elif flat >= 0.12 and dur >= 0.15 and rise_ms >= 30:
            cls = "whoosh"
        else:
            cls = "other"
        e["cls"] = cls
        e.update(f)
    # серии щелчков → typewriter; повторяющийся удар петли → music (не SFX)
    for e in events:
        if e["cls"] == "click" and e["train"] >= 4:
            e["cls"] = "typewriter"
        if e.get("loop", 0) >= LOOP_MIN and e["cls"] != "typewriter":
            e["cls_raw"] = e["cls"]
            e["cls"] = "music"
    return events


CLASSES = ["whoosh", "hit", "click", "typewriter", "shutter", "riser", "sting", "ding", "paper", "other"]
POOL_THR = 6.0   # пул для проверки повтора: все кандидаты с контрастом >= 6 дБ
LOOP_MIN = 3     # >= 3 повторов того же отпечатка (корр. >= 0.9) в ±12 с → элемент музыки
MOMENT_GAP = 0.4  # «звуковой момент»: события, разделённые < 0.4 с, считаются одним (штамп = удар + хвост)


def summarize(events, dur_s):
    music = [e for e in events if e["cls"] == "music"]
    events = [e for e in events if e["cls"] != "music"]
    mins = int(np.ceil(dur_s / 60))
    per_min = []
    for k in range(mins):
        sel = [e for e in events if k * 60 <= e["t"] < (k + 1) * 60]
        span = min(60, dur_s - k * 60) / 60
        per_min.append({"min": k, "n": len(sel), "per_min": round(len(sel) / span, 1),
                        **{c: sum(e["cls"] == c for e in sel) for c in CLASSES}})
    tot = {c: sum(e["cls"] == c for e in events) for c in CLASSES}
    ts = sorted(e["t"] for e in events)
    moments = 1 + sum(1 for a, b in zip(ts[:-1], ts[1:]) if b - a > MOMENT_GAP) if ts else 0
    return {"n": len(events), "per_min": round(len(events) / (dur_s / 60), 2),
            "moments": moments, "moments_per_min": round(moments / (dur_s / 60), 2),
            "n_music_loop_hits_excluded": len(music),
            "class_counts": tot, "class_per_min": {c: round(v / (dur_s / 60), 2) for c, v in tot.items()},
            "per_minute": per_min}


def run(path, thr, floor, multi=None):
    m = load_mono(path)
    dur = len(m) / SR
    env = envelopes(m)
    F = spectral_features(m)
    res = {"file": path, "duration_s": round(dur, 2), "floor_lufs20": floor, "by_thr": {}}
    pool = detect(m, POOL_THR, floor, F, env)
    for t in (multi or [thr]):
        ev = classify(loop_counts(detect(m, t, floor, F, env), pool, F["mel"]), env, F)
        res["by_thr"][str(t)] = {"summary": summarize(ev, dur), "events": ev}
    return res


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("--thr", type=float, default=10.0, help="контраст над фоном, дБ (по умолчанию 10)")
    ap.add_argument("--floor", type=float, default=-40.0, help="мин. пик, LUFS в окне 20 мс (по умолчанию -40)")
    ap.add_argument("--multi", help="несколько порогов через запятую, напр. 6,10,15")
    ap.add_argument("--json", help="записать события и сводку в JSON")
    a = ap.parse_args()
    multi = [float(v) for v in a.multi.split(",")] if a.multi else None
    res = run(a.audio, a.thr, a.floor, multi)
    for t, r in res["by_thr"].items():
        s = r["summary"]
        print(f"\n=== порог {t} дБ, пол {a.floor} LUFS-20мс: {s['n']} событий, {s['per_min']}/мин ===")
        print(f"исключено как удары музыкальной петли: {s['n_music_loop_hits_excluded']}; "
              f"звуковых моментов (слияние < {MOMENT_GAP} с): {s['moments']} ({s['moments_per_min']}/мин)")
        print("класс/мин: " + ", ".join(f"{c} {v}" for c, v in s["class_per_min"].items() if v))
        print("мин   всего  " + " ".join(f"{c[:6]:>6}" for c in CLASSES))
        for p in s["per_minute"]:
            print(f"{p['min']:3d}  {p['per_min']:6.1f}  " + " ".join(f"{p[c]:6d}" for c in CLASSES))
    if a.json:
        json.dump(res, open(a.json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("\n→", a.json)


if __name__ == "__main__":
    sys.exit(main())
