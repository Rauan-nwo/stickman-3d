# -*- coding: utf-8 -*-
"""Плиты GPT для пролётов над городом: raw/*.png -> assets/ + assets.js.
- задники (backdrop) — как есть, JPG;
- вырезки (зелёный / пурпурный фон) — хромакей только по области, связанной с краем кадра, удаление «пролива» цвета
  с кромки, мягкая альфа 1 px, обрезка по содержимому -> PNG с альфой;
- фасады — срезается зелёная полоса над карнизом, остальное непрозрачно.
META — то, что снято с картинок вручную (доля «тротуара» под фасадом, высота окна/баннера в метрах при ширине плиты).
Запуск: python make_assets.py   (из любой папки)"""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(HERE, 'raw'), os.path.join(HERE, 'assets')
os.makedirs(OUT, exist_ok=True)

KIND = {
    'sg_backdrop': 'backdrop', 'dc_backdrop': 'backdrop', 'tp_backdrop': 'backdrop', 'fin_backdrop': 'backdrop',
    'sg_mbs': 'green', 'sg_wheel': 'green', 'dc_capitol': 'green', 'tp_101': 'magenta',
    'tp_hall': 'facade',
}
# ручные замеры (доли высоты картинки сверху; после обрезки зелёной полосы — пересчитываются ниже)
META = json.load(open(os.path.join(HERE, 'assets_meta.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'assets_meta.json')) else {}


def keyness(a, kind):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if kind == 'green':
        d = g - np.maximum(r, b)
    else:  # magenta
        d = np.minimum(r, b) - g
    return np.clip((d - .18) / .22, 0, 1)


def despill(a, alpha, kind):
    r, g, b = a[..., 0].copy(), a[..., 1].copy(), a[..., 2].copy()
    edge = alpha < .999
    edge = ndimage.binary_dilation(edge, iterations=3)
    if kind == 'green':
        lim = np.maximum(r, b) * 1.02
        g = np.where(edge, np.minimum(g, lim), g)
    else:
        m = np.minimum(r, b)
        spill = np.clip(m - g * 1.05, 0, None)
        r = np.where(edge, r - spill, r); b = np.where(edge, b - spill, b)
    return np.stack([r, g, b], -1)


def cutout(a, kind):
    k = keyness(a, kind)
    bgmask = k > .35
    lab, n = ndimage.label(bgmask)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # большие внутренние зелёные «дыры» (между опорами, спицами) — тоже фон
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    for i, s in enumerate(sizes, 1):
        if s > 25 and i not in border: bg |= lab == i
    bgz = ndimage.binary_dilation(bg, iterations=2)
    alpha = np.where(bgz, 1 - k, 1.0)
    alpha = np.where(bg, 0.0, alpha)
    alpha = ndimage.grey_erosion(alpha, size=(2, 2))
    alpha = ndimage.gaussian_filter(alpha, .7)
    return np.clip(alpha, 0, 1)


def bbox(alpha, pad=6):
    ys, xs = np.where(alpha > .02)
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(alpha.shape[0], ys.max() + pad + 1), max(0, xs.min() - pad), min(alpha.shape[1], xs.max() + pad + 1)
    return y0, y1, x0, x1


entries = {}
for name, kind in KIND.items():
    src = os.path.join(RAW, name + '.png')
    if not os.path.exists(src):
        print('нет', name); continue
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    H, W = a.shape[:2]
    meta = dict(META.get(name, {}))
    if kind == 'backdrop':
        out = os.path.join(OUT, name + '.jpg'); im.save(out, quality=92)
        entries[name] = dict(file=name + '.jpg', aspect=W / H, crop=[0, 0, 1, 1], **meta)
    elif kind in ('green', 'magenta'):
        alpha = cutout(a, kind)
        rgb = despill(a, alpha, kind)
        y0, y1, x0, x1 = bbox(alpha)
        rgba = np.concatenate([rgb, alpha[..., None]], -1)[y0:y1, x0:x1]
        Image.fromarray((np.clip(rgba, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
        entries[name] = dict(file=name + '.png', aspect=(x1 - x0) / (y1 - y0), crop=[0, 0, 1, 1], **meta)
        # проверочный кадр: вырезка на сером и на тёмно-синем
        ch = Image.new('RGB', (x1 - x0, y1 - y0), (40, 60, 90)); ch.paste(Image.open(os.path.join(OUT, name + '.png')), (0, 0), Image.open(os.path.join(OUT, name + '.png')))
        ch.save(os.path.join(OUT, 'check_' + name + '.jpg'), quality=88)
    else:  # facade: срезать зелёный верх
        alpha = cutout(a, 'green')
        rgb = despill(a, alpha, 'green')
        y0, y1, x0, x1 = bbox(alpha, pad=2)
        rgba = np.concatenate([rgb, alpha[..., None]], -1)[y0:H, :]
        Image.fromarray((np.clip(rgba, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
        h2 = H - y0
        # ground: доля высоты (после обрезки) ниже линии тротуара; winY: высота центра окна/баннера над тротуаром в долях ширины
        g = meta.get('ground_px')
        if g is not None: meta['ground'] = (H - g) / h2
        if 'banner_px' in meta:   # баннер: [центр x доля ширины, центр y над тротуаром доля высоты, ширина доля ширины, высота доля высоты]
            bx, by = meta.pop('banner_px'); meta['banner'] = [bx / W, (g - by) / h2, 872 / W, 175 / h2]
        entries[name] = dict(file=name + '.png', aspect=W / h2, crop=[0, 0, 1, 1], top_cut=int(y0), **meta)
        ch = Image.new('RGB', (W, h2), (40, 60, 90)); ch.paste(Image.open(os.path.join(OUT, name + '.png')), (0, 0), Image.open(os.path.join(OUT, name + '.png')))
        ch.save(os.path.join(OUT, 'check_' + name + '.jpg'), quality=88)
    print(name, entries[name])

# ---------- 2.5D: расширенные плиты (тайлы из модулей самой картинки, без дорисовки) ----------
def save_rgba(name, rgba, meta):
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    h, w = rgba.shape[:2]
    entries[name] = dict(file=name + '.png', aspect=w / h, crop=[0, 0, 1, 1], **meta)
    ch = Image.new('RGB', (w, h), (40, 60, 90)); im = Image.open(os.path.join(OUT, name + '.png')); ch.paste(im, (0, 0), im)
    ch.thumbnail((2400, 2400)); ch.save(os.path.join(OUT, 'check_' + name + '.jpg'), quality=88)
    print(name, entries[name])

# Сингапур: набережная шопхаусов. Модуль = пилястра + арка с двумя окнами над ней, x 1245..1630 (385 px).
if os.path.exists(os.path.join(RAW, 'sg_facade.png')):
    a = np.asarray(Image.open(os.path.join(RAW, 'sg_facade.png')).convert('RGB')).astype(np.float32) / 255
    al = cutout(a, 'green'); rgba = np.concatenate([despill(a, al, 'green'), al[..., None]], -1)
    # чистая пилястра: левая половина у правого края (x 1630..1672) + её зеркало; модуль — x 1340..1630 (без навеса и листьев)
    P = np.concatenate([rgba[:, 1630:1672], rgba[:, 1630:1672][:, ::-1]], 1); M = rgba[:, 1340:1630]; K = 16
    TL, TR = np.concatenate([P, M[:, ::-1]], 1), np.concatenate([P, M], 1)
    row = np.concatenate([TL] * K + [rgba[:, 335:1630]] + [TR] * K, 1)[85:]
    W0 = row.shape[1]; cx = (K * TL.shape[1] + (836 - 335)) / W0     # центр ресторана (x=836 в исходнике)
    H0 = row.shape[0]; g = (941 - 845) / H0                          # доля высоты ниже линии тротуара
    win = (845 - 640) / H0                                            # центр окна с шторами над тротуаром, доля высоты
    save_rgba('sg_street', row, dict(cx=cx, ground=g, winY=win, ppm=1672 / 34))

# Вашингтон: каменная стена. Отсек окна 303 px; центр — исходник x 382..1293 (отсек 2, горящее окно, отсек 4);
# вбок — отсек 4 (x 990..1293) и его зеркало; вниз — 3 этажа из полосы y 330..700 (в центре горящее окно -> отсек 4).
if os.path.exists(os.path.join(RAW, 'dc_window.png')):
    a = np.asarray(Image.open(os.path.join(RAW, 'dc_window.png')).convert('RGB')).astype(np.float32) / 255
    B = a[:, 990:1293]; K = 6
    wide = np.concatenate([B[:, ::-1]] * K + [a[:, 382:1293]] + [B] * K, 1)
    off = K * 303 - 382                                               # сдвиг исходных x
    floor = wide[330:700].copy(); floor[:, 687 + off:990 + off] = B[330:700]
    low = wide[700:].copy(); low[:, 687 + off:990 + off] = B[700:]   # нижний этаж без тёплого отсвета
    wall = np.concatenate([wide[:700]] + [floor] * 3 + [low], 0)
    rgba = np.concatenate([wall, np.ones_like(wall[..., :1])], -1)
    H0, W0 = wall.shape[:2]
    save_rgba('dc_wall', rgba, dict(cx=(845 + off) / W0, winY=(H0 - 505) / H0, ground=0, ppm=303 / 4.2))

lines = ['// assets.js: пишет make_assets.py — карта плит { name: { url, aspect, crop, ground, ... } }']
for n, e in entries.items():
    lines.append(f"import {n} from './assets/{e['file']}';")
lines.append('export default {')
for n, e in entries.items():
    rest = {k: v for k, v in e.items() if k != 'file'}
    lines.append(f"  {n}: {{ url: {n}, ...{json.dumps(rest)} }},")
lines.append('};')
open(os.path.join(HERE, 'assets.js'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('assets.js:', list(entries))
