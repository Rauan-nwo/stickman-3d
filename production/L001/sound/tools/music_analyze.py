# Анализ кандидатов музыки L001: темп, сетка долей/тактов, тональность, громкость, полоса 1–4 кГц,
# громкость по 5 с, разделы (новизна по матрице самоподобия тактов), петли и чистые точки резки по тактам.
# Запуск: python -I music_analyze.py <candidates_dir> <analysis_dir> [id ...]
import sys, json, pathlib, warnings
import numpy as np
import soundfile as sf
import librosa
import pyloudnorm as pyln
from scipy.signal import find_peaks

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
SR = 22050
HOP = 512

KS_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KS_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def r(x, n=2):
    return float(round(float(x), n))


def key_estimate(C):
    ch = C.mean(axis=1)
    best = []
    for i in range(12):
        for name, prof in (("major", KS_MAJ), ("minor", KS_MIN)):
            c = np.corrcoef(np.roll(prof, i), ch)[0, 1]
            best.append((c, f"{NOTES[i]} {name}"))
    best.sort(reverse=True)
    return {"key": best[0][1], "corr": r(best[0][0], 3), "runner_up": best[1][1], "runner_up_corr": r(best[1][0], 3)}


def lufs_blocks(x, rate, meter, step=5.0):
    out = []
    n = int(step * rate)
    for i in range(0, len(x), n):
        seg = x[i:i + n]
        if len(seg) < int(0.5 * rate):
            break
        try:
            v = meter.integrated_loudness(seg)
        except Exception:
            v = float("-inf")
        out.append(None if not np.isfinite(v) else r(v, 1))
    return out


def band_ratio(y):
    S = np.abs(librosa.stft(y, n_fft=4096, hop_length=1024)) ** 2
    f = librosa.fft_frequencies(sr=SR, n_fft=4096)
    tot = S.sum() + 1e-12
    b = S[(f >= 1000) & (f < 4000)].sum()
    lo = S[f < 250].sum()
    return {"1_4k_share_pct": r(100 * b / tot, 2), "1_4k_rel_dB": r(10 * np.log10(b / tot + 1e-12), 1),
            "below_250_share_pct": r(100 * lo / tot, 1),
            "centroid_median_hz": int(np.median(librosa.feature.spectral_centroid(S=np.sqrt(S), sr=SR)))}


def downbeats(beats_t, C, mel, onset_env, meter_opts=(4, 3)):
    """Фаза сильной доли: смена гармонии + низкие частоты на доле."""
    if len(beats_t) < 16:
        return None
    fr = librosa.time_to_frames(beats_t, sr=SR, hop_length=HOP)
    Cs = librosa.util.sync(C, fr, aggregate=np.median)
    Cs = Cs / (np.linalg.norm(Cs, axis=0, keepdims=True) + 1e-9)
    chg = np.r_[0, 1 - np.sum(Cs[:, 1:] * Cs[:, :-1], axis=0)][:len(beats_t)]
    low = librosa.power_to_db(mel[:6])  # примерно < 200 Гц
    low_flux = np.maximum(0, np.diff(low, axis=1, prepend=low[:, :1])).sum(axis=0)
    lf = np.array([low_flux[max(0, f - 2):f + 3].max() for f in fr])
    on = np.array([onset_env[max(0, f - 2):f + 3].max() for f in fr])

    def z(v):
        return (v - v.mean()) / (v.std() + 1e-9)

    feat = 1.0 * z(chg) + 0.7 * z(lf) + 0.3 * z(on)
    best = None
    for m in meter_opts:
        for p in range(m):
            sel = feat[p::m]
            other = np.delete(feat, np.arange(p, len(feat), m))
            score = sel.mean() - other.mean()
            if best is None or score > best[0]:
                best = (score, m, p)
    score, m, p = best
    # уверенность: отрыв лучшей фазы от второй при том же метре
    alt = sorted([feat[q::m].mean() - np.delete(feat, np.arange(q, len(feat), m)).mean() for q in range(m)], reverse=True)
    return {"meter": m, "phase": p, "score": r(score, 2), "margin": r(alt[0] - alt[1], 2)}


