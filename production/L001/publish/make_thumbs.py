# -*- coding: utf-8 -*-
"""make_thumbs.py — обложки L001 (1280×720) из кадров самого фильма + крупный текст.

  python -X utf8 production/L001/publish/make_thumbs.py      -> production/L001/publish/thumb_{A,B,C}.png (+ jpg ≤ 2 МБ)

Формула конкурента (Paper Billions, обложки лидеров 1–3 млн): 2–4 слова сверху/сбоку капсом, белый + красный акцент,
крупный узнаваемый герой с эмоцией, предмет-символ (светящийся чип), тёмный фон, высокий контраст. Лидер — сцена-история.
Кадры берутся из film/out/full.mp4 (рисовка канала: герои кодом, фоны — плейты стиля). Правый нижний угол свободен
(там таймкод YouTube).
"""
import subprocess, os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

L = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(L, 'publish'); os.makedirs(OUT, exist_ok=True)
VIDEO = os.path.join(L, 'film', 'out', 'full.mp4')
FONT = 'C:/Windows/Fonts/ariblk.ttf'
W, H = 1280, 720
WHITE, RED, INK = (255, 255, 255), (232, 36, 36), (12, 10, 14)


def frame(t):
    p = os.path.join(OUT, f'_f{t}.png')
    if not os.path.exists(p):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', p], check=True)
    return Image.open(p).convert('RGB')


def punch(im, c=1.14, s=1.22, b=1.06):
    im = ImageEnhance.Contrast(im).enhance(c); im = ImageEnhance.Color(im).enhance(s); return ImageEnhance.Brightness(im).enhance(b)


def vignette(im, k=.55):
    m = Image.new('L', im.size, 0); d = ImageDraw.Draw(m)
    d.ellipse((-im.width * .15, -im.height * .25, im.width * 1.15, im.height * 1.25), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(im.width // 6)); dark = Image.new('RGB', im.size, (0, 0, 0))
    return Image.composite(im, Image.blend(im, dark, k), m)


def crop(im, box):  # box в координатах 1920×1080 -> 1280×720
    return im.crop(box).resize((W, H), Image.LANCZOS)


def text(d, xy, s, size, fill, anchor='la', stroke=10):
    f = ImageFont.truetype(FONT, size)
    x, y = xy
    d.text((x + 6, y + 8), s, font=f, fill=(0, 0, 0), anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0))   # тень
    d.text((x, y), s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=INK)


def fit(s, maxw, size):
    while size > 40 and ImageFont.truetype(FONT, size).getlength(s) > maxw: size -= 4
    return size


def brackets(d, box, col=WHITE, L_=46, w=7):
    x0, y0, x1, y1 = box
    for (x, y, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        d.line([(x, y + dy * L_), (x, y), (x + dx * L_, y)], fill=col, width=w)


def rec(d, xy, size=40):
    x, y = xy; d.ellipse((x, y, x + size * .7, y + size * .7), fill=RED)
    d.text((x + size * .9, y - size * .12), 'REC', font=ImageFont.truetype(FONT, size), fill=WHITE, stroke_width=4, stroke_fill=INK)


def glow(im, center, r, col=(80, 255, 120), k=.9):
    """аддитивное свечение (свет чипа)"""
    import numpy as np
    g = Image.new('RGB', im.size, (0, 0, 0)); d = ImageDraw.Draw(g); x, y = center
    d.ellipse((x - r, y - r, x + r, y + r), fill=col); g = g.filter(ImageFilter.GaussianBlur(r * .45))
    return Image.fromarray(np.clip(np.asarray(im, 'float32') + np.asarray(g, 'float32') * k, 0, 255).astype('uint8'))


# ---------- A: «NOBODY TOLD HIM» — Дженсен смеётся, объектив агента, рамка записи на нём ----------
def thumb_a():
    im = punch(crop(frame(40.5), (40, 30, 1640, 930))); im = vignette(im, .45); d = ImageDraw.Draw(im)
    brackets(d, (95, 40, 520, 450)); rec(d, (40, 26), 36)
    s1, s2 = 'NOBODY', 'TOLD HIM'; mw = 600
    z = min(fit(s1, mw, 150), fit(s2, mw, 150))
    text(d, (W - 36, 70), s1, z, WHITE, 'ra'); text(d, (W - 36, 70 + z * 1.05), s2, z, RED, 'ra')
    return im


# ---------- B: сплит — Дженсен смеётся | Алиса под прицелом; «WATCHED FOR A YEAR» (текст полосой сверху, лица ниже) ----------
def thumb_b():
    band = 196
    a = punch(frame(40.5).crop((110, 20, 860, 960)).resize((560, 702), Image.LANCZOS))    # голова Дженсена целиком
    b = punch(frame(5.6).crop((1200, 70, 1880, 1000)).resize((560, 766), Image.LANCZOS))  # голова Алисы целиком, в рамке записи фильма
    im = Image.new('RGB', (W, H), INK)
    bg = punch(frame(5.6).crop((0, 0, 1920, 1080)).resize((W, H), Image.LANCZOS)).filter(ImageFilter.GaussianBlur(10))
    im.paste(Image.blend(bg, Image.new('RGB', (W, H), (0, 0, 0)), .45), (0, 0))
    im.paste(a, (20, band - 40)); im.paste(b, (W - 560 - 10, band - 70))
    d = ImageDraw.Draw(im); d.polygon([(632, band), (652, band), (628, H), (608, H)], fill=RED)   # разделитель
    im = vignette(im, .25); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, band), fill=(10, 8, 12))
    z = fit('WATCHED FOR A YEAR', W - 60, 120)
    f = ImageFont.truetype(FONT, z); w1 = f.getlength('WATCHED '); w2 = f.getlength('FOR A YEAR'); x0 = (W - w1 - w2) / 2; y = (band - z) / 2 - 8
    text(d, (x0, y), 'WATCHED', z, WHITE); text(d, (x0 + w1, y), 'FOR A YEAR', z, RED)
    rec(d, (W - 150, band + 18), 30)
    return im


# ---------- C: Алиса в рамке записи (рамка — из кадра фильма) + чип под столом; «$4.8B OF NVIDIA GEAR» ----------
def thumb_c():
    im = punch(crop(frame(5.6), (300, 40, 1900, 940)))
    chip = punch(frame(23.2).crop((760, 600, 1260, 920)).resize((470, 300), Image.LANCZOS), 1.2, 1.35, 1.35)   # рука в перчатке с чипом
    im.paste(chip, (40, H - 300 - 34)); d = ImageDraw.Draw(im)
    d.rectangle((40, H - 334, 510, H - 34), outline=WHITE, width=6)
    im = vignette(im, .3); d = ImageDraw.Draw(im)
    z = fit('$4.8B', 640, 190); text(d, (40, 70), '$4.8B', z, RED, 'la')
    z2 = fit('OF NVIDIA GEAR', 640, 76); text(d, (44, 70 + z * 1.0), 'OF NVIDIA GEAR', z2, WHITE, 'la', 8)
    return im


if __name__ == '__main__':
    for k, fn in (('A', thumb_a), ('B', thumb_b), ('C', thumb_c)):
        im = fn(); p = os.path.join(OUT, f'thumb_{k}.png'); im.save(p)
        im.save(os.path.join(OUT, f'thumb_{k}.jpg'), quality=92, optimize=True)
        print(p, os.path.getsize(p.replace('.png', '.jpg')) // 1024, 'КБ jpg')
