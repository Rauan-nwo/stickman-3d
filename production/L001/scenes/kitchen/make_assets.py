# -*- coding: utf-8 -*-
"""Плиты сцены «повара»: апскейл GPT-плит до 1920x1080 (Lanczos) -> assets/. Запуск: python make_assets.py"""
import os, json
from PIL import Image
import numpy as np
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def up(src, dst):
    if not os.path.exists(src): print('нет', src); return None
    im = Image.open(src).convert('RGB').resize((1920, 1080), Image.LANCZOS); im.save(dst); return im
crt = up('raw/bg_crt_desk_v2.png', 'assets/plate_crt.png')
if crt is not None:   # экран: самая большая тёмная область в центре кадра — для подсказки координат
    a = np.asarray(crt).astype(int); dark = (a.sum(2) < 120)
    ys, xs = np.nonzero(dark[150:800, 560:1360]); print('crt dark bbox', xs.min() + 560, ys.min() + 150, xs.max() + 560, ys.max() + 150)
up('raw/bg_kitchen_side.png', 'assets/plate_kitchen.png')