def analyze(path, catalog_bpm=None):
    info = sf.info(str(path))
    x, rate = sf.read(str(path), always_2d=True)
    xm = x.mean(axis=1)
    dur = len(xm) / rate
    meter = pyln.Meter(rate)
    I = meter.integrated_loudness(x)
    y = librosa.resample(xm.astype(np.float32), orig_sr=rate, target_sr=SR)
    # начало и конец звучания
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max)
    sounding = np.where(rms_db > -45)[0]
    t_first = librosa.frames_to_time(sounding[0], sr=SR, hop_length=HOP) if len(sounding) else 0
    t_last = librosa.frames_to_time(sounding[-1], sr=SR, hop_length=HOP) if len(sounding) else dur
    onset_env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    C = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP)
    mel = librosa.feature.melspectrogram(y=y, sr=SR, hop_length=HOP, n_mels=64, fmax=8000)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=SR, hop_length=HOP, trim=False,
                                           start_bpm=catalog_bpm or 120.0)
    no_tempo = catalog_bpm == 0
    if no_tempo:
        catalog_bpm_out, catalog_bpm = "none", None
    else:
        catalog_bpm_out = catalog_bpm
    tempo = float(np.atleast_1d(tempo)[0])
    tempo_raw = tempo
    tempo_fix = None
    if catalog_bpm and len(beats) > 8:
        ratio = tempo / catalog_bpm
        if 1.8 < ratio < 2.2:  # нашли удвоенный темп: берём каждую вторую долю (фаза с более сильными атаками)
            ph = max((0, 1), key=lambda q: onset_env[beats[q::2]].mean())
            beats = beats[ph::2]
            tempo, tempo_fix = tempo / 2, "halved_to_catalog"
        elif 0.45 < ratio < 0.55:  # половинный темп: вставляем середины
            mids = ((beats[:-1] + beats[1:]) / 2).astype(int)
            beats = np.sort(np.r_[beats, mids])
            tempo, tempo_fix = tempo * 2, "doubled_to_catalog"
    beats_t = librosa.frames_to_time(beats, sr=SR, hop_length=HOP)
    # ясность пульса: автокорреляция огибающей атак на лаге доли
    ac = librosa.autocorrelate(onset_env - onset_env.mean())
    ac = ac / (ac[0] + 1e-9)
    lag = int(round(60.0 / max(tempo, 1) * SR / HOP))
    pulse = float(ac[max(1, lag - 2):lag + 3].max()) if lag + 3 < len(ac) else 0.0
    ibi = np.diff(beats_t)
    beat_cv = float(ibi.std() / ibi.mean()) if len(ibi) > 4 else 1.0
    pulsed = pulse > 0.25 and beat_cv < 0.08
    if catalog_bpm and abs(tempo / catalog_bpm - 1) < 0.04 and beat_cv < 0.06:
        pulsed = True  # сетка совпала с темпом автора — доверяем, даже если автокорреляция слабая (свинг)
    if no_tempo:
        pulsed = False  # в каталоге автора темпа нет (дроны, свободный темп)
    db = downbeats(beats_t, C, mel, onset_env) if pulsed else None
    res = {"file": path.name, "duration_s": r(dur), "samplerate": info.samplerate, "channels": info.channels,
           "sounding_from_s": r(t_first), "sounding_to_s": r(t_last),
           "lufs_integrated": r(I, 1), "peak_dbfs": r(20 * np.log10(np.abs(x).max() + 1e-12), 1),
           "spectrum": band_ratio(y), "key": key_estimate(C),
           "tempo_bpm": r(tempo, 1), "tempo_raw_bpm": r(tempo_raw, 1), "tempo_fix": tempo_fix,
           "catalog_bpm": catalog_bpm_out, "pulse_clarity": r(pulse, 3), "beat_interval_cv": r(beat_cv, 3),
           "pulsed": bool(pulsed)}
    res["loudness_5s_lufs"] = lufs_blocks(x, rate, meter)
    # единицы сетки: такты (если есть пульс) или окна по 2 с
    if pulsed and db:
        m, p = db["meter"], db["phase"]
        dbt = beats_t[p::m]
        res["downbeat"] = db
        res["bar_s"] = r(np.median(np.diff(dbt)), 3)
        res["beats_s"] = [r(t, 3) for t in beats_t]
        res["downbeats_s"] = [r(t, 3) for t in dbt]
        units = dbt
        unit_name = "bar"
    else:
        units = np.arange(0, dur - 2, 2.0)
        unit_name = "2s"
        res["bar_s"] = None
    res["grid_unit"] = unit_name
    # признаки на единицу сетки: хрома + MFCC + громкость (ключевые для повторов)
    fr = librosa.time_to_frames(units, sr=SR, hop_length=HOP)
    M = librosa.feature.mfcc(S=librosa.power_to_db(mel), n_mfcc=13)
    R = librosa.amplitude_to_db(librosa.feature.rms(y=y, hop_length=HOP), ref=np.max)
    F = np.vstack([C * 2, (M - M.mean(axis=1, keepdims=True)) / (M.std(axis=1, keepdims=True) + 1e-9), R / 10])
    Fs = librosa.util.sync(F, fr, aggregate=np.mean)[:, :len(units)]
    Fz = (Fs - Fs.mean(axis=1, keepdims=True)) / (Fs.std(axis=1, keepdims=True) + 1e-9)
    Fn = Fz / (np.linalg.norm(Fz, axis=0, keepdims=True) + 1e-9)
    SSM = Fn.T @ Fn
    n = SSM.shape[0]
    # новизна Фута, ядро 4+4 единицы
    k = 4
    g = np.outer(np.r_[-np.ones(k), np.ones(k)], np.r_[-np.ones(k), np.ones(k)])  # + внутри блоков, - между
    nov = np.zeros(n)
    for i in range(k, n - k):
        nov[i] = np.sum(SSM[i - k:i + k, i - k:i + k] * g)
    nov = np.maximum(nov, 0)
    if nov.max() > 0:
        nov = nov / nov.max()
    pk, _ = find_peaks(nov, distance=4, height=max(0.25, float(np.median(nov) + 0.5 * nov.std())))
    bounds = [0] + list(pk) + [n]
    # подписи разделов по сходству средних векторов
    segs = []
    means = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        if b <= a:
            continue
        v = Fz[:, a:b].mean(axis=1)
        means.append(v / (np.linalg.norm(v) + 1e-9))
        segs.append((a, b))
    labels = []
    reps = []
    for v in means:
        lab = None
        for li, rv in enumerate(reps):
            if float(v @ rv) > 0.75:
                lab = li
                break
        if lab is None:
            reps.append(v)
            lab = len(reps) - 1
        labels.append(lab)
    sec = []
    for (a, b), lab in zip(segs, labels):
        t0 = float(units[a])
        t1 = float(units[b]) if b < len(units) else dur
        lv = float(np.mean(R[0, librosa.time_to_frames(t0, sr=SR, hop_length=HOP):librosa.time_to_frames(t1, sr=SR, hop_length=HOP)]))
        sec.append({"label": "ABCDEFGHIJKLMNOP"[lab % 16], "start_s": r(t0), "end_s": r(t1), "units": int(b - a),
                    "rel_level_db": r(lv, 1)})
    res["sections"] = sec
    res["novelty_peaks_s"] = [r(units[i]) for i in pk]
    # петли: прыжок с конца единицы B-1 на начало A; хорош, если B похож на A и B-1 похож на A-1
    loops = []
    for L in ([8, 16, 32] if unit_name == "bar" else [8, 15, 30]):
        for a in range(1, n - L - 1):
            b = a + L
            s = (SSM[a, b] + SSM[a - 1, b - 1] + SSM[a + 1, b + 1 if b + 1 < n else b]) / 3
            loops.append((float(s), a, b, L))
    loops.sort(reverse=True)
    picked = []
    for s, a, b, L in loops:
        if any(abs(a - pa) < 4 and pl == L for _, pa, _, pl in picked):
            continue
        picked.append((s, a, b, L))
        if len(picked) >= 6:
            break
    res["loops"] = [{"from_s": r(units[a]), "to_s": r(units[b]) if b < len(units) else r(dur), "units": L,
                     "len_s": r((units[b] if b < len(units) else dur) - units[a]), "similarity": r(s, 3)}
                    for s, a, b, L in picked]
    # чистые точки резки: начало такта, где новизна высокая (смена раздела) или атака низкая (тихо в стыке)
    cuts = []
    on_u = np.array([onset_env[max(0, f - 1):f + 2].max() if f < len(onset_env) else 0 for f in fr])
    for i in range(1, n):
        cuts.append({"t": r(units[i]), "novelty": r(nov[i], 2), "onset": r(on_u[i] / (on_u.max() + 1e-9), 2)})
    res["section_cut_points_s"] = [s["start_s"] for s in sec[1:]]  # границы разделов = сильные доли
    res["strong_novelty_points_s"] = [c["t"] for c in cuts if c["novelty"] >= 0.5]
    res["quiet_bar_starts_s"] = [c["t"] for c in cuts if c["onset"] <= 0.25][:40]  # стык без сильной атаки
    res["phrase_points_s"] = [r(units[i]) for i in range(0, n, 4)] if unit_name == "bar" else []
    return res


