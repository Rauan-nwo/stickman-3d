# -*- coding: utf-8 -*-
"""banner_v2.py — баннеры из GPT Image -> 2560×1440 с безопасной зоной, фон без швов.
  python -X utf8 production/channel/branding/banner_v2.py
Из картинки GPT вырезается только содержимое (персонаж, диван, у A — текст и кнопка): пиксели, заметно отличные от
сглаженного фона. Фон всего баннера рисуется заново: ровная зелень из цветов исходника, лёгкая виньетка и узор
из $ и монет по решётке (как у GPT). A: текст и кнопка от GPT. B: текст и SUBSCRIBE — наши (compose.py)."""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import compose as C

D = os.path.dirname(os.path.abspath(__file__)); BW, BH = C.BW, C.BH; SX0, SY0, SX1, SY1 = C.SAFE


def smooth_bg(im):
    small = im.resize((im.width // 8, im.height // 8), Image.BILINEAR).filter(ImageFilter.MedianFilter(9)).filter(ImageFilter.GaussianBlur(3))
    return small.resize(im.size, Image.BILINEAR)


def cut(im, box, dark=70):
    """маска содержимого: всё, что не достижимо от края картинки без пересечения чёрной обводки (стиль канала — обводка у всего)"""
    from scipy import ndimage
    a = np.asarray(im, 'float32'); lum = a @ np.array([.299, .587, .114])
    barrier = lum < dark
    barrier = ndimage.binary_dilation(barrier, iterations=2)                       # закрыть щели сглаживания в обводке
    k = np.zeros(barrier.shape, bool); k[box[1]:box[3], box[0]:box[2]] = True
    free = ~barrier | ~k                                                           # вне box — всегда фон
    lab, _ = ndimage.label(free)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); bgm = np.isin(lab, edge[edge > 0])
    m = ~bgm & k
    m = ndimage.binary_opening(m, iterations=1)                                    # убрать одиночные точки
    M = Image.fromarray((m * 255).astype('uint8'))
    return M.filter(ImageFilter.GaussianBlur(1.0))


def background(src, contour):
    """зелень 2560×1440: центр и края — цвета фона исходника; узор $ и монет"""
    s = np.asarray(smooth_bg(src), 'float32'); h, w = s.shape[:2]
    c_mid = s[h // 2 - 20:h // 2 + 20, w // 10:w // 5].reshape(-1, 3).mean(0)             # фон слева от центра
    c_edge = np.concatenate([s[:30, :].reshape(-1, 3), s[-30:, :].reshape(-1, 3)]).mean(0)
    Y, X = np.mgrid[0:BH, 0:BW]; r = np.clip(np.sqrt(((X - 1280) / 1600) ** 2 + ((Y - 720) / 1000) ** 2), 0, 1)[..., None]
    bg = c_mid * (1 - r ** 1.6) + c_edge * r ** 1.6
    img = Image.fromarray(bg.clip(0, 255).astype('uint8')); ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    gold = (196, 168, 60, 70); f = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 62)
    sx, sy = 190, 116
    for j, y in enumerate(range(-40, BH + 80, sy)):
        for i, x in enumerate(range(-60 + (sx // 2 if j % 2 else 0), BW + 120, sx)):
            if (i + j) % 2 == 0: d.text((x, y), '$', font=f, fill=gold, anchor='mm')
            else:
                d.ellipse((x - 34, y - 15, x + 34, y + 15), outline=gold, width=5); d.arc((x - 34, y - 9, x + 34, y + 21), 0, 180, fill=gold, width=4)
    ov = ov.rotate(0); return Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')


def place(src, box, scale, center):
    m = cut(src, box)
    im = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS); m = m.resize(im.size, Image.LANCZOS)
    cx, cy = (box[0] + box[2]) / 2 * scale, (box[1] + box[3]) / 2 * scale
    xo, yo = round(center[0] - cx), round(center[1] - cy)
    bg = background(src, None); bg.paste(im, (xo, yo), m)
    bb = (round(xo + box[0] * scale), round(yo + box[1] * scale), round(xo + box[2] * scale), round(yo + box[3] * scale))
    ok = bb[0] >= SX0 and bb[2] <= SX1 and bb[1] >= SY0 and bb[3] <= SY1
    print(f'  контент {bb} — {"ВНУТРИ зоны 1546×423" if ok else "ВЫХОДИТ за зону"}'); return bg


def save(b, n):
    b.save(os.path.join(D, f'banner_{n}_2560x1440.jpg'), quality=93, optimize=True)
    b.crop(C.SAFE).save(os.path.join(D, f'banner_{n}_mobile_view.png'))
    C.zones(b).resize((1280, 720), Image.LANCZOS).save(os.path.join(D, f'banner_{n}_zones_preview.png'))
    print(n, os.path.getsize(os.path.join(D, f'banner_{n}_2560x1440.jpg')) // 1024, 'КБ')


A = Image.open(os.path.join(D, 'banner_gpt_full.png')).convert('RGB'); boxA = (255, 250, 1385, 672)
sA = min((SX1 - SX0) / (boxA[2] - boxA[0]), (SY1 - SY0) / (boxA[3] - boxA[1])) * .96; print('A: масштаб', round(sA, 3))
save(place(A, boxA, sA, (1280, 720)), 'A')

B = Image.open(os.path.join(D, 'banner_green_sofa_v2.png')).convert('RGB'); boxB = (735, 85, 1475, 862)
sB = (SY1 - SY0) * .95 / (boxB[3] - boxB[1]); print('B: масштаб', round(sB, 3))
b = place(B, boxB, sB, (1700, 720)); tmp = os.path.join(D, '_b.png'); b.save(tmp); C.SUBSCRIBE = True
b = C.banner(tmp, (560, 1200), None); os.remove(tmp); save(b, 'B')
