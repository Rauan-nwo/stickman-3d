# -*- coding: utf-8 -*-
"""compose.py — аватарка и баннер канала huh из сгенерированных картинок (GPT Image) + текст.

  python -X utf8 production/channel/branding/compose.py [--avatar avatar_v1.png]

Баннер YouTube: 2560×1440 (≤ 6 МБ). Видимые зоны: ТВ — весь; компьютер — 2560×423 по центру по высоте;
планшет — 1855×423; **телефон и все устройства — 1546×423 по центру** (x 507–2053, y 509–932).
Всё важное (название, слоган, ведущий) — внутри зоны 1546×423. Аватарка: 800×800, YouTube режет в круг
(виден диаметр 800, показывается до 98 px) — важное внутри круга.
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
FONT = 'C:/Windows/Fonts/ariblk.ttf'
FONT2 = 'C:/Windows/Fonts/arialbd.ttf'
BW, BH = 2560, 1440
SAFE = (507, 509, 2053, 932)          # 1546×423 — видно везде
DESK = (0, 509, 2560, 932)            # компьютер
TAB = (352, 509, 2207, 932)           # планшет
GOLD, WHITE, INK = (236, 190, 92), (250, 246, 236), (14, 11, 16)


def cover(im, w, h):
    s = max(w / im.width, h / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2; return im.crop((x, y, x + w, y + h))


def shadow_text(d, xy, s, f, fill, stroke=10):
    x, y = xy
    d.text((x + 8, y + 10), s, font=f, fill=(0, 0, 0), stroke_width=stroke, stroke_fill=(0, 0, 0))
    d.text((x, y), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=INK)


def place(src, scale, xo, yo):
    """картинка в масштабе scale со сдвигом (xo, yo) на холст 2560×1440; пустые края — зеркальное продолжение сцены (видно только на ТВ/ПК)"""
    im = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    big = Image.new('RGB', (im.width * 3, im.height * 3))
    fx, fy = im.transpose(Image.FLIP_LEFT_RIGHT), im.transpose(Image.FLIP_TOP_BOTTOM); fxy = fx.transpose(Image.FLIP_TOP_BOTTOM)
    for i, j, t in ((0, 0, fxy), (1, 0, fy), (2, 0, fxy), (0, 1, fx), (1, 1, im), (2, 1, fx), (0, 2, fxy), (1, 2, fy), (2, 2, fxy)): big.paste(t, (i * im.width, j * im.height))
    x, y = im.width - xo, im.height - yo; canvas = big.crop((x, y, x + BW, y + BH))
    # края-зеркала чуть темнее и мягче, чтобы шов не бросался в глаза
    m = Image.new('L', (BW, BH), 0); ImageDraw.Draw(m).rectangle((max(0, xo), max(0, yo), min(BW, xo + im.width), min(BH, yo + im.height)), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(40)); soft = canvas.filter(ImageFilter.GaussianBlur(6)); soft = Image.blend(soft, Image.new('RGB', soft.size, (0, 0, 0)), .35)
    return Image.composite(canvas, soft, m)


def banner(bg_path, title_box, layout=None):
    """title_box: (x0, x1) по горизонтали внутри SAFE, где ставить текст; layout: (scale, xo, yo) — где лежит картинка"""
    src = Image.open(bg_path).convert('RGB')
    im = place(src, *layout) if layout else cover(src, BW, BH)
    x0, x1 = title_box; y0, y1 = SAFE[1], SAFE[3]
    # мягкая тёмная подложка под текст (читаемость на любом фоне)
    m = Image.new('L', (BW, BH), 0); md = ImageDraw.Draw(m); md.rounded_rectangle((x0 - 40, y0 + 20, x1 + 40, y1 - 20), 60, fill=150)
    m = m.filter(ImageFilter.GaussianBlur(60)); im = Image.composite(Image.new('RGB', (BW, BH), (6, 5, 8)), im, m)
    d = ImageDraw.Draw(im)
    title, slogan = 'huh?', 'The money stories nobody told you.'
    size = 260
    while ImageFont.truetype(FONT, size).getlength(title) > (x1 - x0): size -= 6
    f = ImageFont.truetype(FONT, size); tb = d.textbbox((0, 0), title, font=f)
    s2 = 64
    while ImageFont.truetype(FONT2, s2).getlength(slogan) > (x1 - x0): s2 -= 2
    f2 = ImageFont.truetype(FONT2, s2); sb = d.textbbox((0, 0), slogan, font=f2)
    th, sh, gap = tb[3] - tb[1], sb[3] - sb[1], 28
    BTN = 92 + 34 if SUBSCRIBE else 0          # кнопка + отступ — в общей высоте блока
    while th + gap + sh + BTN > (y1 - y0) - 50 and size > 120:   # блок целиком влезает в зону всех устройств
        size -= 8; f = ImageFont.truetype(FONT, size); tb = d.textbbox((0, 0), title, font=f); th = tb[3] - tb[1]
    ty = y0 + ((y1 - y0) - (th + gap + sh + BTN)) // 2 - tb[1]
    tx = x0 + ((x1 - x0) - (tb[2] - tb[0])) // 2 - tb[0]
    shadow_text(d, (tx, ty), title, f, WHITE, 12)
    tx = x0 + ((x1 - x0) - (tb[2] - tb[0])) // 2 - tb[0]; q = ImageFont.truetype(FONT, size); qx = tx + f.getlength('huh')                 # знак вопроса — золотом
    d.text((qx, ty), '?', font=q, fill=GOLD, stroke_width=12, stroke_fill=INK)
    sx = x0 + ((x1 - x0) - (sb[2] - sb[0])) // 2 - sb[0]; sy = ty + tb[3] + gap - sb[1]
    shadow_text(d, (sx, sy), slogan, f2, GOLD, 5)
    if SUBSCRIBE:   # красная кнопка SUBSCRIBE под слоганом (в зоне всех устройств)
        f3 = ImageFont.truetype(FONT, 54); bw = f3.getlength('SUBSCRIBE') + 150; bh = 92
        bx = x0 + ((x1 - x0) - bw) / 2; by = sy + sb[3] + 34
        d.rounded_rectangle((bx + 6, by + 8, bx + bw + 6, by + bh + 8), 20, fill=(0, 0, 0))
        d.rounded_rectangle((bx, by, bx + bw, by + bh), 20, fill=(222, 28, 36), outline=INK, width=5)
        cx, cy = bx + 58, by + bh / 2   # значок «play»
        d.polygon([(cx - 16, cy - 20), (cx - 16, cy + 20), (cx + 20, cy)], fill=WHITE)
        d.text((bx + 96, cy), 'SUBSCRIBE', font=f3, fill=WHITE, anchor='lm')
    return im


SUBSCRIBE = False


def zones(im):
    z = im.copy(); d = ImageDraw.Draw(z)
    for box, col, name in ((DESK, (90, 160, 255), 'компьютер 2560×423'), (TAB, (255, 200, 60), 'планшет 1855×423'), (SAFE, (255, 60, 60), 'все устройства 1546×423')):
        d.rectangle(box, outline=col, width=8); d.text((box[0] + 16, box[1] + 10), name, font=ImageFont.truetype(FONT2, 40), fill=col)
    d.text((24, 20), 'ТВ — весь баннер 2560×1440', font=ImageFont.truetype(FONT2, 44), fill=(255, 255, 255))
    return z


def avatar(src):
    im = Image.open(src).convert('RGB'); s = min(im.size); im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2)).resize((800, 800), Image.LANCZOS)
    prev = Image.new('RGB', (1100, 860), (24, 24, 28)); m = Image.new('L', (800, 800), 0); ImageDraw.Draw(m).ellipse((0, 0, 800, 800), fill=255)
    prev.paste(im, (20, 30), m)
    for sz, x in ((176, 860), (98, 880), (48, 905), (32, 913)):
        sm = im.resize((sz, sz), Image.LANCZOS); mm = m.resize((sz, sz)); y = {176: 40, 98: 260, 48: 400, 32: 490}[sz]; prev.paste(sm, (x, y), mm)
    return im, prev


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--avatar', default='avatar_v1.png'); ap.add_argument('--bg', default='banner_bg.png')
    ap.add_argument('--title', default='530,1160', help='x0,x1 полосы текста внутри зоны 507–2053')
    ap.add_argument('--subscribe', action='store_true'); ap.add_argument('--out', default='banner_2560x1440')
    ap.add_argument('--layout', default='1.45,236,139', help='scale,xo,yo картинки на холсте (ведущий в зоне 1546×423)')
    a = ap.parse_args()
    if os.path.exists(os.path.join(D, a.bg)):
        SUBSCRIBE = a.subscribe; x0, x1 = map(int, a.title.split(','))
        b = banner(os.path.join(D, a.bg), (x0, x1), tuple(float(v) if i == 0 else int(v) for i, v in enumerate(a.layout.split(',')))); b.save(os.path.join(D, a.out + '.jpg'), quality=93, optimize=True); b.crop(SAFE).save(os.path.join(D, a.out + '_mobile_view.png'))
        zones(b).resize((1280, 720), Image.LANCZOS).save(os.path.join(D, a.out + '_zones_preview.png'))
        print('banner', a.out, os.path.getsize(os.path.join(D, a.out + '.jpg')) // 1024, 'КБ')
    if os.path.exists(os.path.join(D, a.avatar)):
        av, pv = avatar(os.path.join(D, a.avatar)); n = os.path.splitext(a.avatar)[0]
        av.save(os.path.join(D, f'{n}_800.png')); pv.save(os.path.join(D, f'{n}_preview.png')); print('avatar ok', n)
