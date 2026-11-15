#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mix.py <voice.mp3|wav> <words.json> <out.wav> [--audio-dir DIR] [--music-db X] [--sfx-db X] [--no-m4a]

Voice + music.wav + sfx.wav (made by make_audio.py from the SAME words.json) -> one stereo file.

  1. voice: 70 Hz high-pass, levelled to a fixed active RMS, compressed (dense, like the channel's reference)
  2. music is ducked under the voice, sidechain style but with look-ahead: the attack finishes just BEFORE
     each phrase starts, the release runs in the gaps. The key is the word timings OR-ed with the voice's own
     envelope, so a slightly-off words.json cannot leave music on top of speech.
  3. effects are ducked a little; cues marked "featured" in cues.json (music hits too) are not ducked at all
  4. look-ahead limiter so that -14 LUFS fits under -1.5 dBTP without loudnorm having to pump
  5. ffmpeg loudnorm, two passes, linear: -14 LUFS / -1.5 dBTP  ->  <out.wav> (44.1 kHz, 24 bit)
     and <out>.m4a (AAC 192k) + <out>.report.json

Needs numpy, scipy, ffmpeg.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_audio import SR, lin, dbv, read_wav, write_wav, fade  # noqa: E402

TARGET_I, TARGET_TP, TARGET_LRA = -14.0, -1.5, 7.0
ATTACK, RELEASE, PRE, HOLD, MIN_GAP = 0.04, 0.08, 0.01, 0.01, 0.12


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-f", "f32le", "-acodec", "pcm_f32le",
                          "-ac", "1", "-ar", str(SR), "pipe:1"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


def ebur128(x):
    """Integrated loudness / LRA / true peak of a float stereo array, measured by ffmpeg's ebur128."""
    raw = np.ascontiguousarray(x, dtype="<f4").tobytes()
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0",
                          "-af", "ebur128=peak=true", "-f", "null", "-"], input=raw, capture_output=True).stderr.decode("utf-8", "replace")
    tail = err[err.rfind("Summary:"):]
    g = lambda pat: float(re.search(pat, tail).group(1))
    return {"I": g(r"I:\s+(-?[\d.]+) LUFS"), "LRA": g(r"LRA:\s+(-?[\d.]+) LU"), "TP": g(r"Peak:\s+(-?[\d.]+) dBFS")}


def phrases(words, voice, act_rms_db, min_gap=MIN_GAP):
    """Speech intervals: word timings OR the voice's own envelope; pauses shorter than min_gap are bridged."""
    n = len(voice)
    act = np.zeros(n, dtype=bool)
    for w in words:
        act[max(0, int(float(w["start"]) * SR)):min(n, int(float(w["end"]) * SR) + 1)] = True
    hop = 441
    nb = n // hop
    e = np.sqrt(np.mean(voice[:nb * hop].reshape(nb, hop) ** 2, axis=1))
    env = np.repeat(dbv(e) > act_rms_db - 32.0, hop)
    act[:len(env)] |= env
    d = np.diff(np.concatenate([[0], act.astype(np.int8), [0]]))
    a, b = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
    out = []
    for s, e_ in zip(a / SR, b / SR):
        if out and s - out[-1][1] < min_gap:
            out[-1][1] = e_
        else:
            out.append([s, e_])
    return out


def duck_curve(n, phr, depth_db, attack=ATTACK, release=RELEASE, pre=PRE, hold=HOLD):
    """dB curve: 0 in the gaps, depth under speech. Raised-cosine attack that ENDS `pre` s before the phrase,
    raised-cosine release that starts `hold` s after it."""
    g = np.zeros(n)
    for a, b in phr:
        t0, t1, t2, t3 = a - pre - attack, a - pre, b + hold, b + hold + release
        i0, i3 = max(0, int(t0 * SR)), min(n, int(t3 * SR))
        t = np.arange(i0, i3) / SR
        seg = np.where(t < t1, depth_db * (0.5 - 0.5 * np.cos(np.pi * (t - t0) / attack)),
                       np.where(t <= t2, depth_db, depth_db * (0.5 + 0.5 * np.cos(np.pi * (t - t2) / release))))
        g[i0:i3] = np.minimum(g[i0:i3], seg)
    return g


