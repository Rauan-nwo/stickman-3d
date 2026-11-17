# -*- coding: utf-8 -*-
"""Превью новых решений D14–D26 (shot_for_shot.md) -> production/L001/decisions/Dnn_*.jpg
Сверху его кадр(ы) из 1080p, ниже варианты: грубый набросок поверх нашего плейта (assets/*.png) или шаблона.
Формат листа — как animatic/decisions_previews.py."""
import os, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
L = r'C:\dev\projects\youtube-video\production\L001'; OUT = os.path.join(L, 'decisions'); A = os.path.join(L, 'assets')
CV = r'C:\Users\velar\AppData\Local\Temp\paperbillions-research-wi34v2j2\_MG4v3foET8\video_1080.webm'
import tempfile; TMP = os.path.join(tempfile.gettempdir(), 'l001_sfs_dec'); os.makedirs(TMP, exist_ok=True)
F = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 20); FB = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 24)
FS = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 18); FT = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 14)
CW, CH = 640, 360

def comp(t):
    p = os.path.join(TMP, f'c_{t:.1f}.jpg')
    if not os.path.exists(p):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{max(t - 2, 0):.2f}', '-i', CV, '-ss', f'{min(t, 2):.2f}', '-frames:v', '1', '-vf', f'scale={CW}:{CH}', p])
    return Image.open(p).convert('RGB')
def plate(name, dark=0.0):
    im = Image.open(os.path.join(A, name)).convert('RGB').resize((CW, CH))
    if dark: im = Image.blend(im, Image.new('RGB', im.size, (0, 0, 0)), dark)
    return im
def blank(c=(22, 20, 26)): return Image.new('RGB', (CW, CH), c)

