#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_audio.py <words.json> <outdir> [--narration narration.txt]

Synthesises ALL non-voice sound of V002 "Why Soldiers Never March Across Bridges"
in code (numpy + scipy, fixed seeds, no samples, no network):

    <outdir>/music.wav      the bed: field drum cadence + bass drum + original fife tune
    <outdir>/sfx.wav        every effect, placed at its cue word
    <outdir>/stems/*.wav    each effect as its own file + the music parts as full-length tracks
    <outdir>/cues.json      every placed sound: cue (sentence, word), time, file, gain

Nothing is keyed to seconds. Every event is keyed to (sentence number, word) of
narration.txt and resolved through words.json, so a new voice take only needs:

    python make_audio.py <new words.json> <outdir>

A sentence = one line of narration.txt (17 lines). The march tempo is not a constant
either: it is measured from the four step words of sentence 8 ("Left, right, left, right").

To swap an effect for a real recording put <outdir>/overrides/<stem name>.wav
(44.1 kHz, the sound starting at the beginning of the file) and re-run.
"""
import argparse
import difflib
import json
import re
import sys
import wave
import zlib
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
SEED = 2002
TAU = 2.0 * np.pi

V_REF = -20.0      # dBFS. mix.py normalises the voice's active RMS to this; all levels below are "dB re voice"
FILE_TRIM = 6.0    # music.wav / sfx.wav are written this much hotter than their mix level (mix.py undoes it)
DUCK_MUSIC = -8.0  # how far mix.py pulls the music down under the voice
DUCK_SFX = -3.0    # ...and the non-featured effects
# effect levels that were tuned against the reference film (dB re voice, loudest 20 ms): its transition swishes
# peak about 6 dB under the voice's median level in the 1.5-8 kHz band (see NOTES.md)
import os
FIFE_OCT = float(os.environ.get("FIFE_OCT", "-12"))   # register of the sampled flute line, semitones re the written tune
LV_FX = {"throw": -3.0, "tumble": -8.0, "splash": -7.0, "whip": 7.0, "push": 1.0}
DUCK_LINE_MUSIC = -12.0  # under the colonel's and the general's own lines: deeper, and featured cues are not exempt
DUCK_LINE_SFX = -8.0


# =====================================================================================
# small DSP toolbox
# =====================================================================================
def lin(d):
    return 10.0 ** (np.asarray(d, dtype=float) / 20.0)


def dbv(x):
    return 20.0 * np.log10(np.maximum(np.abs(x), 1e-12))


def rng_for(name, k=0):
    """Independent, order-free deterministic generator per sound."""
    return np.random.default_rng([SEED, zlib.crc32(name.encode("utf-8")), int(k)])


def nsamp(d):
    return max(1, int(round(d * SR)))


def taxis(d):
    return np.arange(nsamp(d)) / SR


def _sos(kind, fc, order):
    ny = SR / 2
    if kind == "band":
        fc = [max(10.0, float(fc[0])), min(float(fc[1]), ny * 0.95)]
    else:
        fc = float(np.clip(fc, 10.0, ny * 0.95))
    return signal.butter(order, fc, kind, fs=SR, output="sos")


def lp(x, fc, order=2):
    return signal.sosfilt(_sos("low", fc, order), x, axis=0)


def hp(x, fc, order=2):
    return signal.sosfilt(_sos("high", fc, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("band", (lo, hi), order), x, axis=0)


def biquad(x, kind, f0, gain_db=0.0, q=0.707):
    """RBJ cookbook biquads: peak, hishelf, loshelf, bpf (0 dB peak)."""
    A = 10 ** (gain_db / 40.0)
    w0 = TAU * min(f0, SR * 0.45) / SR
    cw, sw = np.cos(w0), np.sin(w0)
    al = sw / (2 * q)
    if kind == "peak":
        b = [1 + al * A, -2 * cw, 1 - al * A]
        a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == "hishelf":
        s = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + s), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - s)]
        a = [(A + 1) - (A - 1) * cw + s, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - s]
    elif kind == "loshelf":
        s = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + s), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - s)]
        a = [(A + 1) + (A - 1) * cw + s, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - s]
    elif kind == "bpf":
        b = [al, 0.0, -al]
        a = [1 + al, -2 * cw, 1 - al]
    else:
        raise ValueError(kind)
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def reson(x, f0, q):
    return biquad(x, "bpf", f0, q=q)


def fade(x, fin=0.0, fout=0.0):
    x = np.array(x, dtype=float, copy=True)
    a = min(nsamp(fin), len(x)) if fin > 0 else 0
    b = min(nsamp(fout), len(x)) if fout > 0 else 0
    if a > 1:
        r = 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
        x[:a] = (x[:a].T * r).T
    if b > 1:
        r = 0.5 + 0.5 * np.cos(np.pi * np.arange(b) / b)
        x[-b:] = (x[-b:].T * r).T
    return x


def smooth_rand(n, rate, rng):
    """Smooth random curve in 0..1 that changes about `rate` times a second."""
    k = int(np.ceil(n / SR * rate)) + 3
    pts = rng.uniform(0.0, 1.0, k)
    x = np.arange(n) * (rate / SR)
    i = x.astype(int)
    f = 0.5 - 0.5 * np.cos(np.pi * (x - i))
    return pts[i] * (1 - f) + pts[i + 1] * f


def nbnoise(n, fc, bw, rng):
    """Narrow-band Gaussian noise centred on fc (scalar or per-sample array), bandwidth bw Hz.
    I*cos + Q*sin of two low-passed noises: a moving band with no filter-sweep artefacts."""
    def base():
        b = lp(rng.standard_normal(n + 4000), max(float(bw), 4.0) / 2, 2)[4000:]
        return b / (np.sqrt(np.mean(b * b)) + 1e-12)
    ph = TAU * np.cumsum(np.broadcast_to(np.asarray(fc, dtype=float), (n,))) / SR
    return (base() * np.cos(ph) + base() * np.sin(ph)) / np.sqrt(2.0)


def modal_ir(dur, modes, scale=1.0):
    """Sum of damped sines. modes = [(freq Hz, decay tau s, amp)]. Zero phase => no click at t=0."""
    t = taxis(dur)
    y = np.zeros_like(t)
    for f, tau, a in modes:
        f = f * scale
        if f < SR * 0.45:
            y += a * np.sin(TAU * f * t) * np.exp(-t / tau)
    return y


def burst(rng, ms, fc=None):
    """The 'contact' of an impact: a Hann-windowed noise grain. Longer / darker = softer object."""
    n = max(6, nsamp(ms / 1000.0))
    b = rng.standard_normal(n) * np.hanning(n)
    if fc:
        b = lp(b, fc, 1)
    return b / (np.sqrt(np.sum(b * b)) + 1e-12)


def strike(ir, rng, contact_ms=2.0, fc=None):
    """Excite a resonant body (modal impulse response) with a noise grain instead of an ideal impulse:
    this is what stops modal synthesis from sounding like a row of beeps."""
    return signal.fftconvolve(burst(rng, contact_ms, fc), ir)


def pan(x, p):
    th = (float(np.clip(p, -1, 1)) + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def pan_move(x, p0, p1):
    th = (np.linspace(p0, p1, len(x)) + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def loud20(x, win=0.02):
    """Loudest 20 ms RMS of a sound (per-channel power average): the level number used for one-shots."""
    x = np.asarray(x, dtype=float)
    p = x * x if x.ndim == 1 else np.mean(x * x, axis=1)
    w = nsamp(win)
    if len(p) <= w:
        return float(np.sqrt(np.mean(p)) + 1e-12)
    c = np.concatenate([[0.0], np.cumsum(p)])
    return float(np.sqrt(np.max(c[w:] - c[:-w]) / w) + 1e-12)


def rms(x):
    x = np.asarray(x, dtype=float)
    p = x * x if x.ndim == 1 else np.mean(x * x, axis=1)
    return float(np.sqrt(np.mean(p)) + 1e-12)


def put(buf, x, t, g=1.0):
    i = int(round(t * SR))
    x = np.asarray(x)
    if i < 0:
        x = x[-i:]
        i = 0
    m = min(len(x), len(buf) - i)
    if m > 0:
        buf[i:i + m] += g * x[:m]


def auto(n, pts):
    """Automation curve: [(time s, dB)] -> linear gain per sample (linear-in-dB between points)."""
    tt = np.array([p[0] for p in pts], dtype=float)
    vv = np.array([p[1] for p in pts], dtype=float)
    return lin(np.interp(np.arange(n) / SR, tt, vv))


def soft_limit(x, knee_db=-6.0, ceil_db=-1.0):
    """Transparent below the knee, tanh above it: stops rare transient overs, never clips."""
    k, c = lin(knee_db), lin(ceil_db)
    a = np.abs(x)
    over = a > k
    y = np.array(x, dtype=float, copy=True)
    y[over] = np.sign(x[over]) * (k + (c - k) * np.tanh((a[over] - k) / (c - k)))
    return y


# ---- synthetic rooms ---------------------------------------------------------------
def make_ir(name, rt60, predelay=0.006, damp=(1.15, 1.0, 0.45), xo=(250.0, 2800.0), early=8, er_ratio=0.35,
            echoes=(), bright=7000.0):
    """Synthetic stereo impulse response: sparse early reflections + exponentially decaying noise whose
    highs die faster than its lows; optional discrete echoes (canyon slap). Unit energy per channel."""
    extra = max([e[0] for e in echoes]) if echoes else 0.0
    n = nsamp(rt60 * 1.25 + predelay + extra + 0.05)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for ch in range(2):
        rng = rng_for("ir:" + name, ch)
        nz = rng.standard_normal(n)
        lo, hi = lp(nz, xo[0], 2), hp(nz, xo[1], 2)
        mid = nz - lo - hi
        tail = (lo * np.exp(-6.91 * t / (rt60 * damp[0])) + mid * np.exp(-6.91 * t / (rt60 * damp[1]))
                + hi * np.exp(-6.91 * t / (rt60 * damp[2])))
        tail *= 1.0 - np.exp(-t / 0.010)
        er = np.zeros(n)
        for _ in range(early):
            d = rng.uniform(0.003, 0.055)
            er[int(d * SR)] += rng.choice([-1.0, 1.0]) * np.exp(-d / 0.03)
        er *= np.sqrt(er_ratio * np.sum(tail ** 2) / (np.sum(er ** 2) + 1e-12))
        ir = er + tail
        full = ir.copy()
        for d, g in echoes:
            k = int(d * SR)
            full[k:] += g * lp(ir, 2600.0, 1)[:n - k]
        full = lp(full, bright, 1)
        pd = int(predelay * SR)
        full = np.concatenate([np.zeros(pd), full])[:n]
        out[:, ch] = full / np.sqrt(np.sum(full ** 2) + 1e-12)
    return out


def reverb(x, ir, wet_db=0.0):
    """Wet signal only (stereo, tail included)."""
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    return lin(wet_db) * np.stack([signal.fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)


def room(x, ir, wet_db, p=0.0):
    """Dry (panned if mono) + wet."""
    dry = pan(x, p) if x.ndim == 1 else x
    w = reverb(x if x.ndim == 1 else dry, ir, wet_db)
    out = np.zeros((len(w), 2))
    out[:len(dry)] += dry
    return out + w


def mixp(*xs):
    """Sum stereo signals of different lengths."""
    out = np.zeros((max(len(x) for x in xs), 2))
    for x in xs:
        out[:len(x)] += x
    return out


IR = {}


def irs():
    if not IR:
        IR["room"] = make_ir("room", 0.55, bright=6000.0)                      # the band: small dry square
        IR["field"] = make_ir("field", 0.32, er_ratio=0.6, bright=5000.0)      # open air, close effects
        IR["gorge"] = make_ir("gorge", 1.9, predelay=0.03, echoes=((0.23, 0.42), (0.47, 0.22)),
                              damp=(1.2, 1.0, 0.35), bright=3600.0)             # canyon: long, dark, slapback
    return IR


# ---- wav io ------------------------------------------------------------------------
def write_wav(path, x, bits=24):
    x = np.asarray(x, dtype=float)
    if x.ndim == 1:
        x = x[:, None]
    x = np.clip(x, -1.0, 1.0)
    w = wave.open(str(path), "wb")
    w.setnchannels(x.shape[1])
    w.setsampwidth(bits // 8)
    w.setframerate(SR)
    if bits == 16:
        w.writeframes((x * 32767.0).round().astype("<i2").tobytes())
    else:
        v = np.ascontiguousarray((x * 8388607.0).round().astype("<i4"))
        w.writeframes(v.view(np.uint8).reshape(-1, 4)[:, :3].tobytes())
    w.close()


def read_wav(path):
    """Minimal RIFF reader (PCM 16/24/32 bit, float 32, also WAVE_FORMAT_EXTENSIBLE as written by ffmpeg / DAWs).
    Returns stereo float at 44.1 kHz."""
    import struct
    b = Path(path).read_bytes()
    if b[:4] != b"RIFF" or b[8:12] != b"WAVE":
        raise ValueError("not a wav file: %s" % path)
    pos, fmt, data = 12, None, None
    while pos + 8 <= len(b):
        cid, size = b[pos:pos + 4], struct.unpack("<I", b[pos + 4:pos + 8])[0]
        body = b[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            tag, ch, sr, _, _, bits = struct.unpack("<HHIIHH", body[:16])
            if tag == 0xFFFE and len(body) >= 26:
                tag = struct.unpack("<H", body[24:26])[0]
            fmt = (tag, ch, sr, bits)
        elif cid == b"data":
            data = body
        pos += 8 + size + (size & 1)
    if fmt is None or data is None:
        raise ValueError("wav without fmt/data chunk: %s" % path)
    tag, ch, sr, bits = fmt
    if tag == 3 and bits == 32:
        x = np.frombuffer(data[:len(data) // 4 * 4], dtype="<f4").astype(float)
    elif tag == 1 and bits == 16:
        x = np.frombuffer(data[:len(data) // 2 * 2], dtype="<i2").astype(float) / 32768.0
    elif tag == 1 and bits == 24:
        u = np.frombuffer(data[:len(data) // 3 * 3], dtype=np.uint8).reshape(-1, 3).astype(np.int32)
        v = u[:, 0] | (u[:, 1] << 8) | (u[:, 2] << 16)
        x = np.where(v >= 1 << 23, v - (1 << 24), v).astype(float) / 8388608.0
    elif tag == 1 and bits == 32:
        x = np.frombuffer(data[:len(data) // 4 * 4], dtype="<i4").astype(float) / 2147483648.0
    else:
        raise ValueError("unsupported wav encoding (tag %d, %d bit): %s" % (tag, bits, path))
    x = x[:len(x) // ch * ch].reshape(-1, ch)
    if sr != SR:
        g = np.gcd(SR, sr)
        x = signal.resample_poly(x, SR // g, sr // g, axis=0)
    if ch == 1:
        x = np.repeat(x, 2, axis=1)
    return x[:, :2]


# =====================================================================================
# cue resolver: (sentence, word) -> seconds, through words.json
# =====================================================================================
def norm_tok(w):
    return re.sub(r"[^a-z0-9]+", "", w.lower())


def split_tok(w):
    return [p for p in (norm_tok(q) for q in re.split(r"[-‐-―]", w)) if p]


def C(s, word=None, occ=1, frac=0.0, off=0.0):
    """A cue: sentence number (line of narration.txt), word, which occurrence of it in that sentence,
    position inside the word (0 = its start, 1 = its end) and an optional offset in seconds."""
    return {"sentence": s, "word": word, "occ": occ, "frac": frac, "offset": off}


class Script:
    def __init__(self, words, narration):
        W = []
        for w in words:
            parts = split_tok(str(w["word"]))
            if not parts:
                continue
            s, e = float(w["start"]), float(w["end"])
            tot, acc = sum(len(p) for p in parts), 0
            for p in parts:
                a = s + (e - s) * acc / tot
                acc += len(p)
                W.append((p, a, s + (e - s) * acc / tot))
        self.lines = [l.strip() for l in narration.splitlines() if l.strip()]
        N = []
        for si, line in enumerate(self.lines, 1):
            for raw in line.split():
                for p in split_tok(raw):
                    N.append((si, p))
        sm = difflib.SequenceMatcher(None, [x[1] for x in N], [x[0] for x in W], autojunk=False)
        st, en = [None] * len(N), [None] * len(N)
        for a, b, size in sm.get_matching_blocks():
            for k in range(size):
                st[a + k], en[a + k] = W[b + k][1], W[b + k][2]
        self.unmatched = sum(1 for v in st if v is None)
        i = 0
        while i < len(N):                       # words the aligner missed: spread them between their neighbours
            if st[i] is None:
                j = i
                while j < len(N) and st[j] is None:
                    j += 1
                left = en[i - 1] if i > 0 else (W[0][1] if W else 0.0)
                right = st[j] if j < len(N) else (W[-1][2] if W else left)
                step = (right - left) / (j - i)
                for k in range(i, j):
                    st[k], en[k] = left + step * (k - i), left + step * (k - i + 1)
                i = j
            else:
                i += 1
        self.tok = [{"s": N[i][0], "w": N[i][1], "start": st[i], "end": en[i]} for i in range(len(N))]
        self.nsent = len(self.lines)
        self.t_end = max(x[2] for x in W)
        self.t_first = min(x[1] for x in W)

    def span(self, s, word=None, occ=1):
        idx = [i for i, k in enumerate(self.tok) if k["s"] == s]
        if not idx:
            raise KeyError("no sentence %s" % s)
        if word is None:
            return self.tok[idx[0]]["start"], self.tok[idx[-1]]["end"]
        parts = split_tok(word)
        hits = [i for i in idx if all(i + j <= idx[-1] and self.tok[i + j]["w"] == p for j, p in enumerate(parts))]
        if len(hits) < occ:
            raise KeyError("cue word %r (occurrence %d) not found in sentence %d: %r" % (word, occ, s, self.lines[s - 1]))
        i = hits[occ - 1]
        return self.tok[i]["start"], self.tok[i + len(parts) - 1]["end"]

    def at(self, cue):
        a, b = self.span(cue["sentence"], cue.get("word"), cue.get("occ", 1))
        return a + (b - a) * cue.get("frac", 0.0) + cue.get("offset", 0.0)

    def t(self, s, word=None, occ=1, frac=0.0, off=0.0):
        return self.at(C(s, word, occ, frac, off))

    def start(self, s):
        return self.span(s)[0]

    def end(self, s):
        return self.span(s)[1]


def make_grids(sc):
    """All tempo comes from the voice: one beat = one step word of sentence 8."""
    st = [sc.t(8, "left", 1), sc.t(8, "right", 1), sc.t(8, "left", 2), sc.t(8, "right", 2)]
    P = float(np.clip((st[3] - st[0]) / 3.0, 0.28, 0.65))
    g = {"P": P, "steps": st}
    t_land = sc.t(7, "land")
    g["t_land"] = t_land
    g["R"] = [t_land - j * P for j in range(0, 600) if t_land - j * P >= sc.start(6) - 1e-6][::-1]      # ridge + valley
    g["B_pre"] = [st[0] - j * P for j in range(1, 600) if st[0] - j * P >= sc.start(8) - 0.5 * P][::-1]  # onto the bridge
    g["t_you"] = sc.t(12, "You")
    g["B_post"] = [st[3] + k * P for k in range(1, 600) if st[3] + k * P <= g["t_you"] - 0.45 * P]       # on the bridge
    g["t_cut"] = sc.t(17, "forty-first")
    # film.js T_CUT41: the cut to boot 41 hanging in the air (confirmed by the frame difference of out/raw.mp4)
    g["t_drop"] = min(g["t_cut"] - 0.09, sc.start(17)) - 0.17
    g["F"] = [g["t_cut"] - j * P for j in range(1, 600) if g["t_cut"] - j * P >= sc.start(16) - 0.55 * P][::-1]
    g["t_bucks"] = sc.t(17, "bucks")
    # swing: the figure is pinned to four words and speeds up between them
    anchors = [sc.t(13, "Ever"), sc.t(13, "Tiny"), sc.t(13, "always"), sc.t(13, "and"), sc.end(13)]
    targets = [0.92, 0.86, 0.72, 0.66]        # one beat = one whole swing of the seat (was half of that: too busy)
    sw, seg = [], []
    for i in range(4):
        span = anchors[i + 1] - anchors[i]
        k = max(1, int(round(span / targets[i])))
        for j in range(k):
            sw.append(anchors[i] + j * span / k)
            seg.append(i)
    g["swing"], g["swing_seg"], g["swing_end"] = sw, seg, anchors[4]
    return g


# =====================================================================================
# instruments (music)
# =====================================================================================
def snare_hit(vel, rng, head=0.85, dur=0.40, tune=1.0):
    """Rope-tension field drum: two-headed shell tone with a fast downward chirp, gut snares as shaped
    noise that the head modulates, and a stick click. Soft strokes are darker, not just quieter."""
    t = taxis(dur)
    n = len(t)
    f0 = 162.0 * tune * (1 + 0.012 * rng.standard_normal())
    ph = TAU * np.cumsum(f0 * (1 + 0.30 * vel * np.exp(-t / 0.010))) / SR
    shell = (np.sin(ph) * np.exp(-t / 0.060) + 0.45 * np.sin(1.59 * ph) * np.exp(-t / 0.040)
             + 0.22 * np.sin(2.14 * ph) * np.exp(-t / 0.028) + 0.12 * np.sin(2.65 * ph) * np.exp(-t / 0.020))
    nz = rng.standard_normal(n)
    wires = bp(nz, 650, 4800, 2) + 0.30 * hp(nz, 4200, 2)
    wenv = (1 - np.exp(-t / 0.0015)) * (0.7 * np.exp(-t / (0.050 + 0.04 * vel)) + 0.3 * np.exp(-t / 0.150))
    wires = wires * wenv * (1 + 0.3 * np.sin(ph))
    click = hp(rng.standard_normal(n), 2000) * np.exp(-t / 0.0012)
    y = head * shell + (0.50 + 0.25 * vel) * wires + 0.22 * vel * click
    y = lp(y, 2300 + 5200 * vel)
    return fade(y * vel ** 1.2, 0.0004, 0.03)


def bass_drum(vel, rng, f0=58.0, dur=0.7, damp=1.0, click=1.0):
    """Marching bass drum: a pitch-dropping fundamental, two higher membrane modes, a felt-beater thud."""
    t = taxis(dur)
    n = len(t)
    ph = TAU * np.cumsum(f0 * (1 + 0.9 * vel * np.exp(-t / 0.018) + 0.12 * np.exp(-t / 0.12))) / SR
    body = (np.sin(ph) * np.exp(-t / (0.20 * damp)) + 0.35 * np.sin(1.59 * ph + 0.4) * np.exp(-t / (0.09 * damp))
            + 0.15 * np.sin(2.30 * ph) * np.exp(-t / 0.05))
    beater = (0.5 * lp(rng.standard_normal(n), 900) * np.exp(-t / 0.006)
              + 0.10 * bp(rng.standard_normal(n), 1500, 3500) * np.exp(-t / 0.003))
    y = np.tanh(1.4 * (body + click * vel * beater)) / 1.4
    return fade(y * vel, 0.0005, 0.05)


def flute_line(notes, total, rng, kind="fife"):
    """One continuous wind line. notes = [(t0, dur, midi, vel)]. Pitch glides between notes, every note is
    tongued (a breath 'chiff' at the attack), vibrato only grows on held notes, breath noise follows the
    pitch. kind = 'fife' (a little 2nd/3rd harmonic) or 'whistle' (nearly a sine, more air, lazier)."""
    n = nsamp(total)
    t = np.arange(n) / SR
    f, amp, chiff, vib = np.zeros(n), np.zeros(n), np.zeros(n), np.zeros(n)
    att, rel = (0.012, 0.030) if kind == "fife" else (0.030, 0.050)
    for t0, d, midi, vel in notes:
        i0, i1 = max(0, int(t0 * SR)), min(n, int((t0 + d) * SR))
        m = i1 - i0
        if m < 16:
            continue
        f[i0:i1] = 440.0 * 2 ** ((midi - 69) / 12.0)
        e = np.ones(m)
        a, r = min(m // 2, nsamp(att)), min(m // 2, nsamp(rel))
        e[:a] = np.linspace(0, 1, a) ** 0.6
        e[m - r:] = np.linspace(1, 0, r) ** 1.2
        tt = np.arange(m) / SR
        e *= 0.88 + 0.12 * np.sin(np.pi * np.clip(tt / max(d, 1e-3), 0, 1))
        amp[i0:i1] = np.maximum(amp[i0:i1], vel * e)
        c = min(m, nsamp(0.035))
        chiff[i0:i0 + c] += vel * np.exp(-np.arange(c) / SR / 0.009)
        vib[i0:i1] = np.clip((tt - 0.16) / 0.25, 0, 1)
    if not np.any(f > 0):
        return np.zeros(n)
    idx = np.where(f > 0, np.arange(n), 0)
    np.maximum.accumulate(idx, out=idx)
    f = f[idx]
    f[f <= 0] = f[np.argmax(f > 0)]
    a1 = np.exp(-1.0 / ((0.006 if kind == "fife" else 0.022) * SR))
    f = signal.lfilter([1 - a1], [1, -a1], f, zi=[f[0] * a1])[0]
    vr, vd = (5.3, 0.0035) if kind == "fife" else (5.8, 0.006)
    fi = f * (1 + 0.0015 * (smooth_rand(n, 1.5, rng) - 0.5)) * (1 + vd * vib * np.sin(TAU * vr * t + rng.uniform(0, TAU)))
    ph = TAU * np.cumsum(fi) / SR
    a_s = np.maximum(lp(amp, 90.0, 1), 0.0)
    if kind == "fife":
        tone = (np.sin(ph) + (0.16 + 0.22 * a_s) * np.sin(2 * ph + 0.6) + (0.05 + 0.10 * a_s) * np.sin(3 * ph + 1.1)
                + 0.03 * a_s * np.sin(4 * ph))
        breath = 0.030 * bp(rng.standard_normal(n), 2000, 7500, 1) + 0.05 * nbnoise(n, fi, 400, rng)
        y = a_s * (tone * (1 + 0.04 * (smooth_rand(n, 30, rng) - 0.5)) + breath * (0.6 + 0.4 * a_s))
        y += 0.20 * chiff * bp(rng.standard_normal(n), 2500, 8000, 1)
    else:
        tone = np.sin(ph) + 0.035 * np.sin(2 * ph)
        breath = 0.10 * nbnoise(n, fi, 500, rng) + 0.03 * bp(rng.standard_normal(n), 3000, 9000, 1)
        y = a_s * (tone * (1 + 0.10 * (smooth_rand(n, 18, rng) - 0.5)) + breath)
        y += 0.06 * chiff * bp(rng.standard_normal(n), 2000, 6000, 1)
    return y


def pluck(freq, dur, rng, bright=0.4, t60=0.6, pick=0.18):
    """Pizzicato: Karplus-Strong string (delay line + averaging loss + all-pass for exact tuning), excited by
    one period of low-passed noise combed at the pluck position, then a wooden body (two broad peaks)."""
    n = nsamp(dur)
    N = SR / freq
    L = int(np.floor(N - 0.5 - 1e-6))
    d = N - 0.5 - L
    if d < 0.08:
        L -= 1
        d += 1.0
    c = (1 - d) / (1 + d)
    g = 10 ** (-3.0 * N / (t60 * SR))
    m = int(N) + 2
    e = lp(rng.standard_normal(m + 64), 500 + 5000 * bright, 1)[64:]
    k = max(1, int(pick * N))
    e2 = e.copy()
    e2[k:] -= e[:-k]
    exc = np.zeros(n)
    exc[:min(m, n)] = (e2 * np.hanning(m))[:min(m, n)]
    a = np.zeros(L + 3)
    a[0] = 1.0
    a[1] += c
    a[L] -= g * 0.5 * c
    a[L + 1] -= g * 0.5 * (1 + c)
    a[L + 2] -= g * 0.5
    y = signal.lfilter([1.0, c], a, exc)
    y = biquad(y, "peak", 280.0, 4.0, 1.2)
    y = biquad(y, "peak", 460.0, 3.0, 1.5)
    y = lp(y, 2200 + 3500 * bright, 1)
    return fade(y / (np.max(np.abs(y)) + 1e-12), 0.0005, min(0.08, dur * 0.3))


def woodblock(f, rng, vel=1.0):
    ir = modal_ir(0.25, [(f, 0.030, 1.0), (f * 2.71, 0.014, 0.5), (f * 4.9, 0.008, 0.25)])
    return lp(strike(ir, rng, 1.2, 6000) * vel, 7000, 1)


def pad_note(freq, dur, rng, bright=420.0, detune=0.0025):
    """Warm sustained tone: three slowly drifting detuned voices, harmonics rolled off hard above `bright`."""
    t = taxis(dur)
    y = np.zeros(len(t))
    for v in range(3):
        f = freq * (1 + detune * (v - 1) + 0.0006 * rng.standard_normal())
        ph = TAU * np.cumsum(f * (1 + 0.0015 * (smooth_rand(len(t), 0.4, rng) - 0.5))) / SR + rng.uniform(0, TAU)
        for h in range(1, 13):
            if f * h > 2500:
                break
            y += (1.0 / h ** 1.6) / (1 + (f * h / bright) ** 2) * np.sin(h * ph + rng.uniform(0, TAU))
    return y / 3.0


def big_hit(rng, size=1.0):
    """Bass drum + low tom + field drum flam + a dark 'crash' of noise. size 1.0 = the bridge bucking."""
    dur = 1.2 + 1.0 * size
    t = taxis(dur)
    n = len(t)
    y = np.zeros(n)
    put(y, bass_drum(1.0, rng, f0=52.0 - 6 * size, dur=dur * 0.9, damp=1.4 + 1.0 * size), 0.0, 1.0)
    put(y, bass_drum(1.0, rng, f0=66.0, dur=0.7, damp=1.0), 0.0, 0.6)
    tom = modal_ir(0.9, [(98.0, 0.22, 1.0), (147.0, 0.14, 0.6), (221.0, 0.08, 0.35)])
    put(y, strike(tom, rng, 3.0, 1500), 0.0, 0.5)
    put(y, snare_hit(0.34, rng, head=0.5), 0.0, 0.5)
    put(y, snare_hit(1.0, rng), 0.027, 0.55)
    crash = bp(rng.standard_normal(n), 250, 4200, 1) * (1 - np.exp(-(t - 0.027).clip(0) / 0.004)) * np.exp(-t / (0.25 + 0.3 * size))
    y += 0.16 * size * crash
    return y


# =====================================================================================
# sound effects (each returns mono or stereo audio; the anchor = where its perceptual onset is)
# =====================================================================================
def metal_tick(rng, scale=1.0, tau=0.09, contact=0.4):
    modes = [(1240, tau * 1.2, 0.5), (2100, tau, 1.0), (3370, tau * 0.8, 0.7), (4830, tau * 0.6, 0.5), (6950, tau * 0.4, 0.3)]
    return strike(modal_ir(tau * 7, modes, scale), rng, contact)


def wood_knock(rng, scale=1.0, tau=0.045, contact=1.6):
    modes = [(310, tau, 1.0), (590, tau * 0.7, 0.7), (940, tau * 0.5, 0.5), (1650, tau * 0.3, 0.3), (2700, tau * 0.2, 0.15)]
    return strike(modal_ir(tau * 7, modes, scale), rng, contact, 5000)


def creak(rng, dur, rate, formants, jitter=0.12, noise=0.15):
    """Stick-slip friction: an irregular pulse train (rate glides, each slip a tiny tick) through the
    body's fixed resonances. Low rate + low resonances = groan, high rate + high Q = squeal."""
    n = nsamp(dur)
    t = np.arange(n) / SR
    r = np.interp(t, np.linspace(0, dur, len(rate)), rate) * (1 + jitter * 2 * (smooth_rand(n, 25, rng) - 0.5))
    k = np.floor(np.cumsum(r) / SR)
    idx = np.nonzero(np.diff(k) > 0)[0] + 1
    exc = np.zeros(n)
    exc[idx] = 1.0 + 0.35 * rng.standard_normal(len(idx))
    exc = signal.lfilter([1.0], [1.0, -0.85], exc)
    exc += noise * rng.standard_normal(n) * lp(np.abs(exc), 200, 1)
    return sum(g * reson(exc, f, q) for f, q, g in formants)


def whoosh(rng, dur=0.42, peak=0.5, f0=350.0, f1=2400.0, body=0.5, air=0.25):
    n = nsamp(dur)
    t = np.arange(n) / SR
    tp = dur * peak
    env = np.exp(-0.5 * ((t - tp) / np.where(t < tp, dur * 0.22, dur * 0.16)) ** 2)
    fc = f0 * (f1 / f0) ** env
    y = nbnoise(n, fc, 0.6 * np.sqrt(f0 * f1), rng) * env
    y += 0.5 * nbnoise(n, fc * 2.3, 1500, rng) * env ** 1.5
    y += body * nbnoise(n, 90 + 60 * env, 120, rng) * env ** 0.8
    y += air * hp(rng.standard_normal(n), 5000) * env ** 3
    return fade(y, 0.01, 0.03), tp


def bubble(rng, f0, rise=35.0, tau=0.012):
    """One air bubble in water: a short sine whose pitch rises as it decays (the 'plip')."""
    t = taxis(tau * 6)
    return np.sin(TAU * f0 * (t + 0.5 * rise * t * t)) * np.exp(-t / tau) * (1 - np.exp(-t / 0.0006))


def splash(rng, size=1.0, dist=0.0):
    """Water entry: low 'plunk', a cluster of rising-pitch bubbles, a hiss of spray. dist darkens it."""
    dur = 0.5 + 0.8 * size
    t = taxis(dur)
    n = len(t)
    plunk = np.sin(TAU * np.cumsum(70 + 150 * np.exp(-t / 0.03)) / SR) * np.exp(-t / (0.06 * size + 0.02))
    bub = np.zeros(n)
    for _ in range(int(16 * size) + 5):
        t0 = 0.004 + rng.exponential(0.10 * size + 0.02)
        b = bubble(rng, rng.uniform(380, 1500) / np.sqrt(size + 0.3), rng.uniform(20, 60), rng.uniform(0.006, 0.02))
        put(bub, b, t0, rng.uniform(0.25, 1.0) * np.exp(-t0 / 0.25))
    spray = (bp(rng.standard_normal(n), 1200, 6500, 1) * (1 - np.exp(-t / 0.012)) * np.exp(-t / (0.20 * size + 0.03))
             * (0.5 + 0.5 * smooth_rand(n, 70, rng)))
    body = bp(rng.standard_normal(n), 180, 900, 1) * np.exp(-t / (0.11 * size + 0.02))
    y = 0.9 * size * plunk + 0.55 * bub + 0.55 * spray + 0.6 * body
    return fade(lp(y, 9000.0 / (1 + 2.2 * dist), 1), 0.0, 0.05)


def footstep_wood(rng, weight=0.5, scuff=0.5):
    base = rng.uniform(95, 180) / (0.7 + 0.6 * weight)
    ir = modal_ir(0.22, [(base, 0.045 + 0.03 * weight, 1.0), (base * 2.31, 0.028, 0.55), (base * 3.87, 0.018, 0.35),
                         (base * 6.1, 0.010, 0.2)])
    th = strike(ir, rng, 3.5, 1800)
    n = len(th)
    t = np.arange(n) / SR
    sc_ = (bp(rng.standard_normal(n), 800, 4200, 1) * (1 - np.exp(-t / 0.012)) * np.exp(-t / rng.uniform(0.04, 0.14))
           * (0.6 + 0.4 * smooth_rand(n, 120, rng)))
    return th + 0.35 * scuff * sc_


def steps_texture(rng, dur, rate, weight=(0.2, 0.8), scuff=(0.3, 1.0), spread=0.8, shape=None):
    """Many feet with no common beat (a Poisson process). shape(u) = density profile over 0..1."""
    n = nsamp(dur + 0.4)
    out = np.zeros((n, 2))
    t = 0.0                                              # the first foot lands on the cue
    while t < dur:
        u = t / dur
        dens = shape(u) if shape else 1.0
        if t == 0.0 or rng.random() < dens:
            s = footstep_wood(rng, rng.uniform(*weight), rng.uniform(*scuff))
            put(out, pan(s, rng.uniform(-spread, spread)), t, lin(0.0 if t == 0.0 else rng.uniform(-10, 0)))
        t += rng.exponential(1.0 / rate)
    return out


def rain_steps(rng, dur):
    """'His men hit it like rain': light, dry, high taps at random times, thickening and thinning like a shower."""
    n = nsamp(dur + 0.3)
    out = np.zeros((n, 2))
    t = 0.0
    while t < dur:
        u = t / dur
        rate = 9 + 26 * np.sin(np.pi * min(u * 1.15, 1.0)) ** 2
        base = rng.uniform(420, 1300)
        ir = modal_ir(0.08, [(base, 0.012, 1.0), (base * 2.4, 0.007, 0.5), (base * 0.42, 0.02, 0.6)])
        tap = strike(ir, rng, 1.0, 4500)
        put(out, pan(tap, rng.uniform(-0.9, 0.9)), t, lin(0.0 if t == 0.0 else rng.uniform(-12, 0)))
        t += rng.exponential(1.0 / rate)
    return out


def boots(rng, heavy=0.5, nmen=14, spread=0.006):
    """Hundreds of boots landing as one on planks: a pitch-dropping thump (the deck), a cluster of plank
    knocks a few ms apart (nobody is early, some are late), leather and grit. heavy adds weight and length."""
    dur = 0.55 + 0.40 * heavy
    t = taxis(dur)
    n = len(t)
    f = (50 + 8 * (1 - heavy)) + (45 + 25 * heavy) * np.exp(-t / 0.022)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / (0.09 + 0.10 * heavy))
    planks = np.zeros(n)
    for _ in range(nmen):
        d = abs(rng.normal(0, spread))
        ir = modal_ir(0.3, [(148, 0.06, 1.0), (236, 0.045, 0.8), (372, 0.03, 0.6), (590, 0.02, 0.4), (910, 0.012, 0.25)],
                      1 + 0.08 * rng.standard_normal())
        put(planks, strike(ir, rng, 2.5, 2500), d, rng.uniform(0.6, 1.0))
    grit = bp(rng.standard_normal(n), 600, 3000, 1) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.003))
    y = (0.9 + 0.5 * heavy) * body + 1.0 * planks / np.sqrt(nmen) + 0.22 * grit
    if heavy > 0.45:                         # the deck answers: sub weight and loose chain
        y += 0.5 * (heavy - 0.45) * np.sin(TAU * 38.0 * t) * np.exp(-t / 0.22) * (1 - np.exp(-t / 0.01))
        for _ in range(int(6 * heavy)):
            put(y, metal_tick(rng, rng.uniform(0.7, 1.2), 0.05), rng.uniform(0.04, 0.30), 0.05 * heavy * rng.uniform(0.4, 1.0))
    y = np.tanh(1.3 * y) / 1.3
    return fade(lp(y, 3500 + 2500 * (1 - heavy), 1), 0.0, 0.06)


def bird(rng, kind=0):
    """Small songbird: fast FM chirps with a weak 2nd harmonic."""
    out = np.zeros(nsamp(0.9))
    pos = 0.0
    sylls = [(3300, 4700, 0.07), (3600, 5200, 0.06), (4300, 3500, 0.09)] if kind == 0 else \
            [(2600, 3400, 0.045)] * 5 + [(3900, 4600, 0.11)]
    for f_a, f_b, d in sylls:
        t = taxis(d)
        u = t / d
        f = f_a + (f_b - f_a) * np.sin(np.pi * u * 0.5) ** 2 + 150 * np.sin(TAU * 38 * t)
        ph = TAU * np.cumsum(f * (1 + 0.02 * rng.standard_normal())) / SR
        s = (np.sin(ph) + 0.10 * np.sin(2 * ph)) * np.sin(np.pi * u) ** 1.5
        put(out, s, pos, rng.uniform(0.7, 1.0))
        pos += d + rng.uniform(0.02, 0.05)
    return out[:nsamp(pos + 0.05)]


def slowmo(y, speed):
    """Tape-style slow motion: resample (lower and longer)."""
    x = np.arange(0, len(y) - 1, speed)
    return np.interp(x, np.arange(len(y)), y)


# =====================================================================================
# session: stems, placements, cue list
# =====================================================================================
class Session:
    def __init__(self, sc, outdir):
        self.sc = sc
        self.out = Path(outdir)
        self.n = nsamp(sc.t_end)                       # everything stops with the last word
        self.sfx = np.zeros((self.n + nsamp(4.0), 2))
        self.stems, self.cues = {}, []
        self.g = make_grids(sc)
        self.P = self.g["P"]

    def has(self, name):
        return (self.out / "overrides" / (name + ".wav")).exists()

    def stem(self, name, audio, anchor=0.0, mode="peak20", measure="onset", maxlen=None, minlen=None):
        """Register a sound. `anchor` = seconds from the file start to the instant that must land on the cue.
        mode: how its level is defined ('peak20' loudest 20 ms for one-shots, 'rms' for textures)."""
        a = np.asarray(audio, dtype=float)
        if a.ndim == 1:
            a = pan(a, 0.0)
        ov = self.out / "overrides" / (name + ".wav")
        src = "synth"
        if ov.exists():                                # a real recording replaces the synthetic stem
            a = read_wav(ov)
            thr = 0.1 * np.max(np.abs(a))
            anchor = float(np.argmax(np.max(np.abs(a), axis=1) >= thr)) / SR
            jf = ov.with_suffix(".json")
            src = "override"
            if jf.exists():
                side = json.load(open(jf, encoding="utf-8"))
                anchor = float(side.get("anchor", anchor))
                src = str(side.get("origin", src))            # 'recording' (Openverse) or 'earshot-bank'
            if minlen is not None and len(a) < nsamp(minlen):  # a bed shorter than the film: loop it with crossfades
                xf = min(nsamp(0.5), len(a) // 4)
                body, out_ = a.copy(), a[:len(a) - xf].copy()
                ramp = np.linspace(0, 1, xf)[:, None]
                while len(out_) < nsamp(minlen):
                    seam = a[len(a) - xf:] * (1 - ramp) + body[:xf] * ramp
                    out_ = np.concatenate([out_, seam, body[xf:len(body) - xf]])
                a = out_
            if maxlen is not None and len(a) > nsamp(maxlen):  # a recording longer than its slot: cut + fade
                a = fade(a[:nsamp(maxlen)], 0.0, min(0.25, maxlen * 0.3))
        a = a * (lin(-3.0) / (np.max(np.abs(a)) + 1e-12))  # every stem file peaks at -3 dBFS
        self.stems[name] = {"audio": a, "anchor": float(anchor), "mode": mode, "measure": measure, "src": src,
                            "loud": loud20(a) if mode == "peak20" else rms(a)}
        return name

    def place(self, name, cue, lvl, t=None, featured=False, key=False, note="", beat=None, length=None,
              fin=0.0, fout=0.0, win=None, skip=0.0):
        """Put stem `name` so that its anchor lands on `cue` (or on explicit time t derived from a cue + beats),
        at `lvl` dB re voice."""
        st = self.stems[name]
        time = self.sc.at(cue) if t is None else float(t)
        a = st["audio"]
        if skip:
            a = a[nsamp(skip) % max(1, len(a) - nsamp(length or 0.1)):]
        if length is not None:
            a = a[:nsamp(length)]
        if fin or fout:
            a = fade(a, fin, fout)
        gain = float(lin(V_REF + lvl) / st["loud"])
        start = time - st["anchor"]
        put(self.sfx, a, start, gain)
        c = dict(cue)
        if beat is not None:
            c["beat"] = beat
            c["beat_period"] = round(self.P, 5)
        self.cues.append({"id": "%s@%d" % (name, len(self.cues)), "track": "sfx", "file": "stems/%s.wav" % name,
                          "cue": c, "time": round(time, 4), "start": round(start, 4), "anchor": round(st["anchor"], 4),
                          "gain_db": round(float(dbv(gain)), 2), "level_re_voice_db": lvl, "level_mode": st["mode"],
                          "length": round(len(a) / SR, 3), "fade_in": fin, "fade_out": fout,
                          "featured": bool(featured), "window": round(win if win else min(len(a) / SR, 0.45), 3),
                          "key": bool(key), "measure": st["measure"], "source": st["src"], "note": note})

    def real(self, name, cue, lvl, maxlen=None, mode="rms", minlen=None, **kw):
        """A sound that exists only as a recording (voices): placed when overrides/<name>.wav is there."""
        if not self.has(name):
            return False
        if name not in self.stems:
            self.stem(name, np.zeros(8), 0.0, mode=mode, measure="onset", maxlen=maxlen, minlen=minlen)
        self.place(name, cue, lvl, **kw)
        return True

    def mark(self, file, cue, lvl, t=None, featured=False, key=False, note="", win=0.4, beat=None):
        """Log a music event (the music is rendered as full-length parts, not placed one-shots)."""
        time = self.sc.at(cue) if t is None else float(t)
        c = dict(cue)
        if beat is not None:
            c["beat"] = beat
            c["beat_period"] = round(self.P, 5)
        self.cues.append({"id": "music@%d" % len(self.cues), "track": "music", "file": file, "cue": c,
                          "time": round(time, 4), "start": round(time, 4), "anchor": 0.0, "gain_db": 0.0,
                          "level_re_voice_db": lvl, "level_mode": "peak20", "featured": bool(featured), "window": win,
                          "key": bool(key), "measure": "onset", "source": "synth", "note": note})


# =====================================================================================
# the music
# =====================================================================================
D5, E5, Fs5, G5, A5, B5, Cs6, D6 = 74, 76, 78, 79, 81, 83, 85, 86
# Original 8-bar quickstep in D, 2/4 (one beat = one step). (duration in beats, midi or None for a rest)
THEME = [(.75, Fs5), (.25, E5), (.5, D5), (.5, A5),   (.5, B5), (.5, A5), (1.0, Fs5),
         (.75, G5), (.25, Fs5), (.5, E5), (.5, B5),   (1.5, A5), (.5, None),
         (.75, D6), (.25, B5), (.5, A5), (.5, Fs5),   (.5, G5), (.5, B5), (1.0, A5),
         (.5, Fs5), (.5, E5), (.5, D5), (.5, E5),     (1.5, D5), (.5, None)]
# second fife: sixths and thirds under the tune
HARM = [(.75, D5), (.25, 73), (.5, 69), (.5, Fs5),    (.5, G5), (.5, Fs5), (1.0, D5),
        (.75, E5), (.25, D5), (.5, 73), (.5, G5),     (1.5, Fs5), (.5, None),
        (.75, Fs5), (.25, G5), (.5, Fs5), (.5, D5),   (.5, E5), (.5, G5), (1.0, Fs5),
        (.5, D5), (.5, 73), (.5, 71), (.5, 73),       (1.5, 69), (.5, None)]

PAT = {  # (sixteenth 0..7 in a two-beat bar, velocity, kind)
    "S": [(0, 1.00, "flam"), (4, .80, "acc")],
    # the steady set: one bar = two steps, strong stroke on the first, light answer on the second
    "H": [(0, 1.00, "flam"), (4, .60, "acc")],
    "I": [(0, 1.00, "flam"), (4, .60, "acc"), (6, .40, "tap")],
    "J": [(0, 1.00, "flam"), (4, .64, "acc"), (6, .42, "tap"), (7, .48, "tap")],
    "R": [(0, 1.00, "flam"), (4, .50, "roll")],
    "A": [(0, 1.00, "flam"), (2, .40, "tap"), (3, .46, "tap"), (4, .82, "acc"), (6, .40, "tap"), (7, .46, "tap")],
    "B": [(0, 1.00, "flam"), (2, .42, "tap"), (3, .48, "tap"), (4, .85, "acc"), (5, .38, "tap"), (6, .72, "acc"), (7, .44, "tap")],
    "C": [(0, 1.00, "flam"), (2, .44, "tap"), (3, .50, "tap"), (4, .50, "roll")],
    "D": [(0, 1.00, "flam"), (1, .36, "tap"), (2, .44, "tap"), (3, .50, "tap"), (4, .90, "flam"), (5, .38, "tap"),
          (6, .50, "tap"), (7, .55, "tap")],
}

LV = {  # music levels, dB re voice, before ducking (loudest 20 ms of a full-velocity stroke / RMS for sustained parts)
    "first_hit": 3.0, "pulse": -4.0, "drone": -6.0, "calm": -9.0,
    "far_snare": -11.0, "far_bd": -9.0,
    "snare": -12.0, "bd": -9.0, "fife": -17.0, "fife2": -21.0,
    "step_bd": 1.0, "step_snare": -3.0, "land": 2.0,
    "you_hit": -7.0, "pizz": -8.0, "pizz_hi": -10.0, "wood": -15.0, "slide": -15.0,
    "roll14": -8.0, "push": -1.0, "rain_pizz": -12.0, "bucks": 7.0,
}


def build_music(sc, ses):
    g, P, n = ses.g, ses.P, ses.n
    N = n + nsamp(3.5)
    R = irs()
    tr = {k: np.zeros(N) for k in ("snare", "snare_far", "bd", "bd_far", "pulse", "fife1", "fife2", "slide", "hits",
                                   "hits_gorge", "post")}
    st = {k: np.zeros((N, 2)) for k in ("pizz", "drone")}
    cnt = [0]

    def k_for(sample, lvl=0.0):             # gain that puts a centred mono sound at lvl dB re voice
        return float(lin(V_REF + lvl) / (loud20(sample) * 0.7071))

    g_sn = k_for(snare_hit(1.0, rng_for("ref:sn")))
    g_bd = k_for(bass_drum(1.0, rng_for("ref:bd")))

    # real recordings for the field drum, when present: overrides/snare_hit_<n>.wav (single strokes, used in
    # rotation) and overrides/snare_roll.wav (a sustained roll that crescendo rolls are cut from)
    ovd = ses.out / "overrides"
    sn_smp = [read_wav(f).mean(axis=1) for f in sorted(ovd.glob("snare_hit_*.wav"))]
    sn_smp = [x / (np.max(np.abs(x)) + 1e-12) for x in sn_smp]
    sn_gain = [k_for(x) for x in sn_smp]
    roll_smp = read_wav(ovd / "snare_roll.wav").mean(axis=1) if (ovd / "snare_roll.wav").exists() else None
    fl_smp = []                                        # sustained flute notes (overrides/flute_note_*.wav + .json: midi)
    for f in sorted(ovd.glob("flute_note_*.wav")):
        jf = f.with_suffix(".json")
        if jf.exists():
            x_ = read_wav(f).mean(axis=1)
            fl_smp.append((float(json.load(open(jf, encoding="utf-8"))["process"]["midi"]), x_ / (np.max(np.abs(x_)) + 1e-12)))
    ses.music_src = {"snare": "recording" if sn_smp else "synth", "roll": "recording" if roll_smp is not None else "synth",
                     "fife": "recording (two flute notes, sequenced)" if fl_smp else "synth"}

    def sample_line(notes, total):
        """The tune played on the recorded flute notes: each note is the nearest sample resampled to pitch,
        an octave under the written line (a real flute's comfortable register, and out of the consonants' way)."""
        y = np.zeros(nsamp(total))
        for t0, d, midi, vel in notes:
            m_ = midi + FIFE_OCT
            sm, x_ = min(fl_smp, key=lambda q: abs(m_ - q[0]))
            idx = np.arange(nsamp(d + 0.03)) * 2.0 ** ((m_ - sm) / 12.0)
            idx = idx[idx < len(x_) - 1]
            put(y, fade(np.interp(idx, np.arange(len(x_)), x_), 0.004, 0.05) * vel, t0, 1.0)
        return y

    def snare(t, vel, lvl, far=False, head=0.85, flam=False, dur=0.40):
        cnt[0] += 1
        r = rng_for("sn", cnt[0])
        buf = tr["snare_far"] if far else tr["snare"]
        if sn_smp:                                     # recorded stroke: softer = darker and quieter
            def smp(v, k):
                x = sn_smp[k % len(sn_smp)][:nsamp(max(dur, 0.25))]
                return fade(lp(x, 2300 + 7000 * v, 1) * v ** 1.2, 0.0, 0.04), sn_gain[k % len(sn_smp)]
            if flam:
                x, g_ = smp(0.32 * vel, cnt[0] + 1)
                put(buf, x, t - 0.027, g_ * lin(lvl))
            x, g_ = smp(vel, cnt[0])
            put(buf, x, t, g_ * lin(lvl))
            return
        if flam:
            put(buf, snare_hit(0.32 * vel, r, head=0.5), t - 0.027, g_sn * lin(lvl))
        put(buf, snare_hit(vel, r, head=head, dur=dur), t, g_sn * lin(lvl))

    def roll(t0, t1, v0, v1, lvl, far=False):
        r = rng_for("roll", int(t0 * 1000))
        if roll_smp is not None and t1 - t0 > 0.08:    # a recorded roll, shaped into the crescendo
            m = nsamp(t1 - t0)
            i0 = int(r.integers(0, max(1, len(roll_smp) - m)))
            x = np.resize(roll_smp[i0:i0 + m], m)
            u = np.arange(m) / m
            x = fade(x * (v0 + (v1 - v0) * u ** 1.5) ** 1.2, 0.012, 0.02)
            put(tr["snare_far"] if far else tr["snare"], x, t0, float(lin(V_REF + lvl) / (loud20(roll_smp) * 0.7071)))
            return
        t = t0
        while t < t1 - 0.012:
            u = (t - t0) / max(t1 - t0, 1e-3)
            snare(t + r.normal(0, 0.0015), (v0 + (v1 - v0) * u ** 1.5) * r.uniform(0.85, 1.1), lvl, far, head=0.3, dur=0.22)
            t += r.uniform(0.9, 1.1) / 27.0

    def bdrum(t, vel, lvl, far=False, **kw):
        cnt[0] += 1
        put(tr["bd_far"] if far else tr["bd"], bass_drum(vel, rng_for("bd", cnt[0]), **kw), t, g_bd * lin(lvl))

    def beat_t(B, x):                        # time of (fractional) beat x on grid B, extrapolated at tempo P
        m = len(B)
        i = int(np.floor(x))
        fr = x - i
        a = B[i] if 0 <= i < m else (B[-1] + (i - (m - 1)) * P if i >= m else B[0] + i * P)
        b = B[i + 1] if 0 <= i + 1 < m else (B[-1] + (i + 1 - (m - 1)) * P if i + 1 >= m else B[0] + (i + 1) * P)
        return a + fr * (b - a)

    def cadence(B, i_down, cyc0, lvl_fn, pats, far=False, pick=False, t_stop=None, far_until=None, steady=True):
        """Field-drum street beat over beat grid B. i_down = index of any downbeat; cyc0 = downbeat where
        the pattern cycle starts. Beats on the grid are never humanised (they carry the lock to the voice)."""
        m = len(B)
        if m == 0:
            return
        r = rng_for("cad", int(B[0] * 1000))
        first = i_down % 2
        for i in range(first - 2, m, 2):
            name = pats[((i - cyc0) // 2) % len(pats)]
            for p, vel, kind in PAT[name]:
                bi = i + p // 4
                if bi < 0 or bi >= m:
                    continue
                t = beat_t(B, bi + (p % 4) / 4.0)
                if t_stop is not None and t >= t_stop - 1e-4:
                    continue
                is_far = far or (far_until is not None and t < far_until)
                L = lvl_fn(t) + (LV["far_snare"] if is_far else LV["snare"])
                if kind == "roll":
                    t1 = beat_t(B, i + 2)
                    roll(t, min(t1, t_stop) if t_stop else t1, 0.30, 0.78, L, is_far)
                elif kind == "tap":
                    snare(t + r.normal(0, 0.002), vel * r.uniform(0.92, 1.08), L, is_far, head=0.6)
                else:
                    snare(t, vel, L, is_far, flam=(kind == "flam"))
        for bi in range(m):
            t = B[bi]
            if t_stop is not None and t >= t_stop - 1e-4:
                continue
            is_far = far or (far_until is not None and t < far_until)
            down = (bi - first) % 2 == 0
            L = lvl_fn(t) + (LV["far_bd"] if is_far else LV["bd"])
            if steady and not down:                   # steadier: the bass drum marks every SECOND step
                continue
            bdrum(t, 1.0 if down else 0.8, L, is_far)
            if pick and not down and not is_far:      # eighth-note pick-up into the next downbeat
                bdrum(beat_t(B, bi + 0.5), 0.5, L - 2)

    def tune(B, x0, line, lvl_fn, buf, transpose=0, t_stop=None, vel=1.0, name="f", bars=None, stretch=2.0):
        """Lay a (duration, midi) line onto beat grid B starting at beat x0 and render it as one fife line."""
        notes, x = [], 0.0                   # x counts tune beats; one tune beat = `stretch` steps (half-time feel)
        seq = line if bars is None else line * 8
        total_beats = sum(d for d, _ in line) if bars is None else bars * 2 / stretch
        used = 0.0
        for d, m in seq:
            if used >= total_beats - 1e-6:
                break
            t0, t1 = beat_t(B, x0 + x * stretch), beat_t(B, x0 + (x + d) * stretch)
            if m is not None and (t_stop is None or t0 < t_stop - 0.03):
                te = min(t1, t_stop) if t_stop else t1
                notes.append((t0, max(0.04, (te - t0) * 0.93), m + transpose, vel))
            x += d
            used += d
        if not notes:
            return
        a, b = notes[0][0] - 0.05, notes[-1][0] + notes[-1][1] + 0.1
        rel = [(t0 - a, d, m, v) for t0, d, m, v in notes]
        y = sample_line(rel, b - a) if fl_smp else flute_line(rel, b - a, rng_for("fife:" + name, int(a * 1000)))
        i0 = int(a * SR)
        gcurve = lin(np.array([lvl_fn(a + j / SR) for j in range(0, len(y), 2205)]))
        y *= np.interp(np.arange(len(y)), np.arange(0, len(y), 2205), gcurve)
        put(buf, y, a, 1.0)
        return i0

    # reference level for the fife: a held note at full velocity
    g_ff = float(lin(V_REF) / (rms((sample_line([(0.02, 0.6, A5, 1.0)], 0.7) if fl_smp else
                                    flute_line([(0.02, 0.6, A5, 1.0)], 0.7, rng_for("ref:ff")))[2000:24000]) * 0.7071))

    S, E = sc.start, sc.end
    t_he = sc.t(1, "He")
    steps, t_land, t_you, t_cut, t_bucks = g["steps"], g["t_land"], g["t_you"], g["t_cut"], g["t_bucks"]

    # ---- 1. one hit on the first word ------------------------------------------------
    h = big_hit(rng_for("hit:first"), 0.45)
    put(tr["hits_gorge"], h, t_he, k_for(h, LV["first_hit"]))
    ses.mark("stems/mus_hits.wav", C(1, "He"), LV["first_hit"], featured=True, key=True, win=0.30,
             note="the drum's last hit: bass drum + field drum flam, canyon reverb")

    # ---- 2. sparse tension under the hook and the colonel: a muffled half-time pulse ----
    pulse_end = S(5) - 0.9 * P
    pause = (S(3) - 0.25, E(3) + 0.05)            # beat sheet: the music pauses on "But in step..."
    k = 1
    while t_he + k * 2 * P < pulse_end:
        t = t_he + k * 2 * P
        if not (pause[0] <= t <= pause[1]):
            strong = k % 2 == 0
            up = np.interp(t, [t_he, S(4), E(4)], [-2.0, 0.0, 2.0])     # creeps up towards the bridge
            cnt[0] += 1
            b = lp(bass_drum(0.8, rng_for("pulse", k), f0=64.0, dur=0.5, damp=0.7, click=0.3), 260, 2)
            put(tr["pulse"], b, t, k_for(b, LV["pulse"] + up - (0.0 if strong else 2.5)))
            if strong:                                                    # lub-dub
                b2 = lp(bass_drum(0.6, rng_for("pulse2", k), f0=70.0, dur=0.4, damp=0.6, click=0.2), 240, 2)
                put(tr["pulse"], b2, t + 0.42 * P, k_for(b2, LV["pulse"] + up - 4.0))
        k += 1
    ses.mark("stems/mus_pulse.wav", C(1, "He"), LV["pulse"], beat=2,
             note="muffled half-time pulse (2 beats of the march) until sentence 5, silent through sentence 3")

    # ---- 3. sentence 5: the blue army's sneaky out-of-step pizzicato (D minor) -----------
    q = 1.5 * P
    t0 = S(5) - q
    bass = [38, 41, 43, 44, 45, 44, 43, 41]
    j = 0
    while t0 + j * q < E(5) - 0.15:
        t = t0 + j * q
        r = rng_for("sneak", j)
        nb = pluck(440 * 2 ** ((bass[j % 8] - 69) / 12), 0.7, r, bright=0.30, t60=0.55)
        put(st["pizz"], pan(nb, -0.15), t, k_for(nb, LV["pizz"]))
        lim = t + 0.62 * q                                 # the limp: the off-beat arrives late
        if lim < E(5):
            for mnote, pp in zip((62, 65) if j % 2 == 0 else (61, 64), (0.30, 0.45)):
                nh = pluck(440 * 2 ** ((mnote - 69) / 12), 0.35, r, bright=0.45, t60=0.25)
                put(st["pizz"], pan(nh, pp), lim, k_for(nh, LV["pizz_hi"] - 2))
            wb = woodblock(640.0, r, 0.8)
            put(st["pizz"], pan(wb, -0.4), lim, k_for(wb, LV["wood"]))
        j += 1
    for i_, (mnote, dt) in enumerate(((45, 0.10), (38, 0.10 + 0.55 * q))):     # "ba-dum" in the gap after the sentence
        nb = pluck(440 * 2 ** ((mnote - 69) / 12), 0.8, rng_for("sneak:end", i_), bright=0.30, t60=0.6)
        put(st["pizz"], pan(nb, -0.1), E(5) + dt, k_for(nb, LV["pizz"] + 1))
    ses.mark("stems/mus_pizz.wav", C(5, "So", off=-q), LV["pizz"], note="sneaky limping pizzicato, D minor, beat = 1.5 march beats")

    # ---- 4. sentence 6: the red army's drums far away; sentence 7: the march enters ----------
    Rg = g["R"]
    i_land = len(Rg) - 1

    def lv7(t):                                           # close cadence swells towards "land as one"
        return float(np.interp(t, [S(7), t_land], [-3.0, 0.0]))

    cadence(Rg[:-1], i_land, i_land, lv7, ["H", "H", "H", "I"], far_until=S(7) - 0.03, t_stop=t_land)
    ses.mark("stems/mus_snare.wav", C(6, "On"), LV["far_snare"], note="distant cadence (low-passed, wet) on the ridge")
    ses.mark("stems/mus_snare.wav", C(7, "His"), LV["snare"], note="the march enters: field drum + bass drum, close")
    snare(t_land, 1.0, LV["land"] - 2, flam=True)
    bdrum(t_land, 1.0, LV["land"], f0=54.0, dur=0.9, damp=1.3)
    ses.mark("stems/mus_bassdrum.wav", C(7, "land"), LV["land"], featured=True, win=0.35, note="tutti hit with the boots, then a rest")

    # ---- 5. sentence 8: onto the bridge; stop-time on the four step words -------------------
    Bp = g["B_pre"]
    if Bp:
        def lv8(t):
            return float(np.interp(t, [Bp[0], steps[0]], [-2.0, 0.5]))
        i_dn = len(Bp) % 2                                  # "Left" is a downbeat, so count back in pairs
        pats8 = ["H", "H", "H", "R"][-max(1, min(4, (len(Bp) + 1) // 2)):]   # the bar before "Left" is always the roll
        cadence(Bp, i_dn, len(Bp) - 2 * len(pats8), lv8, pats8)
        if len(Bp) >= 6:                                    # fife call: the first bar of the tune, half-time
            x0 = len(Bp) - 6
            tune(Bp, x0, THEME[:4], lambda t: 0.0, tr["fife1"], vel=0.85, name="call")
    for i_, ts in enumerate(steps):
        bdrum(ts, 1.0, LV["step_bd"], f0=56.0, dur=0.6, damp=0.9)
        snare(ts, 0.95, LV["step_snare"], flam=False)
        ses.mark("stems/mus_bassdrum.wav", C(8, "left" if i_ % 2 == 0 else "right", i_ // 2 + 1), LV["step_bd"],
                 featured=True, win=0.22, note="stop-time: one drum stroke per step word")

    # ---- 6. sentences 9-11: the march on the bridge, locked to the step tempo, growing --------
    Bq = g["B_post"]
    if Bq:
        def lv9(t):
            return float(np.interp(t, [Bq[0], S(10), S(11), Bq[-1]], [-1.5, 0.0, 1.0, 2.5]))
        m1 = [i for i, t in enumerate(Bq) if t < S(11) - 0.02]
        cut11 = (len(m1) // 2) * 2
        cadence(Bq[:cut11], 0, 0, lv9, ["H", "I", "H", "J"])
        cadence(Bq[cut11:], 0, 0, lv9, ["I", "J", "I", "J"], t_stop=t_you - 0.02)
        nb_ = len(Bq)
        tune(Bq, 0, THEME, lambda t: lv9(t), tr["fife1"], t_stop=t_you - 0.04, name="t1", bars=(nb_ + 1) // 2 + 1)
        i10 = next((i for i, t in enumerate(Bq) if t >= S(10) - 0.5 * P), None)
        if i10 is not None:                                 # the second fife joins when they start to enjoy it
            i10 += (-i10) % 4                               # a bar of the half-time tune = four steps
            off = (i10 // 4) % 8
            line = [x for x in HARM]
            # start the harmony at the bar the tune has reached
            acc, k0 = 0.0, 0
            while acc < off * 2 - 1e-6 and k0 < len(line):
                acc += line[k0][0]
                k0 += 1
            tune(Bq, i10, line[k0:] + line, lambda t: lv9(t), tr["fife2"], t_stop=t_you - 0.04, name="t2",
                 bars=(nb_ - i10 + 1) // 2 + 1)
        ses.mark("stems/mus_fife.wav", C(8, "right", 2), LV["fife"], t=Bq[0], beat=1, key=True,
                 note="full march: tune enters one beat after the 4th step word and keeps that tempo")

    # ---- 7. sentence 12: almost nothing -----------------------------------------------------
    b = lp(bass_drum(0.7, rng_for("you"), f0=60.0, dur=0.8, damp=1.2, click=0.4), 400, 2)
    put(tr["hits"], b, t_you, k_for(b, LV["you_hit"]))
    ses.mark("stems/mus_hits.wav", C(12, "You"), LV["you_hit"], key=True, note="the march is gone: one soft drum, then only a pad")

    # ---- 8. sentence 13: the swing. Lilting pizzicato that climbs and speeds up ------------
    sw, sw_end = g["swing"], g["swing_end"]
    scale = [57, 59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93]
    for i_, dt in enumerate((0.30, 0.15)):                 # two-note pick-up in the gap before "Ever"
        nh = pluck(440 * 2 ** ((scale[3 + i_ * 2] - 69) / 12), 0.4, rng_for("sw:pk", i_), bright=0.5, t60=0.3)
        put(st["pizz"], pan(nh, 0.3), sw[0] - dt, k_for(nh, LV["pizz_hi"] - 2))
    for i_, t in enumerate(sw):
        nxt = sw[i_ + 1] if i_ + 1 < len(sw) else sw_end
        d = nxt - t
        r = rng_for("sw", i_)
        up = 2.0 * i_ / max(1, len(sw) - 1)                # grows a little as the swing rises
        nb = pluck(440 * 2 ** (((50 if i_ % 2 == 0 else 45) - 69) / 12), 0.7, r, bright=0.35, t60=0.5)
        put(st["pizz"], pan(nb, -0.1), t, k_for(nb, LV["pizz"] + up))
        for jj, fr in enumerate((1 / 3.0, 2 / 3.0)):
            mnote = scale[min(len(scale) - 1, 2 + i_ + jj)]
            nh = pluck(440 * 2 ** ((mnote - 69) / 12), 0.4, r, bright=0.5, t60=0.28)
            put(st["pizz"], pan(nh, 0.25 + 0.1 * jj), t + fr * d, k_for(nh, LV["pizz_hi"] + up))
    ts0, ts1 = sc.t(13, "soon"), sw_end                     # slide whistle: he goes over your head
    tt = taxis(ts1 - ts0 + 0.08)
    u = np.clip(tt / (ts1 - ts0), 0, 1)
    fz = 520 * (1650 / 520.0) ** (u ** 1.4) * (1 + 0.012 * u * np.sin(TAU * 6.2 * tt))
    ph = TAU * np.cumsum(fz) / SR
    sl = (np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.05 * nbnoise(len(tt), fz, 500, rng_for("slide")))
    sl = fade(sl * (0.5 + 0.5 * u), 0.04, 0.07)
    if not ses.has("kid_squeal"):                           # the recorded squeal takes this moment when it exists
        put(tr["slide"], sl, ts0, float(lin(V_REF + LV["slide"]) / (rms(sl) * 0.7071)))
    nh = pluck(440 * 2 ** ((90 - 69) / 12), 0.5, rng_for("sw:end"), bright=0.6, t60=0.35)
    put(st["pizz"], pan(nh, 0.2), sw_end + 0.02, k_for(nh, LV["pizz_hi"] + 2))
    ses.mark("stems/mus_pizz.wav", C(13, "Ever"), LV["pizz"], key=True,
             note="swing figure: %d beats pinned to Ever/Tiny/always/and, beat %.0f -> %.0f ms" % (
                 len(sw), 1000 * (sw[1] - sw[0]) if len(sw) > 1 else 0, 1000 * (sw_end - sw[-1])))

    # ---- 9. sentence 14: the drums come back as a long crescendo roll into "one giant push" ----
    t_two, t_one = sc.t(14, "two"), sc.t(14, "one")
    roll(sc.t(14, "and"), t_one, 0.12, 0.85, LV["roll14"])
    bdrum(t_two, 0.8, LV["bd"] + 1)
    snare(t_one, 1.0, LV["push"] - 3, flam=True)
    bdrum(t_one, 1.0, LV["push"], f0=50.0, dur=1.0, damp=1.5)
    ses.mark("stems/mus_snare.wav", C(14, "and"), LV["roll14"], note="crescendo roll into the push")
    ses.mark("stems/mus_bassdrum.wav", C(14, "one"), LV["push"], featured=True, win=0.4, note="tutti with the low push thump")

    # ---- 10. sentence 15: the blue army again - pizzicato raindrops -------------------------
    r = rng_for("rainpizz")
    t = S(15)
    while t < sc.t(15, "rain", frac=1.0) + 0.25:
        mnote = int(r.choice([74, 76, 78, 81, 83, 86]))
        nh = pluck(440 * 2 ** ((mnote - 69) / 12), 0.35, r, bright=0.55, t60=0.22)
        put(st["pizz"], pan(nh, r.uniform(-0.6, 0.6)), t, k_for(nh, LV["rain_pizz"] + r.uniform(-4, 0)))
        t += r.uniform(0.09, 0.26)
    ses.mark("stems/mus_pizz.wav", C(15, "His"), LV["rain_pizz"], note="scattered high pizzicato = footsteps like rain")

    # ---- 11. sentence 16: the march at its limit (up a fourth, in G), cut dead on "forty-first" ----
    F = g["F"]
    if F:
        def lv16(t):
            return float(np.interp(t, [F[0], t_cut], [1.5, 4.0]))
        roll(max(E(15) + 0.2, F[0] - 1.3 * P), F[0], 0.15, 0.7, LV["snare"])
        i_dn = len(F) % 2
        cadence(F, i_dn, i_dn, lv16, ["I", "J", "I", "A"], t_stop=g["t_drop"])
        tune(F, i_dn, THEME[13:] + THEME, lv16, tr["fife1"], transpose=(-7 if fl_smp else 5), t_stop=g["t_drop"] - 0.02, name="g1", bars=len(F) // 2 + 2)
        tune(F, i_dn, HARM[13:] + HARM, lv16, tr["fife2"], transpose=(-7 if fl_smp else 5), t_stop=g["t_drop"] - 0.02, name="g2", bars=len(F) // 2 + 2)
        ses.mark("stems/mus_snare.wav", C(16, "But"), LV["snare"] + 3, t=F[0],
                 note="march at the limit, in G; the grid is counted back from 'forty-first' so the last beat is step 40")
    ses.mark("music.wav", C(17, "And", off=-0.17), -120.0, t=g["t_drop"], key=True,
             note="silence-drop: music cuts dead (8 ms) on the cut to the hanging boot, before 'And on the forty-first'")

    # ---- 12. one huge hit on "bucks" ---------------------------------------------------------
    h = big_hit(rng_for("hit:bucks"), 1.0)
    put(tr["post"], h, t_bucks, k_for(h, LV["bucks"]))
    ses.mark("stems/mus_hits.wav", C(17, "bucks"), LV["bucks"], featured=True, key=True, win=0.6,
             note="bass drum + tom + field drum + dark crash, canyon reverb")

    # ---- drones / pads (the glue: there is always a tone under the voice) --------------------
    def pad(notes, t0, t1, bright, name, width=0.5):
        dur = t1 - t0 + 0.6
        out = np.zeros((nsamp(dur), 2))
        for i_, (mnote, amp) in enumerate(notes):
            for ch in range(2):
                y = pad_note(440 * 2 ** ((mnote - 69) / 12), dur, rng_for("pad:%s:%d" % (name, mnote), ch), bright)
                out[:, ch] += amp * y[:len(out)]
        mid_, side = (out[:, 0] + out[:, 1]) / 2, (out[:, 0] - out[:, 1]) / 2
        side = hp(side, 140.0, 1) * width                  # lows stay mono
        return np.stack([mid_ + side, mid_ - side], axis=1)

    def lay(p, t0, pts, lvl):
        gcurve = auto(len(p), [(a - t0, b) for a, b in pts])
        lfo = 1 + 0.10 * np.sin(TAU * 0.17 * np.arange(len(p)) / SR)
        put(st["drone"], p * (gcurve * lfo)[:, None], t0, float(lin(V_REF + lvl) / rms(p)))

    OFF = -70.0
    a0 = t_he + 0.05
    low_d = pad([(38, 1.0), (45, 0.7), (50, 0.35)], a0, t_you + 0.3, 330.0, "D")
    lay(low_d, a0, [(a0, OFF), (a0 + 0.5, -1.0), (pause[0], 0.0), (pause[0] + 0.25, -7.0), (pause[1], -7.0), (S(4), -1.0),
                    (E(4), 1.0), (S(5), -3.0), (S(6), -2.0), (S(7), -4.0), (t_you - 0.05, -4.0), (t_you + 0.25, OFF)], LV["drone"])
    calm = pad([(50, 0.8), (57, 0.8), (66, 0.5)], t_you, S(14) + 0.4, 520.0, "calm", width=0.8)
    lay(calm, t_you, [(t_you, OFF), (t_you + 0.25, 0.0), (S(13), -1.0), (S(14) - 0.1, -1.0), (S(14) + 0.35, OFF)], LV["calm"])
    f0_ = F[0] if F else S(16)
    d14 = pad([(38, 1.0), (45, 0.7), (50, 0.35)], E(13), f0_ + 0.3, 330.0, "D14")
    lay(d14, E(13), [(E(13), OFF), (E(13) + 0.3, -3.0), (S(14) + 0.3, -1.0), (t_one, 2.0), (E(14) + 0.3, -2.0), (E(15), -3.0),
                           (f0_ - 0.1, -2.0), (f0_ + 0.25, OFF)], LV["drone"])
    dg = pad([(43, 1.0), (50, 0.7), (55, 0.35)], f0_ - 0.2, t_cut + 0.1, 360.0, "G")
    lay(dg, f0_ - 0.2, [(f0_ - 0.2, OFF), (f0_ + 0.1, -2.0), (t_cut, 0.0)], LV["drone"])

    # ---- parts -> stereo, rooms, bus ---------------------------------------------------------
    far_sn = lp(hp(tr["snare_far"], 180, 1), 1100, 2)
    far_bd = lp(tr["bd_far"], 500, 2)
    parts = {
        "snare": mixp(room(tr["snare"], R["room"], -15.0, -0.12), room(far_sn, R["gorge"], -3.0, -0.3)),
        "bassdrum": mixp(room(tr["bd"], R["room"], -22.0, 0.0), room(far_bd, R["gorge"], -6.0, -0.3)),
        "pulse": room(tr["pulse"], R["room"], -18.0, 0.0),
        "fife": mixp(room(tr["fife1"] * g_ff * lin(LV["fife"]), R["room"], -9.0, 0.28),
                     room(tr["fife2"] * g_ff * lin(LV["fife2"]), R["room"], -9.0, -0.30), room(tr["slide"], R["room"], -10.0, 0.15)),
        "hits": mixp(room(tr["hits"], R["room"], -14.0, 0.0), room(tr["hits_gorge"], R["gorge"], -9.0, 0.0)),
    }
    L_ = max(len(v) for v in parts.values())
    pz = np.zeros((L_, 2))
    pz[:N] += st["pizz"]
    pw = reverb(st["pizz"], R["room"], -13.0)
    pz[:min(L_, len(pw))] += pw[:L_]
    parts["pizz"] = pz
    dr = np.zeros((L_, 2))
    dr[:N] += st["drone"]
    parts["drone"] = dr
    for k_ in parts:
        v = np.zeros((L_, 2))
        v[:min(L_, len(parts[k_]))] = parts[k_][:L_]
        parts[k_] = v
    # the cut: everything that was playing dies in 8 ms on "forty-first"
    i_cut = int(g["t_drop"] * SR)
    gate = np.ones(L_)
    ramp = nsamp(0.008)
    gate[i_cut - ramp:i_cut] = np.linspace(1, 0, ramp)
    gate[i_cut:] = 0.0
    post = room(tr["post"], R["gorge"], -8.0, 0.0)

    def bus(x):                                           # warm: no sub rumble, less top, a dip where the voice lives
        x = hp(x, 32.0, 2)
        x = biquad(x, "hishelf", 6500.0, -3.0, 0.7)
        x = biquad(x, "peak", 2600.0, -1.5, 0.9)
        return x

    out = {}
    for k_ in parts:
        y = bus(parts[k_])[:n] * gate[:n, None]           # gate after the EQ, so no filter ringing survives the cut
        if k_ == "hits":
            pb = bus(post)[:n]
            y[:len(pb)] += pb
        out[k_] = fade(y, 0.0, 0.004)                     # hard stop at the end of the last word
    music = sum(out.values())
    return music, out


# =====================================================================================
# the effects
# =====================================================================================
def build_sfx(sc, ses):
    g, P = ses.g, ses.P
    R = irs()
    S, E = sc.start, sc.end
    steps, t_you, t_cut, t_bucks, t_end = g["steps"], g["t_you"], g["t_cut"], g["t_bucks"], sc.t_end

    # ---------- hook: the drum goes into the river ----------
    r = rng_for("whoosh")
    y, a = whoosh(r, 0.44, 0.45, 320, 2300)
    ses.stem("throw_whoosh", room(pan_move(y, -0.45, 0.4), R["field"], -16.0), a, measure="peak")
    t_throw, t_spl = sc.t(1, "threw") + 0.05, sc.t(1, "river") + 0.12      # the film's T_THROW and T_SPLASH
    ses.place("throw_whoosh", C(1, "threw", off=0.05), LV_FX["throw"], key=True, note="arm swing; the peak of the whoosh is on the throw")

    # the drum tumbles down the gorge between the throw and the splash: knocks of the drum itself (the recorded
    # field-drum strokes when they are installed), each one quieter, darker and wetter, the sticks clattering off;
    # it ends early enough to leave a pause of air before the splash
    r = rng_for("tumble")
    ovd = ses.out / "overrides"
    hits = [read_wav(f).mean(axis=1) for f in sorted(ovd.glob("snare_hit_*.wav"))]
    stick = read_wav(ovd / "stick_tok.wav").mean(axis=1) if (ovd / "stick_tok.wav").exists() else None
    t0_, t1_ = t_throw + 0.24, t_spl - 0.34
    span = max(0.45, t1_ - t0_)
    nk = int(np.clip(round(span / 0.16), 4, 8))
    dry, wet = np.zeros(nsamp(span + 0.6)), np.zeros(nsamp(span + 0.6))
    for i_ in range(nk):
        u = i_ / (nk - 1)
        tk = span * (u ** 0.85) * 0.92 + (0 if i_ == 0 else r.uniform(-0.02, 0.02))
        if hits:
            hd = hits[i_ % len(hits)][:nsamp(0.22)] / (np.max(np.abs(hits[i_ % len(hits)])) + 1e-12)
            hd = fade(hd * r.uniform(0.8, 1.0), 0.0, 0.08)
        else:
            t = taxis(0.3)
            hd = np.sin(TAU * np.cumsum(140 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.085)
            hd += 0.3 * bp(r.standard_normal(len(t)), 1200, 5000, 1) * np.exp(-t / 0.06)
        rate_ = 1.0 - 0.38 * u                                # falling away: each knock lower (Doppler-like), ...
        hd = np.interp(np.arange(0, len(hd) - 1, rate_), np.arange(len(hd)), hd)
        hd = lp(hd, 900 + 7000 * (1 - u) ** 2, 1)             # ... darker: it recedes into the gorge
        gk = lin(-17.0 * u)                                   # ... and gets quieter as it falls
        put(dry, hd, tk, gk)
        put(wet, hd, tk, gk * (0.3 + 0.5 * u))
        if i_ < 4:                                            # the sticks fly off
            sk = stick[:nsamp(0.12)] / (np.max(np.abs(stick)) + 1e-12) if stick is not None else woodblock(r.uniform(1700, 2600), r, 1.0)
            put(dry, sk, tk + 0.05 + r.uniform(0, 0.03), 0.4 * gk)
    nfa = len(dry)                                            # the air it falls through: a soft rush that drops in pitch and fades
    ufa = np.arange(nfa) / nfa
    air = nbnoise(nfa, 1400 * (350 / 1400.0) ** np.clip(ufa * 1.3, 0, 1), 500, r) * np.sin(np.pi * np.clip(ufa * 1.25, 0, 1)) ** 2 * (1 - 0.7 * ufa)
    dry += 0.16 * air
    tm = pan_move(dry, 0.1, -0.2)
    tw = reverb(wet, R["gorge"], -8.0)
    full = np.zeros((len(tw), 2))
    full[:len(tm)] += tm
    full += tw
    full = fade(full[:nsamp(span + 0.45)], 0.0, 0.4)          # the pause of air before the splash
    ses.stem("drum_tumble", full, 0.0)
    if hits:
        ses.stems["drum_tumble"]["src"] = "recording (assembled in code)"
    ses.place("drum_tumble", C(1, "threw", off=0.05 + 0.24), LV_FX["tumble"],
              note="the drum tumbling down: %d knocks, each quieter and darker, sticks clatter; ends %.2f s before the splash" % (nk, 0.34 - 0.08))

    r = rng_for("splash:far")
    ses.stem("splash_distant", room(splash(r, 0.9, 1.0), R["gorge"], -5.0, -0.1), 0.0)
    ses.place("splash_distant", C(1, "river", off=0.12), LV_FX["splash"], key=True, win=0.5,
              note="far below, on the film's splash frame: the splash with its watery tail")

    # ---------- the colonel ----------
    r = rng_for("cloth")

    def swish(t0, d, lo, hi, a_, buf):
        m = nsamp(d * 6)
        t = np.arange(m) / SR
        s = bp(r.standard_normal(m), lo, hi, 1) * (1 - np.exp(-t / 0.004)) * np.exp(-t / d) * (0.55 + 0.45 * smooth_rand(m, 140, r))
        put(buf, s, t0, a_)

    def cloth(strength):
        y = np.zeros(nsamp(0.55))
        pre, _ = whoosh(r, 0.13, 0.7, 500, 1800, body=0.2, air=0.1)
        put(y, pre, 0.0, 0.07)
        a_ = 0.10
        swish(a_, 0.045, 500, 4200, 1.0, y)
        swish(a_ + 0.07, 0.06, 350, 2600, 0.5 * strength, y)
        swish(a_ + 0.16, 0.05, 600, 3200, 0.3 * strength, y)
        t = taxis(0.2)
        put(y, np.sin(TAU * np.cumsum(60 + 120 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.035), a_, 0.7)
        return y, a_

    y, a = cloth(1.0)
    ses.stem("cloth_grab", room(y, R["field"], -18.0, 0.15), a)
    ses.place("cloth_grab", C(2, "colonel"), -8, key=True, note="hand flies in (short whoosh before the word) and grabs the collar")
    y, a = cloth(0.6)
    ses.stem("cloth_yank", room(lp(y, 3500, 1), R["field"], -18.0, -0.1), a)
    ses.place("cloth_yank", C(2, "collar"), -11, note="the yank towards camera")

    r = rng_for("echo")
    h = lp(big_hit(r, 0.3), 700, 2)
    ses.stem("gorge_echo_drum", reverb(h, R["gorge"], 0.0), 0.03)
    ses.place("gorge_echo_drum", C(2, "That"), -13, note="'That drum': the hit from the first word answers from the gorge, wet only")

    r = rng_for("clatter")
    cl = np.zeros((nsamp(1.4), 2))
    ev = [(0.00, "body"), (0.05, "wood"), (0.11, "metal"), (0.19, "body"), (0.24, "wood"), (0.33, "gear"), (0.40, "metal"),
          (0.52, "body"), (0.63, "drop"), (0.80, "bounce"), (0.90, "bounce")]
    for t0, kind in ev:
        p_ = r.uniform(-0.6, 0.6)
        if kind == "body":
            t = taxis(0.2)
            s = lp(r.standard_normal(len(t)), 300, 2) * np.exp(-t / 0.03) * 3 + np.sin(TAU * 85 * t) * np.exp(-t / 0.05)
            put(cl, pan(s, p_), t0, 0.8)
        elif kind == "wood":
            put(cl, pan(wood_knock(r, r.uniform(0.8, 1.3)), p_), t0, 0.9)
        elif kind == "metal":
            put(cl, pan(metal_tick(r, r.uniform(0.5, 0.9), r.uniform(0.07, 0.15)), p_), t0, 0.55)
        elif kind == "gear":
            for _ in range(5):
                put(cl, pan(metal_tick(r, r.uniform(0.9, 1.5), 0.02), p_), t0 + r.uniform(0, 0.08), 0.2)
        elif kind == "drop":                               # one of them drops his musket
            put(cl, pan(wood_knock(r, 0.75, 0.06), 0.3), t0, 1.0)
            put(cl, pan(metal_tick(r, 0.6, 0.16), 0.3), t0 + 0.012, 0.6)
        else:
            put(cl, pan(wood_knock(r, 0.9, 0.035), 0.35), t0, 0.45)
            put(cl, pan(metal_tick(r, 0.7, 0.07), 0.35), t0 + 0.008, 0.25)
    ses.stem("soldiers_clatter", cl + reverb(cl, R["field"], -15.0)[:len(cl)], 0.0)
    ses.place("soldiers_clatter", C(2, "six"), -7, key=True, note="bodies, musket stocks, buckles; one musket dropped")
    ses.real("soldiers_bodies", C(2, "six"), -9, mode="peak20", note="the bodies under the gear (recording)")

    # ---------- the bridge ----------
    r = rng_for("chain:creak")
    y = creak(r, 0.8, [42, 68, 96, 84, 52], [(740, 30, 1.0), (1320, 35, 0.8), (2150, 40, 0.6), (3400, 30, 0.35)])
    t = taxis(0.8)
    y = y[:len(t)] * np.sin(np.pi * np.clip(t / 0.8, 0, 1)) ** 0.7
    for t0 in (0.18, 0.47, 0.66):
        put(y, metal_tick(r, r.uniform(0.6, 0.9), 0.06), t0, 0.25 * np.max(np.abs(y)))
    ses.stem("chain_creak", room(lp(y, 5500, 1), R["gorge"], -14.0, -0.2), 0.047)
    ses.place("chain_creak", C(3, "last"), -8, key=True, note="iron link under load (stick-slip through metal resonances)")
    for cue_, lv_ in ((C(9, "the"), -14), (C(10, "Some"), -12.5), (C(11, "By"), -11), (C(11, "bouncing"), -9.5),
                      (C(14, "A", off=0.5), -13), (C(16, "But"), -11), (C(16, "gives"), -9)):
        ses.place("chain_creak", cue_, lv_, note="chain load creak, louder as the wave grows")

    r = rng_for("wind")
    wn = nsamp(t_end + 1.0)
    gust = smooth_rand(wn, 0.35, r) ** 1.5
    wind = np.zeros((wn, 2))
    for ch in range(2):
        r2 = rng_for("wind:ch", ch)
        wind[:, ch] = (0.35 + 0.65 * gust) * bp(r2.standard_normal(wn), 110, 650, 1) \
            + (0.2 + 0.8 * gust ** 2) * 0.10 * bp(r2.standard_normal(wn), 1500, 4500, 1)
    w1 = nbnoise(wn, 520 + 260 * smooth_rand(wn, 0.5, r) + 80 * gust, 45, r) * gust ** 2
    w2 = nbnoise(wn, 930 + 380 * smooth_rand(wn, 0.4, r), 60, r) * gust ** 2.5 * 0.6
    wind += 0.35 * (pan(w1, -0.3) + pan(w2, 0.35))
    river = np.stack([bp(rng_for("river", c).standard_normal(wn), 250, 1400, 1) for c in range(2)], axis=1)
    ses.stem("amb_gorge", wind + 0.25 * river, 0.0, mode="rms", minlen=t_end + 1.0)
    amb_g = ses.stems["amb_gorge"]["audio"]
    ses.stem("amb_lens", lp(amb_g, 900, 2), 0.0, mode="rms", measure="none")          # the gorge heard from the ridge
    ses.stem("amb_under", lp(amb_g, 420, 2) + 0.5 * bp(amb_g, 90, 180, 2), 0.0, mode="rms", measure="none")   # under the deck
    opn = np.zeros((wn, 2))
    for ch in range(2):
        r2 = rng_for("open:ch", ch)
        opn[:, ch] = (0.5 + 0.5 * smooth_rand(wn, 0.25, r2)) * bp(r2.standard_normal(wn), 180, 1500, 1) \
            + 0.08 * bp(r2.standard_normal(wn), 2500, 6000, 1)
    ses.stem("amb_open", opn, 0.0, mode="rms", measure="none", minlen=t_end + 1.0)       # open valley air
    ses.stems["amb_gorge"]["audio"] = ses.stems["amb_gorge"]["audio"]
    AMB = [("amb_gorge", C(1, "He", off=0.15), S(6), -18, "location A: windy gorge, river far below"),
           ("amb_open", C(6, "On"), sc.t(6, "That's"), -20, "location B: the ridge, open air"),
           ("amb_lens", C(6, "That's"), S(7), -21, "through the spyglass: the gorge from far away"),
           ("amb_open", C(7, "His"), S(8), -19, "location B: the valley, open air (distant drums are in the music)"),
           ("amb_gorge", C(8, "So"), S(11), -18, "back on the bridge"),
           ("amb_under", C(11, "By"), sc.t(11, "bouncing"), -15, "under the deck: the gorge through the planks, low resonance"),
           ("amb_gorge", C(11, "bouncing"), S(12), -18, "on the deck"),
           ("amb_gorge", C(12, "You"), S(13), -20, "the bridge head on a calm day"),
           ("amb_gorge", C(14, "A"), t_end + 0.2, -18, "back at the gorge")]
    for nm, cue_, t1_, lv_, note_ in AMB:
        t0_ = sc.at(cue_)
        ses.place(nm, cue_, lv_, length=t1_ - t0_ + 0.05, fin=0.05, fout=0.07, skip=t0_, note="AMBIENCE " + note_)

    r = rng_for("gust")
    gn = nsamp(2.6)
    t = np.arange(gn) / SR
    ge = np.exp(-0.5 * ((t - 0.9) / 0.55) ** 2)
    gs = np.zeros((gn, 2))
    for ch in range(2):
        r2 = rng_for("gust:ch", ch)
        gs[:, ch] = ge * bp(r2.standard_normal(gn), 130, 900, 1) + 0.12 * ge ** 2 * bp(r2.standard_normal(gn), 1500, 5000, 1)
    gs += pan(0.5 * nbnoise(gn, 600 + 500 * ge, 60, r) * ge ** 2, -0.2) + pan(0.3 * nbnoise(gn, 1100 + 500 * ge, 80, r) * ge ** 3, 0.3)
    ses.stem("wind_gust", gs, 0.25, mode="rms", measure="none")
    ses.place("wind_gust", C(4, "The"), -15, note="wide shot of the gorge: one gust swells and whistles")

    r = rng_for("clink")
    y = np.zeros(nsamp(0.6))
    for t0, a_, s_ in ((0.0, 1.0, 0.8), (0.06, 0.5, 1.0), (0.15, 0.35, 0.9)):
        put(y, metal_tick(r, s_, 0.08), t0, a_)
    ses.stem("chain_clink", room(lp(y, 7000, 1), R["gorge"], -14.0, 0.2), 0.0)
    ses.place("chain_clink", C(4, "chain"), -11, note="crash zoom on a link")
    ses.place("chain_clink", C(8, "right", 2, off=0.05), -9, note="4th step: the link above them shudders")

    r = rng_for("pebble")
    dry, wet = np.zeros(nsamp(2.0)), np.zeros(nsamp(2.0))
    for i_, (t0, gdb, fc) in enumerate(((0.0, 0, 9000), (0.10, -4, 7000), (0.24, -8, 5000), (0.46, -13, 3500), (0.78, -18, 2500))):
        tk = strike(modal_ir(0.08, [(900, .008, .4), (2300, .006, 1), (3900, .004, .7), (5800, .003, .4)], r.uniform(0.85, 1.2)), r, 0.3)
        tk = lp(tk, fc, 1)
        put(dry, tk, t0, lin(gdb))
        put(wet, tk, t0, lin(gdb + 3 * i_))
    put(wet, bubble(r, 900, 40, 0.012), 1.45, 0.02)         # a very long way down
    pb = pan(dry, 0.1)
    pw = reverb(wet, R["gorge"], -9.0)
    full = np.zeros((len(pw), 2))
    full[:len(pb)] += pb
    full += pw
    ses.stem("pebble_fall", full, 0.0)
    ses.place("pebble_fall", C(1, "threw", off=0.55), -16, length=1.1, fout=0.3, note="loose rocks rattling down the cliff beside the drum")
    ses.place("pebble_fall", C(4, "gorge"), -10, note="pebble ticks off the rock, each tick fainter and wetter, tiny plip 1.45 s later")

    # ---------- the blue army shuffles ----------
    r = rng_for("shuffle")
    d5 = E(5) - S(5) + 0.45
    y = steps_texture(r, d5, 12.0)
    ses.stem("shuffle_steps", fade(y + reverb(y, R["field"], -16.0)[:len(y)], 0.0, 0.35), 0.0, mode="rms", measure="onset", maxlen=d5)
    ses.real("shuffle_steps_b", C(5, "So", off=0.12), -16, maxlen=d5 - 0.12, note="a second layer of feet (another recording)")
    ses.place("shuffle_steps", C(5, "So"), -13, key=True, note="six hundred men with no common beat (Poisson timing), thumps + scuffs")

    # the marbles gag left the film: under "a bag of spilled marbles" the blue column just stumbles along
    r = rng_for("stumble")
    y = steps_texture(r, 1.1, 5.0, weight=(0.2, 0.6), scuff=(0.5, 1.0))
    ses.stem("stumble_steps", fade(y + reverb(y, R["field"], -16.0)[:len(y)], 0.0, 0.3), 0.0, mode="rms", measure="onset", maxlen=1.6)
    ses.place("stumble_steps", C(6, "bag"), -12, key=True, note="scattered stumbling footsteps (replaces the marbles rattle)")
    t = taxis(0.25)
    bump = lp(r.standard_normal(len(t)), 220, 2) * np.exp(-t / 0.04) * 3 + np.sin(TAU * 80 * t) * np.exp(-t / 0.06)
    ses.stem("soft_bump", room(bump, R["field"], -18.0, 0.0), 0.0)
    ses.place("soft_bump", C(6, "spilled", frac=0.5), -12, note="soft bump: two of them walk into each other")
    ses.place("soft_bump", C(6, "marbles", frac=0.6), -14, note="soft bump")
    ses.place("stumble_steps", C(4, "cross"), -13, fout=0.2, note="the captain shows the walk: four wobbly steps on the planks")
    ses.real("drum_plop", C(2, "drum", off=0.12), -11, mode="peak20", note="rings on the river where the drum went in: a small plop")
    ses.real("adjutant_laugh", C(6, "crying", off=0.22), -16, maxlen=max(0.4, sc.t(6, "That's") - sc.t(6, "crying") - 0.3),
             note="the adjutant laughs along")
    ses.place("cloth_yank", C(4, "orders"), -17, note="the captain's arm goes up: sleeve")
    ses.place("cloth_yank", C(12, "real", off=0.3), -17, note="the officer's arm goes up at the sign: sleeve")
    r = rng_for("pat")
    t = taxis(0.09)
    pat = bp(r.standard_normal(len(t)), 700, 3500, 1) * np.exp(-t / 0.012)
    ses.stem("hand_pat", room(pat, R["field"], -18.0, 0.0), 0.0)
    for off_ in (-1.0, -0.74):
        ses.place("hand_pat", C(2, "His", off=off_), -15, note="the captain dusts his hands after the throw (timing approximate)")
    for off_ in (0.12, 0.36):
        ses.place("hand_pat", C(17, "gorge", off=off_), -13, note="far bank: the captain dusts his hands")

    # the red army on sand: unison steps (soft thud + grit), every second one lighter; gear and drums rattle
    Rg_ = [tb for tb in g["R"] if sc.t(7, "finest") - 0.02 <= tb < g["t_land"] - 0.05]
    t = taxis(0.22)
    snd = lp(rng_for("sand").standard_normal(len(t)), 420, 2) * np.exp(-t / 0.03) * 3 + 0.5 * bp(rng_for("sand2").standard_normal(len(t)), 1500, 5000, 1) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.004))
    ses.stem("sand_step", room(snd, R["field"], -16.0, 0.0), 0.0)
    for k_, tb in enumerate(Rg_):
        down = (len(g["R"]) - 1 - g["R"].index(tb)) % 2 == 0
        ses.place("sand_step", C(7, "land"), -13 if down else -17, t=tb, beat=g["R"].index(tb) - (len(g["R"]) - 1), note="red army on sand, in unison")
    for cue_, t1_, lv_ in ((C(7, "finest"), g["t_land"], -21), (C(8, "So"), g["t_you"], -20), (C(16, "But"), g["t_drop"], -19)):
        ses.real("gear_rattle", cue_, lv_, minlen=t_end + 1.0, length=t1_ - sc.at(cue_), fin=0.15, fout=0.12, skip=sc.at(cue_),
                 note="belts, muskets and drums rattling on the march")

    # ---------- voices (recordings only; nothing is placed when the file is missing) ----------
    t_l0, t_l1 = sc.t(6, "crying"), sc.t(6, "That's")
    ses.real("general_laugh", C(6, "crying"), -13, maxlen=max(0.4, t_l1 - t_l0 - 0.06), key=True,
             note="the general's laughter; stops before he speaks")
    ses.real("soldiers_chuckle_b", C(9, "soldiers", off=0.22), -13, maxlen=max(0.4, S(10) - sc.t(9, "soldiers") - 0.3),
             note="a second soldier chuckles")
    ses.real("soldiers_chuckle", C(9, "soldiers"), -11, maxlen=max(0.4, S(10) - sc.t(9, "soldiers") - 0.05), key=True,
             note="the red soldiers enjoy the bounce")
    ses.real("kid_squeal", C(13, "over"), -9, maxlen=max(0.4, S(14) - sc.t(13, "over") - 0.05), key=True,
             note="the kid on the swing, delighted")

    # ---------- unison boots ----------
    for i_, hv in enumerate((0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.0)):
        for side in "LR":
            r = rng_for("boots:%d%s" % (i_, side))
            ses.stem("boots_h%d_%s" % (i_, side), room(boots(r, hv), R["field"], -17.0 + 4 * hv, -0.08 if side == "L" else 0.08), 0.0)

    def boot(i_h, side, cue, lvl, **kw):
        ses.place("boots_h%d_%s" % (int(np.clip(i_h, 0, 6)), side), cue, lvl, **kw)

    boot(4, "L", C(7, "land"), 2, featured=True, key=True, win=0.35, note="two thousand boots land as one")
    for j, tb in enumerate(g["B_pre"]):                     # marching onto the bridge
        side = "L" if (len(g["B_pre"]) - j) % 2 == 0 else "R"
        u = j / max(1, len(g["B_pre"]) - 1)
        offb = (len(g["B_pre"]) - j) % 2 == 1               # "Left" is a downbeat; the steps between are light
        boot(0 if u < 0.6 or offb else 1, side, C(8, "left", 1), -12 + 3 * u - (5.0 if offb else 0.0), t=tb,
             beat=j - len(g["B_pre"]), note="approaching step" + (" (light)" if offb else ""))
    for i_, ts in enumerate(steps):
        boot(3, "L" if i_ % 2 == 0 else "R", C(8, "left" if i_ % 2 == 0 else "right", i_ // 2 + 1), 3, featured=True, key=True,
             win=0.22, note="STEP %d: one step word = one beat" % (i_ + 1))
    Bq = g["B_post"]
    t_stomp = sc.t(10, "stomp")
    for k_, tb in enumerate(Bq):                            # every beat while they are on the bridge, getting heavier
        u = k_ / max(1, len(Bq) - 1)
        offb = k_ % 2 == 1                                  # steadier: every second step carries the accent
        hv = 1 + 3.6 * u + (0.8 if tb >= t_stomp - 0.02 else 0.0) - (1.5 if offb else 0.0)
        lvl = -11 + 4.0 * u + (1.5 if tb >= t_stomp - 0.02 else 0.0) - (5.0 if offb else 0.0)
        boot(int(round(max(0.0, hv))), "L" if k_ % 2 == 0 else "R", C(8, "right", 2), lvl, t=tb, beat=k_ + 1,
             note="step %d on the bridge%s" % (k_ + 5, " (light)" if offb else ""))
    boot(4, "L", C(14, "two"), -3, note="'two thousand boots landing together'")
    F = g["F"]
    for j, tb in enumerate(F):                              # forty perfect pushes
        if tb >= g["t_drop"] - 0.01:                        # after the cut to boot 41 only the chalk counts
            continue
        u = j / max(1, len(F) - 1)
        no = 41 - (len(F) - j)
        offb = (j - len(F) % 2) % 2 == 1
        boot((5 if u < 0.5 else 6) - (2 if offb else 0), "L" if no % 2 == 1 else "R", C(17, "forty-first"),
             -7 + 3.0 * u - (4.0 if offb else 0.0), t=tb, beat=j - len(F), note="push %d%s" % (no, " (light)" if offb else ""))
    r = rng_for("boot41")
    b41 = slowmo(boots(r, 1.0, nmen=10, spread=0.004), 0.55)
    ses.stem("boot_41_slowmo", room(b41, R["gorge"], -12.0, 0.0), 0.0)
    ses.place("boot_41_slowmo", C(17, "forty-first", off=0.5), 2, featured=True, key=True, win=0.5,
              note="push 41 lands (film.js T_STOMP = forty-first + 0.5 s): the same boots at 0.55 speed")
    r = rng_for("chalk")
    t = taxis(0.16)
    ck = bp(r.standard_normal(len(t)), 2200, 7000, 1) * (0.5 + 0.5 * smooth_rand(len(t), 90, r)) * np.sin(np.pi * t / 0.16) ** 0.5
    ses.stem("chalk_tick", room(ck, R["field"], -20.0, -0.3), 0.0)
    for i_, n_ in enumerate((38, 39, 40)):
        ses.place("chalk_tick", C(17, "forty-first"), -11, t=g["t_cut"] + (i_ - 3) * P - 0.03, beat=i_ - 3, note="chalk tally: %d" % n_)
    ses.place("chalk_tick", C(17, "forty-first", off=-0.03), -8, note="chalk: 41, underlined")
    ses.place("chalk_tick", C(17, "forty-first", off=0.12), -9, note="chalk: the underline")

    # ---------- the deck starts to move ----------
    r = rng_for("plank")
    for i_ in range(4):
        d = 0.42 + 0.06 * i_
        y = creak(r, d, [38 - 2 * i_, 62, 80 - 4 * i_, 56], [(410, 9, 1.0), (780, 11, 0.8), (1350, 10, 0.5), (2300, 8, 0.25)], noise=0.25)
        t = taxis(d)
        y = y[:len(t)] * np.sin(np.pi * t / d) ** 0.8
        ses.stem("plank_creak_%d" % i_, room(lp(y, 4500, 1), R["field"], -15.0, (-0.3, 0.25, -0.1, 0.35)[i_]), 0.065)
    ses.place("plank_creak_0", C(9, "A"), -9, key=True, note="'A few steps in': the deck flexes")
    for k_, tb in enumerate(Bq):
        if k_ % 4 == 3 and tb > S(9) + 0.3:                  # then once every four steps, a little more each time
            u = k_ / max(1, len(Bq) - 1)
            ses.place("plank_creak_%d" % ((k_ // 2) % 4), C(8, "right", 2), -12 + 4 * u, t=tb + 0.5 * P, beat=k_ + 1.5,
                      note="deck creak between steps")

    r = rng_for("whistle")
    tw_cue = sc.t(10, "whistle")
    nxt = next((tb for tb in Bq if tb >= tw_cue + 0.14), tw_cue + 0.3)
    base = nxt - tw_cue                                     # the tune itself starts on the next march beat
    wnotes = [(0.0, min(0.11, base * 0.8), 86, 0.6)]        # a little "fweet" exactly on the word
    x = base
    for d, mnote in THEME[:7] + THEME[7:11]:
        wnotes.append((x, d * 2 * P * 0.92, mnote + 12, 0.9))
        x += d * 2 * P
    wl = flute_line(wnotes, x + 0.15, r, kind="whistle")
    w2n = [(t0 + 0.03 + 0.01 * (i_ % 3), d, m - 0.22, v * 0.7) for i_, (t0, d, m, v) in enumerate(wnotes[1:])]   # a bit flat, a bit late
    wl2 = flute_line(w2n, x + 0.15, rng_for("whistle2"), kind="whistle")
    wst = room(wl, R["field"], -12.0, 0.3) + room(wl2, R["field"], -12.0, -0.35)
    cutoff = max(0.3, t_you - tw_cue - 0.1)
    ses.stem("whistle_march", fade(wst[:nsamp(cutoff)], 0.0, 0.08), 0.008, mode="rms", measure="onset", maxlen=cutoff)
    ses.place("whistle_march", C(10, "whistle"), -15, key=True, note="two soldiers whistle the march tune an octave up, loosely together")

    r = rng_for("rumble")
    t_by = sc.t(11, "By")
    dr_ = max(0.4, t_you - t_by)
    m = nsamp(dr_)
    t = np.arange(m) / SR
    phase0 = (t_by - Bq[0]) / P if Bq else 0.0
    am = 0.55 + 0.45 * np.cos(TAU * (t / P + phase0))        # it throbs at the step frequency: resonance
    rb = (bp(r.standard_normal(m), 28, 85, 2) * 3.0 + 0.8 * np.sin(TAU * 41.0 * t)) * am * (0.25 + 0.75 * t / dr_)
    ses.stem("bridge_rumble", fade(rb, 0.15, 0.03), 0.0, mode="rms", measure="none")
    ses.place("bridge_rumble", C(11, "By"), -11, note="the whole span moves: low rumble pulsing in step, cut on 'You see'")

    # ---------- the sign ----------
    r = rng_for("ding")
    dg = strike(modal_ir(1.4, [(1568, 0.50, 1.0), (1568 * 2.756, 0.28, 0.45), (1568 * 5.404, 0.14, 0.2)]), r, 0.8, 6000)
    ses.stem("sign_ding", room(lp(dg, 9000, 1), R["room"], -12.0, 0.0), 0.0)
    ses.place("sign_ding", C(12, "You"), -6, key=True, note="ALL TROOPS MUST BREAK STEP")

    r = rng_for("pea")
    t = taxis(0.30)
    pw_ = np.sin(TAU * (2950 * t + (55 / 38.0) * np.sin(TAU * 38 * t))) * (0.7 + 0.3 * np.sin(TAU * 38 * t))
    pw_ += 0.15 * hp(r.standard_normal(len(t)), 4000)
    pw_ = fade(pw_ * (1 - np.exp(-t / 0.01)), 0.0, 0.05)
    ses.stem("officer_whistle", room(lp(pw_, 6000, 1), R["field"], -12.0, -0.2), 0.0)
    ses.place("officer_whistle", C(12, "real"), -17, note="officer's pea whistle: break step")

    r = rng_for("breakstep")
    d12 = E(12) - sc.t(12, "break") + 0.55
    y = steps_texture(r, d12, 9.0, weight=(0.1, 0.5), scuff=(0.2, 0.6))
    ses.stem("breakstep_steps", fade(y + reverb(y, R["field"], -16.0)[:len(y)], 0.03, 0.3), 0.0, mode="rms", measure="none", maxlen=d12)
    ses.place("breakstep_steps", C(12, "break"), -14, note="the column scatters its step")

    # ---------- the swing ----------
    r = rng_for("meadow")
    d13 = E(13) - S(13) + 0.6
    m = nsamp(d13)
    md = np.stack([bp(rng_for("meadow:air", c).standard_normal(m), 300, 2600, 1) * 0.25 for c in range(2)], axis=1)
    t0 = 0.9
    while t0 < d13 - 0.8 and not ses.has("bird_meadow"):    # synthetic far birds only while there is no recording
        put(md, pan(bird(r, int(r.integers(0, 2))), r.uniform(-0.7, 0.7)), t0, r.uniform(0.3, 0.6))
        t0 += r.uniform(0.7, 1.4)
    ses.stem("amb_meadow", fade(md, 0.2, 0.3), 0.0, mode="rms", measure="none", maxlen=d13)
    ses.place("amb_meadow", C(13, "Ever"), -17, fin=0.05, note="AMBIENCE location C: the meadow with the swing, air and far birds")
    r = rng_for("bird1")
    ses.stem("bird_meadow", room(bird(r, 1), R["field"], -14.0, -0.4), 0.0, maxlen=d13 - 0.3)
    ses.place("bird_meadow", C(13, "Ever"), -13, note="birds")

    for i_, (rate, nm) in enumerate((([70, 112, 140], "fwd"), ([132, 96, 64], "back"))):
        r = rng_for("swing:" + nm)
        y = creak(r, 0.30, rate, [(520, 12, 1.0), (1100, 14, 0.7), (1900, 12, 0.4)], noise=0.2)
        t = taxis(0.30)
        y = y[:len(t)] * np.sin(np.pi * t / 0.30)
        ses.stem("swing_creak_" + nm, room(lp(y, 4000, 1), R["field"], -16.0, 0.2 if i_ == 0 else -0.2), 0.05)
    r = rng_for("tick")
    tk = lp(strike(modal_ir(0.2, [(180, 0.03, 0.8), (820, 0.02, 1.0), (1340, 0.012, 0.5)]), r, 2.0), 3000, 1)
    ses.stem("push_tick", room(tk, R["field"], -18.0, 0.0), 0.0)
    sw, seg = g["swing"], g["swing_seg"]
    t_at, t_mo = sc.t(13, "at"), sc.t(13, "moment")
    PUSH = [(C(13, "Tiny"), None), (C(13, "always"), None), (C(13, "at"), None), (C(13, "moment"), None),
            (C(13, "moment"), t_mo + (t_mo - t_at))]
    pt_ = [sc.at(c_) if t_ is None else t_ for c_, t_ in PUSH]
    for i_, (cue_, t_) in enumerate(PUSH):
        ses.place("push_tick", cue_, -8, t=t_, beat=None, key=(i_ < 2), note="push %d of 5 (film.js PUSH)" % (i_ + 1))
        ses.place("swing_creak_fwd", cue_, -13 + 0.7 * i_, t=pt_[i_] + 0.05, note="rope creaks as the seat goes out")
        nxt = pt_[i_ + 1] if i_ + 1 < len(pt_) else pt_[i_] + (pt_[i_] - pt_[i_ - 1])
        if nxt < S(14) - 0.2:
            ses.place("swing_creak_back", cue_, -15 + 0.7 * i_, t=(pt_[i_] + nxt) / 2, note="rope creaks on the way back")
    for tb in (sc.t(13, "Ever") + 0.25, sc.t(13, "kid"), sc.t(13, "swing")):
        ses.place("swing_creak_back", C(13, "Ever"), -16, t=tb, note="the swing at rest sways: soft rope creak")

    # ---------- a bridge swings too ----------
    r = rng_for("bridge:creak")
    d = 1.0
    y = creak(r, d, [22, 34, 46, 38, 26], [(230, 14, 1.0), (410, 16, 0.8), (760, 14, 0.5), (1300, 12, 0.3)], noise=0.2)
    y2 = creak(r, d, [40, 66, 90, 70, 44], [(740, 30, 1.0), (1320, 35, 0.8), (2150, 40, 0.5)], noise=0.1)
    t = taxis(d)
    y = (y[:len(t)] + 0.35 * y2[:len(t)]) * np.sin(np.pi * t / d) ** 0.7
    ses.stem("bridge_creak", room(lp(y, 4500, 1), R["gorge"], -13.0, 0.0), 0.06)
    ses.place("bridge_creak", C(14, "A"), -8, note="the empty bridge swaying like the swing: the same creak, bigger and lower")

    r = rng_for("push")
    t = taxis(1.3)
    pt = np.sin(TAU * np.cumsum(36 + 46 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.42)
    pt += 0.3 * np.sin(TAU * np.cumsum(72 + 92 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.2)
    pt += 0.6 * lp(r.standard_normal(len(t)), 150, 2) * np.exp(-t / 0.05) * 4
    pt = np.tanh(1.5 * pt) / 1.5
    gr = creak(r, 0.8, [30, 26, 21], [(150, 18, 1.0), (290, 22, 0.9), (520, 25, 0.5)], noise=0.1)
    put(pt, gr[:nsamp(0.8)] * np.sin(np.pi * taxis(0.8) / 0.8), 0.18, 0.12 * np.max(np.abs(pt)) / (np.max(np.abs(gr)) + 1e-9))
    ses.stem("push_thump", room(pt, R["gorge"], -16.0, 0.0), 0.0)
    ses.real("thump_real", C(14, "one"), -3, mode="peak20", featured=True, win=0.45, note="recorded heavy thud under the synthetic sub")
    ses.place("push_thump", C(14, "one"), 2, featured=True, key=True, win=0.45, note="ONE giant push: sub thump 82 -> 36 Hz, the deck groans after it")

    # ---------- like rain ----------
    r = rng_for("rain")
    d15 = sc.t(15, "rain", frac=1.0) - S(15) + 0.5
    y = rain_steps(r, d15)
    singles = [read_wav(f).mean(axis=1) for f in sorted((ses.out / "overrides").glob("step_single_*.wav"))]
    if singles:                                             # the same shower of feet, made of recorded steps on wood
        y = np.zeros((nsamp(d15 + 0.4), 2))
        tt_ = 0.0
        while tt_ < d15:
            u = tt_ / d15
            x_ = singles[int(r.integers(0, len(singles)))]
            x_ = x_[int(np.argmax(np.abs(x_) >= 0.25 * np.max(np.abs(x_)))):]      # start on the step itself
            x_ = fade(x_[:nsamp(0.22)] / (np.max(np.abs(x_)) + 1e-12), 0.0, 0.08)
            put(y, pan(hp(x_, 250, 1), r.uniform(-0.9, 0.9)), tt_, lin(0.0 if tt_ == 0.0 else r.uniform(-12, 0)))
            tt_ += r.exponential(1.0 / (7 + 14 * np.sin(np.pi * min(u * 1.15, 1.0)) ** 2))
    ses.stem("rain_steps", fade(y + reverb(y, R["field"], -15.0)[:len(y)], 0.0, 0.3), 0.0, mode="rms", measure="onset")
    if singles:
        ses.stems["rain_steps"]["src"] = "recording (assembled in code)"
    ses.place("rain_steps", C(15, "His"), -12, key=True, note="light dry taps at random times, thickening and thinning like a shower")
    r = rng_for("bird2")
    ses.stem("bird_chirp", room(bird(r, 0), R["field"], -13.0, 0.35), 0.0)
    ses.place("bird_chirp", C(15, "never", off=0.15), -8, key=True, note="the bird on the chain did not even move")

    # ---------- forty perfect pushes ----------
    r = rng_for("bolt")
    t = taxis(0.9)
    bl = strike(modal_ir(0.9, [(3180, 0.22, 1.0), (4770, 0.15, 0.7), (6910, 0.09, 0.45), (8350, 0.05, 0.25)]), r, 0.25)[:len(t)]
    bl = bl / (np.max(np.abs(bl)) + 1e-12)
    bl += 0.5 * np.sin(TAU * np.cumsum(1900 + 2300 * np.exp(-t / 0.25)) / SR) * np.exp(-t / 0.12)   # it flies off
    bl[:nsamp(0.004)] += 0.6 * hp(r.standard_normal(nsamp(0.004)), 3000) * np.hanning(nsamp(0.004))
    ses.stem("bolt_ping", room(lp(bl, 9000, 1), R["gorge"], -12.0, 0.35), 0.0)
    ses.place("bolt_ping", C(16, "forty"), -5, key=True, note="a bolt lets go")
    r = rng_for("groan")
    y = creak(r, 1.05, [34, 30, 26, 22, 19], [(150, 18, 1.0), (290, 22, 0.9), (520, 25, 0.6), (880, 20, 0.35), (1500, 15, 0.15)], noise=0.1)
    t = taxis(1.05)
    y = y[:len(t)] * np.sin(np.pi * t / 1.05) ** 0.6
    for t0 in (0.2, 0.42, 0.55, 0.71, 0.8):
        put(y, metal_tick(r, r.uniform(0.5, 0.8), 0.05), t0, 0.12 * np.max(np.abs(y)))
    ses.stem("metal_groan", room(lp(y, 3500, 1), R["gorge"], -12.0, -0.2), 0.08)
    ses.place("metal_groan", C(16, "forty", off=0.06), -8, note="the links stretch")

    # ---------- the forty-first ----------
    r = rng_for("subdrop")
    d = max(0.5, min(2.2, t_bucks - g["t_drop"] + 0.25))
    t = taxis(d)
    ph = TAU * np.cumsum(30 + 85 * np.exp(-t / 0.28)) / SR
    sd = (np.sin(ph) + 0.3 * np.sin(2 * ph) * np.exp(-t / 0.2)) * (1 - np.exp(-t / 0.008)) * np.exp(-t / 0.55)
    ses.stem("slowmo_subdrop", fade(pan(sd, 0.0), 0.0, 0.12), 0.0)
    ses.place("slowmo_subdrop", C(17, "And", off=-0.17), -4, t=g["t_drop"], key=True, note="slow motion: a tone falling 115 -> 30 Hz in the hole the music left")
    r = rng_for("riser")
    d = max(0.25, min(0.75, t_bucks - t_cut - 0.1))
    m = nsamp(d)
    t = np.arange(m) / SR
    u = t / d
    rs = nbnoise(m, 200 * (9.0 ** u), 500, r) * u ** 2.5 + 0.3 * hp(r.standard_normal(m), 3000) * u ** 4
    ses.stem("riser_into_bucks", fade(pan(rs, 0.0), 0.0, 0.004), d, mode="rms", measure="none")
    ses.place("riser_into_bucks", C(17, "bucks"), -12, note="air sucked in, ends exactly on 'bucks'")

    r = rng_for("snap")
    sn = np.zeros((nsamp(2.4), 2))
    for i_, t0 in enumerate((0.0, 0.035, 0.085, 0.16, 0.27)):       # timber
        s_ = r.uniform(0.8, 1.3)
        ck = strike(modal_ir(0.12, [(520, 0.02, 1.0), (1180, 0.012, 0.8), (2300, 0.008, 0.6), (3900, 0.004, 0.4)], s_), r, 0.3)
        m = len(ck)
        ck += 0.5 * bp(r.standard_normal(m), 2000, 6000, 1) * np.exp(-np.arange(m) / SR / 0.012)
        put(sn, pan(ck, r.uniform(-0.5, 0.5)), t0, 1.0 if i_ == 0 else r.uniform(0.5, 0.8))
    tang = strike(modal_ir(1.6, [(640, .35, 1), (1010, .30, .8), (1690, .22, .6), (2480, .16, .45), (3620, .10, .3)]), r, 0.5)
    put(sn, pan(tang, -0.3), 0.02, 0.5)                              # a chain parts
    wh, wa = whoosh(r, 0.3, 0.4, 500, 3000, body=0.3)
    put(sn, pan_move(wh, -0.5, 0.6), 0.10, 0.5)                      # and whips
    t = taxis(1.6)
    boom = np.tanh(2.0 * np.sin(TAU * np.cumsum(30 + 50 * np.exp(-t / 0.07)) / SR) * np.exp(-t / 0.5)) / 2.0
    put(sn, pan(boom, 0.0), 0.0, 2.2)
    for _ in range(14):                                              # planks rain down
        t0 = r.uniform(0.3, 1.5)
        put(sn, pan(wood_knock(r, r.uniform(0.7, 1.6), 0.04), r.uniform(-0.7, 0.7)), t0, 0.35 * np.exp(-t0 / 0.8))
    snw = reverb(sn, R["gorge"], -10.0)
    full = np.zeros((len(snw), 2))
    full[:len(sn)] += sn
    full += snw
    ses.stem("bridge_snap", full, 0.0)
    ses.real("bridge_crack", C(17, "bucks"), 4, mode="peak20", featured=True, win=0.6,
             note="recorded timber crack layered over the synthetic boom")
    ses.place("bridge_snap", C(17, "bucks"), 7, featured=True, key=True, win=0.6, note="timber cracks, a chain parts and whips, sub boom, planks")

    r = rng_for("fall")
    d = max(0.4, t_end - sc.t(17, "throws") + 0.05)
    m = nsamp(d)
    t = np.arange(m) / SR
    u = t / d
    fw = np.zeros((m, 2))
    for i_, (fa, fb, dly, p_) in enumerate(((2300, 800, 0.0, -0.4), (2050, 700, 0.07, 0.3), (1800, 620, 0.15, 0.0))):
        uu = np.clip((t - dly) / max(d - dly, 0.1), 0, 1)
        f = fa * (fb / fa) ** (uu ** 1.6) * (1 + 0.01 * np.sin(TAU * (7 + i_) * t))
        v = (np.sin(TAU * np.cumsum(f) / SR) + 0.3 * nbnoise(m, f, 80, r)) * (t >= dly) * (1 - np.exp(-(t - dly).clip(0) / 0.05))
        fw += pan(v * (1.0 - 0.6 * uu), p_)
    rush = nbnoise(m, 1500 * (500 / 1500.0) ** u, 700, r) * np.sin(np.pi * np.clip(u * 1.2, 0, 1)) * 0.5
    fw += pan_move(rush, -0.3, 0.3)
    ses.stem("falling_whistle", fw + reverb(fw, R["gorge"], -12.0)[:m], 0.045, mode="rms", measure="onset")
    ses.place("falling_whistle", C(17, "throws"), -11, key=True, note="three falling whistles + air rush, into the gorge")

    r = rng_for("splashes")
    t_into, t_gorge = sc.t(17, "into"), sc.t(17, "gorge")
    for i_ in range(4):
        ses.stem("splash_small_%d" % i_, room(splash(rng_for("splash:s", i_), 0.3 + 0.08 * i_, 0.8), R["gorge"], -7.0,
                                              (-0.5, 0.4, -0.2, 0.6)[i_]), 0.0)
    span = max(0.1, t_end - t_into - 0.05)
    ks = max(6, int(round(span / 0.055)))
    for i_ in range(ks):
        tb = t_into + span * (i_ + r.uniform(0.0, 0.8)) / ks
        ses.place("splash_small_%d" % (i_ % 4), C(17, "into"), -13 + r.uniform(-3, 2), t=tb, beat=None,
                  note="one of many small splashes")
    ses.stem("splash_final", room(splash(rng_for("splash:final"), 1.0, 0.45), R["gorge"], -8.0, 0.0), 0.0)
    ses.place("splash_final", C(17, "gorge"), -4, key=True, note="the last one; everything stops with the word")

    # ---------- camera whooshes: every whip between shots and every crash push ----------
    # The list mirrors film.js (shots that carry in:/out: whips, from = the same cue words) and its rule:
    # a whip survives only if it comes at least 1 s after the previous one, counted from the hook's horizon shot.
    WHIPS = [C(2, "drum", off=0.12), C(2, "six"), C(2, "in"), C(3, "last"), C(4, "chain"), C(4, "gorge"), C(4, "cross"),
             C(4, "a", 3), C(5, "six"), C(5, "looking"), C(6, "the", 2), C(7, "finest"), C(7, "two"), C(8, "in"),
             C(9, "bounce"), C(9, "soldiers"), C(10, "stomp"), C(11, "bouncing"), C(12, "break"), C(14, "landing", off=-0.1),
             C(15, "so"), C(15, "never"), C(16, "forty"), C(17, "into")]
    for i_ in range(4):
        y, a = whoosh(rng_for("camwhoosh", i_), 0.30 + 0.03 * i_, 0.4, 420 + 60 * i_, 2600, body=0.25, air=0.2)
        ses.stem("cam_whoosh_%d" % i_, pan_move(y, -0.5 if i_ % 2 == 0 else 0.5, 0.5 if i_ % 2 == 0 else -0.5), a, measure="peak")
    y, a = whoosh(rng_for("campush"), 0.45, 0.4, 260, 1700, body=0.5, air=0.15)
    ses.stem("cam_push", pan(y, 0.0), a, measure="peak")
    last, nw = sc.t(1, "river") + 0.12 + 0.62, 0
    for cue in WHIPS:
        tw_ = sc.at(cue)
        if tw_ - last < 1.0:
            continue
        last = tw_
        ses.place("cam_whoosh_%d" % (nw % 4), cue, LV_FX["whip"], key=(nw == 0), win=0.2, note="whip between shots")
        nw += 1
    ses.place("cam_push", C(6, "That's"), LV_FX["push"], note="through the spyglass lens")
    ses.place("cam_push", C(12, "You", off=-0.02), LV_FX["push"], note="crash push onto the sign")
    ses.place("cam_push", C(17, "bucks", off=-0.03), LV_FX["push"] + 1, note="the buck: air before the crack")


# =====================================================================================
def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("words")
    ap.add_argument("outdir")
    ap.add_argument("--narration", help="default: narration.txt next to this script's parent folder or next to words.json")
    a = ap.parse_args(argv)

    words = json.load(open(a.words, encoding="utf-8"))
    cand = [a.narration] if a.narration else [Path(__file__).resolve().parent.parent / "narration.txt",
                                              Path(a.words).resolve().parent / "narration.txt"]
    nar = next((Path(c) for c in cand if c and Path(c).exists()), None)
    if nar is None:
        sys.exit("narration.txt not found; pass --narration")
    sc = Script(words, nar.read_text(encoding="utf-8"))
    out = Path(a.outdir)
    (out / "stems").mkdir(parents=True, exist_ok=True)
    ses = Session(sc, out)

    music, parts = build_music(sc, ses)
    build_sfx(sc, ses)

    n = ses.n
    sfx = fade(ses.sfx[:n], 0.0, 0.004)                     # hard stop at the end of the last word
    music_f = soft_limit(music * lin(FILE_TRIM))
    sfx_f = soft_limit(sfx * lin(FILE_TRIM))
    write_wav(out / "music.wav", music_f)
    write_wav(out / "sfx.wav", sfx_f)
    for name, st in ses.stems.items():
        write_wav(out / "stems" / (name + ".wav"), st["audio"])
    for name, y in parts.items():
        write_wav(out / "stems" / ("mus_%s.wav" % name), soft_limit(y * lin(FILE_TRIM)))

    g = ses.g
    meta = {
        "version": 1,
        "words": str(a.words), "narration": str(nar), "sentences": sc.nsent, "unmatched_narration_words": sc.unmatched,
        "duration": round(sc.t_end, 4), "sample_rate": SR, "seed": SEED,
        "tempo": {"beat_period_s": round(g["P"], 5), "bpm": round(60.0 / g["P"], 2), "from": "sentence 8: Left, right, left, right",
                  "step_times": [round(x, 4) for x in g["steps"]],
                  "bridge_beats": [round(x, 4) for x in g["B_post"]], "final_beats": [round(x, 4) for x in g["F"]],
                  "swing_beats": [round(x, 4) for x in g["swing"]]},
        "mix": {"voice_ref_rms_db": V_REF, "music_trim_db": -FILE_TRIM, "sfx_trim_db": -FILE_TRIM,
                "duck_music_db": DUCK_MUSIC, "duck_sfx_db": DUCK_SFX,
                "note": "levels are dB re the voice's active RMS; featured cues are exempt from ducking for `window` seconds"},
        "character_lines": [                               # quoted lines in the characters' own voices: mix.py ducks deeper here
            {"sentence": 2, "who": "colonel", "t0": round(sc.t(2, "That"), 4), "t1": round(sc.end(2), 4)},
            {"sentence": 6, "who": "general", "t0": round(sc.t(6, "That's"), 4), "t1": round(sc.end(6), 4)}],
        "duck_lines": {"music_db": DUCK_LINE_MUSIC, "sfx_db": DUCK_LINE_SFX},
        "music_sources": getattr(ses, "music_src", {}),
        "stem_sources": {k_: v_["src"] for k_, v_ in ses.stems.items()},
        "music_levels_re_voice_db": LV,
        "cues": sorted(ses.cues, key=lambda c: (c["time"], c["id"])),
    }
    json.dump(meta, open(out / "cues.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("tempo: beat %.1f ms = %.1f bpm | duration %.3f s | %d cues (%d sfx placements, %d stems) | unmatched words: %d"
          % (1000 * g["P"], 60.0 / g["P"], sc.t_end, len(ses.cues), sum(1 for c in ses.cues if c["track"] == "sfx"),
             len(ses.stems), sc.unmatched))
    print("music.wav peak %.1f dBFS rms %.1f | sfx.wav peak %.1f dBFS rms %.1f"
          % (dbv(np.max(np.abs(music_f))), dbv(rms(music_f)), dbv(np.max(np.abs(sfx_f))), dbv(rms(sfx_f))))


if __name__ == "__main__":
    main()
