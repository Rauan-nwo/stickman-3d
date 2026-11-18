# -*- coding: utf-8 -*-
"""speech_exact.py: голос на шкале фильма против исходной записи — построчно, по самим отсчётам звука.

  python production/L001/animatic/speech_exact.py [timing.json] [голос на шкале фильма .wav]
  (по умолчанию animatic/timing.json и animatic/tmp/voice_animatic.wav — его пишет render_all.mjs; для русской версии:
   timing_ru.json и tmp/voice_animatic_ru.wav)

Для каждой строки берётся её кусок из исходной дорожки (timing.audioFile) и тот же кусок на шкале фильма (со сдвигом на
вставленную тишину). Считается корреляция отсчётов и отношение энергий: строка цела, если корреляция ≥ 0.98 и энергия
в пределах ±10 %. Любая вставка тишины внутри строки или срезанный хвост слова роняют корреляцию. Код возврата 1 при ошибке.
"""
import json, os, subprocess, sys
import numpy as np
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D); SR = 16000
tm_path = sys.argv[1] if len(sys.argv) > 1 else 'timing.json'
TM = json.load(open(os.path.join(D, tm_path), encoding='utf-8'))
film_wav = sys.argv[2] if len(sys.argv) > 2 else os.path.join(D, 'tmp', 'voice_animatic.wav')
LINES = json.load(open(os.path.join(L, TM['linesFile']), encoding='utf-8'))


def pcm(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float32)


raw, film = pcm(os.path.join(L, TM['audioFile'])), pcm(film_wav)
ins = TM['inserts']; shift = lambda t: sum(x['dur'] for x in ins if x['at'] <= t)
bad = 0; worst = (1, None)
for l in LINES:
    a, b = l['start'], l['end']; sh = shift(a)
    if shift(b) - sh > 1e-6: bad += 1; print(f"! строка {l['line']} {l['speaker']}: внутри строки вставлено {shift(b) - sh:.2f} с тишины — «{l['text'][:60]}»"); continue
    x = raw[int(a * SR):int(b * SR)]; n = len(x)
    if n < SR // 10: continue
    best = -1
    for d in range(-40, 41, 2):            # ±2.5 мс на округления и задержку ресемплера
        i0 = int((a + sh) * SR) + d
        if i0 < 0 or i0 + n > len(film): continue
        y = film[i0:i0 + n]; c = float(np.dot(x, y) / (np.linalg.norm(x) * np.linalg.norm(y) + 1e-9))
        if c > best: best, by = c, y
    if best < 0: bad += 1; print(f"! строка {l['line']}: за пределами дорожки фильма"); continue
    er = float(np.sum(by ** 2) / (np.sum(x ** 2) + 1e-9))
    if best < worst[0]: worst = (best, l['line'])
    if best < .98 or not .9 < er < 1.1:
        bad += 1; print(f"! строка {l['line']} {l['speaker']}: корреляция {best:.3f}, энергия ×{er:.2f} — «{l['text'][:60]}»")
print(f"{tm_path}: строк {len(LINES)}, расхождений со своей записью: {bad}; худшая корреляция {worst[0]:.4f} (строка {worst[1]})")
sys.exit(1 if bad else 0)
