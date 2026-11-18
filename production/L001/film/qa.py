# -*- coding: utf-8 -*-
"""film/qa.py — приёмка финала L001 по главам.

  python production/L001/film/qa.py sheets <video> <ch,ch> [--every 3]  -> out/qa/ch<N>_p<k>.jpg: КАЖДЫЙ 3-й кадр каждого плана
                                                                          (слои: руки, кромка стола, стулья, передний план)
                                                                       -> out/qa_ch<N>.jpg: на план 3 кадра (начало, рывок/событие, конец)
  python production/L001/film/qa.py opacity <k_dir> <w_dir>           -> out/qa/opacity.jpg + таблица: герои на чёрном и белом
                                                                          (render.mjs --stills ... --set solo=k|w), разница внутри героя
  python production/L001/film/qa.py mouths <ch,ch>                     -> таблица: кто говорит на каком плане (рот только на своих словах)
"""
import json, os, sys, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D); OUT = os.path.join(D, 'out'); QA = os.path.join(OUT, 'qa')
os.makedirs(QA, exist_ok=True)
FPS = 30
TM = json.load(open(os.path.join(L, 'animatic', 'timing.json'), encoding='utf-8')); SH = TM['shots']
WJ = json.load(open(os.path.join(L, 'animatic', 'words.json'), encoding='utf-8'))['words']
F = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 15); FB = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 18)
fmt = lambda t: f'{int(t // 60)}:{t % 60:04.1f}'

def word_at(t):
    for w in WJ:
        if w['s'] - .05 <= t <= w['e'] + .1: return f"{w['sp'][:7]}:{w['w']}"
    return '—'

def frames(video, t0, t1, every, tmp, w=384, h=216):
    """кадры видео в [t0, t1) с шагом every кадров (ffmpeg select) -> список картинок"""
    os.makedirs(tmp, exist_ok=True)
    for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
    f0, f1 = round(t0 * FPS), round(t1 * FPS)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0:.3f}', '-i', video, '-t', f'{t1 - t0:.3f}', '-vf', f"select='not(mod(n\\,{every}))',scale={w}:{h}", '-vsync', '0', os.path.join(tmp, 'f%04d.jpg')], check=True)
    fs = sorted(os.listdir(tmp)); return [(f0 + i * every, Image.open(os.path.join(tmp, f)).copy()) for i, f in enumerate(fs)]

