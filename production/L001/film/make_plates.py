# -*- coding: utf-8 -*-
"""film/make_plates.py — плейты финала, собранные из готовых (исходники в raw/ и style-test не меняются).
  python production/L001/film/make_plates.py
  assets/plate_v2_far.png — общий план ресторана с дальним столиком в проёме справа (D01 #1): из raw/plate_v2_fartable_b.png
     (GPT Image, исходник 1672×941, тот же ресторан + дальний столик) берётся ТОЛЬКО прямоугольник проёма с мягким краем и кладётся
     на утверждённый plate_v2 — всё остальное попиксельно прежнее, поэтому маски скатерти и посадка героев не меняются.
  assets/bath_nomop.png — санузел Кентукки без нарисованной швабры (её играет 2D-швабра в руках юного Дженсена, план #30):
     черенок и головка швабры убраны (cv2.inpaint Telea по маске-полигону)."""
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
cv2.imwrite(os.path.join(D, 'assets', 'bath_nomop.png'), cv2.inpaint(bath, mk, 9, cv2.INPAINT_TELEA))
print('ok')
