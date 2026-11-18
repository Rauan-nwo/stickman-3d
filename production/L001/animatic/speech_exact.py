# -*- coding: utf-8 -*-
"""speech_exact.py: голос на шкале фильма против исходной записи — построчно, по самим отсчётам звука.

  python production/L001/animatic/speech_exact.py [timing.json] [голос на шкале фильма .wav]
  (по умолчанию animatic/timing.json и animatic/tmp/voice_animatic.wav — его пишет render_all.mjs; для русской версии:
   timing_ru.json и tmp/voice_animatic_ru.wav)

Для каждой строки берётся её кусок из исходной дорожки (timing.audioFile) и тот же кусок на шкале фильма (со сдвигом на
вставленную тишину). Сравниваются огибающие громкости (10 мс) и паузы внутри строки: строка цела, если огибающая совпадает (корреляция ≥ 0.95)
и в фильме внутри строки нет лишней тишины (> 30 мс). Вставка тишины внутри строки или срезанный хвост слова это ломают. Код возврата 1 при ошибке.
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
HOP = SR // 100                          # огибающая громкости 10 мс: не чувствительна к долям отсчёта после ресемплинга
env = lambda x: np.sqrt(np.add.reduceat(x.astype(np.float64) ** 2, np.arange(0, len(x) - HOP, HOP)) / HOP + 1e-6)
def pauses(e):                           # паузы внутри строки: подряд ≥ 60 мс тише −35 дБ от пика строки
    th = e.max() * 10 ** (-35 / 20); q = e < th; out = []; run = 0
    for v in q[3:-3]:
        if v: run += 1
        elif run: out.append(run); run = 0
    return [r for r in out if r >= 6]
bad = 0; worst = (1, None)
for l in LINES:
    a, b = l['start'], l['end']; sh = shift(a)
    if shift(b) - sh > 1e-6: bad += 1; print(f"! строка {l['line']} {l['speaker']}: внутри строки вставлено {shift(b) - sh:.2f} с тишины — «{l['text'][:60]}»"); continue
    x = raw[int(a * SR):int(b * SR)]; n = len(x)
    if n < SR // 5: continue
    ex = env(x); best = -1
    for d in range(-160, 161, 16):       # ±10 мс
        i0 = int((a + sh) * SR) + d
        if i0 < 0 or i0 + n > len(film): continue
        ey = env(film[i0:i0 + n]); c = float(np.corrcoef(np.log(ex), np.log(ey))[0, 1])
        if c > best: best, bey = c, ey
    if best < 0: bad += 1; print(f"! строка {l['line']}: за пределами дорожки фильма"); continue
    px, py = pauses(ex), pauses(bey)
    if best < worst[0]: worst = (best, l['line'])
    if best >= .95 and sum(py) - sum(px) > 3:   # порог пауз мог дрогнуть — подтверждаем по самим отсчётам (лаг до ±25 мс)
        i00 = int((a + sh) * SR); c = max((float(np.dot(x, film[i00 + d:i00 + d + n]) / (np.linalg.norm(x) * np.linalg.norm(film[i00 + d:i00 + d + n]) + 1e-9)), d) for d in range(-400, 401, 4) if i00 + d >= 0)
        if c[0] >= .95: px = py                 # отсчёты совпадают — лишней тишины нет
    if best < .95 or sum(py) - sum(px) > 3:   # огибающая не совпала или в фильме внутри строки на 30+ мс больше тишины
        bad += 1; print(f"! строка {l['line']} {l['speaker']}: огибающая {best:.3f}, паузы в записи {sum(px) * 10} мс, в фильме {sum(py) * 10} мс — «{l['text'][:60]}»")
print(f"{tm_path}: строк {len(LINES)}, расхождений со своей записью: {bad}; худшая корреляция {worst[0]:.4f} (строка {worst[1]})")
sys.exit(1 if bad else 0)