def sheets(video, chs, every=3):
    vend = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout) - .07   # экспорт кончается раньше конца главы (граница фразы)
    for ch in chs:
        shots = [s for s in SH if s['ch'] == ch]
        # 1) каждый every-й кадр каждого плана
        tiles = []
        for s in shots:
            for fi, im in frames(video, s['start'], min(s['end'], vend), every, os.path.join(QA, 'tmp')):
                tiles.append((s, fi, im))
        cols, w, h, per = 8, 384, 216, 64
        for p in range(0, len(tiles), per):
            part = tiles[p:p + per]; rows = (len(part) + cols - 1) // cols
            c = Image.new('RGB', (cols * w, rows * (h + 20)), (14, 14, 18)); d = ImageDraw.Draw(c)
            for i, (s, fi, im) in enumerate(part):
                x, y = (i % cols) * w, (i // cols) * (h + 20)
                c.paste(im, (x, y + 20)); d.text((x + 3, y + 2), f"#{s['n']} f{fi} {fi / FPS:.2f}s {word_at(fi / FPS)}", fill=(255, 212, 138), font=F)
            c.save(os.path.join(QA, f'ch{ch}_p{p // per + 1}.jpg'), quality=88)
        # 2) на план 3 кадра: начало, рывок/событие, конец (сводный лист главы)
        rows = []
        for s in shots:
            ev = s.get('snap') or (s.get('whip') or {}).get('t') or s['dur'] * .5
            ts = [s['start'] + .05, s['start'] + min(ev + .12, s['dur'] - .1), s['end'] - .07]
            ts = [min(q, vend) for q in ts]
            ims = []
            for t in ts:
                tmp = os.path.join(QA, 'one.jpg')
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-vf', 'scale=480:270', tmp], check=True)
                ims.append((t, Image.open(tmp).copy()))
            rows.append((s, ims))
        cols = 2; w, h = 480 * 3, 270 + 26; R = (len(rows) + 1) // 2
        c = Image.new('RGB', (cols * w + 10, R * h), (14, 14, 18)); d = ImageDraw.Draw(c)
        for i, (s, ims) in enumerate(rows):
            x, y = (i % cols) * (w + 10), (i // cols) * h
            d.text((x + 4, y + 3), f"#{s['n']} {fmt(s['start'])} {s['dur']:.1f}s {s['loc']} · {s['framing'][:50]}", fill=(255, 212, 138), font=FB)
            for j, (t, im) in enumerate(ims):
                c.paste(im, (x + j * 480, y + 26)); d.text((x + j * 480 + 4, y + 30), f"{['начало', 'событие', 'конец'][j]} {fmt(t)} «{word_at(t)}»", fill=(255, 255, 255), font=F)
        c.save(os.path.join(OUT, f'qa_ch{ch}.jpg'), quality=88)
        print('ch', ch, 'tiles', len(tiles), '->', os.path.join(OUT, f'qa_ch{ch}.jpg'))

def opacity(kdir, wdir):
    """герой непрозрачен: на чёрном (k) и на белом (w) пиксели героя совпадают; где k тёмный фон — не герой"""
    ks = sorted(f for f in os.listdir(kdir) if f.endswith('.png') or f.endswith('.jpg'))
    rep, tiles = [], []
    for f in ks:
        a = Image.open(os.path.join(kdir, f)).convert('RGB'); b = Image.open(os.path.join(wdir, f.replace('k-', 'w-'))).convert('RGB')
        # маска героя: пиксель «не фон» на обоих (на чёрном не чёрный И на белом не белый)
        ga, gb = a.convert('L'), b.convert('L')
        mask = Image.eval(ImageChops.multiply(ga.point(lambda v: 255 if v > 12 else 0), gb.point(lambda v: 255 if v < 243 else 0)), lambda v: 255 if v else 0)
        diff = ImageChops.difference(a, b).convert('L')
        st = ImageStat.Stat(diff, mask); n = ImageStat.Stat(mask).sum[0] / 255
        bad = Image.eval(ImageChops.multiply(diff.point(lambda v: 255 if v > 40 else 0), mask), lambda v: v)
        nb = ImageStat.Stat(bad).sum[0] / 255
        rep.append((f, int(n), round(st.mean[0], 2) if n else 0, int(nb)))
        t = Image.new('RGB', (3 * 480, 270)); t.paste(a.resize((480, 270)), (0, 0)); t.paste(b.resize((480, 270)), (480, 0)); t.paste(Image.merge('RGB', [bad.resize((480, 270))] * 3), (960, 0)); tiles.append((f, t))
    c = Image.new('RGB', (1440, len(tiles) * 292), (14, 14, 18)); d = ImageDraw.Draw(c)
    for i, (f, t) in enumerate(tiles): c.paste(t, (0, i * 292 + 22)); d.text((4, i * 292 + 3), f'{f}: чёрный фон | белый фон | пиксели героя, которые различаются > 40 (просвечивание)', fill=(255, 212, 138), font=F)
    c.save(os.path.join(QA, 'opacity.jpg'), quality=88)
    print('кадр | пикселей героя | средняя разница внутри героя | пикселей с разницей > 40')
    for r in rep: print(' | '.join(map(str, r)))

def mouths(chs):
    print('план | кадр | кто говорит на плане (интервалы, с от начала плана)')
    for s in SH:
        if s['ch'] not in chs: continue
        ws = [w for w in WJ if s['start'] - .01 <= w['s'] < s['end'] and w['sp'] != 'NARRATOR']
        sp = {}
        for w in ws: sp.setdefault(w['sp'], []).append((round(w['s'] - s['start'], 2), round(w['e'] - s['start'], 2)))
        txt = '; '.join(f"{k}: {v[0][0]}–{v[-1][1]}" for k, v in sp.items()) or 'никто (закадр рассказчика) — рты закрыты'
        print(f"#{s['n']} | {s['framing'][:40]} | {txt}")

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'sheets': sheets(sys.argv[2], [int(x) for x in sys.argv[3].split(',')], int(sys.argv[sys.argv.index('--every') + 1]) if '--every' in sys.argv else 3)
    elif cmd == 'opacity': opacity(sys.argv[2], sys.argv[3])
    elif cmd == 'mouths': mouths([int(x) for x in sys.argv[2].split(',')])
