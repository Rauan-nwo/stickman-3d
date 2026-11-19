# -*- coding: utf-8 -*-
"""Поиск провалов звука в дорожке озвучки: тишина ВНУТРИ реплики, слишком тихие реплики, обрезанные концы.
  python check_dropouts.py <audio> <lines.json> [--thr -45] [--min 0.25]
Печатает таблицу подозрительных мест (время, строка, говорящий, что не так)."""
import json, subprocess, sys, re
import numpy as np

audio, lines_path = sys.argv[1], sys.argv[2]
thr = float(sys.argv[sys.argv.index('--thr') + 1]) if '--thr' in sys.argv else -45.0
mind = float(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 0.25
SR = 16000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
hop = int(SR * 0.02)
n = len(x) // hop
rms = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)
db = 20 * np.log10(rms)
L = json.load(open(lines_path, encoding='utf-8'))
print(f'{audio}: {len(x)/SR:.1f} s, строк {len(L)}, порог {thr} dB, мин. провал {mind} s')
issues = []
levels = []
for l in L:
    a, b = int(l['start'] / 0.02), min(n, int(l['end'] / 0.02))
    if b - a < 3: continue
    seg = db[a:b]
    loud = seg[seg > thr]
    lvl = float(loud.mean()) if len(loud) else -99.0
    levels.append((l['line'], lvl))
    # тишина внутри реплики (не считая краёв по 0.1 с)
    quiet = seg < thr
    i = 5
    while i < len(quiet) - 5:
        if quiet[i]:
            j = i
            while j < len(quiet) - 5 and quiet[j]: j += 1
            d = (j - i) * 0.02
            if d >= mind:
                t = l['start'] + i * 0.02
                # какое слово рядом
                w = ''
                for k, ww in enumerate(l.get('words', [])):
                    if ww['s'] >= t:
                        w = (l['words'][k - 1]['w'] if k else '') + ' | ' + ww['w']; break
                issues.append((t, l['line'], l['speaker'], f'тишина {d:.2f} с внутри реплики (между: {w})'))
            i = j
        else:
            i += 1
    # обрезан конец: громко прямо на последнем кадре
    if seg[-1] > thr + 20 and (b >= n or db[min(n - 1, b + 1)] < thr):
        issues.append((l['end'], l['line'], l['speaker'], 'возможен обрыв в конце реплики (резкий срез)'))
med = np.median([v for _, v in levels])
for (ln, lvl), l in zip(levels, [q for q in L if int(q['end'] / 0.02) - int(q['start'] / 0.02) >= 3]):
    if lvl < med - 9:
        issues.append((l['start'], ln, l['speaker'], f'реплика тише остальных на {med - lvl:.0f} dB'))
issues.sort()
for t, ln, sp, msg in issues:
    print(f'{int(t//60):2d}:{t%60:05.2f}  строка {ln:3d}  {sp:13s} {msg}')
print('итого подозрительных мест:', len(issues), '| медианный уровень реплик', round(float(med), 1), 'dB')
