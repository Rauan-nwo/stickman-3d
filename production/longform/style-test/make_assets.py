# make_assets.py: plate variants + masks for the style test (reads bg_restaurant.png, writes assets/).
#   python make_assets.py
# plate_raw.jpg   - background as generated
# plate_soft.jpg  - graded toward the flat characters: fine texture removed (median), local contrast lowered,
#                   mild posterize blended in, slight desaturation; big shapes and lights untouched
# mask_window.png - window panes (skyline layer for parallax), feathered
# mask_cloth.png  - tablecloth matte: drawn over the seated characters' legs
import sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageChops, ImageDraw, ImageEnhance
import numpy as np

D = Path(__file__).parent
src = Image.open(D / 'bg_restaurant.png').convert('RGB')
W, H = src.size
A = D / 'assets'; A.mkdir(exist_ok=True)
src.save(A / 'plate_raw.jpg', quality=93)

def soft(im):
    m = im.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MedianFilter(5))  # kills speckle, velvet grain, rain dots
    base = m.filter(ImageFilter.GaussianBlur(10))
    a, b = np.asarray(m, np.float32), np.asarray(base, np.float32)
    flat = b + (a - b) * .72                                        # lower texture (local) contrast, keep big forms
    q = np.asarray(ImageOps.posterize(Image.fromarray(np.clip(flat, 0, 255).astype(np.uint8)), 4), np.float32)
    out = flat * .78 + q * .22                                      # a hint of cel banding
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    img = ImageEnhance.Color(img).enhance(.9)
    return img
soft(src).save(A / 'plate_soft.jpg', quality=93)

# window panes above the table line; the orchid is cut out
mw = Image.new('L', (W, H), 0); d = ImageDraw.Draw(mw)
for x0, x1 in [(212, 286), (308, 624), (648, 1026), (1049, 1384), (1398, 1478)]:
    d.rectangle([x0, 72, x1, 428], fill=255)
d.ellipse([826, 340, 952, 470], fill=0)
mw = mw.filter(ImageFilter.GaussianBlur(4))
Image.merge('LA', (mw, mw)).save(A / 'mask_window.png')   # маска в альфе (canvas composite читает альфу)

# tablecloth: hand-traced outline (the floor under the hem has the same colour, so no keying)
mc = Image.new('L', (W, H), 0)
ImageDraw.Draw(mc).polygon([(596, 540), (640, 521), (1040, 521), (1080, 540), (1086, 560), (1078, 640), (1070, 690), (1066, 703), (1050, 709), (1000, 719),
    (940, 726), (880, 731), (820, 735), (760, 733), (700, 729), (640, 716), (606, 706), (600, 660), (594, 600), (591, 560)], fill=255)
mc = mc.filter(ImageFilter.GaussianBlur(1.5))
Image.merge('LA', (mc, mc)).save(A / 'mask_cloth.png')
print('ok', W, H)

# ---------------- фон v2 (рисованный, cel-shaded): апскейл 1672 -> 1920 Lanczos, маски в 1920x1080 ----------------
v2 = Image.open(D / 'bg_restaurant_v2.png').convert('RGB')
K = 1920 / v2.size[0]
v2.resize((1920, 1080), Image.LANCZOS).save(A / 'plate_v2.png', optimize=True)
sc = lambda pts: [(x * K, y * K) for x, y in pts]
mw = Image.new('L', (1920, 1080), 0); d = ImageDraw.Draw(mw)
for pane in [
    [(368, 0), (588, 0), (588, 642), (400, 642), (392, 580), (360, 540), (300, 522), (272, 520), (272, 330), (300, 220), (340, 100)],
    [(615, 0), (1065, 0), (1065, 642), (615, 642)],
    [(1090, 0), (1370, 0), (1400, 150), (1430, 350), (1432, 520), (1385, 525), (1330, 535), (1295, 570), (1290, 642), (1090, 642)],
]: d.polygon(sc(pane), fill=255)
for box in [(546, 553, 642, 652), (1048, 553, 1144, 652), (818, 476, 980, 625)]: d.ellipse([v * K for v in box], fill=0)   # бокалы, цветы
d.rectangle([v * K for v in (744, 600, 945, 650)], fill=0)                                                                 # свеча и ваза
mw = mw.filter(ImageFilter.GaussianBlur(3))
Image.merge('LA', (mw, mw)).save(A / 'mask_window_v2.png')
mc = Image.new('L', (1920, 1080), 0)
ImageDraw.Draw(mc).polygon(sc([(330, 722), (380, 745), (500, 766), (700, 778), (840, 780), (1000, 778), (1180, 766), (1300, 745), (1345, 722),
    (1360, 800), (1385, 941), (282, 941), (300, 800)]), fill=255)
mc = mc.filter(ImageFilter.GaussianBlur(1.5))
Image.merge('LA', (mc, mc)).save(A / 'mask_cloth_v2.png')
print('v2 ok')
# дальний слой v2: только город за окнами. Всё, что не стекло (бокалы, цветы, стулья, шторы), заливается цветом соседних
# пикселей стекла (нормированная свёртка), иначе при параллаксе в дырах ближнего слоя видна вторая копия бокала
p2 = np.asarray(Image.open(A / 'plate_v2.png').convert('RGB'), np.float32)
m2 = np.asarray(Image.open(A / 'mask_window_v2.png').split()[1], np.float32) / 255
m2 = (np.asarray(Image.fromarray((m2 * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9)), np.float32) / 255)  # без мягкого края
out = p2.copy(); filled = m2.copy()
for r in [4, 10, 24, 60, 140]:
    num = np.stack([np.asarray(Image.fromarray(np.clip(p2[..., c] * m2, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) for c in range(3)], -1)
    den = np.asarray(Image.fromarray((m2 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32)[..., None] / 255
    est = num / np.maximum(den, 1e-3)
    take = (filled < .5) & (den[..., 0] > .02)
    out[take] = est[take]; filled[take] = 1
out = m2[..., None] * p2 + (1 - m2[..., None]) * out
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(A / 'far_v2.jpg', quality=92)
print('far ok')

# ---------------- интро ведущего: кабинет (bg_host_office.png), апскейл 1672 -> 1920 Lanczos ----------------
Image.open(D / 'bg_host_office.png').convert('RGB').resize((1920, 1080), Image.LANCZOS).save(A / 'plate_office.png', optimize=True)
print('office ok')
