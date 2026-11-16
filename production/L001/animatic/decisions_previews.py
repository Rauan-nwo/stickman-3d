# -*- coding: utf-8 -*-
"""decisions_previews.py: превью решений для Рауана -> production/L001/decisions/Dnn_*.jpg
Сверху кадр(ы) конкурента, ниже варианты: кадр нашего аниматика (контактный лист, 60 % плана) или грубый набросок
поверх нашего плейта. Запуск: python decisions_previews.py <comp_video.mp4> (после render_all.mjs --sheets)."""
import json, os, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D); OUT = os.path.join(L, 'decisions'); os.makedirs(OUT, exist_ok=True)
CV = sys.argv[1]
TM = json.load(open(os.path.join(D, 'timing.json'), encoding='utf-8'))['shots']
F = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 20); FB = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 24); FS = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 18)
TMP = os.path.join(D, 'tmp', 'dec'); os.makedirs(TMP, exist_ok=True)
CW, CH = 640, 360

def comp(t):
    p = os.path.join(TMP, f'c_{t:.1f}.jpg')
    if not os.path.exists(p): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', CV, '-frames:v', '1', '-vf', f'scale={CW}:{CH}', p])
    return Image.open(p).convert('RGB')
def ours(n, at=.6):
    s = TM[n - 1]; f = min(round((s['start'] + s['dur'] * at) * 30), round(s['end'] * 30) - 1)
    p = os.path.join(D, 'tmp', 'sheet', f's-{f:04d}.jpg')
    if not os.path.exists(p):    # кадр не из листа — отрендерить
        subprocess.run(['node', os.path.join(L, '..', '..', 'engine', 'tools', 'render.mjs'), os.path.join(D, 'out', 'film.html'), os.path.join(TMP, 'x'), '--stills', str(f), '--set', 'debug=0'])
        p = os.path.join(TMP, f'x-{f:04d}.jpg')
    return Image.open(p).convert('RGB').resize((CW, CH))
def video(path, t):
    p = os.path.join(TMP, os.path.basename(path) + f'_{t}.jpg')
    if not os.path.exists(p): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', path, '-frames:v', '1', '-vf', f'scale={CW}:{CH}', p])
    return Image.open(p).convert('RGB') if os.path.exists(p) else blank()
def blank(c=(24, 22, 30)): return Image.new('RGB', (CW, CH), c)

