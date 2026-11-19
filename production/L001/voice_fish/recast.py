# -*- coding: utf-8 -*-
"""recast.py — смена голоса роли без сдвига шкалы (L001, 19.11: рисунок героя и голос не совпадали по полу).

  python production/L001/voice_fish/recast.py en          # роли из RECAST + толпа CROWD -> fish_takes_en.json
  python production/L001/voice_fish/fish_voice.py assemble en   # затем: склейка по замороженной шкале

Каждая реплика роли: до 3 дублей нового голоса, проверка whisper (check), лучший по сходству текста и близости длины;
длина подгоняется atempo (×0.80…×1.25) под прежнее окно строки (`lines_fish_en.json`), чтобы start/end/words не сдвинулись
(KEEP_TOL ±40 мс в assemble). Новый голос записывается в cast.json (id, name, note) — sig дубля совпадает, synth его не тронет.
CROWD («GPU! GPU!») — не один «голос толпы», а 5 разных голосов со сдвигом 0–60 мс и разной громкостью, сведённые в один дубль.
"""
import json, math, os, subprocess, sys
import fishlib
import fish_voice as F

D = os.path.dirname(os.path.abspath(__file__))
# роль -> новый голос (публичная библиотека Fish, без клонов знаменитостей)
RECAST = {
    'BANKER 2': ('f4011527d52045bebe004aa874695276', 'old man (calm friendly)', 'мужской, пожилой, спокойный — нарисован пожилым с усами (было: женский Abby)'),
    'EDITOR': ('4d801c05a9314e15996a2a8d00bac2b6', 'old man (measured)', 'мужской, пожилой, ровный — нарисован лысым с усами (было: женский)'),
    'GUIDE': ('12a41b18606d4aff82e253bc293ea5e9', 'Man man (young calm)', 'мужской, молодой, тихий — нарисован парнем (было: женский Selene)'),
    'BOARD': ('e5653035f4bd402da1762114d0587e29', 'Woman (professional deep)', 'женский, зрелый, авторитетный — нарисована седой женщиной с каре (было: мужской)'),
    'ANALYST 2': ('57d4a7fa3d944ca5b2407f916ce5f4d5', 'Woman (conversational warm)', 'женский — нарисована с хвостом и гарнитурой (было: мужской)'),
}
CROWD_VOICES = [   # id, громкость дБ, сдвиг с — мужские и женские «крики» вразнобой
    # ('98ae13e923d448b9819b501a2caf2598', …)  Energetic Crowd Chant — выговаривает «G.P.U.» по буквам медленно, ритм не совпадает с остальными
    # ('62488a599cd84d7d843070664d27409b', …)  Crowd (м) — один слышится как «CPU», в смеси даёт «Gee-poo»
  # Crowd (м, молодой) — тихо: один он слышится как «CPU»
    ('b7d076a70a104e278764c7aab73d0864', 0.0, 0.0),   # Crowd (ж)
    # ('b545c585f631496c914815291da4e893', …)  Friendly Women — в смеси с ведущим «JIT-N-U» (сверка whisper 19.11)
  # FAN 2 — Friendly Women (ж) — она есть на вечеринке
    ('b5f4515fd395410b9ed3aef6fa51d9a0', 0.0, 0.009),  # FAN — Alex (м)
]


def fit(src, want, tag):
    """src (mp3/flac) -> trimmed wav длиной ~want: atempo в пределах, остаток — паддинг тишиной"""
    w = F.trimmed(src); dur = fishlib.probe(w); tempo = min(1.25, max(0.80, dur / want))
    out = os.path.join(fishlib.CACHE, f'{tag}_fit.flac')
    af = f'atempo={tempo:.5f}' + (f',apad=whole_dur={want:.3f}' if dur / tempo < want else '')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-af', af, '-c:a', 'flac', out], check=True)
    t = os.path.join(F.TRIM, os.path.splitext(os.path.basename(out))[0] + '.wav')
    if os.path.exists(t): os.remove(t)
    return out, tempo


def first_shout(w, max_len=1.0):
    """первый выкрик дубля (до первой паузы ≥ 80 мс ниже −32 дБ от пика) -> (samples, sr)"""
    import numpy as np
    sr = 44100; y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', w, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True, check=True).stdout, np.float32).astype(float)
    hop = int(sr * .01); env = np.array([np.abs(y[i:i + hop]).max() for i in range(0, len(y) - hop, hop)])
    thr = env.max() * 10 ** (-32 / 20); on = np.where(env > thr)[0]; a = on[0]; quiet = 0; b = a
    for i in range(a, len(env)):
        quiet = quiet + 1 if env[i] <= thr else 0
        if env[i] > thr: b = i
        if quiet >= 22 or (i - a) * .01 > max_len: break
    seg = y[max(0, a * hop - int(.01 * sr)):(b + 3) * hop].copy(); n = int(.02 * sr); seg[-n:] *= np.linspace(1, 0, n)
    return seg, sr


