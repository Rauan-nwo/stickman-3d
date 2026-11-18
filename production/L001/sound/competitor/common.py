# -*- coding: utf-8 -*-
"""Общие пути и функции для замера звука конкурента (Paper Billions, _MG4v3foET8).

Источник звука — video.mp4 (Opus 48 кГц стерео; в video_1080.webm звуковой дорожки нет).
Картинка 1080p — video_1080.webm. Все результаты пишутся в competitor_audio.json по разделам.
"""
import json
import os
import subprocess

import sys

import numpy as np

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SRC_DIR = r"C:\Users\velar\AppData\Local\Temp\paperbillions-research-wi34v2j2\_MG4v3foET8"
VIDEO_MP4 = os.path.join(SRC_DIR, "video.mp4")
VIDEO_1080 = os.path.join(SRC_DIR, "video_1080.webm")
CAPTIONS = os.path.join(SRC_DIR, "captions.vtt")
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(HERE, "tmp")
OUT_JSON = os.path.join(HERE, "competitor_audio.json")
MIX_WAV = os.path.join(TMP, "mix.wav")
VOC_WAV = os.path.join(TMP, "htdemucs", "mix", "vocals.wav")
RES_WAV = os.path.join(TMP, "htdemucs", "mix", "no_vocals.wav")
DYN = r"C:\Users\velar\AppData\Local\Temp\claude\8bd48fdc79c32563\6b93721b-4d73-44f7-bee9-2a1409fa5259\scratchpad\dyn"
FINAL_JSON = os.path.join(DYN, "final.json")          # склейки, рывки камеры, появления (замер dynamics/tools)
FPS = 30.0
SR = 48000

# главы из описания ролика (YouTube chapters)
CHAPTERS = [(0, "Dinner in Singapore"), (41, "The Man With the Key"), (271, "The Locked Door"), (361, "The Cover"),
            (437, "The Approach"), (620, "The Pipeline"), (709, "What She Was After"), (939, "The Memo"),
            (989, "The Empty Chair")]


def load_wav(path, mono=False):
    import soundfile as sf
    x, sr = sf.read(path, dtype="float32", always_2d=True)
    assert sr == SR, sr
    if mono:
        return x.mean(1)
    return x


def db(v, floor=1e-10):
    return 20 * np.log10(np.maximum(np.asarray(v, dtype=np.float64), floor))


def pw_db(p, floor=1e-20):
    return 10 * np.log10(np.maximum(np.asarray(p, dtype=np.float64), floor))


def frame_rms(x, win, hop, sr=SR):
    """RMS в окнах win c шагом hop (с); центр окна — время."""
    w, h = int(round(win * sr)), int(round(hop * sr))
    x = np.asarray(x, dtype=np.float64)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    idx = np.arange(0, max(1, len(x) - w + 1), h)
    r = np.sqrt(np.maximum(c[idx + w] - c[idx], 0) / w)
    return r, (idx + w / 2) / sr


def k_weight(x, sr=SR):
    """K-фильтр BS.1770 (предфильтр + RLB), коэффициенты для 48 кГц."""
    from scipy import signal
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    assert sr == 48000
    y = signal.lfilter(b1, a1, x, axis=0)
    return signal.lfilter(b2, a2, y, axis=0)


def lufs_frames(x, win=0.4, hop=0.1, sr=SR):
    """Громкость по BS.1770 (без гейта) в окнах: x — (n,) или (n, ch). Возвращает LUFS и время центра."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    y = k_weight(x, sr)
    p = None
    for ch in range(y.shape[1]):
        r, t = frame_rms(y[:, ch], win, hop, sr)
        p = r * r if p is None else p + r * r
    return -0.691 + pw_db(p), t


def integrated(x, sr=SR):
    import pyloudnorm as pyln
    x = np.asarray(x, dtype=np.float64)
    m = pyln.Meter(sr)
    return float(m.integrated_loudness(x))


def runs(mask):
    """Отрезки подряд идущих True: список (i0, i1) с i1 исключительно."""
    m = np.asarray(mask, bool).astype(np.int8)
    d = np.diff(np.concatenate([[0], m, [0]]))
    s = np.nonzero(d == 1)[0]
    e = np.nonzero(d == -1)[0]
    return list(zip(s.tolist(), e.tolist()))


def pct(v, ps=(10, 50, 90), nd=1):
    v = np.asarray(v, dtype=np.float64)
    v = v[np.isfinite(v)]
    if not len(v):
        return {f"p{p}": None for p in ps}
    return {f"p{p}": round(float(np.percentile(v, p)), nd) for p in ps}


def read_vtt(path=CAPTIONS):
    import re
    segs = []
    txt = open(path, encoding="utf-8").read()
    for m in re.finditer(r"(\d+):(\d+):(\d+\.\d+) --> (\d+):(\d+):(\d+\.\d+)\s*\n(.*?)(?:\n\n|\Z)", txt, re.S):
        a = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
        b = int(m.group(4)) * 3600 + int(m.group(5)) * 60 + float(m.group(6))
        segs.append((a, b, " ".join(m.group(7).split())))
    return segs


def update_json(section, data):
    D = {}
    if os.path.exists(OUT_JSON):
        D = json.load(open(OUT_JSON, encoding="utf-8"))
    D[section] = data
    json.dump(D, open(OUT_JSON, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


def load_json():
    return json.load(open(OUT_JSON, encoding="utf-8")) if os.path.exists(OUT_JSON) else {}


def ffmpeg_frame(t, out, src=VIDEO_1080, width=960):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1",
                    "-vf", f"scale={width}:-2", "-q:v", "4", out], check=True)


def mmss(t):
    m = int(t // 60)
    return f"{m}:{t - 60 * m:05.2f}"