def sketch(im, ops):      # грубый набросок поверх кадра
    im = im.copy(); d = ImageDraw.Draw(im, 'RGBA')
    for o in ops:
        k = o[0]
        if k == 'fig':      # силуэт: x, y (ноги), h, подпись
            _, x, y, h, lab = o; r = h * .14
            d.ellipse((x - r, y - h * .86 - r, x + r, y - h * .86 + r), fill=(10, 10, 16, 220), outline=(255, 214, 140, 255), width=3)
            d.rounded_rectangle((x - h * .2, y - h * .7, x + h * .2, y - h * .15), radius=int(h * .1), fill=(10, 10, 16, 220), outline=(255, 214, 140, 255), width=3)
            if lab: d.text((x - h * .4, y - h * .1), lab, font=FS, fill=(255, 230, 160, 255))
        elif k == 'rect':   # x0, y0, x1, y1, цвет, подпись
            _, x0, y0, x1, y1, col, lab = o; d.rectangle((x0, y0, x1, y1), fill=col, outline=(20, 20, 20, 255), width=3)
            if lab: d.text((x0 + 6, y0 + 4), lab, font=FS, fill=(20, 20, 20, 255))
        elif k == 'lens':   # x, y, r — объектив с бликом
            _, x, y, r = o; d.ellipse((x - r, y - r, x + r, y + r), fill=(15, 15, 20, 255), outline=(200, 200, 210, 255), width=4)
            d.ellipse((x - r * .35, y - r * .5, x - r * .05, y - r * .2), fill=(255, 255, 255, 230))
        elif k == 'glow':   # x, y, r, rgb
            _, x, y, r, rgb = o
            for i in range(8, 0, -1): d.ellipse((x - r * i / 8, y - r * i / 8, x + r * i / 8, y + r * i / 8), fill=rgb + (int(40 * (9 - i) / 8),))
        elif k == 'text':
            _, x, y, txt = o; d.text((x, y), txt, font=FB, fill=(255, 240, 200, 255), stroke_width=3, stroke_fill=(0, 0, 0, 255))
        elif k == 'frame':  # рамка видоискателя
            _, m = o; c = (255, 255, 255, 230)
            for (x, y, sx, sy) in [(m, m, 1, 1), (CW - m, m, -1, 1), (m, CH - m, 1, -1), (CW - m, CH - m, -1, -1)]:
                d.line((x, y + sy * 40, x, y, x + sx * 40, y), fill=c, width=4)
            d.ellipse((m + 14, m + 14, m + 28, m + 28), fill=(230, 40, 40, 255)); d.text((m + 34, m + 10), 'REC', font=FS, fill=c)
        elif k == 'split':  # склейка двух кадров пополам
            _, other = o; im.paste(other.resize((CW // 2, CH)).crop((0, 0, CW // 2, CH)), (CW // 2, 0)); d = ImageDraw.Draw(im, 'RGBA'); d.line((CW // 2, 0, CW // 2, CH), fill=(0, 0, 0, 255), width=6)
    return im

def sheet(code, title, his, opts, rec):
    cols = max(len(his), len(opts)); W = cols * (CW + 10) + 10
    rows_txt = 74
    H = 60 + CH + 40 + (CH + rows_txt) + 60
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
    p = os.path.join(OUT, f'{code}.jpg'); im.save(p, quality=86); print(p)

CITY = os.path.join(L, 'scenes', 'city', 'out', 'city_singapore.mp4')
REST = ours(1)
# D01 — слежка с первых секунд
sheet('D01_surveillance', 'Слежка видна с первых секунд', [(comp(13.8), 'объектив в окне отеля, 0:13'), (comp(17.7), 'агенты фотографируют, снимки, 0:17')], [
    (sketch(REST, [('fig', 470, 230, 110, 'АГЕНТ'), ('rect', 430, 140, 500, 200, (230, 220, 190, 230), 'MENU'), ('lens', 462, 168, 14), ('text', 20, 300, 'агент в зале за меню')]), 'A',
     'Агент в зале за дальним столиком, камера за меню; POV через объектив, щелчок, стоп-кадр; официант проходит между ними'),
    (sketch(ours(13), [('lens', 520, 150, 40), ('text', 20, 300, 'машина через улицу, телеобъектив')]), 'B', 'Агенты в машине через улицу (как сейчас в тексте): телеобъектив сквозь мокрое стекло'),
    (sketch(REST, [('fig', 470, 230, 110, 'АГЕНТ'), ('lens', 462, 168, 14), ('split', ours(13)), ('text', 20, 300, 'зал фотографирует | машина слушает')]), 'C',
     'Оба: агент в зале фотографирует (#1, #3, #15–16), машина с наушниками слушает (#12–14, #18); монтаж между ними')], 'C')
# D02 — чип под столом
sheet('D02_chip_under_table', 'Чип под столом на «Her company buys his chips»', [(comp(28.5), 'под столом рука Дженсена передаёт чип, «$ BILLIONS»')], [
    (ours(10), 'A', 'Низкий ракурс у края стола: рука в перчатке со стороны Алисы просовывает светящийся чип под скатерть; лица нет (#10)'),
    (sketch(ours(8), [('rect', 260, 260, 420, 330, (40, 140, 70, 230), 'VIP CUSTOMER'), ('text', 20, 300, 'ящик под столом')]), 'B', 'Без руки: под столом ящик Nvidia с биркой VIP CUSTOMER, его ногой подвигают к стороне Алисы'),
    (sketch(REST, [('glow', 320, 300, 120, (80, 255, 140)), ('text', 20, 300, 'свечение сквозь скатерть')]), 'C', 'Только свет: под скатертью загорается зелёное свечение, бокалы над ним; без рук и людей')], 'A')
# D03 — «самая дорогая компания»
sheet('D03_most_valuable', '«The most valuable company on Earth»', [(comp(1.5), 'карта, башни компаний, Nvidia выше всех')], [
    (ours(2), 'A', 'Шаблон: горизонт башен-компаний, зелёная NVIDIA вырастает выше всех, «#1» (#2, повтор в #70)'),
    (video(CITY, 1) if os.path.exists(CITY) else blank(), 'B', 'Тот же образ в 3D: наш набор города, ночной Сингапур, одна зелёная башня растёт и обгоняет'),
    (sketch(blank(), [('text', 40, 150, 'карта мира с башнями — его идея')]), 'C', 'Как у него: карта мира со столбиками — слишком близко к его кадру, не советую')], 'B')
# D04 — кухня/повара
sheet('D04_cooks', 'Сравнение «один повар против тысяч»', [(comp(190), 'сплит: один повар | поле поваров')], [
    (ours(53), 'A', 'Провал сквозь монитор в чип, кухня вырастает из кристалла — явное «представьте» (#53–55)'),
    (sketch(ours(54), [('split', ours(55)), ('text', 20, 300, 'сплит как у него')]), 'B', 'Сплит-экран один повар | тысячи поваров'),
    (sketch(ours(53), [('text', 20, 300, 'сплит, потом провал в чип')]), 'C', 'Сначала сплит, потом камера проваливается в правую половину — в чип')], 'A')
# D05 — вербовка/куратор (правило 3)
sheet('D05_handler', 'Сцена с куратором (у него Алиса у куратора)', [(comp(346), 'Алиса в кабинете куратора, «So what do I steal?»')], [
    (ours(98), 'A', 'Как сейчас: безликие офицеры, замок, визитка на фото, карточка «Why pick a lock…» (#96–101)'),
    (sketch(ours(99), [('rect', 360, 120, 600, 280, (240, 235, 220, 235), 'TARGET: J. HUANG'), ('text', 20, 300, 'досье без лица Алисы')]), 'B', 'Офицеры раскрывают досье «TARGET: J. HUANG» — без Алисы, без слов о вербовке'),
    (sketch(ours(236), [('text', 20, 300, 'ACCORDING TO A 2026 U.S. MEMO')]), 'C', 'Вспышка вперёд: строка меморандума с пометкой «по меморандуму 2026» (нужна строка в тексте)')], 'A')
# D06 — аренда: книга вместо машин
sheet('D06_rent_analogy', 'Аренда вместо продажи', [(comp(400), 'машины у границы, ключи по часам')], [
    (ours(119), 'A', 'Как сейчас: книга через окно соседа, монета в банку «PER PAGE» (#119–121)'),
    (sketch(ours(119), [('text', 20, 300, '3D-диорама: дом соседа, окно, фонарик')]), 'B', 'То же в 3D-диораме: дом соседа, луч фонарика, страницы у стекла'),
    (sketch(blank(), [('text', 40, 150, 'машины за границей — его гэг')]), 'C', 'Машины у границы — копирует его идею, не советую')], 'A')
# D07 — пекарня вместо лимонада
sheet('D07_bakery', 'Рост в 90 раз «на бытовом примере»', [(comp(545), 'лимонадный ларёк $33 → $3000')], [
    (ours(161), 'A', 'Как сейчас: пекарня, мешки муки растут до крыши, соседи заглядывают (#161)'),
    (sketch(ours(161), [('text', 20, 300, 'копилка трескается от монет')]), 'B', 'Копилка ребёнка раздувается и трескается'),
    (sketch(blank(), [('text', 40, 150, 'лимонад — его гэг')]), 'C', 'Лимонадный ларёк — копирует его, не советую')], 'A')
# D08 — Вашингтон меняет решения
sheet('D08_flipflop', 'Вашингтон меняет решения', [(comp(730), 'доска «BLOCKED / 15% / 25%», «bigger whiteboard»')], [
    (ours(202), 'A', 'Как сейчас: доска с датами APR/AUG/DEC + календарь Дженсена листается сам (#202–211)'),
    (sketch(ours(205), [('text', 20, 240, 'места нет — пишет на стене и окне'), ('rect', 420, 60, 620, 120, (255, 255, 255, 200), '25%!!')]), 'B', 'Наш гэг: на доске кончилось место, чиновник дописывает «25%» на стене и на стекле окна'),
    (sketch(blank(), [('text', 40, 150, 'флюгер на Капитолии — метафора')]), 'C', 'Флюгер — буквальная метафора (правило 1), не советую')], 'B')
# D09 — контрабандисты
sheet('D09_smugglers', 'Настоящие контрабандисты против накладных', [(comp(673), 'чипы рядом с живыми лобстерами')], [
    (ours(194), 'A', 'Как сейчас: чемодан контрабандиста лопается на таможне, рядом спокойно едет грузовик (#194–196)'),
    (sketch(ours(194), [('text', 20, 300, '917 изъятых серверов (если A5 утвердят)')]), 'B', 'Плюс строка A5 из script_v2_draft: склад изъятых серверов с биркой «917»'),
    (sketch(blank(), [('text', 40, 150, 'лобстеры — его гэг')]), 'C', 'Лобстеры — его находка из новостей, не повторяем')], 'A')
# D10 — снятие маски с имени
sheet('D10_unmasking', '«An American citizen» → имя', [(comp(605), 'отчёт: [AN AMERICAN CITIZEN] → JENSEN HUANG')], [
    (ours(4), 'A', 'Не берём (нет факта в нашем факт-чеке); в папке #4 строка «Contacts include ███»'),
    (sketch(ours(4), [('text', 20, 300, 'в гл. 9 плашка срывается: J. HUANG')]), 'B', 'Только картинкой: в гл. 9 на той же папке чёрная плашка срывается — под ней «J. HUANG» (нужен факт-чек)')], 'A')
# D11 — «Nobody told the man at the table»
sheet('D11_nobody_told', '«Nobody told the man at the table»', [(comp(1060), 'окно ресторана снаружи, двое у свечи')], [
    (ours(257), 'A', 'Вид из машины агентов на смеющегося Дженсена (#257)'),
    (sketch(REST, [('lens', 120, 90, 60), ('frame', 30), ('text', 20, 300, 'объектив из зала, как в начале')]), 'B', 'Если D01 = A или C: тот же объектив из-за меню, тот же стол — повтор кадра хука')], 'B')
# D12 — твои деньги
sheet('D12_your_money', 'Почему это касается зрителя', [(comp(1106), '«$8 из каждых $100» индексного фонда')], [
    (ours(271), 'A', 'Как сейчас: экран «YOUR RETIREMENT ACCOUNT — S&P 500», кусок NVDA краснеет (без цифры доли) (#271)'),
    (sketch(ours(271), [('text', 20, 300, '+ доля NVDA в индексе (нужен факт-чек)')]), 'B', 'С точной долей Nvidia в S&P 500 — только после факт-чека')], 'A')
# D13 — финал
sheet('D13_ending', 'Последний кадр', [(comp(1185), 'письмо «proud to be an American», флаг')], [
    (ours(281), 'A', 'Как сейчас: тот же латунный ключ ложится в сейф, щелчок, лампа гаснет (#280–283)'),
    (sketch(ours(281), [('text', 20, 300, 'на сейфе — снимок агентов из хука')]), 'B', 'Плюс отыгрыш хука: рядом с сейфом лежит снимок «Дженсен + Алиса» из #16, лампа гаснет на нём')], 'B')