def crowd(lang, r, o, want):
    """толпа: у каждого голоса — один выкрик «GPU!», поставленный на оба «GPU» исходной строки (слова lines_fish) со сдвигом"""
    import numpy as np
    starts = [w['s'] - o['start'] for w in o['words']][:2] or [0, want / 2]
    sr0 = 44100; out = np.zeros(int((want + .3) * sr0)); segs = []
    for i, (vid, g, off) in enumerate(CROWD_VOICES):
        p = fishlib.synth('[shouting] GPU!', vid, 1.0, .8, .8, tag=f'crowd1_{i}'); seg, sr = first_shout(F.trimmed(p)); assert sr == sr0, sr
        segs.append((seg, g, off))
    lead = max(range(len(segs)), key=lambda i: segs[i][1])
    def env(y):
        e = np.abs(y); k = int(.005 * sr0); return np.convolve(e, np.ones(k) / k, 'same')[::k]
    E0 = env(segs[lead][0])
    for i, (seg, g, off) in enumerate(segs):
        lag = 0
        if i != lead:   # выравнивание по ведущему: максимум корреляции огибающих в ±150 мс (шаг 5 мс)
            e = env(seg); best = -1
            for L in range(-30, 31):
                a = E0[max(0, L):]; b = e[max(0, -L):]; n = min(len(a), len(b)); c = float(np.dot(a[:n], b[:n]))
                if c > best: best, lag = c, L
            lag = lag * .005
        for k, st in enumerate(starts):
            a = int((st + lag + off) * sr0); a = max(0, a); b = min(len(out), a + len(seg))
            out[a:b] += seg[:b - a] * 10 ** (g / 20)
    out = out[:int(want * sr0)]; out *= .89 / max(1e-9, np.abs(out).max())
    mix = os.path.join(fishlib.CACHE, f'crowd2_{r["line"]}.flac')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr0), '-ac', '1', '-i', '-', '-c:a', 'flac', mix], input=out.astype(np.float32).tobytes(), check=True)
    t = os.path.join(F.TRIM, os.path.splitext(os.path.basename(mix))[0] + '.wav')
    if os.path.exists(t): os.remove(t)   # trimmed() кэширует по имени — иначе проверка слушает прошлую версию
    return mix, 1.0


def main(lang='en', only=None):
    cast_p = os.path.join(D, F.CAST[lang]); cast = json.load(open(cast_p, encoding='utf-8'))
    for sp, (vid, name, note) in RECAST.items():
        cast[sp].update({'id': vid, 'name': name, 'note': note}); cast[sp].pop('f0_hz', None)
    json.dump(cast, open(cast_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    rows = F.load(lang); takes = F.load_takes(lang)
    old = {x['line']: x for x in json.load(open(F.lines_file(lang), encoding='utf-8'))}
    for r in rows:
        if r['speaker'] not in RECAST and r['speaker'] != 'CROWD': continue
        want = old[r['line']]['end'] - old[r['line']]['start']; key = str(r['line'])
        if r['speaker'] == 'CROWD':
            if only and 'CROWD' not in only: continue
            p, tempo = crowd(lang, r, old[r['line']], want); s = F.check(lang, r, p)
            print(f"line {key} CROWD: {len(CROWD_VOICES)} голосов, длина {s['dur']} (окно {want:.2f}) | {s['asr']}", flush=True)
        else:
            if only and r['speaker'] not in only: continue
            best = None
            for k in range(3):
                p0 = fishlib.synth(r['directed'], r['vid'], r['speed'], r['temperature'], r['top_p'], tag='' if k == 0 else f'rc{k}')
                s0 = F.check(lang, r, p0)
                cand = (s0['bad'], -s0['sim'], abs(math.log(max(.05, s0['dur']) / want)), p0, s0)
                if best is None or cand[:3] < best[:3]: best = cand
                if not s0['bad'] and s0['sim'] >= .95 and .85 <= s0['dur'] / want <= 1.18: break
            p, tempo = fit(best[3], want, os.path.splitext(os.path.basename(best[3]))[0]); s = F.check(lang, r, p)
            print(f"line {key} {r['speaker']}: {r['voice']} | {s['dur']} с (окно {want:.2f}, ×{tempo:.2f}) sim {s['sim']} bad {s['bad']} | {s['asr']}", flush=True)
        tk = takes.get(key, {}); tk.setdefault('orig_path', tk.get('path'))
        tk.update({'sig': [r['directed'], r['vid'], r['speed'], r['temperature'], r['top_p']], 'path': p, 'score': s, 'retake': 'recast', 'tempo': round(tempo, 4)})
        takes[key] = tk
    F.save_takes(lang, takes)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'en', set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None)