def exempt(n, cues, track):
    """0..1 curve: 1 where a featured cue of this track must not be ducked."""
    e = np.zeros(n)
    r = int(0.03 * SR)
    for c in cues:
        if c["track"] != track or not c.get("featured"):
            continue
        i0, i1 = int((c["time"] - 0.03) * SR), int((c["time"] + c.get("window", 0.4)) * SR)
        i0, i1 = max(r, i0), min(n - r, i1)
        if i1 <= i0:
            continue
        e[i0:i1] = 1.0
        e[i0 - r:i0] = np.maximum(e[i0 - r:i0], np.linspace(0, 1, r))
        e[i1:i1 + r] = np.maximum(e[i1:i1 + r], np.linspace(1, 0, r))
    return e


def compressor(x, thr_db, ratio, att_ms=2.0, rel_ms=70.0, knee_db=6.0, look_ms=1.5):
    """Feed-forward peak compressor at a 0.7 ms control rate (soft knee, look-ahead)."""
    B = 32
    nb = len(x) // B
    pk = np.max(np.abs(x[:nb * B]).reshape(nb, B), axis=1)
    over = dbv(pk) - thr_db
    s = 1.0 - 1.0 / ratio
    gr = np.where(over <= -knee_db / 2, 0.0, np.where(over >= knee_db / 2, s * over, s * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    aa, ar = np.exp(-B / SR / (att_ms / 1000.0)), np.exp(-B / SR / (rel_ms / 1000.0))
    out = np.empty(nb)
    g = 0.0
    for i in range(nb):
        c = aa if gr[i] > g else ar
        g = c * g + (1 - c) * gr[i]
        out[i] = g
    pos = (np.arange(nb) + 0.5) * B - look_ms / 1000.0 * SR
    return x * lin(-np.interp(np.arange(len(x)), pos, out)), float(out.max())


def limiter(x, ceil_db, look_ms=3.0, rel_db_per_s=150.0):
    """Stereo-linked brick-wall limiter: required gain -> min over a look-ahead window -> release limited in
    dB/s -> smoothed. The smoothed gain can never exceed the required gain, so nothing passes the ceiling."""
    c = lin(ceil_db)
    req = np.minimum(1.0, c / np.maximum(np.max(np.abs(x), axis=1), 1e-12))
    B = 16
    W = int(look_ms / 1000.0 * SR) | 1
    m = minimum_filter1d(req, size=W + 2 * B, mode="nearest")
    nb = len(m) // B + 1
    mb = np.pad(m, (0, nb * B - len(m)), constant_values=1.0).reshape(nb, B).min(axis=1)
    mdb = 20 * np.log10(mb)
    step = rel_db_per_s * B / SR
    fwd = np.empty(nb)
    g = 0.0
    for i in range(nb):
        g = min(mdb[i], g + step)
        fwd[i] = g
    gs = np.repeat(lin(fwd), B)[:len(m)]
    gs = minimum_filter1d(gs, size=W, mode="nearest")
    h = np.hanning(W + 2)[1:-1]
    gs = np.convolve(np.pad(gs, W // 2, mode="edge"), h / h.sum(), mode="valid")
    y = x * gs[:, None]
    return np.clip(y, -c, c), float(-20 * np.log10(gs.min()))


def m4a_meter(m4a):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(m4a), "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"],
                         capture_output=True, check=True).stdout
    return ebur128(np.frombuffer(raw, dtype="<f4").reshape(-1, 2))


def master_once(pre, m0, out, tp_goal, no_m4a):
    """Gain to -14 LUFS, limit, loudnorm (two passes, linear) -> out; AAC next to it. Returns the meters."""
    gain, ceil = TARGET_I - m0["I"], tp_goal - 0.15
    for _ in range(6):
        y, lim_gr = limiter(pre * lin(gain), ceil)
        m1 = ebur128(y)
        if abs(m1["I"] - TARGET_I) <= 0.05 and m1["TP"] <= tp_goal - 0.05:
            break
        gain += TARGET_I - m1["I"]
        if m1["TP"] > tp_goal - 0.05:
            ceil -= (m1["TP"] - (tp_goal - 0.1))
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "premaster.wav"
        write_wav(tmp, y)
        spec = "loudnorm=I=%g:TP=%g:LRA=%g" % (TARGET_I, tp_goal, TARGET_LRA)
        err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(tmp), "-af", spec + ":print_format=json",
                              "-f", "null", "-"], capture_output=True, text=True).stderr
        p1 = json.loads(err[err.rindex("{"):err.rindex("}") + 1])
        spec2 = (spec + ":measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true:print_format=json"
                 % (p1["input_i"], p1["input_tp"], p1["input_lra"], p1["input_thresh"], p1["target_offset"]))
        err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", "-i", str(tmp), "-af", spec2, "-ar", str(SR),
                              "-c:a", "pcm_s24le", str(out)], capture_output=True, text=True).stderr
        p2 = json.loads(err[err.rindex("{"):err.rindex("}") + 1])
    final = ebur128(read_wav(out))
    m4a_tp = None
    if not no_m4a:
        m4a = out.with_suffix(".m4a")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(out), "-c:a", "aac", "-b:a", "192k",
                        "-ar", str(SR), "-ac", "2", "-movflags", "+faststart", str(m4a)], check=True)
        m4a_tp = m4a_meter(m4a)["TP"]
    return final, (gain, ceil, lim_gr, m1, p1, p2), m4a_tp


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("voice")
    ap.add_argument("words")
    ap.add_argument("out")
    ap.add_argument("--audio-dir", default=str(HERE), help="folder with music.wav, sfx.wav, cues.json (default: next to mix.py)")
    ap.add_argument("--music-db", type=float, default=0.0, help="extra gain on the music")
    ap.add_argument("--sfx-db", type=float, default=0.0, help="extra gain on the effects")
    ap.add_argument("--no-m4a", action="store_true")
    ap.add_argument("--tp", type=float, default=TARGET_TP, help="true-peak target of the WAV master (default -1.5); "
                    "use a lower one when another encoder (the film's AAC track) overshoots more than the .m4a made here")
    ap.add_argument("--stems", help="folder for the three layers as they enter the master (voice / music / sfx after "
                                    "ducking, before gain and limiter): for listening checks and masking measurements")
    a = ap.parse_args(argv)

    A = Path(a.audio_dir)
    meta = json.load(open(A / "cues.json", encoding="utf-8"))
    mx = meta["mix"]
    words = json.load(open(a.words, encoding="utf-8"))
    t_end = max(float(w["end"]) for w in words)
    if abs(t_end - meta["duration"]) > 0.02:
        sys.exit("cues.json was made for a %.3f s voice, this words.json ends at %.3f s: run make_audio.py first"
                 % (meta["duration"], t_end))

    n = int(round((t_end + 0.05) * SR))                     # the mix ends with the last word (+50 ms for its tail)
    v = decode(a.voice)
    v = np.pad(v, (0, max(0, n - len(v))))[:n]
    v = signal.sosfilt(signal.butter(2, 70.0, "high", fs=SR, output="sos"), v)

    act = np.zeros(n, dtype=bool)
    for w in words:
        act[max(0, int(float(w["start"]) * SR)):min(n, int(float(w["end"]) * SR) + 1)] = True
    arms = lambda s: float(dbv(np.sqrt(np.mean(s[act] ** 2))))
    vref = mx["voice_ref_rms_db"]
    raw_rms, raw_peak = arms(v), float(dbv(np.max(np.abs(v))))
    v *= lin(vref - raw_rms)
    v, gr_max = compressor(v, thr_db=vref + 7.0, ratio=4.0)
    v *= lin(vref - arms(v))
    v = fade(v, 0.0, 0.03)
    voice_crest = float(dbv(np.max(np.abs(v)))) - vref

    def bed(name, trim):
        x = read_wav(A / name) * lin(trim)
        return np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]

    music = bed("music.wav", mx["music_trim_db"] + a.music_db)
    sfx = bed("sfx.wav", mx["sfx_trim_db"] + a.sfx_db)

    phr = phrases(words, v, vref)
    dm = duck_curve(n, phr, mx["duck_music_db"]) * (1.0 - exempt(n, meta["cues"], "music"))
    ds = duck_curve(n, phr, mx["duck_sfx_db"]) * (1.0 - exempt(n, meta["cues"], "sfx"))
    # character lines (the colonel's shout, the general's line): everything else goes further down, and the
    # "featured" exemption does not apply inside them
    lines = [[c["t0"], c["t1"]] for c in meta.get("character_lines", [])]
    if lines:
        dl = meta.get("duck_lines", {"music_db": -12.0, "sfx_db": -8.0})
        dm = np.minimum(dm, duck_curve(n, lines, dl["music_db"], attack=0.06, release=0.15))
        ds = np.minimum(ds, duck_curve(n, lines, dl["sfx_db"], attack=0.06, release=0.15))
    mus_d, sfx_d = music * lin(dm)[:, None], sfx * lin(ds)[:, None]
    pre = np.stack([v, v], axis=1) + mus_d + sfx_d
    if a.stems:
        sd = Path(a.stems)
        sd.mkdir(parents=True, exist_ok=True)
        write_wav(sd / "voice.wav", np.stack([v, v], axis=1))
        write_wav(sd / "music_ducked.wav", mus_d)
        write_wav(sd / "sfx_ducked.wav", sfx_d)
        write_wav(sd / "bed_ducked.wav", mus_d + sfx_d)

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    m0 = ebur128(pre)
    tp_goal, tries = a.tp, []
    for attempt in range(5):
        final, rep_m, m4a_tp = master_once(pre, m0, out, tp_goal, a.no_m4a)
        tries.append({"wav_tp_target": round(tp_goal, 2), "wav_tp": final["TP"], "m4a_tp": m4a_tp})
        if m4a_tp is None or m4a_tp <= TARGET_TP - 0.1:      # the meter prints 0.1 dB steps: keep a step of margin
            break
        tp_goal -= (m4a_tp - TARGET_TP) + 0.1              # the AAC encoder overshoots: master lower and encode again
    gain, ceil, lim_gr, m1, p1, p2 = rep_m
    rep = {
        "voice": {"file": str(a.voice), "raw_active_rms_db": round(raw_rms, 1), "raw_peak_db": round(raw_peak, 1),
                  "compressor_max_gr_db": round(gr_max, 1), "crest_after_db": round(voice_crest, 1)},
        "ducking": {"music_db": mx["duck_music_db"], "sfx_db": mx["duck_sfx_db"], "attack_s": ATTACK, "release_s": RELEASE,
                    "attack_ends_before_phrase_s": PRE, "hold_s": HOLD, "min_gap_s": MIN_GAP, "phrases": len(phr),
                    "featured_exempt": sum(1 for c in meta["cues"] if c.get("featured"))},
        "premaster": m0, "master_gain_db": round(gain, 2), "limiter_ceiling_db": round(ceil, 2), "limiter_max_gr_db": round(lim_gr, 1),
        "after_limiter": m1,
        "loudnorm_pass1": p1, "loudnorm_pass2_type": p2.get("normalization_type"),
        "final_wav": final, "duration_s": round(n / SR, 3),
    }
    rep["true_peak_attempts"] = tries
    rep["character_lines"] = meta.get("character_lines", [])
    if not a.no_m4a:
        rep["final_m4a"] = m4a_meter(out.with_suffix(".m4a"))
    json.dump(rep, open(out.with_suffix(".report.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("voice: active RMS %.1f dBFS, peak %.1f -> compressed (max GR %.1f dB), crest %.1f dB"
          % (raw_rms, raw_peak, gr_max, voice_crest))
    print("premaster %.1f LUFS -> gain %+.1f dB, limiter ceiling %.2f dBFS, max GR %.1f dB"
          % (m0["I"], gain, ceil, lim_gr))
    print("loudnorm pass 2: %s" % p2.get("normalization_type"))
    print("FINAL %s: %.1f LUFS, LRA %.1f, true peak %.1f dBFS" % (out.name, final["I"], final["LRA"], final["TP"])
          + ("" if a.no_m4a else " | m4a: %.1f LUFS, LRA %.1f, TP %.1f" % (rep["final_m4a"]["I"], rep["final_m4a"]["LRA"], rep["final_m4a"]["TP"])))


if __name__ == "__main__":
    main()
