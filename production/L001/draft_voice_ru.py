# -*- coding: utf-8 -*-
"""Русская черновая озвучка аниматика L001 (edge-tts) — только для просмотра, не для публикации.

  C:\\Users\\velar\\.claude\\skills\\handdraw-skill\\.venv\\Scripts\\python.exe production/L001/draft_voice_ru.py

Берёт narration_ru.txt (строка в строку с narration.txt), ставит каждую строку на старт английской строки
в таймлайне аниматика (lines_draft.json + вставки тишины из animatic/timing.json), при нехватке места
ускоряет atempo (не больше 1.35×), а если и так не влезает — сдвигает следующую строку позже.
Пишет out/voice_ru.mp3 (длина = animatic_nodebug.mp4) и out/voice_ru_report.json. Кеш — out/draft_cache_ru/.
"""
import asyncio, json, os, re, subprocess, sys, hashlib
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'out'); C = os.path.join(OUT, 'draft_cache_ru')
os.makedirs(C, exist_ok=True)
SR, MAX_TEMPO, GAP = 24000, 1.35, 0.06

M, F = 'ru-RU-DmitryNeural', 'ru-RU-SvetlanaNeural'   # других ru-RU голосов в edge-tts нет
NARR = (M, '+8%', '+0Hz')
FIXED = {'HOST': (M, '-4%', '-12Hz'), 'JENSEN': (M, '+4%', '+8Hz'), 'YOUNG JENSEN': (M, '+6%', '+45Hz'),
         'ALICE': (F, '+4%', '-4Hz')}
FEMALE = {'AUNT', 'WAITRESS', 'ASSISTANT', 'FAN 2', 'CLERK', 'ACCOUNTANT 2', 'EDITOR', 'BANKER 2', 'GUIDE', 'AIDE 2'}
M_VAR = [('+6%', '-18Hz'), ('+6%', '+16Hz'), ('+10%', '-8Hz'), ('+2%', '+24Hz'), ('+8%', '-24Hz'), ('+4%', '+4Hz')]
F_VAR = [('+6%', '+0Hz'), ('+6%', '+14Hz'), ('+8%', '-12Hz'), ('+4%', '+24Hz')]
def voice(sp):
    if not sp: return NARR
    if sp in FIXED: return FIXED[sp]
    h = int(hashlib.md5(sp.encode()).hexdigest(), 16)
    if sp in FEMALE: r, p = F_VAR[h % len(F_VAR)]; return (F, r, p)
    r, p = M_VAR[h % len(M_VAR)]; return (M, r, p)

def probe(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                                capture_output=True, text=True).stdout.strip())

async def synth(text, v, rate, pitch, path):
    import edge_tts
    if os.path.exists(path + '.wav'): return
    tries = [(v, rate, pitch)] * 6 + [(M, rate, '+30Hz')]   # запасной вариант, если голос не отвечает
    for attempt, (vv, rr, pp) in enumerate(tries):
        try:
            audio = bytearray()
            async for ch in edge_tts.Communicate(text, vv, rate=rr, pitch=pp).stream():
                if ch['type'] == 'audio': audio += ch['data']
            if audio: break
        except Exception as e:
            print('retry', vv, repr(text[:40]), type(e).__name__)
        await asyncio.sleep(1 + attempt)
    else:
        raise RuntimeError('no audio: ' + text)
    open(path + '.mp3', 'wb').write(audio)
    # обрезать тишину по краям, чтобы строка начиналась ровно на своём старте
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path + '.mp3', '-af',
                    'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
                    '-ar', str(SR), '-ac', '1', path + '.wav'], check=True)

def tempo(src, t, dst):
    if not os.path.exists(dst):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f'atempo={t:.4f}', '-ar', str(SR), '-ac', '1', dst], check=True)
    return dst

