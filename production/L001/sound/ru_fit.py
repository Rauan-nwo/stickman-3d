#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ru_fit.py — влезает ли русский голос в картинку, смонтированную по английскому голосу.

  python sound/ru_fit.py [--t1 73.4 | --frames film/out/ch0_1.frames.json] [--max-tempo 1.08] [--name ch0_1]
  (из production/L001; питон sound-venv)

Каждая русская строка (out/lines_fish_ru.json, строка в строку с out/lines_fish.json) ставится на старт своей английской
строки на шкале фильма (animatic/words.json). «Окно» строки — до старта следующей строки. Если русская строка длиннее окна
больше, чем позволяет ускорение max-tempo (по умолчанию 1.08 — предел, при котором речь не звучит сжатой), вариант
НЕ собирается: пишется отчёт sound/out/<name>/RU_FIT.md с таблицей строк, а код возврата 2. Если всё влезает —
пишется sound/out/<name>/voice_ru_film.wav (голос на шкале фильма) для render.py --voice-wav.
"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent; L = HERE.parent; SR = 48000


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--t1', type=float, default=None); ap.add_argument('--frames', default=None)
    ap.add_argument('--max-tempo', type=float, default=1.08); ap.add_argument('--name', default='ch0_1'); ap.add_argument('--gap', type=float, default=.06)
    a = ap.parse_args()
    t1 = a.t1 if a.t1 else (json.load(open(L / a.frames))['F1'] / 30 if a.frames else 1e9)
    W = json.load(open(L / 'animatic/words.json', encoding='utf-8'))['words']
    EN = json.load(open(L / 'out/lines_fish.json', encoding='utf-8')); RU = json.load(open(L / 'out/lines_fish_ru.json', encoding='utf-8'))
    film = {}
    for w in W:
        film.setdefault(w['line'], [w['s'], w['e']]); film[w['line']][1] = w['e']
    rows, prev_end = [], 0.0
    for i, (e, r) in enumerate(zip(EN, RU)):
        ln = e['line']
        if ln not in film or film[ln][0] >= t1: break
        fs = film[ln][0]; nxt = film.get(EN[i + 1]['line'], [t1])[0] if i + 1 < len(EN) else t1
        nxt = min(nxt, t1); slot = nxt - fs; den = e['end'] - e['start']; dru = r['end'] - r['start']
        need = dru / max(.05, slot - a.gap)                      # во сколько раз надо ускорить, чтобы влезть в окно
        start = max(fs, prev_end + a.gap); prev_end = start + dru  # без ускорения: насколько съезжает
        rows.append({'line': ln, 'speaker': e['speaker'], 'film_start': round(fs, 3), 'slot': round(slot, 3), 'en': round(den, 3), 'ru': round(dru, 3),
                     'over': round(dru - slot, 3), 'tempo_needed': round(need, 3), 'late_if_untouched': round(start - fs, 3),
                     'ru_src': [r['start'], r['end']], 'text': r['text']})
    bad = [x for x in rows if x['tempo_needed'] > a.max_tempo]
    en_t, ru_t = sum(x['en'] for x in rows), sum(x['ru'] for x in rows)
    od = HERE / 'out' / a.name; od.mkdir(parents=True, exist_ok=True)
    ok = not bad
    md = [f'# Русский голос на картинке {a.name} — влезает ли', '',
          f'Окно 0–{min(t1, rows[-1]["film_start"] + rows[-1]["slot"]):.2f} с, строк {len(rows)}. Английская речь {en_t:.1f} с, русская {ru_t:.1f} с '
          f'(**×{ru_t / en_t:.2f}**). Допустимое ускорение ≤ ×{a.max_tempo}.', '',
          ('**Влезает**: собран `voice_ru_film.wav`.' if ok else
           f'**Не влезает**: {len(bad)} строк из {len(rows)} требуют ускорения больше ×{a.max_tempo} (до ×{max(x["tempo_needed"] for x in rows):.2f}); '
           f'без ускорения голос отстаёт от картинки до {max(x["late_if_untouched"] for x in rows):.1f} с и кончается на '
           f'{prev_end:.1f} с при длине куска {min(t1, 1e8):.1f} с. Вариант с русским голосом на этой картинке не собран — '
           'русской версии нужен свой тайминг картинки (make_timing по русским строкам) или более короткий русский текст.'), '',
          '| строка | кто | старт в фильме | окно, с | EN, с | RU, с | лишнее, с | нужно ускорение | текст |', '|---|---|---|---|---|---|---|---|---|']
    for x in rows:
        md.append(f'| {x["line"]} | {x["speaker"]} | {x["film_start"]:.2f} | {x["slot"]:.2f} | {x["en"]:.2f} | {x["ru"]:.2f} | {max(0, x["over"]):.2f} | '
                  f'{"**×%.2f**" % x["tempo_needed"] if x["tempo_needed"] > a.max_tempo else "×%.2f" % max(1, x["tempo_needed"])} | {x["text"][:70]} |')
    (od / 'RU_FIT.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    json.dump({'ok': ok, 'ratio': ru_t / en_t, 'rows': rows}, open(od / 'ru_fit.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'RU fit: lines {len(rows)}, EN {en_t:.1f}s, RU {ru_t:.1f}s (x{ru_t / en_t:.2f}), over-limit lines {len(bad)}, max tempo needed x{max(x["tempo_needed"] for x in rows):.2f} -> {"OK" if ok else "DOES NOT FIT"}')
    if not ok: sys.exit(2)
    # голос на шкале фильма: каждая строка на свой старт, при нужде — atempo до max-tempo
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(L / 'out/voice_fish_ru.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(SR), 'pipe:1'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, '<f4'); n = int(min(t1, rows[-1]['film_start'] + rows[-1]['slot']) * SR); out = np.zeros(n, np.float32); prev = 0
    for x in rows:
        seg = v[int(x['ru_src'][0] * SR):int(x['ru_src'][1] * SR)]; tempo = max(1.0, x['tempo_needed'])
        if tempo > 1.001:
            seg = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0', '-af', f'atempo={tempo:.4f}',
                                                '-f', 'f32le', 'pipe:1'], input=seg.tobytes(), capture_output=True, check=True).stdout, '<f4')
        i0 = max(int(x['film_start'] * SR), prev); out[i0:i0 + len(seg)] += seg[:n - i0]; prev = i0 + len(seg)
    import soundfile as sf
    sf.write(str(od / 'voice_ru_film.wav'), out, SR, subtype='PCM_24'); print('->', od / 'voice_ru_film.wav')


if __name__ == '__main__':
    main()
