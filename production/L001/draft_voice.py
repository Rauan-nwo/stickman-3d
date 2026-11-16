# -*- coding: utf-8 -*-
"""Черновая озвучка L001 для аниматика (edge-tts, бесплатно): каждая строка narration.txt своим голосом.

  C:\\Users\\velar\\.claude\\skills\\handdraw-skill\\.venv\\Scripts\\python.exe production/L001/draft_voice.py

Пишет production/L001/out/voice_draft.mp3 и out/lines_draft.json: [{line, speaker, text, start, end, words:[{w,s,e}]}].
Кеш по строкам — out/draft_cache/. Финальный голос потом — ElevenLabs (Liam), тайминги пересчитать.
"""
import asyncio, json, os, re, subprocess, sys, hashlib
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'out'); C = os.path.join(OUT, 'draft_cache')
os.makedirs(C, exist_ok=True)
NARR = 'en-US-AndrewNeural'
FIXED = {'HOST': 'en-GB-RyanNeural', 'JENSEN': 'en-US-BrianNeural', 'YOUNG JENSEN': 'en-US-AnaNeural',
         'ALICE': 'en-US-AvaNeural'}
FEMALE = {'AUNT', 'WAITRESS', 'ASSISTANT', 'FAN 2', 'CLERK', 'ACCOUNTANT 2', 'EDITOR', 'BANKER 2', 'GUIDE', 'AIDE 2'}
MALES = ['en-US-GuyNeural', 'en-US-ChristopherNeural', 'en-US-EricNeural', 'en-US-RogerNeural', 'en-US-SteffanNeural',
         'en-GB-ThomasNeural', 'en-AU-WilliamNeural']
FEMS = ['en-US-EmmaNeural', 'en-US-JennyNeural', 'en-GB-SoniaNeural', 'en-US-MichelleNeural']
def voice(sp):
    if not sp: return NARR
    if sp in FIXED: return FIXED[sp]
    h = int(hashlib.md5(sp.encode()).hexdigest(), 16)
    return (FEMS if sp in FEMALE else MALES)[h % (len(FEMS) if sp in FEMALE else len(MALES))]
GAP_NARR, GAP_LINE, GAP_CH = .2, .16, .6
RATE_NARR, RATE_CHAR = '+9%', '+4%'   # паузы: после фразы рассказчика, после реплики, перед главой

async def synth(text, v, path, rate='+0%'):
    import edge_tts
    if os.path.exists(path + '.json'): return json.load(open(path + '.json', encoding='utf-8'))
    for attempt, vv in enumerate([v, v, NARR if v != NARR else 'en-US-GuyNeural']):
        try:
            c = edge_tts.Communicate(text, vv, rate=rate, boundary='WordBoundary'); audio = bytearray(); words = []
            async for ch in c.stream():
                if ch['type'] == 'audio': audio += ch['data']
                elif ch['type'] == 'WordBoundary':
                    s = ch['offset'] / 1e7; words.append({'w': ch['text'], 's': s, 'e': s + ch['duration'] / 1e7})
            break
        except Exception as e:
            print('retry', vv, repr(text[:40]), type(e).__name__); await asyncio.sleep(2)
    else:
        raise RuntimeError('no audio: ' + text)
    open(path + '.mp3', 'wb').write(audio)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path + '.mp3'],
                               capture_output=True, text=True).stdout.strip())
    r = {'dur': dur, 'words': words}; json.dump(r, open(path + '.json', 'w', encoding='utf-8')); return r

async def main():
    lines = [l.strip() for l in open(os.path.join(D, 'narration.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')]
    # границы глав — по script.md: первая фраза каждой главы
    script = open(os.path.join(D, 'script.md'), encoding='utf-8').read()
    firsts = []
    for ch in re.split(r'\n## \d+\. ', script)[1:]:
        body = [x.strip() for x in ch.split('\n')[1:] if x.strip() and not x.startswith('[SCENE') and not x.startswith('<!--')]
        if body: firsts.append(re.sub(r'^[A-Z][A-Z0-9 ]{1,20}:\s+', '', body[0])[:25])
    res, t, parts = [], 0.0, []
    for i, l in enumerate(lines, 1):
        m = re.match(r'^\[([A-Z0-9 ]+)\]\s*(.*)$', l); sp, text = (m.group(1), m.group(2)) if m else ('', l)
        if any(text.startswith(f) for f in firsts) and i > 1: t += GAP_CH
        v = voice(sp); rate = RATE_CHAR if sp else RATE_NARR
        key = hashlib.md5(f'{v}|{rate}|{text}'.encode()).hexdigest()[:12]; p = os.path.join(C, key)
        r = await synth(text, v, p, rate)
        res.append({'line': i, 'speaker': sp or 'NARRATOR', 'voice': v, 'text': text, 'start': round(t, 3),
                    'end': round(t + r['dur'], 3), 'words': [{'w': w['w'], 's': round(t + w['s'], 3), 'e': round(t + w['e'], 3)} for w in r['words']]})
        parts.append((p + '.mp3', t)); t += r['dur'] + (GAP_LINE if sp else GAP_NARR)
        if i % 40 == 0: print(i, '/', len(lines))
    json.dump(res, open(os.path.join(OUT, 'lines_draft.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    # склейка: каждая фраза ставится на своё время (adelay), затем amix
    lst = os.path.join(OUT, 'draft_concat.txt'); sil = os.path.join(C, 'sil.wav')
    with open(lst, 'w', encoding='utf-8') as f:
        cur = 0.0
        for p, st in parts:
            gap = st - cur
            if gap > 0.001:
                g = os.path.join(C, f'sil_{int(gap*1000)}.wav')
                if not os.path.exists(g):
                    subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', f'{gap:.3f}', g])
                f.write(f"file '{g}'\n")
            w = p[:-4] + '.wav'
            if not os.path.exists(w): subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ar', '24000', '-ac', '1', w])
            f.write(f"file '{w}'\n")
            cur = st + float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', w],
                                            capture_output=True, text=True).stdout.strip())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c:a', 'libmp3lame', '-q:a', '3',
                    os.path.join(OUT, 'voice_draft.mp3')])
    print('lines', len(res), 'duration', round(t, 1), 's =', f'{int(t//60)}:{t%60:04.1f}')
    print('voices', sorted({(r['speaker'], r['voice']) for r in res if r['speaker'] != 'NARRATOR'})[:60])
asyncio.run(main())
