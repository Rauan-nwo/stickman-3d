# -*- coding: utf-8 -*-
"""qa.py: покадровая приёмка готового аниматика L001.

  python production/L001/animatic/qa.py sheets [video]      -> out/qa_ch<N>.jpg (+ _p2, _p3 …): на каждый план 3 кадра
                                                               (начало, рывок/событие, конец) с временем и звучащим словом
  python production/L001/animatic/qa.py auto <anim.npz> [video] [ru.mp4]
                                                            -> автопроверки: длина, чёрные кадры, всплески разницы вне склеек,
                                                               синхрон реплик с планом говорящего, план-регрессия против HEAD
  python production/L001/animatic/qa.py frames <секунды через запятую> <out.jpg> [video]   -> полоска кадров ±5 вокруг моментов
По умолчанию video = animatic/out/animatic_nodebug.mp4. anim.npz — из dynamics/tools/analyze.py по этому же видео.
"""
import json, os, re, subprocess, sys, bisect
from PIL import Image, ImageDraw, ImageFont
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D); OUT = os.path.join(D, 'out')
FPS = 30
TM = json.load(open(os.path.join(D, 'timing.json'), encoding='utf-8')); SH = TM['shots']
F = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 16); FB = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 18)
fmt = lambda t: f'{int(t // 60)}:{t % 60:04.1f}'
VID = os.path.join(OUT, 'animatic_nodebug.mp4')

# ---- слова чернового голоса на шкале аниматика (вставки тишины из timing.inserts)
LINES = json.load(open(os.path.join(L, TM.get('linesFile', 'out/lines_draft.json')), encoding='utf-8'))   # голос, по которому сделан timing.json
INS = TM['inserts']
def to_anim(t): return t + sum(x['dur'] for x in INS if x['at'] <= t)
WORDS = []
for li, l in enumerate(LINES):
    for w in l['words']: WORDS.append((to_anim(w['s']), to_anim(w['e']), w['w'], li))
WS = [w[0] for w in WORDS]
def word_at(t):
    i = bisect.bisect_right(WS, t) - 1
    if i >= 0 and WORDS[i][1] + .15 >= t: return WORDS[i][2]
    return '—'
def shot_at(t):
    for s in SH:
        if s['start'] <= t < s['end']: return s
    return SH[-1]

def event_moment(s):
    d = s['dur']
    if s.get('whip'): return s['whip']['t'] + .12, 'вип'
    if s.get('snap') is not None and 'статично' not in s['camera']: return s['snap'] + .1, 'рывок'
    if s['loc'] in ('T-card',): return d * .6, 'карточка дописана'
    return min(d - .2, max(.45, d * .42) + .1), 'событие'

def grab(video, frames, outdir, w=480, h=270):
    import cv2                                   # один последовательный проход по видео (длинный select ffmpeg не тянет)
    os.makedirs(outdir, exist_ok=True); want = sorted(set(frames)); out = {}; cap = cv2.VideoCapture(video); n = 0; k = 0
    while k < len(want):
        ok = cap.grab()
        if not ok: break
        if n == want[k]:
            _, im = cap.retrieve(); p = os.path.join(outdir, f'g{n:06d}.jpg')
            cv2.imwrite(p, cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88]); out[n] = p; k += 1
        n += 1
    cap.release(); return out

