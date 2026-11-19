# -*- coding: utf-8 -*-
"""film/make_plates.py — плейты финала, собранные из готовых (исходники в raw/ и style-test не меняются).
  python production/L001/film/make_plates.py
  assets/plate_v2_far.png — общий план ресторана с дальним столиком в проёме справа (D01 #1): из raw/plate_v2_fartable_b.png
     (GPT Image, исходник 1672×941, тот же ресторан + дальний столик) берётся ТОЛЬКО прямоугольник проёма с мягким краем и кладётся
     на утверждённый plate_v2 — всё остальное попиксельно прежнее, поэтому маски скатерти и посадка героев не меняются.
  assets/bath_nomop.png — санузел Кентукки без нарисованной швабры (её играет 2D-швабра в руках юного Дженсена, план #30):
     черенок и головка швабры убраны: маска-полигон заполнена сдвинутой копией того же плейта (стена/пол отдельно, мягкий край)."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D)
os.makedirs(os.path.join(D, 'assets'), exist_ok=True)

# ---- ресторан: дальний столик ----
base = Image.open(os.path.join(L, '..', 'longform', 'style-test', 'assets', 'plate_v2.png')).convert('RGB')
gen = Image.open(os.path.join(D, 'raw', 'plate_v2_fartable_b.png')).convert('RGB').resize((1920, 1080), Image.LANCZOS)
m = Image.new('L', (1920, 1080), 0); ImageDraw.Draw(m).rectangle((1756, 340, 1920, 636), fill=255)
m = m.filter(ImageFilter.GaussianBlur(5))
Image.composite(gen, base, m).save(os.path.join(D, 'assets', 'plate_v2_far.png'), optimize=True)

# ---- санузел без швабры ----
import cv2
bath = cv2.imread(os.path.join(L, 'assets', 'bg_kentucky_day.png'))
mk = np.zeros(bath.shape[:2], np.uint8)
cv2.line(mk, (992, 432), (882, 802), 255, 26)                                    # черенок
cv2.fillPoly(mk, [np.array([[770, 860], [800, 820], [880, 800], [935, 830], [960, 880], [930, 900], [860, 905], [790, 890]], np.int32)], 255)   # головка
mk = cv2.dilate(mk, np.ones((7, 7), np.uint8))
# заливка: не cv2.inpaint (оставлял размазанную полосу у ведра — замечание 2026-11-19), а сдвинутая копия того же плейта:
# стена и пол отдельно, сдвиг подбирается по кольцу вокруг маски (минимум расхождения), источник не задевает маску; край мягкий
src = bath.astype(np.float32); out = src.copy(); Hh, Ww = mk.shape
for name, (y0, y1) in {'wall': (0, 770), 'floor': (770, Hh)}.items():
    m = np.zeros_like(mk); m[y0:y1] = mk[y0:y1]
    ring = cv2.dilate(m, np.ones((31, 31), np.uint8)) > 0; ring &= ~(m > 0)
    ys, xs = np.nonzero(ring); mys, mxs = np.nonzero(cv2.dilate(m, np.ones((15, 15), np.uint8))); best = None
    for dy in range(-160, 161, 2):
        for dx in (range(-260, -29, 2) if name == 'floor' else range(-200, 201, 2)):
            if abs(dx) < 30 and abs(dy) < 30: continue
            sy, sx = ys + dy, xs + dx; ok = (sy >= 0) & (sy < Hh) & (sx >= 0) & (sx < Ww)
            if ok.mean() < .98: continue
            if (mk[np.clip(mys + dy, 0, Hh - 1), np.clip(mxs + dx, 0, Ww - 1)] > 0).any(): continue
            e = np.mean((src[sy[ok], sx[ok]] - src[ys[ok], xs[ok]]) ** 2)
            if best is None or e < best[0]: best = (e, dx, dy)
    _, dx, dy = best
    sh = cv2.warpAffine(src, np.float32([[1, 0, -dx], [0, 1, -dy]]), (Ww, Hh), borderMode=cv2.BORDER_REFLECT)
    a = cv2.GaussianBlur(cv2.dilate(m, np.ones((9, 9), np.uint8)).astype(np.float32) / 255, (0, 0), 4)[..., None]
    out = out * (1 - a) + sh * a
cv2.imwrite(os.path.join(D, 'assets', 'bath_nomop.png'), out.clip(0, 255).astype(np.uint8))
print('ok')
