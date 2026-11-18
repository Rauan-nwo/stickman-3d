# -*- coding: utf-8 -*-
"""8. Покадровый разбор первых 120 с: события картинки (склейки, рывки, появления, чёрные карточки) + SFX.

python 08_first120.py <thr> [t0=0] [t1=120] [tag=first120]
→ tmp/<tag>.json (строки таблицы) и tmp/frames/<tag>_N.jpg (кадр в момент каждого SFX + 0.1 с) для просмотра.
Уровень SFX против голоса: пик события (K, окно 20 мс) − медианный уровень голоса (vocals, K 400 мс) в ±2 с.
"""
import subprocess

from common import *

thr = sys.argv[1] if len(sys.argv) > 1 else "10.0"
T0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
T1 = float(sys.argv[3]) if len(sys.argv) > 3 else 120.0
TAG = sys.argv[4] if len(sys.argv) > 4 else "first120"
ev = [e for e in json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))["by_thr"][thr]["events"]
      if T0 <= e["t"] < T1]
J = json.load(open(os.path.join(DYN, "comp_shots.json"), encoding="utf-8"))
F = json.load(open(FINAL_JSON, encoding="utf-8"))["res"]["comp"]
cuts = [(t["t"], "cut-" + t["type"]) for t in J["trans"] if T0 <= t["t"] < T1]
snaps = [(s[0], "snap-" + s[1]) for s in F["snaps"] if T0 <= s[0] < T1]
pops = [(p, "pop") for p in F["pops"] if T0 <= p < T1] + [(p, "flash") for p in F["flashes"] if T0 <= p < T1]
dz = np.load(os.path.join(DYN, "comp.npz"))
bl = dz["luma"] < 6
cards = [(a / FPS, b / FPS) for a, b in runs(bl) if b - a >= 9 and T0 <= a / FPS < T1]
Z = np.load(os.path.join(TMP, "blocks.npz"))
sp = np.load(os.path.join(TMP, "vad.npz"))["speech"]
lu = lambda p: -0.691 + pw_db(p)
pic = sorted(cuts + snaps + pops + [(a, "card-in") for a, b in cards] + [(b, "card-out") for a, b in cards])


def voice_level(t):
    a, b = int((t - 2) / 0.01), int((t + 2) / 0.01)
    m = sp[a:b]
    if m.sum() < 40:
        return None
    return float(lu(Z["voc_k"][a:b][m].mean()))


rows = []
for e in ev:
    v = voice_level(e["t"])
    insp = bool(sp[int(e["t"] / 0.01)])
    near = [(round((p - e["t"]) * 1000), k) for p, k in pic if abs(p - e["t"]) <= 0.25]
    rows.append({"t": e["t"], "mmss": mmss(e["t"]), "cls": e["cls"], "contrast_db": e["contrast_db"],
                 "peak_lufs20": e["peak_lufs20"], "dur_ms": e["dur_ms"],
                 "minus_voice_LU": None if v is None else round(e["peak_lufs20"] - v, 1),
                 "during_speech": insp, "picture_events_pm250ms": near})
# события картинки без SFX рядом
on = np.array([e["t"] for e in ev]) if ev else np.zeros(0)
silent = [(round(p, 2), k) for p, k in pic if not len(on) or np.min(np.abs(on - p)) > 0.15]
out = {"thr": thr, "range": [T0, T1], "rows": rows, "picture_events_without_sfx_150ms": silent,
       "counts": {"sfx": len(ev), "cuts": len(cuts), "snaps": len(snaps), "pops": len(pops), "cards": len(cards)}}
json.dump(out, open(os.path.join(TMP, f"{TAG}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for r in rows:
    print(r["mmss"], r["cls"], r["contrast_db"], r["minus_voice_LU"], r["dur_ms"], r["picture_events_pm250ms"])
print("без SFX:", silent)
os.makedirs(os.path.join(TMP, "frames"), exist_ok=True)
ts = [r["t"] + 0.1 for r in rows]
for s in range(0, len(ts), 16):
    subprocess.run([sys.executable, os.path.join(HERE, "frames.py"), os.path.join(TMP, "frames", f"{TAG}_{s // 16}.jpg"),
                    *[f"{t:.3f}" for t in ts[s:s + 16]], "--w", "400", "--cols", "4"], check=True)
