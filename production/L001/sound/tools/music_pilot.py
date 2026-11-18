# Пилот музыки под картинку: ставит куски треков на время фильма по сильным долям, приглушает под голосом,
# сводит с голосом аниматика и меряет стыки (скачок громкости, как в правиле скилла soundtrack: > +6 дБ = испуг).
# Запуск: python -I music_pilot.py <placements.json> <music_dir> <voice_film_time.wav> <out.wav> [film_end_s]
# placements.json: [{"track": id, "src_in": s, "film_in": s, "film_out": s, "fade_in": s, "fade_out": s,
#                    "gain_db": dB, "snap": true}]
import sys, json, pathlib
import numpy as np
import soundfile as sf
import librosa
import pyloudnorm as pyln
from pedalboard import Pedalboard, PeakFilter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
pl_path, mdir, voice_path, out_path = map(pathlib.Path, sys.argv[1:5])
film_end = float(sys.argv[5]) if len(sys.argv) > 5 else None
SR = 48000
pls = json.loads(pl_path.read_text(encoding="utf-8"))
vi = sf.info(str(voice_path))
end = film_end or max(p["film_out"] + p.get("fade_out", 0) for p in pls) + 1.0
voice, vsr = sf.read(str(voice_path), frames=int(end * vi.samplerate), always_2d=True)
voice = librosa.resample(voice.mean(axis=1).astype(np.float32), orig_sr=vsr, target_sr=SR)
N = int(end * SR)
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
music = np.zeros((N, 2), np.float32)
report = []
for p in pls:
    a = json.loads((mdir / "analysis" / f"{p['track']}.json").read_text(encoding="utf-8"))
    src_in = p["src_in"]
    if p.get("snap", True) and a.get("downbeats_s"):
        db = np.array(a["downbeats_s"])
        src_in = float(db[np.argmin(np.abs(db - src_in))])
    f = next((mdir / "candidates").glob(p["track"] + ".*"))
    x, sr = sf.read(str(f), always_2d=True)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    x = librosa.resample(x.T.astype(np.float32), orig_sr=sr, target_sr=SR).T
    fi, fo = p["film_in"], p["film_out"]
    fade_out = p.get("fade_out", 0.0)
    L = int((fo - fi + fade_out) * SR)
    s0 = int(src_in * SR)
    seg = x[s0:s0 + L].copy()
    seg = np.pad(seg, ((0, L - len(seg)), (0, 0)))
    env = np.ones(L, np.float32)
    nin = int(p.get("fade_in", 0.0) * SR)
    if nin:
        env[:nin] = np.linspace(0, 1, nin) ** 2
    nout = int(fade_out * SR)
    if nout:
        env[-nout:] = np.linspace(1, 0, nout) ** 2
    seg *= env[:, None] * (10 ** (p.get("gain_db", 0.0) / 20))
    o0 = int(fi * SR)
    music[o0:o0 + L] += seg[:max(0, min(L, N - o0))]
    bars = []
    if a.get("downbeats_s"):
        bars = [round(fi + (t - src_in), 3) for t in a["downbeats_s"] if src_in - 1e-3 <= t <= src_in + (fo - fi)]
    report.append({"track": p["track"], "src_in_snapped": round(src_in, 3), "src_out": round(src_in + fo - fi, 3),
                   "film_in": fi, "film_out": fo, "bar_s": a.get("bar_s"), "film_downbeats": bars})

# EQ: провал 1–4 кГц у музыки, чтобы не спорить с голосом
board = Pedalboard([PeakFilter(cutoff_frequency_hz=2500, gain_db=-4.0, q=0.8)])
music = board(music.T.copy(), SR).T
# приглушение под голосом: огибающая голоса (атака 30 мс, спад 350 мс), до -8 дБ
hop = 480
vr = np.sqrt(np.convolve(voice ** 2, np.ones(hop) / hop, mode="same"))[::hop]
vdb = 20 * np.log10(vr + 1e-9)
active = (vdb > vdb.max() - 35).astype(np.float32)
g = np.zeros_like(active)
for i in range(1, len(active)):
    k = 0.6 if active[i] > g[i - 1] else 0.03  # атака ~30 мс, спад ~350 мс при шаге 10 мс
    g[i] = g[i - 1] + k * (active[i] - g[i - 1])
duck_db = -8.0 * g
duck = np.repeat(10 ** (duck_db / 20), hop)[:N]
duck = np.pad(duck, (0, N - len(duck)), constant_values=1.0)
music_d = music * duck[:, None]
meter = pyln.Meter(SR)
mix = music_d + voice[:, None]
I_mix = meter.integrated_loudness(mix)
mix *= 10 ** ((-16.0 - I_mix) / 20)  # к -16 LUFS для прослушивания
peak = np.abs(mix).max()
if peak > 0.98:
    mix *= 0.98 / peak
out_path.parent.mkdir(parents=True, exist_ok=True)
sf.write(str(out_path), mix, SR, subtype="PCM_16")
sf.write(str(out_path.with_name(out_path.stem + "_music.wav")), music_d, SR, subtype="PCM_16")


def lufs(sig, t0, t1):
    a, b = int(max(0, t0) * SR), int(min(end, t1) * SR)
    try:
        return round(meter.integrated_loudness(sig[a:b]), 1)
    except Exception:
        return None


# стыки: громкость музыки за 1 с до и 1 с после точки (без голоса — честный «скачок»)
checks = []
for p in pls:
    for t in (p["film_in"], p["film_out"]):
        if 1.0 < t < end - 1.0:
            before, after = lufs(music_d, t - 1.0, t), lufs(music_d, t, t + 1.0)
            jump = round(after - before, 1) if before is not None and after is not None and np.isfinite(before) and np.isfinite(after) else None
            # что слышит зритель: смесь с голосом, 1 с после точки против последних 4 с (как в sync-check)
            m_after, m_before4 = lufs(mix, t, t + 1.0), lufs(mix, t - 4.0, t)
            mjump = round(m_after - m_before4, 1) if m_after is not None and m_before4 is not None and np.isfinite(m_after) and np.isfinite(m_before4) else None
            checks.append({"t": t, "music_before_LUFS": before, "music_after_LUFS": after, "music_jump_dB": jump,
                           "mix_jump_vs_last4s_dB": mjump, "startle": bool(mjump is not None and mjump > 6)})
# громкость музыки под голосом и без голоса
v_on = np.repeat(g > 0.5, hop)[:N]
v_on = np.pad(v_on, (0, N - len(v_on)))
res = {
    "placements": report, "joins": checks,
    "mix_integrated_LUFS_before_norm": round(I_mix, 1),
    "voice_LUFS": lufs(voice[:, None], 0, end),
    "music_LUFS_whole": lufs(music_d, 0, end),
    "music_under_voice_LUFS": round(meter.integrated_loudness(music_d[v_on]), 1) if v_on.sum() > SR else None,
    "music_no_voice_LUFS": round(meter.integrated_loudness(music_d[~v_on]), 1) if (~v_on).sum() > SR else None,
    "out": str(out_path),
}
print(json.dumps(res, ensure_ascii=False, indent=1))
