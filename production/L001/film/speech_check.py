# -*- coding: utf-8 -*-
"""film/speech_check.py — речь не рвётся: паузы внутри реплик на шкале фильма не длиннее, чем в самой записи голоса.
  python production/L001/film/speech_check.py [--ch 0,1] [--tol 0.06] [--whisper production/L001/film/out/ch0_1_voice.wav]
1) Для каждой строки lines json (та, по которой сделан тайминг — animatic/words.json.lines): пауза между соседними словами в записи
   и та же пауза на шкале фильма (words.json). Разница > tol — в строку вставлена тишина (make_timing растянул план): печатается где и сколько.
2) --whisper <wav голоса на шкале фильма>: распознаёт дорожку и сверяет слова реплик героев (не рассказчика) — все на месте, начало слова ±0.15 с."""
import json, os, re, sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D)
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
CH = [int(x) for x in arg('--ch', '0,1').split(',')]; TOL = float(arg('--tol', '0.06'))
TM = json.load(open(os.path.join(L, 'animatic', 'timing.json'), encoding='utf-8')); WJ = json.load(open(os.path.join(L, 'animatic', 'words.json'), encoding='utf-8'))
LINES = json.load(open(os.path.join(L, WJ['lines']), encoding='utf-8'))
sh = [s for s in TM['shots'] if s['ch'] in CH]; T0, T1 = sh[0]['start'], sh[-1]['end']
film = {}
for w in WJ['words']: film.setdefault(w['line'], []).append(w)
bad = 0; n = 0
for li, l in enumerate(LINES, 1):
    fw = film.get(li, [])
    if not fw or fw[0]['s'] < T0 - .01 or fw[0]['s'] >= T1: continue
    for a, b, fa, fb in zip(l['words'], l['words'][1:], fw, fw[1:]):
        n += 1; gv, gf = b['s'] - a['e'], fb['s'] - fa['e']
        if gf - gv > TOL:
            bad += 1; print(f"! строка {li} {l['speaker']}: «{a['w']} | {b['w']}» — в записи пауза {gv:.2f} с, в фильме {gf:.2f} с (+{gf - gv:.2f}) на {fa['e']:.2f} с")
print(f"строк в гл. {CH}: {sum(1 for li in film if film[li][0]['s'] >= T0 - .01 and film[li][0]['s'] < T1)}; стыков слов {n}; растянутых пауз внутри реплик: {bad}")
wav = arg('--whisper')
if wav:
    from faster_whisper import WhisperModel
    norm = lambda w: re.sub(r"[^a-z0-9]", '', w.lower().replace("'", '').replace('’', ''))
    m = WhisperModel('small', device='cpu', compute_type='int8'); miss = 0; tot = 0
    import subprocess, tempfile
    for li, fw in sorted(film.items()):
        sp = fw[0]['sp']
        if sp == 'NARRATOR' or fw[0]['s'] < T0 - .01 or fw[0]['s'] >= T1: continue
        a, b = max(0, fw[0]['s'] - T0 - .4), fw[-1]['e'] - T0 + .5; tmp = os.path.join(tempfile.gettempdir(), 'sc_line.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', wav, '-ac', '1', '-ar', '16000', tmp], check=True)
        segs, _ = m.transcribe(tmp, word_timestamps=True, language='en'); got = [(norm(w.word), w.start + a + T0) for s in segs for w in s.words]
        heard = ' '.join(g[0] for g in got); k = 0
        for w in fw:
            tot += 1; key = norm(w['w']); alt = {'thirty': '30'}.get(key, key); j = next((q for q in range(k, len(got)) if got[q][0] in (key, alt)), None)
            if j is None: miss += 1; print(f"! строка {li} {sp}: слово «{w['w']}» ({w['s']:.2f} с) не распознано; услышано: {heard}")
            else:
                if abs(got[j][1] - w['s']) > .15 and j > 0: print(f"  строка {li} {sp}: «{w['w']}» по таймингу {w['s']:.2f}, по whisper {got[j][1]:.2f}")
                k = j + 1
    print(f"whisper: слов в репликах героев {tot}, не распознано {miss}")
sys.exit(1 if bad else 0)
