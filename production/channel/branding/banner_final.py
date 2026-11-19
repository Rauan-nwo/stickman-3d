# -*- coding: utf-8 -*-
"""banner_final.py — баннер huh 2560×1440: персонаж на диване от GPT (на пурпурном фоне, вырезается), всё остальное — код.
  python -X utf8 production/channel/branding/banner_final.py
Фон: ровная изумрудная зелень + узор $ и монет; слева huh? + слоган + SUBSCRIBE; справа персонаж.
Всё важное — в зоне 1546×423 (видна на всех устройствах)."""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import compose as C

D = os.path.dirname(os.path.abspath(__file__)); BW, BH = C.BW, C.BH; SX0, SY0, SX1, SY1 = C.SAFE


def key_magenta(im):
    """альфа по удалённости от пурпурного (#FF00FF) + удаление пурпурной каймы"""
    a = np.asarray(im.convert('RGB'), 'float32'); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip((np.minimum(r, b) - g) / 255, 0, 1)                    # «насколько пурпурный»
    alpha = np.clip(1 - (mag - .25) / .45, 0, 1)                         # чистый пурпур -> 0, обычные цвета -> 1
    # снять пурпурный оттенок с полупрозрачных краёв
    spill = np.clip(np.minimum(r, b) - g, 0, None) * (1 - alpha) ; a[..., 0] -= spill; a[..., 2] -= spill
    out = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype('uint8'); o = Image.fromarray(out, 'RGBA')
    return o.crop(o.getbbox())


def background():
    Y, X = np.mgrid[0:BH, 0:BW]; r = np.clip(np.sqrt(((X - 1280) / 1500) ** 2 + ((Y - 720) / 950) ** 2), 0, 1)[..., None]
    mid, edge = np.array([18, 128, 58], 'float32'), np.array([4, 58, 26], 'float32')
    bg = mid * (1 - r ** 1.5) + edge * r ** 1.5
    img = Image.fromarray(bg.astype('uint8')).convert('RGBA'); ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    gold = (214, 182, 70, 46); f = ImageFont.truetype('C:/Windows/Fonts/ariblk.ttf', 60)
    sx, sy = 200, 120
    for j, y in enumerate(range(-30, BH + 90, sy)):
        for i, x in enumerate(range(-40 + (sx // 2 if j % 2 else 0), BW + 140, sx)):
            if (i + j) % 2 == 0: d.text((x, y), '$', font=f, fill=gold, anchor='mm')
            else:
                d.ellipse((x - 32, y - 14, x + 32, y + 14), outline=gold, width=5); d.arc((x - 32, y - 6, x + 32, y + 22), 0, 180, fill=gold, width=5)
    return Image.alpha_composite(img, ov.filter(ImageFilter.GaussianBlur(.6))).convert('RGB')


if __name__ == '__main__':
    hp = os.path.join(D, 'host_sofa_cutout.png')
    host = key_magenta(Image.open(hp)) if os.path.exists(hp) else Image.open(os.path.join(D, 'moneyman_sofa_transparent.png')).convert('RGBA')
    h = (SY1 - SY0) - 16; s = h / host.height; host = host.resize((round(host.width * s), h), Image.LANCZOS)
    bg = background()
    # мягкая тень под диваном
    sh = Image.new('L', (BW, BH), 0); cx = 1640; by = SY1 - 14
    ImageDraw.Draw(sh).ellipse((cx - host.width * .45, by - 22, cx + host.width * .45, by + 14), fill=120); sh = sh.filter(ImageFilter.GaussianBlur(16))
    bg = Image.composite(Image.new('RGB', (BW, BH), (0, 0, 0)), bg, sh)
    x = round(cx - host.width / 2); y = SY1 - 8 - host.height; bg.paste(host, (x, y), host)
    print('персонаж', (x, y, x + host.width, y + host.height), 'зона', C.SAFE, 'ВНУТРИ' if x >= SX0 and x + host.width <= SX1 and y >= SY0 else 'ВЫХОДИТ')
    tmp = os.path.join(D, '_f.png'); bg.save(tmp); C.SUBSCRIBE = True; C.PLATE = 80
    b = C.banner(tmp, (580, 1260), None); os.remove(tmp)
    b.save(os.path.join(D, 'banner_final_2560x1440.jpg'), quality=94, optimize=True)
    b.crop(C.SAFE).save(os.path.join(D, 'banner_final_mobile_view.png'))
    C.zones(b).resize((1280, 720), Image.LANCZOS).save(os.path.join(D, 'banner_final_zones_preview.png'))
    print('ok', os.path.getsize(os.path.join(D, 'banner_final_2560x1440.jpg')) // 1024, 'КБ')
