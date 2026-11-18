# -*- coding: utf-8 -*-
"""5. Проверка детектора SFX «на слух и на глаз»: случайные события → клипы остатка → earshot describe + кадр.

python 05_validate_sfx.py <thr> [n=25] [seed=7]
- выбирает n случайных событий (стратифицировано по классам) из tmp/sfx_res.json;
- режет клип no_vocals [t−0.25, t+1.0] с → tmp/val/ev_XX.wav, описывает earshot (одна загрузка моделей);
- кадры video_1080.webm в t−0.1 и t+0.15 → лист tmp/val/sheet_*.jpg для просмотра;
- пишет tmp/val/validate.json (класс детектора, теги earshot, AST, время, контраст).
Запускать питоном earshot (.venv).
"""
import random
import subprocess
import warnings

import soundfile as sf

from common import *

warnings.filterwarnings("ignore")
thr = sys.argv[1] if len(sys.argv) > 1 else "10.0"
n = int(sys.argv[2]) if len(sys.argv) > 2 else 25
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
VAL = os.path.join(TMP, "val")
os.makedirs(VAL, exist_ok=True)
ev = json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))["by_thr"][thr]["events"]
random.seed(seed)
bycls = {}
for k, e in enumerate(ev):
    bycls.setdefault(e["cls"], []).append(k)
pick = []
# по 2 из каждого класса (если есть), остальное — случайно по всем
for c, ks in sorted(bycls.items()):
    pick += random.sample(ks, min(2, len(ks)))
rest = [k for k in range(len(ev)) if k not in pick]
pick += random.sample(rest, max(0, n - len(pick)))
pick = sorted(pick[:max(n, len(pick))])

x = load_wav(RES_WAV)
from earshot.describe import describe  # noqa: E402

out = []
for j, k in enumerate(pick):
    e = ev[k]
    a, b = max(0, e["t"] - 0.25), e["t"] + 1.0
    p = os.path.join(VAL, f"ev_{j:02d}.wav")
    sf.write(p, x[int(a * SR):int(b * SR)], SR, subtype="FLOAT")
    r = describe(p, start=0.15, end=1.25 if e["dur_ms"] > 500 else 0.75)
    tags = [(t["term"], round(t["z"], 2)) for t in r.get("top_tags", [])[:4]]
    out.append({"j": j, "t": e["t"], "mmss": mmss(e["t"]), "cls": e["cls"], "contrast_db": e["contrast_db"],
                "peak_lufs20": e["peak_lufs20"], "dur_ms": e["dur_ms"], "rise_ms": e["rise_ms"],
                "flat": e["flat"], "harm": e["harm"], "cent_hz": e["cent_hz"],
                "earshot_tags": tags, "audioset": [(d["label"], d["p"]) for d in r.get("audioset", [])[:3]],
                "shape": r.get("shape")})
    print(j, mmss(e["t"]), e["cls"], e["contrast_db"], tags[:2], out[-1]["audioset"][:2], flush=True)
json.dump(out, open(os.path.join(VAL, "validate.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# листы кадров: на событие два кадра (до и после)
py = sys.executable
for s in range(0, len(out), 8):
    ts = []
    for o in out[s:s + 8]:
        ts += [o["t"] - 0.1, o["t"] + 0.15]
    subprocess.run([py, os.path.join(HERE, "frames.py"), os.path.join(VAL, f"sheet_{s // 8}.jpg"),
                    *[f"{t:.3f}" for t in ts], "--w", "320", "--cols", "4"], check=True)
print("done")
