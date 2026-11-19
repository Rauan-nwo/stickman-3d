# -*- coding: utf-8 -*-
"""banner_green.py — баннер huh: зелёный фон, moneyman на кожаном диване (GPT Image), huh? + слоган + SUBSCRIBE.
  python -X utf8 production/channel/branding/banner_green.py [--scale .56] [--cx 1700]
Источник banner_green_sofa.png (1672×941): персонаж с диваном ~x 700–1470, y 100–830.
Фон холста — тайлы левой пустой части источника (зелень с $ и монетами) + виньетка; персонаж — с мягкими краями."""
import argparse, os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
import compose as C

D = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('--scale', type=float, default=.56); ap.add_argument('--cx', type=int, default=1680)
ap.add_argument('--title', default='560,1180'); a = ap.parse_args()
src = Image.open(os.path.join(D, 'banner_green_sofa.png')).convert('RGB')
s = a.scale; BW, BH = C.BW, C.BH
# фон: пустая левая часть источника, тайлами (каждый второй — зеркально, чтобы не было шва)
tile = src.crop((0, 0, 620, src.height)).resize((round(620 * s * 1.25), round(src.height * s * 1.25)), Image.LANCZOS)
bg = Image.new('RGB', (BW, BH)); tw, th = tile.size
for j in range(0, BH // th + 2):
    for i in range(0, BW // tw + 2):
        t = tile.transpose(Image.FLIP_LEFT_RIGHT) if i % 2 else tile
        if j % 2: t = t.transpose(Image.FLIP_TOP_BOTTOM)
        bg.paste(t, (i * tw, j * th))
# ровный градиент поверх тайлов: светлее в центре зоны всех устройств, темнее к краям
yy, xx = np.mgrid[0:BH, 0:BW]; r = np.sqrt(((xx - 1280) / 1500) ** 2 + ((yy - 720) / 900) ** 2)
g = np.clip(1.08 - .55 * r, .45, 1.08)[..., None]
bg = Image.fromarray(np.clip(np.asarray(bg, 'float32') * g, 0, 255).astype('uint8'))
# персонаж с диваном
fg = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
xo = round(a.cx - 1085 * s); yo = round(720 - 465 * s)
m = Image.new('L', fg.size, 0); ImageDraw.Draw(m).ellipse((int(.36 * fg.width), int(.02 * fg.height), int(.97 * fg.width), int(.98 * fg.height)), fill=255)   # только персонаж с диваном, овал
m = m.filter(ImageFilter.GaussianBlur(55))
# яркость фона источника под персонажем подгоняем к холсту: свечение оставляем, «коробку» — нет
bg.paste(fg, (xo, yo), m)
C.SUBSCRIBE = True
x0, x1 = map(int, a.title.split(','))
# переиспользуем вёрстку текста из compose.banner: передаём готовый холст через временный файл
tmp = os.path.join(D, '_green_canvas.png'); bg.save(tmp)
b = C.banner(tmp, (x0, x1), None); os.remove(tmp)
b.save(os.path.join(D, 'banner_green_2560x1440.jpg'), quality=93, optimize=True)
b.crop(C.SAFE).save(os.path.join(D, 'banner_green_mobile_view.png'))
C.zones(b).resize((1280, 720), Image.LANCZOS).save(os.path.join(D, 'banner_green_zones_preview.png'))
print('ok', os.path.getsize(os.path.join(D, 'banner_green_2560x1440.jpg')) // 1024, 'КБ')