def sheets(video):
    last = round(TM['total'] * FPS) - 1; plan = []
    for s in SH:
        a, b = round(s['start'] * FPS), round(s['end'] * FPS) - 1
        tm, lab = event_moment(s)
        for kind, f in (('начало', a + 2), (lab, a + round(tm * FPS)), ('конец', b - 2)):
            plan.append((s, kind, min(max(a, f), b, last)))
    got = grab(video, [p[2] for p in plan], os.path.join(D, 'tmp', 'qa'))
    TW, TH, CAP, PER = 480, 270, 46, 12
    for ch in sorted(set(s['ch'] for s in SH)):
        rows = [s for s in SH if s['ch'] == ch]
        for pg in range(0, len(rows), PER):
            part = rows[pg:pg + PER]; nrow = (len(part) + 1) // 2
            img = Image.new('RGB', (2 * (3 * TW + 20) + 10, nrow * (TH + CAP + 8) + 10), (16, 16, 20)); d = ImageDraw.Draw(img)
            for i, s in enumerate(part):
                x0, y0 = 10 + (i % 2) * (3 * TW + 20), 10 + (i // 2) * (TH + CAP + 8)
                d.text((x0, y0), f"#{s['n']} {fmt(s['start'])} {s['dur']:.1f}s {s['loc']} · {s['framing'][:46]}", fill=(255, 212, 138), font=FB)
                for j, (ss, kind, f) in enumerate([p for p in plan if p[0] is s]):
                    t = f / FPS; im = Image.open(got[f]); img.paste(im, (x0 + j * TW, y0 + CAP - 22))
                    d.rectangle([x0 + j * TW, y0 + CAP - 22, x0 + j * TW + TW - 1, y0 + CAP - 22 + 20], fill=(0, 0, 0))
                    d.text((x0 + j * TW + 4, y0 + CAP - 21), f"{kind} {fmt(t)} «{word_at(t)}»", fill=(255, 255, 255), font=F)
            name = f'qa_ch{ch}.jpg' if pg == 0 else f'qa_ch{ch}_p{pg // PER + 1}.jpg'
            img.save(os.path.join(OUT, name), quality=86); print(name, len(part))

def strip(times, out, video):
    fr = []
    for t in times:
        c = round(t * FPS); fr += [(t, c + k) for k in range(-5, 6)]
    got = grab(video, [f for _, f in fr], os.path.join(D, 'tmp', 'qa_strip'), 320, 180)
    img = Image.new('RGB', (11 * 324, len(times) * 206), (16, 16, 20)); d = ImageDraw.Draw(img)
    for r, t in enumerate(times):
        for k in range(11):
            f = round(t * FPS) - 5 + k; img.paste(Image.open(got[f]), (k * 324, r * 206 + 22))
            d.text((k * 324 + 4, r * 206 + 2), f"{fmt(f / FPS)} f{f} #{shot_at(f / FPS)['n']}", fill=(255, 212, 138), font=F)
    img.save(out, quality=86); print(out)

def probe(p, stream):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', stream, '-count_packets', '-show_entries', 'stream=nb_read_packets,duration,r_frame_rate', '-of', 'json', p], capture_output=True, text=True)
    try:
        st = json.loads(r.stdout)['streams'][0]
        if stream.startswith('v'): a, b = st['r_frame_rate'].split('/'); return round(int(st['nb_read_packets']) * int(b) / int(a), 3)
        return float(st['duration'])
    except Exception: return None
    try: return float(r.stdout.strip().split('\n')[0])
    except Exception: return None

def auto(npz, video, ru):
    import numpy as np
    rep = {}
    # 1. длина
    rep['duration'] = dict(timing=round(TM['total'], 3), video=probe(video, 'v:0'), audio=probe(video, 'a:0'),
                           ru_video=probe(ru, 'v:0') if ru else None, ru_audio=probe(ru, 'a:0') if ru else None)
    d = np.load(npz); N = len(d['luma']); luma, lstd, diff = d['luma'], d['lstd'], d['diff']
    cuts = [round(s['start'] * FPS) for s in SH[1:]]
    near = np.zeros(N, bool)
    for c in cuts: near[max(0, c - 2):c + 3] = True
    # ожидаемые всплески внутри плана: рывок, вип, вспышка, переход, засвет перед титром
    exp = np.zeros(N, bool)
    conf = open(os.path.join(D, 'conf.js'), encoding='utf-8').read(); conf = conf[conf.index('export const TRANS'):]
    trans = {int(n): k for n, k in re.findall(r"(\d+): '(\w+)'", conf[:conf.index('};')])}
    for s in SH:
        a = round(s['start'] * FPS)
        for t in ([s['snap']] if s.get('snap') is not None else []) + ([s['whip']['t']] if s.get('whip') else []):
            exp[max(0, a + round(t * FPS) - 3):a + round(t * FPS) + 6] = True
        if s['n'] in trans: exp[a:a + 16] = True
        if re.search('вспышк|щелч|снимк|фото|flash', s['event'] + s['framing']): exp[a:round(s['end'] * FPS)] = True
    nx = {s['n']: i for i, s in enumerate(SH)}
    for n, k in trans.items():
        if k == 'white' and nx.get(n): p = SH[nx[n] - 1]; exp[round((p['end'] - .3) * FPS):round(p['end'] * FPS)] = True
    # 2. чёрные кадры (не на карточке и не в намеренном затемнении в конце)
    black = [i for i in range(N) if luma[i] < 6 and lstd[i] < 3]
    rep['black_frames'] = [dict(f=i, t=fmt(i / FPS), shot=shot_at(i / FPS)['n']) for i in black]
    # 3. всплески разницы вне склеек и вне ожидаемых событий
    sp = []
    for i in range(3, N - 3):
        if near[i] or exp[i]: continue
        base = max(np.median(diff[max(0, i - 8):i]), 1.0)
        if diff[i] > 14 and diff[i] > 5 * base: sp.append(i)
    rep['diff_spikes'] = [dict(f=i, t=fmt(i / FPS), shot=shot_at(i / FPS)['n'], diff=round(float(diff[i]), 1)) for i in sp]
    # 4. синхрон: реплика персонажа -> план под серединой первых слов
    sync = []
    for li, l in enumerate(LINES):
        if not l.get('speaker') or l['speaker'] == 'NARRATOR': continue
        w = l['words']; t0 = to_anim(w[0]['s']); t1 = to_anim(w[min(len(w) - 1, 2)]['e']); tm = (t0 + t1) / 2
        s = shot_at(tm); spk = l['speaker']
        ok = s['text'].startswith(spk + ':') or (s.get('whip') and spk in (s['whip']['from'], s['whip']['to'])) or spk + ':' in s['text']
        sync.append(dict(line=li, speaker=spk, t=fmt(t0), shot=s['n'], ok=bool(ok), shot_text=s['text'][:50]))
    rep['sync_total'] = len(sync); rep['sync_bad'] = [x for x in sync if not x['ok']]
    # 5. регрессия: что изменилось в планах против HEAD (283 плана) через карту 283 -> 288
    try:
        head = json.loads(subprocess.run(['git', 'show', 'HEAD:production/L001/animatic/timing.json'], capture_output=True, cwd=L).stdout.decode('utf-8'))['shots']
        mp = json.load(open(os.path.join(D, 'renumber_283_to_288.json')))
        for nxt in ('renumber_288_to_297.json', 'renumber_297_to_298.json', 'renumber_298_to_329.json', 'renumber_329_to_340.json', 'renumber_340_to_341.json', 'renumber_341_to_342.json', 'renumber_342_to_351.json', 'renumber_351_to_352.json'):            # цепочка карт: номер HEAD (283) -> текущий
            m2 = json.load(open(os.path.join(D, nxt))); mp = {k: (m2.get(str(v)) if v is not None else None) for k, v in mp.items()}
        cur = {s['n']: s for s in SH}; ch = []
        for h in head:
            n = mp.get(str(h['n']))
            if n is None: ch.append(dict(old=h['n'], new=None, what='удалён')); continue
            c = cur[n]; diffs = [k for k in ('loc', 'framing', 'event', 'camera', 'text') if h.get(k) != c.get(k)]
            if abs(h['start'] - c['start']) > .05: diffs.append(f"start {h['start']:.1f}->{c['start']:.1f}")
            if diffs: ch.append(dict(old=h['n'], new=n, what=', '.join(diffs)))
        added = sorted(set(cur) - set(v for v in mp.values() if v))
        rep['regression'] = dict(changed=ch, added=added)
    except Exception as e:
        rep['regression'] = str(e)
    json.dump(rep, open(os.path.join(OUT, 'qa_auto.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(rep['duration'], ensure_ascii=False)); print('black', len(rep['black_frames']), 'spikes', len(rep['diff_spikes']),
          'sync bad', len(rep['sync_bad']), '/', rep['sync_total'])
    if isinstance(rep['regression'], dict): print('regression changed', len(rep['regression']['changed']), 'added', rep['regression']['added'])

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'sheets': sheets(sys.argv[2] if len(sys.argv) > 2 else VID)
    elif cmd == 'auto': auto(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else VID, sys.argv[4] if len(sys.argv) > 4 else None)
    elif cmd == 'frames': strip([float(x) for x in sys.argv[2].split(',')], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else VID)
