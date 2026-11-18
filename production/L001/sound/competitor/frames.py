# -*- coding: utf-8 -*-
"""Кадры из video_1080.webm в моменты времени → лист-сетка с подписями (для просмотра глазами).

python frames.py <out.jpg> t1 t2 ... [--w 480] [--cols 4]
"""
import argparse
import os
import subprocess
import tempfile

from PIL import Image, ImageDraw

from common import VIDEO_1080, mmss

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("times", nargs="+", type=float)
ap.add_argument("--w", type=int, default=480)
ap.add_argument("--cols", type=int, default=4)
a = ap.parse_args()

tmpd = tempfile.mkdtemp()
ims = []
for i, t in enumerate(a.times):
    p = os.path.join(tmpd, f"f{i}.jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", VIDEO_1080, "-frames:v", "1",
                    "-vf", f"scale={a.w}:-2", "-q:v", "3", p], check=True)
    im = Image.open(p).convert("RGB")
    d = ImageDraw.Draw(im)
    lab = f"{t:.2f}s ({mmss(t)})"
    d.rectangle([0, 0, 8 * len(lab) + 8, 16], fill=(0, 0, 0))
    d.text((4, 2), lab, fill=(255, 255, 0))
    ims.append(im)
w, h = ims[0].size
cols = min(a.cols, len(ims))
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), (40, 40, 40))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(a.out, quality=85)
print(a.out, sheet.size)
