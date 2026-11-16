# -*- coding: utf-8 -*-
"""hq_corridor: рисованная плита коридора -> слои глубины 2.5D + «выключенная» версия ламп.
python make_layers.py   (читает layers.json, пишет assets/)
layers.json:
  plate   — исходник в raw/
  rects   — сечения коридора [x0, y0, x1, y1] в пикселях плиты, от ближнего к дальнему (последнее — торцевая стена);
  hw      — полуширина каждого сечения (px) -> глубина слоя ~ 1/hw; hw_office — для последнего слоя (кабинет за дверью)
            слой i = вся плита с дырой по rects[i] (внутри прозрачно, край мягкий — в шейдере); торцевая стена — с дырой двери;
            последний слой — вся плита (за дверью).
  door    — проём двери [x0, y0, x1, y1] (дыра в торцевой стене; за ней в фильме стоит плита кабинета)
  lamps   — [x, y, r, bx, by] настольные лампы: в «выключенной» версии тёплый свет в круге (x, y, r) гаснет (пятно на столе),
            абажур и лампочка у (bx, by) темнеют сильнее
Выход: assets/plate_lit.jpg, assets/plate_off.jpg (лампы погашены), assets/layers_meta.json (дыры слоёв, глубины, uv ламп)."""
import json, os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(HERE, 'layers.json'), encoding='utf-8'))
src = Image.open(os.path.join(HERE, 'raw', cfg['plate'])).convert('RGB')
W, H = src.size
lit = np.asarray(src, np.float32) / 255.

# ---------- «выключенная» версия: гасим тёплый свет вокруг каждой лампы ----------
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
R, G, B = lit[..., 0], lit[..., 1], lit[..., 2]
lum = .299 * R + .587 * G + .114 * B
warm = np.clip((R - B) / .35, 0, 1) * np.clip((lum - .12) / .5, 0, 1)          # тёплые и светлые пиксели
off = lit.copy()
wsum = np.zeros((H, W), np.float32)
for x, y, r, *_ in cfg['lamps']:
    d = np.hypot(xx - x, (yy - y) * 1.0) / r
    w = np.clip(1 - d, 0, 1) ** .5                                               # мягкое пятно
    wsum = np.maximum(wsum, w)
k = (wsum * warm)[..., None]
night = np.array([.10, .14, .24], np.float32)                                    # цвет тени серии (тёмно-синий)
dark = off * np.array([.42, .5, .72], np.float32) + night * .18                  # погашенный свет: темнее и холоднее
off = off * (1 - k) + dark * k
for x, y, r, bx, by in cfg['lamps']:                                             # сам абажур/лампочка (bx, by): глуше
    d = np.hypot(xx - bx, yy - by) / (r * .22)
    w = (np.clip(1 - d, 0, 1) ** .6 * np.clip((lum - .35) / .4, 0, 1))[..., None]
    off = off * (1 - w * .9) + (off * .3) * (w * .9)
off = np.clip(off, 0, 1)

def to_img(a): return Image.fromarray((a * 255 + .5).astype(np.uint8))
litI, offI = to_img(lit), to_img(off)
os.makedirs(os.path.join(HERE, 'assets'), exist_ok=True)

litI.save(os.path.join(HERE, 'assets', 'plate_lit.jpg'), quality=93); offI.save(os.path.join(HERE, 'assets', 'plate_off.jpg'), quality=93)
rects = cfg['rects']
holes = rects[:-1] + [cfg['door']] + [None]          # слой i стоит на глубине сечения rects[i] и имеет дыру по нему; торец (последнее
                                                     # сечение) — дыра двери; последний слой — вся плита без дыры (кабинет за дверью).
                                                     # Дыры вырезаются в шейдере фильма (одна текстура на все слои — меньше вес страницы)
meta = {'W': W, 'H': H, 'vp': cfg['vp'], 'layers': [], 'lamps': []}
for i, hole in enumerate(holes):
    meta['layers'].append({'hole': hole, 'hw': (cfg['hw'] + [cfg['hw_office']])[i]})
for x, y, r, *_ in cfg['lamps']:
    # слой, где лампа видна: первый i, у которого дыра её не содержит
    li = next((i for i, h in enumerate(holes) if h is None or not (h[0] <= x <= h[2] and h[1] <= y <= h[3])), len(holes) - 1)
    meta['lamps'].append({'u': x / W, 'v': 1 - y / H, 'r': r / H, 'layer': li})
json.dump(meta, open(os.path.join(HERE, 'assets', 'layers_meta.json'), 'w'), indent=1)
# превью: горит | погашено
pv = Image.new('RGB', (W * 2, H)); pv.paste(litI, (0, 0)); pv.paste(offI, (W, 0)); pv.save(os.path.join(HERE, 'out', 'layers_on_off.jpg'), quality=85)
print('ok', W, H, len(rects), 'layers', len(cfg['lamps']), 'lamps')