def sketch(im, ops):
    im = im.copy(); d = ImageDraw.Draw(im, 'RGBA')
    for o in ops:
        k = o[0]
        if k == 'fig':      # x, y(ноги), h, подпись, цвет куртки
            _, x, y, h, lab = o[:5]; col = o[5] if len(o) > 5 else (10, 10, 16, 230); r = h * .14
            d.ellipse((x - r, y - h * .86 - r, x + r, y - h * .86 + r), fill=(10, 10, 16, 230), outline=(255, 214, 140, 255), width=3)
            d.rounded_rectangle((x - h * .2, y - h * .7, x + h * .2, y - h * .15), radius=int(h * .1), fill=col, outline=(255, 214, 140, 255), width=3)
            d.line((x - h * .1, y - h * .15, x - h * .12, y), fill=(255, 214, 140, 255), width=3); d.line((x + h * .1, y - h * .15, x + h * .12, y), fill=(255, 214, 140, 255), width=3)
            if lab: d.text((x - h * .45, y + 2), lab, font=FT, fill=(255, 230, 160, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
        elif k == 'rect':   # x0,y0,x1,y1, fill, подпись, цвет текста
            _, x0, y0, x1, y1, col, lab = o[:7]; tc = o[7] if len(o) > 7 else (20, 20, 20, 255)
            d.rectangle((x0, y0, x1, y1), fill=col, outline=(20, 20, 20, 255), width=2)
            if lab:
                for i, ln in enumerate(lab.split('\n')): d.text((x0 + 6, y0 + 4 + i * 18), ln, font=FT if len(o) > 8 else FS, fill=tc)
        elif k == 'line':   # x0,y0,x1,y1, rgb, w
            _, x0, y0, x1, y1, col, w = o; d.line((x0, y0, x1, y1), fill=col, width=w)
        elif k == 'dash':
            _, x0, y0, x1, y1, col, w = o; n = 14
            for i in range(0, n, 2):
                a, b = i / n, (i + 1) / n; d.line((x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b), fill=col, width=w)
        elif k == 'circle': # x,y,r, rgb, w
            _, x, y, r, col, w = o; d.ellipse((x - r, y - r, x + r, y + r), outline=col, width=w)
        elif k == 'disc':
            _, x, y, r, col = o; d.ellipse((x - r, y - r, x + r, y + r), fill=col)
        elif k == 'stamp':  # x,y, текст, rgb
            _, x, y, txt, col = o; w = FB.getlength(txt) + 24
            d.rectangle((x, y, x + w, y + 40), outline=col, width=4); d.text((x + 12, y + 6), txt, font=FB, fill=col)
        elif k == 'text':
            _, x, y, txt = o[:4]; f = o[4] if len(o) > 4 else FB
            d.text((x, y), txt, font=f, fill=(255, 240, 200, 255), stroke_width=3, stroke_fill=(0, 0, 0, 255))
        elif k == 'glow':
            _, x, y, r, rgb = o
            for i in range(8, 0, -1): d.ellipse((x - r * i / 8, y - r * i / 8, x + r * i / 8, y + r * i / 8), fill=rgb + (int(40 * (9 - i) / 8),))
        elif k == 'split':
            _, other = o; im.paste(other.resize((CW // 2, CH)).crop((0, 0, CW // 2, CH)), (CW // 2, 0)); d = ImageDraw.Draw(im, 'RGBA'); d.line((CW // 2, 0, CW // 2, CH), fill=(0, 0, 0, 255), width=6)
        elif k == 'thumb':  # вклейка уменьшенной картинки x,y,w,h,img,наклон-рамка
            _, x, y, w, h, img = o; im.paste(img.resize((w, h)), (x, y)); d = ImageDraw.Draw(im, 'RGBA'); d.rectangle((x, y, x + w, y + h), outline=(240, 240, 240, 255), width=4)
        elif k == 'bars':   # полосы трекинга
            for yy in (60, 150, 250, 300): d.rectangle((0, yy, CW, yy + 6), fill=(255, 255, 255, 120))
        elif k == 'arrow':  # x0,y0,x1,y1, rgb
            _, x0, y0, x1, y1, col = o; d.line((x0, y0, x1, y1), fill=col, width=5)
            import math; a = math.atan2(y1 - y0, x1 - x0)
            for s in (2.6, -2.6): d.line((x1, y1, x1 + 18 * math.cos(a + s), y1 + 18 * math.sin(a + s)), fill=col, width=5)
    return im

def grid(imgs, labels):     # 2×2 мини-наброски в одном кадре
    im = blank((10, 10, 12)); d = ImageDraw.Draw(im)
    for i, (g, lab) in enumerate(zip(imgs, labels)):
        x, y = (i % 2) * (CW // 2), (i // 2) * (CH // 2)
        im.paste(g.resize((CW // 2 - 4, CH // 2 - 4)), (x + 2, y + 2))
        d.text((x + 8, y + CH // 2 - 26), lab, font=FT, fill=(255, 230, 120), stroke_width=2, stroke_fill=(0, 0, 0))
    return im

def card(txt):
    im = blank((8, 8, 8)); d = ImageDraw.Draw(im)
    for i, ln in enumerate(textwrap.wrap(txt, 30)): d.text((60, 120 + i * 40), ln, font=FB, fill=(240, 240, 240))
    d.line((60, 120 + (i + 1) * 40 + 4, 60 + 220, 120 + (i + 1) * 40 + 4), fill=(200, 40, 40), width=4)
    return im

def sheet(code, title, his, opts, rec):
    cols = max(len(his), len(opts)); W = cols * (CW + 10) + 10
    H = 60 + CH + 40 + (CH + 74) + 60
    im = Image.new('RGB', (W, H), (14, 14, 18)); d = ImageDraw.Draw(im)
    d.text((10, 14), f'{code}. {title}', font=FB, fill=(255, 255, 255))
    for i, (img, cap) in enumerate(his):
        x = 10 + i * (CW + 10); im.paste(img, (x, 60)); d.text((x, 60 + CH + 6), 'КОНКУРЕНТ: ' + cap, font=F, fill=(255, 215, 90))
    y = 60 + CH + 40
    for i, (img, lab, desc) in enumerate(opts):
        x = 10 + i * (CW + 10); im.paste(img, (x, y))
        d.rectangle((x, y, x + 52, y + 40), fill=(242, 169, 78)); d.text((x + 14, y + 6), lab, font=FB, fill=(0, 0, 0))
        if lab == rec: d.rectangle((x - 4, y - 4, x + CW + 4, y + CH + 4), outline=(90, 230, 120), width=6)
        for k, ln in enumerate(textwrap.wrap(desc, 58)[:3]): d.text((x, y + CH + 6 + k * 22), ln, font=F, fill=(230, 230, 230))
    d.text((10, H - 44), f'Рекомендация: {rec} (зелёная рамка)', font=FB, fill=(90, 230, 120))
    p = os.path.join(OUT, f'{code}.jpg'); im.save(p, quality=84); print(p)

RED, GRN, WHT, YEL = (220, 40, 40, 255), (70, 220, 110, 255), (245, 245, 245, 255), (255, 214, 90, 255)

# D14 — нить «China» к стулу
DESK = plate('bg_desk_restaurant_top.png')
sheet('D14_china_thread', '«How did China get someone into the seat?» — кто тянется к стулу (#22 → живой #24–25)',
      [(comp(34.6), 'штамп CHINA со звездой, 0:34.6'), (comp(35.5), 'нить от CHINA к стулу Алисы, 0:35.5')], [
    (sketch(DESK, [('circle', 400, 250, 70, WHT, 4), ('line', 640, 0, 430, 215, RED, 5), ('rect', 520, 20, 630, 52, (200, 30, 30, 240), 'BEIJING', WHT), ('text', 20, 310, 'нить к ПУСТОМУ стулу')]), 'A',
     'На «China» красная нить с биркой BEIJING тянется к пустому стулу; на «seat» мел замыкает круг. Стул, не человек'),
    (sketch(DESK, [('circle', 400, 250, 70, WHT, 4), ('rect', 380, 0, 440, 170, (15, 15, 20, 240), ''), ('rect', 380, 150, 440, 175, (200, 30, 30, 255), ''), ('arrow', 470, 120, 430, 200, WHT), ('text', 20, 310, 'рука в красной манжете')]), 'B',
     'Безымянная рука с красной манжетой сверху подвигает пустой стул к столу. Рифмуется с рукой D02 — два безымянных жеста подряд'),
    (sketch(DESK, [('circle', 400, 250, 70, WHT, 4), ('text', 20, 310, 'как сейчас: только мел')]), 'C', 'Оставить: мел вокруг стула, «China» только в словах')], 'A')

# D15 — правая половина сплита #40
KY = plate('bg_kentucky_dorm.png'); OFF = plate('bg_nvidia_ceo_office.png'); HALL = plate('bg_event_hall.png')
def split40(right, ops): return sketch(KY, [('fig', 160, 300, 120, 'мальчик со шваброй'), ('split', sketch(right, ops)), ('text', 200, 10, 'DECADES LATER', FS)])
sheet('D15_split_then_now', '«He\'d put it simply» — где взрослый Дженсен в сплите #40 [45]', [(comp(87.9), 'студия ON AIR, фото KENTUCKY, 1:27.9')], [
    (split40(OFF, [('fig', 320, 300, 130, 'за столом')]), 'A', 'Как сейчас: кабинет, кожанка, на «runs a company» садится за стол. «Сказал» не видно'),
    (split40(HALL, [('fig', 320, 300, 130, 'у микрофона'), ('line', 380, 300, 380, 200, WHT, 4), ('disc', 380, 195, 9, WHT), ('glow', 320, 120, 90, (255, 230, 160))]), 'B',
     'Справа сцена L11: у микрофона в луче, разводит руки на «runs a company». Заход к трибуне #68'),
    (split40(OFF, [('fig', 320, 300, 130, 'кабинет'), ('rect', 380, 80, 470, 150, (200, 190, 160, 255), 'то же фото')]), 'C', 'Кабинет, на стене в рамке то же фото «мальчик со шваброй». Рифма половин, но речи нет')], 'B')

# D16 — кто решает, кому продавать
def hall_scr(ops): return sketch(HALL, [('fig', 200, 320, 150, 'Дженсен у трибуны'), ('rect', 150, 240, 250, 330, (60, 40, 30, 240), '')] + ops)
sheet('D16_who_may_buy', '«…decides who is allowed to buy» — #68 [73]', [(comp(261.2), 'платформа-чип и кольцо дверей со скважинами, 4:21.2')], [
    (hall_scr([('circle', 222, 255, 14, YEL, 4), ('text', 330, 300, 'рука на ключ — «allowed»', FS)]), 'A', 'Трибуна; на «allowed» рука ложится на латунный ключ на поясе, рывок на ключ'),
    (sketch(blank(), [('circle', 320, 260, 150, GRN, 6)] + [('rect', 320 + int(200 * __import__('math').cos(a / 8 * 6.28)) - 18, 180 + int(70 * __import__('math').sin(a / 8 * 6.28)) - 30, 320 + int(200 * __import__('math').cos(a / 8 * 6.28)) + 18, 180 + int(70 * __import__('math').sin(a / 8 * 6.28)) + 30, (110, 70, 40, 255), '') for a in range(8)] + [('fig', 320, 260, 110, 'с ключом'), ('text', 20, 315, 'кольцо дверей — его кадр')]), 'B',
     'Как у него: платформа-чип, кольцо дверей, отъезд. Слишком близко к его находке и опережает наш замок #74'),
    (hall_scr([('rect', 320, 60, 620, 220, (30, 34, 40, 255), ''), ('fig', 360, 200, 70, ''), ('fig', 420, 200, 70, ''), ('fig', 480, 200, 70, ''), ('line', 445, 120, 445, 205, RED, 6), ('text', 360, 225, '✓ проходит  ✗ планка', FS)]), 'C',
     'За трибуной экран: очередь в халатах из #63 у турникета; на «allowed» первый проходит, перед вторым опускается планка')], 'C')

# D17 — прямая речь «compete everywhere»
sheet('D17_compete_quote', '«Let American chips compete everywhere» — прямая речь без источника (#94 [99])', [(comp(312.9), 'Дженсен у трибуны, «We\'ve got to go compete», 5:12.9')], [
    (sketch(HALL, [('fig', 320, 320, 170, ''), ('text', 120, 300, '"Let American chips compete everywhere"', FS)] + [('disc', 60 + i * 100, 330, 10, WHT) for i in range(6)]), 'A', 'Как сейчас: синхрон губ, субтитр-реплика, 6 вспышек — выглядит документальной цитатой'),
    (sketch(HALL, [('fig', 320, 320, 170, ''), ('rect', 120, 290, 540, 335, (30, 30, 30, 230), '"…" — J. HUANG, <издание, дата>', WHT)]), 'B', 'Проверенная дословная цитата с источником; нужен факт-чек и правка script.md'),
    (sketch(HALL, [('fig', 320, 320, 170, 'губы закрыты, кулак'), ('rect', 200, 40, 440, 120, (20, 60, 30, 255), '  COMPETE', WHT)]), 'C', 'Строку читает рассказчик; за спиной на экране печатается COMPETE, вспышки остаются')], 'C')

# D18 — почему Сингапур
def mapbase():
    im = blank((18, 26, 34)); d = ImageDraw.Draw(im)
    d.polygon([(120, 60), (330, 40), (380, 160), (300, 200), (160, 180)], fill=(90, 40, 40)); d.text((210, 100), 'CHINA', font=FS, fill=WHT)
    d.polygon([(330, 260), (380, 250), (400, 290), (350, 300)], fill=(60, 80, 70)); d.text((300, 305), 'MALAYSIA', font=FT, fill=WHT)
    d.ellipse((372, 296, 384, 308), fill=(240, 240, 240)); d.text((392, 292), 'SINGAPORE', font=FT, fill=WHT)
    return im
M = mapbase()
sheet('D18_why_singapore', '«Почему Сингапур» — новая строка, нужен факт-чек (#103–104 [108–109])', [(comp(385.0), 'наклейка US+SG с галочкой на анкете, 6:25.0')], [
    (sketch(M, [('arrow', 250, 130, 372, 296, YEL), ('text', 20, 320, 'как сейчас: переезд без причины', FS)]), 'A', 'Причину не называем, переезд читается с карты'),
    (sketch(M, [('arrow', 250, 130, 372, 296, YEL), ('text', 410, 250, '✓ US CHIPS: OK', FS), ('stamp', 180, 160, 'LOCKED', RED)]), 'B', 'Молча: зелёная галочка у Сингапура, замок над Китаем. Тоже утверждение — без проверки не ставим'),
    (sketch(M, [('arrow', 250, 130, 372, 296, YEL), ('text', 410, 250, '✓ US CHIPS: OK', FS), ('rect', 40, 320, 600, 352, (0, 0, 0, 200), '"Singapore could buy what China couldn\'t" (после ФЧ)', WHT)]), 'C', 'Одна строка в сценарий после факт-чека + картинка B')], 'C')

# D19 — аренда через границу
CITY = os.path.join(L, 'scenes', 'city', 'out', 'city_singapore.mp4')
def cityframe():
    p = os.path.join(TMP, 'city.jpg')
    if os.path.exists(CITY) and not os.path.exists(p): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '2', '-i', CITY, '-frames:v', '1', '-vf', f'scale={CW}:{CH}', p])
    return Image.open(p).convert('RGB') if os.path.exists(p) else plate('bg_singapore_street.png')
CF = cityframe()
sheet('D19_rent_across_border', 'Аренда через границу: его 3D-пролёт 6.9 с против нашей плоской карты (#118 [123])', [(comp(415.5), 'кабель перелетает забор BORDER, 6:55.5'), (comp(418.4), 'парковка чипов сверху, 6:58.4')], [
    (sketch(M, [('rect', 340, 255, 380, 285, (60, 160, 80, 255), ''), ('dash', 360, 255, 260, 150, GRN, 4), ('line', 300, 205, 330, 185, RED, 6), ('text', 400, 200, 'PER HOUR 0001', FS)]), 'A', '2D-карта: коробки стоят у пина в Малайзии, пунктир к Китаю, огоньки по линии, счётчик PER HOUR'),
    (sketch(CF, [('rect', 60, 230, 200, 300, (60, 60, 60, 240), 'NOT FOR CHINA', WHT), ('arrow', 130, 230, 560, 90, GRN), ('text', 470, 50, 'CHINA', FB)]), 'B', 'Своя 3D-диорама на движке города: склад NOT FOR CHINA, светящаяся линия над проливом к берегу CHINA'),
    (sketch(CF, [('rect', 60, 230, 200, 300, (60, 60, 60, 240), 'NOT FOR CHINA', WHT), ('arrow', 130, 230, 560, 90, GRN), ('rect', 420, 230, 600, 330, (230, 200, 140, 240), 'окно соседа\n+ книга (D06)')]), 'C', 'B, слитая с D06-B: одна 3D-сцена на аналогию и реальность — самая большая переделка')], 'A')

# D20 — аренда в развязке гл. 6
GATE = plate('bg_customs_gate.png', .2)
box = [('rect', 200, 150, 440, 320, (150, 120, 80, 255), ''), ('rect', 210, 160, 330, 200, (240, 240, 230, 255), 'S/N 4471-A'), ('text', 340, 165, '✓', FB)]
sheet('D20_rent_payoff_ch6', '«Chips stayed put, China rented them» — развязка гл. 6 (#196 [201])', [(comp(590.4), 'кабель над морем к CHINA, «$/HOUR · HIRED», 9:50.4')], [
    (sketch(GATE, box + [('text', 20, 320, 'как сейчас: серийник = накладная')]), 'A', 'Оставить: гл. 6 про чистые бумаги, аренду объясняет гл. 4'),
    (sketch(GATE, box + [('rect', 380, 100, 540, 140, (240, 210, 120, 255), 'RENT · PER HOUR'), ('line', 400, 140, 420, 160, WHT, 2)]), 'B', 'Без новых слов: на коробку садится тот же ценник RENT · PER HOUR из #123. Слегка спорит с «запечатано»'),
    (sketch(GATE, box + [('rect', 470, 120, 540, 320, (30, 30, 30, 255), ''), ('arrow', 505, 120, 620, 20, GRN), ('text', 20, 320, '(фраза после факт-чека)')]), 'C', 'Одна фраза про удалённую аренду в гл. 6 — только после факт-чека')], 'B')

# D21 — карточки на месте его картинок
BJ = plate('bg_beijing_office.png'); WA = plate('bg_washington_office.png'); MS = plate('bg_megaspeed_office.png', .3)
m70 = sketch(WA, [('split', BJ), ('arrow', 600, 180, 200, 180, RED)])
m183 = sketch(blank((30, 28, 24)), [('rect', 200, 20, 440, 340, (20, 20, 20, 255), '')] + [('rect', 215, 35 + i * 38, 425, 65 + i * 38, (200, 180, 120, 255), n) for i, n in enumerate(['BANK', 'LAW', 'INSURANCE', 'TRADING', 'CAPITAL', 'MEDIA', 'HOLDINGS'])] + [('rect', 215, 305, 330, 325, (90, 85, 70, 255), 'MEGASPEED · 12F', WHT, 1)])
m198 = sketch(MS, [('rect', 120, 40, 520, 300, (220, 210, 190, 255), ''), ('fig', 260, 280, 200, ''), ('fig', 380, 280, 200, '', (40, 40, 60, 255)), ('arrow', 320, 300, 320, 355, WHT)])
m212 = sketch(HALL, [('fig', 320, 320, 170, ''), ('rect', 200, 40, 440, 110, (40, 40, 40, 255), ' APR→AUG→DEC 2025', WHT)])
sheet('D21_cards_to_pictures', 'Чёрные карточки там, где у него картинка: #70, #183, #198, #212 [75, 188, 203, 217]',
      [(comp(267.9), '#84 Пекин с портретом, 4:27.9'), (comp(673.3), '#211 безымянная дверь, 11:13.3'), (comp(716.5), '#228 весы, 11:56.5')], [
    (grid([card('So, it turned out, did Beijing.'), card('one company most people had never heard of'), card('the chips were never the real prize'), card('the same case, loudly')], ['#70', '#183', '#198', '#212']), 'A',
     'Оставить все 4 карточки (плотность карточек 1.8/мин против его 2.2)'),
    (grid([m70, m183, m198, m212], ['#70 сплит Пекин', '#183 табло арендаторов', '#198 въезд в снимок', '#212 баннер APR→AUG→DEC']), 'B',
     'Все 4 — картинкой: Пекин наползает на сплит; табло MEGASPEED · 12F; камера въезжает в снимок; одна речь — три даты'),
    (grid([card('So, it turned out, did Beijing.'), m183, m198, card('the same case, loudly')], ['#70 карточка', '#183 табло', '#198 снимок', '#212 карточка']), 'C',
     'Только #183 и #198 — там 3–4 шаблона подряд; #70 и #212 остаются карточками')], 'B')

# D22 — знак «разговор» на доске
def board(ops):
    im = blank((50, 20, 18)); d = ImageDraw.Draw(im)
    for i in range(8):
        for j in range(5): d.rectangle((120 + i * 50, 30 + j * 60, 170 + i * 50, 90 + j * 60), fill=(200, 190, 170) if (i + j) % 2 else (60, 50, 45))
    return sketch(im, [('fig', 260, 230, 110, 'JENSEN'), ('rect', 380, 150, 440, 230, (240, 240, 240, 255), 'WH')] + ops)
sheet('D22_conversation_token', '«One conversation» — какой знак разговора на доске (#220 [225])', [(comp(834.1), 'красный телефон между фото Дженсена и Белого дома, 13:54.1')], [
    (board([('rect', 300, 180, 350, 220, (20, 20, 20, 255), ''), ('circle', 325, 200, 12, WHT, 2)]), 'A', 'Фигура-телефон (дисковый аппарат на подставке пешки) между фигурками'),
    (board([('dash', 290, 170, 380, 180, WHT, 4), ('text', 20, 320, 'мел: пунктир', FS)]), 'B', 'Фигурки поворачиваются друг к другу, офицер мелом проводит пунктир'),
    (board([('disc', 330, 140, 26, WHT), ('text', 312, 122, '…', FB)]), 'C', 'Фишка-облачко «…» ложится между фигурками — разговор без телефона')], 'C')

# D23 — Тайбэй, май 2025
BAR = plate('bg_taipei_bar.png', .2); CAR = plate('bg_car_interior.png')
sheet('D23_taipei_2025_video', 'Видео из Тайбэя, май 2025: «в нескольких шагах за ним» — нет в нашем тексте, нужен ФЧ', [(comp(953.7), 'видоискатель REC · TAIPEI MAY 2025, «A FEW FEET», 15:53.7')], [
    (sketch(BAR, [('text', 20, 320, 'не берём: близость уже несёт фото Computex (#145)', FS)]), 'A', 'Не брать. «Рядом» уже показывает фото с Computex'),
    (sketch(BAR, [('fig', 260, 320, 160, 'кожанка'), ('fig', 400, 320, 150, ''), ('dash', 290, 250, 380, 250, WHT, 3), ('text', 300, 220, 'A FEW FEET', FT), ('text', 20, 10, '● REC  TAIPEI · MAY 2025', FS)]), 'B', 'Новая фраза в гл. 7 после ФЧ + вставка-видоискатель'),
    (sketch(CAR, [('rect', 380, 230, 520, 320, (230, 230, 230, 255), 'TAIPEI\nMAY 2025'), ('text', 20, 320, 'распечатка на панели #230', FS)]), 'C', 'Без новой фразы: в #230 на приборной панели лежит распечатка кадра TAIPEI · MAY 2025')], 'A')

# D24 — −3 %
NEWS = plate('bg_newsroom.png', .2)
sheet('D24_minus3', 'Акции в день публикации NYT, «−3 %» — не проверено, у нас удар −13 % в гл. 9', [(comp(1002.8), 'красный монитор NVDA, плашка «−3%», 16:42.8')], [
    (sketch(NEWS, [('text', 20, 320, 'не берём', FS)]), 'A', 'Не брать: первое падение акций остаётся −13 % при отставке (#268)'),
    (sketch(NEWS, [('rect', 0, 320, 640, 350, (160, 20, 20, 230), '  NVDA ▼ ~3%   NVDA ▼ ~3%   NVDA ▼ ~3%', WHT)]), 'B', 'Фоном: бегущая строка ТВ в #242–243 «NVDA ▼ ~3%». Только после факт-чека'),
    (sketch(blank(), [('text', 200, 130, 'NVDA  −3%', FB), ('arrow', 330, 200, 330, 300, RED)]), 'C', 'Фраза в текст гл. 8 + шаблон цифры −3 %')], 'A')

# D25 — «больше, чем бизнес»
ST = plate('bg_singapore_street.png'); CR = plate('bg_closed_room.png', .3)
sheet('D25_beyond_business', '«Beyond business» — показывать ли картинкой (#246 [251]), правило 3', [(comp(1073.3), 'силуэты в окне целуются, 17:53.3')], [
    (sketch(card('the relationship had gone beyond business'), [('rect', 60, 200, 420, 214, (255, 220, 60, 160), '')]), 'A', 'Карточка + маркер по строке на «beyond business». Безопасно, плоско'),
    (sketch(ST, [('rect', 380, 80, 560, 220, (255, 200, 120, 200), ''), ('fig', 430, 210, 90, ''), ('fig', 510, 210, 90, ''), ('rect', 380, 80, 470, 220, (40, 30, 30, 220), ''), ('text', 20, 320, 'штора задёргивается', FS)]), 'B', 'Окно ужина, два силуэта, на «beyond business» штора задёргивается. Намекает на конкретную пару'),
    (sketch(CR, [('rect', 140, 30, 500, 340, (235, 230, 215, 255), 'MEMO · p.2'), ('rect', 160, 150, 480, 166, (255, 220, 60, 200), ''), ('rect', 260, 170, 460, 290, (40, 40, 40, 255), 'снимок ужина', WHT)]), 'C', 'Страница меморандума: строка подсвечивается, из-под скрепки выскальзывает снимок ужина гл. 1')], 'C')

# D26 — «Go back»
MSO = plate('bg_megaspeed_office.png'); REST = Image.open(os.path.join(L, 'refs', 'bg_restaurant_v2.png')).convert('RGB').resize((CW, CH))
sheet('D26_go_back', '«Go back to that dinner» — как показать «назад во времени» (#274 [279])', [(comp(1163.2), 'VHS «◀◀», стол сверху, 19:23.2')], [
    (sketch(REST, [('bars',), ('text', 20, 20, '◀◀', FB), ('text', 20, 320, 'VHS: 3 кадра задом, 0.4 с', FS)]), 'A', 'Его приём: «◀◀» и полосы трекинга, 3 прошлых кадра задом наперёд. Копия и не нуар (сейчас в TRANS живой #279)'),
    (sketch(MSO, [('rect', 120, 60, 260, 170, (235, 235, 230, 255), 'NOV 8'), ('rect', 260, 110, 400, 220, (235, 235, 230, 255), 'LENS'), ('thumb', 380, 150, 220, 124, REST), ('arrow', 300, 60, 200, 10, WHT), ('text', 20, 320, 'снимки дела летят обратно', FS)]), 'B',
     'Наше: на стол Megaspeed падают и улетают 3 снимка (письмо, объектив, тост); тост растёт и оживает залом'),
    (sketch(REST, [('text', 20, 320, 'наплыв 0.5 с, «тогда» = выцветший цвет #275', FS)]), 'C', 'Оставить наплыв; «тогда» несёт только выцветший тост #275')], 'B')