async def main():
    en = [l.strip() for l in open(os.path.join(D, 'narration.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')]
    ru = [l.strip() for l in open(os.path.join(D, 'narration_ru.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')]
    ld = json.load(open(os.path.join(OUT, 'lines_draft.json'), encoding='utf-8'))
    tm = json.load(open(os.path.join(D, 'animatic', 'timing.json'), encoding='utf-8'))
    assert len(en) == len(ru) == len(ld), (len(en), len(ru), len(ld))
    tag = lambda l: (re.match(r'^\[([A-Z0-9 ]+)\]', l) or [None, ''])[1]
    for i, (a, b) in enumerate(zip(en, ru), 1): assert tag(a) == tag(b), f'строка {i}: тег {tag(a)} != {tag(b)}'
    vid = os.path.join(D, 'animatic', 'out', 'animatic_nodebug.mp4')
    total = probe(vid) if os.path.exists(vid) else tm['total']
    ins = tm['inserts']
    amap = lambda t: t + sum(x['dur'] for x in ins if x['at'] <= t)   # время voice_draft -> время аниматика
    starts = [amap(l['start']) for l in ld]

    jobs = []
    for i, l in enumerate(ru):
        m = re.match(r'^\[([A-Z0-9 ]+)\]\s*(.*)$', l); sp, text = (m.group(1), m.group(2)) if m else ('', l)
        v, rate, pitch = voice(sp)
        key = hashlib.md5(f'{v}|{rate}|{pitch}|{text}'.encode()).hexdigest()[:12]
        jobs.append((i, sp, text, v, rate, pitch, os.path.join(C, key)))
    sem = asyncio.Semaphore(3)
    async def run(j):
        async with sem: await synth(j[2], j[3], j[4], j[5], j[6])
    await asyncio.gather(*(run(j) for j in jobs))

    rep, parts, cur = [], [], 0.0
    for i, sp, text, v, rate, pitch, p in jobs:
        src = p + '.wav'; dur = probe(src)
        target = starts[i]; st = max(target, cur + (GAP if i else 0))
        nxt = starts[i + 1] if i + 1 < len(starts) else total
        avail = nxt - GAP - st
        t = 1.0
        if dur > avail:
            t = min(MAX_TEMPO, dur / max(avail, 0.01))
            src = tempo(p + '.wav', t, f'{p}_t{int(round(t * 1000))}.wav'); dur = probe(src)
        r = {'line': i + 1, 'speaker': sp or 'NARRATOR', 'voice': f'{v} {rate} {pitch}', 'text': text,
             'target': round(target, 3), 'start': round(st, 3), 'end': round(st + dur, 3), 'tempo': round(t, 3),
             'shift': round(st - target, 3), 'overrun': round(max(0, st + dur - (nxt - GAP)), 3)}
        rep.append(r); parts.append((src, st)); cur = st + dur

    lst = os.path.join(OUT, 'voice_ru_concat.txt'); t0 = 0.0
    def sil(g):
        f = os.path.join(C, f'sil_{int(round(g * 1000))}.wav')
        if not os.path.exists(f):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', f'{g:.3f}', f], check=True)
        return f
    with open(lst, 'w', encoding='utf-8') as f:
        for src, st in parts:
            if st - t0 > 0.001: f.write(f"file '{sil(st - t0)}'\n")
            f.write(f"file '{src}'\n"); t0 = st + probe(src)
        if total - t0 > 0.001: f.write(f"file '{sil(total - t0)}'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-af', f'apad,atrim=0:{total:.3f}',
                    '-c:a', 'libmp3lame', '-q:a', '3', os.path.join(OUT, 'voice_ru.mp3')], check=True)
    json.dump({'total': total, 'lines': rep}, open(os.path.join(OUT, 'voice_ru_report.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    print('animatic', round(total, 3), 'voice_ru.mp3', round(probe(os.path.join(OUT, 'voice_ru.mp3')), 3))
    print('voices:'); [print(' ', s, '->', v) for s, v in sorted({(r['speaker'], r['voice']) for r in rep})]
    fast = [r for r in rep if r['tempo'] > 1.25]; sh = [r for r in rep if r['shift'] > 0.01]
    print(f'tempo>1.25: {len(fast)}'); [print(f"  #{r['line']} x{r['tempo']} {r['text'][:60]}") for r in fast]
    print(f'shifted: {len(sh)}'); [print(f"  #{r['line']} +{r['shift']}s {r['text'][:60]}") for r in sh]
    print('tempo>1.0:', sum(r['tempo'] > 1.001 for r in rep), ' last end', rep[-1]['end'])
asyncio.run(main())
