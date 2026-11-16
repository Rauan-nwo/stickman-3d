# -*- coding: utf-8 -*-
"""side_by_side.py: конкурент против нас по битам сюжета, лист на главу -> production/L001/refs/side_by_side_ch<N>.jpg

  python production/L001/animatic/side_by_side.py <папка кадров конкурента> <comp_shots.json> [только_главы]

Биты берутся из таблиц `compare_scenes.md` (раздел «Сверка по главам»): колонка «конкурент» даёт (C#a–b),
колонка «наши #» — номера наших планов. Кадры конкурента — середина плана (640x360, заранее извлечены в <папка>/NNN.jpg),
наши — кадры контактных листов аниматика (animatic/tmp/sheet/s-NNNN.jpg, 60 % плана; сначала render_all.mjs --sheets).
Для каждого бита пишется: когда бит начинается у конкурента и у нас (от начала ролика и от начала главы).
"""
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D)
CF, CJ = sys.argv[1], sys.argv[2]
ONLY = set(int(x) for x in sys.argv[3].split(',')) if len(sys.argv) > 3 else None
comp = json.load(open(CJ, encoding='utf-8'))
tm = json.load(open(os.path.join(D, 'timing.json'), encoding='utf-8'))['shots']
F = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 15); FB = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 17)
TW, TH, PER, CAP = 240, 135, 4, 34
fmt = lambda t: f'{int(t // 60)}:{t % 60:04.1f}'

def our_nums(cell):
    cell = re.sub(r'\(было[^)]*\)', '', cell); cell = re.sub(r'\([^)]*\)', '', cell)
    out = []
    for a, b in re.findall(r'(\d+)(?:–(\d+))?', cell):
        a = int(a); b = int(b) if b else a
        out += list(range(a, b + 1))
    return [n for n in out if 1 <= n <= len(tm)]

def beats():
    md = open(os.path.join(L, 'compare_scenes.md'), encoding='utf-8').read()
    sec = md[md.index('## Сверка по главам'): md.index('## Чего нет у нас')]
    ch, res = None, []
    for l in sec.split('\n'):
        h = re.match(r'^### Гл\. (\d+)\.', l)
        if h: ch = int(h[1]); continue
        if ch is None or not l.startswith('| ') or l.startswith('| конкурент') or l.startswith('|---'): continue
        c = [x.strip() for x in l.strip('|').split(' | ')]
        m = re.search(r'C#(\d+)(?:–(\d+))?', c[0])
        cs = list(range(int(m[1]), int(m[2] or m[1]) + 1)) if m else []
        res.append({'ch': ch, 'comp': cs, 'ours': our_nums(c[3]), 'said': re.sub(r'\s+', ' ', c[1])[:150], 'label': c[0]})
    return res

def frame_of(s):
    f = min(round((s['start'] + s['dur'] * .6) * 30), round(s['end'] * 30) - 1)
    return os.path.join(D, 'tmp', 'sheet', f's-{f:04d}.jpg')

def thumb(p):
    try: return Image.open(p).convert('RGB').resize((TW, TH))
    except Exception: return Image.new('RGB', (TW, TH), (40, 0, 0))

B = beats()
for ch in sorted({b['ch'] for b in B}):
    if ONLY and ch not in ONLY: continue
    bb = [b for b in B if b['ch'] == ch]
    ch0 = min(s['start'] for s in tm if s['ch'] == ch)
    cbs = [comp[b['comp'][0]]['a'] for b in bb if b['comp']]
    c0 = min(cbs) if cbs else 0
    blocks = []
    for b in bb:
        rows = max(1, -(-len(b['comp']) // PER), -(-len(b['ours']) // PER))
        blocks.append((b, rows))
    Wd = 2 * PER * (TW + 4) + 24; Ht = 50 + sum(56 + r * (TH + CAP) for _, r in blocks)
    img = Image.new('RGB', (Wd, Ht), (14, 14, 18)); d = ImageDraw.Draw(img)
    d.text((10, 12), f'ГЛАВА {ch}: КОНКУРЕНТ (слева) против НАС (справа), по битам сюжета', font=FB, fill=(255, 255, 255))
    y = 50; X2 = PER * (TW + 4) + 20
    for b, rows in blocks:
        ct = comp[b['comp'][0]]['a'] if b['comp'] else None; ot = tm[b['ours'][0] - 1]['start'] if b['ours'] else None
        hdr = f"{b['label'][:40]}  |  их: {fmt(ct) + f' (+{ct - c0:.0f} с в главе)' if ct is not None else '—'}   наши: {fmt(ot) + f' (+{ot - ch0:.0f} с в главе)' if ot is not None else '—'}"
        d.rectangle((0, y, Wd, y + 52), fill=(34, 30, 24)); d.text((8, y + 4), hdr, font=FB, fill=(255, 215, 90)); d.text((8, y + 28), b['said'], font=F, fill=(225, 225, 225))
        y += 56
        for k, i in enumerate(b['comp']):
            x, yy = (k % PER) * (TW + 4), y + (k // PER) * (TH + CAP)
            img.paste(thumb(os.path.join(CF, f'{i:03d}.jpg')), (x, yy))
            d.text((x + 2, yy + TH + 1), f"C#{i} {fmt(comp[i]['a'])} {comp[i]['b'] - comp[i]['a']:.1f}с", font=F, fill=(255, 215, 90))
            d.text((x + 2, yy + TH + 17), comp[i]['said'][:34], font=F, fill=(200, 200, 200))
        for k, n in enumerate(b['ours']):
            s = tm[n - 1]; x, yy = X2 + (k % PER) * (TW + 4), y + (k // PER) * (TH + CAP)
            img.paste(thumb(frame_of(s)), (x, yy))
            d.text((x + 2, yy + TH + 1), f"#{n} {fmt(s['start'])} {s['dur']:.1f}с {s['framing'][:18]}", font=F, fill=(120, 220, 255))
            d.text((x + 2, yy + TH + 17), (s['spoken'] or '—')[:34], font=F, fill=(200, 200, 200))
        d.line((X2 - 10, y, X2 - 10, y + rows * (TH + CAP)), fill=(90, 90, 90), width=2)
        y += rows * (TH + CAP)
    out = os.path.join(L, 'refs', f'side_by_side_ch{ch}.jpg'); img.save(out, quality=84)
    print(out, img.size, len(bb), 'битов')
