# -*- coding: utf-8 -*-
"""5c. Слепая проверка «на глаз»: случайные события SFX вперемешку со случайными моментами.

python 05c_blind_check.py <thr> [n_ev=20] [n_rand=10] [seed=11]
Для каждого пункта — пара кадров (t−0.15 с, t+0.20 с) с подписью только номером (#k). Глазами отмечается,
есть ли в паре видимое событие (появление, штамп, текст, свет, рывок, склейка). Ключ (какой номер — SFX,
какой — случайный момент) пишется в tmp/blind/key.json и открывается только после разметки.
"""
import random
import subprocess
import tempfile

from PIL import Image, ImageDraw

from common import *

thr = sys.argv[1] if len(sys.argv) > 1 else "10.0"
n_ev = int(sys.argv[2]) if len(sys.argv) > 2 else 20
n_rand = int(sys.argv[3]) if len(sys.argv) > 3 else 10
seed = int(sys.argv[4]) if len(sys.argv) > 4 else 11
OUT = os.path.join(TMP, "blind")
os.makedirs(OUT, exist_ok=True)
ev = [e for e in json.load(open(os.path.join(TMP, "sfx_res.json"), encoding="utf-8"))["by_thr"][thr]["events"]
      if e["cls"] != "music" and 3 < e["t"] < 1185]
random.seed(seed)
items = [("sfx", e["t"], e["cls"]) for e in random.sample(ev, n_ev)]
items += [("rand", round(random.uniform(3, 1185), 3), "-") for _ in range(n_rand)]
random.shuffle(items)
json.dump([{"k": k, "kind": a, "t": t, "cls": c} for k, (a, t, c) in enumerate(items)],
          open(os.path.join(OUT, "key.json"), "w", encoding="utf-8"), indent=1)
td = tempfile.mkdtemp()
W = 320
tiles = []
for k, (_, t, _) in enumerate(items):
    for dt, tag in ((-0.15, "a"), (0.20, "b")):
        p = os.path.join(td, f"{k}{tag}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, t + dt):.3f}", "-i", VIDEO_1080, "-frames:v", "1",
                        "-vf", f"scale={W}:-2", "-q:v", "3", p], check=True)
        im = Image.open(p).convert("RGB")
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 44, 16], fill=(0, 0, 0))
        d.text((4, 2), f"#{k}{tag}", fill=(255, 255, 0))
        tiles.append(im)
h = tiles[0].size[1]
per = 16
for s in range(0, len(tiles), per):
    chunk = tiles[s:s + per]
    sheet = Image.new("RGB", (4 * W, ((len(chunk) + 3) // 4) * h), (30, 30, 30))
    for i, im in enumerate(chunk):
        sheet.paste(im, ((i % 4) * W, (i // 4) * h))
    sheet.save(os.path.join(OUT, f"blind_{s // per}.jpg"), quality=85)
print(len(items), "items,", (len(tiles) + per - 1) // per, "sheets")