def main():
    cdir, adir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    adir.mkdir(parents=True, exist_ok=True)
    ids = set(sys.argv[3:])
    # темп из каталога автора (incompetech) — как подсказка против удвоения/половины
    bpm = {}
    led = cdir.parent / "music_ledger.json"
    cand = pathlib.Path(__file__).with_name("music_candidates.json")
    pieces = cdir.parent / "_dl" / "incompetech" / "pieces.json"
    if led.exists():
        for rec in json.loads(led.read_text(encoding="utf-8")):
            cb = (rec.get("catalog") or {}).get("bpm", "absent")
            try:
                bpm[rec["id"]] = float(cb)
            except (TypeError, ValueError):
                if rec.get("source") == "incompetech":
                    bpm[rec["id"]] = 0.0  # автор не указал темп
    elif cand.exists() and pieces.exists():  # реестра ещё нет: темп берём прямо из каталога incompetech
        pz = {p["title"]: p for p in json.loads(pieces.read_text(encoding="utf-8"))}
        for c in json.loads(cand.read_text(encoding="utf-8")):
            try:
                bpm[c["id"]] = float(pz[c["title"]]["bpm"])
            except (KeyError, TypeError, ValueError):
                pass
    files = sorted(p for p in cdir.iterdir() if p.suffix.lower() in (".mp3", ".wav", ".ogg", ".flac"))
    for p in files:
        if ids and p.stem not in ids:
            continue
        out = adir / f"{p.stem}.json"
        try:
            res = analyze(p, bpm.get(p.stem))
            res["id"] = p.stem
            out.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"ok  {p.stem}: {res['tempo_bpm']} bpm pulsed={res['pulsed']} bar={res['bar_s']} key={res['key']['key']} "
                  f"I={res['lufs_integrated']} 1-4k={res['spectrum']['1_4k_share_pct']}% secs={len(res['sections'])}", flush=True)
        except Exception as e:
            print(f"ERR {p.stem}: {e!r}", flush=True)


if __name__ == "__main__":
    main()
