#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
master_full.py — звук всего фильма: главы по отдельности (pre-master) -> одна сборка -> мастер −14 LUFS / ≤ −1 dBTP.

  C:/dev/tools/sound-venv/Scripts/python.exe sound/master_full.py [--lang en|ru] [--density mid] [--video film/out/full.mp4]
  (из production/L001; в фоне — ~10–15 мин на фильм)

1. Усиление голоса считается ОДИН раз на весь фильм (голос на шкале фильма → −16 LUFS), чтобы главы не прыгали по уровню.
2. Каждая глава (окно = её начало и конец по cues.json) рендерится render.py --premaster: стемы без мастера.
3. Главы склеиваются встык (окна смежные, кадр в кадр), громкость всей склейки меряется ffmpeg ebur128,
   усиление до −14 LUFS одно на весь фильм, лимитер истинного пика (4×) по главам, проверка, при нужде второй проход.
4. Пишет sound/out/full<_ru>/{mix,voice,music,sfx,amb}.wav (24 бит), report.json; с --video — <видео>_sound<_ru>.mp4.
Память: одна глава за раз (фильм целиком в память не грузится).
"""
import argparse, json, re, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf
import pyloudnorm as pyln

HERE = Path(__file__).resolve().parent; L = HERE.parent; SR = 48000
sys.path.insert(0, str(HERE))
import render as R  # noqa: E402

PY = sys.executable


def ebur_file(p):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True).stderr.decode('utf-8', 'replace')
    t = err[err.rfind('Summary:'):]; g = lambda pat: float(re.search(pat, t).group(1))
    return {'I': g(r'I:\s+(-?[\d.]+) LUFS'), 'LRA': g(r'LRA:\s+(-?[\d.]+) LU'), 'TP': g(r'Peak:\s+(-?[\d.]+) dBFS')}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--lang', default='en', choices=['en', 'ru']); ap.add_argument('--density', default='mid')
    ap.add_argument('--video', default=None); ap.add_argument('--skip-render', action='store_true'); ap.add_argument('--target', type=float, default=-14.0)
    a = ap.parse_args()
    ru = a.lang == 'ru'; sx = '_ru' if ru else ''
    T = ['--timing', 'animatic/timing_ru.json', '--words', 'animatic/words_ru.json'] if ru else []
    cues = HERE / ('cues_ru.json' if ru else 'cues.json'); plan = HERE / 'out' / f'music_plan{sx}.json'
    tim = json.load(open(L / ('animatic/timing_ru.json' if ru else 'animatic/timing.json'), encoding='utf-8'))
    def run(cmd):
        r = subprocess.run(cmd, cwd=L, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode: sys.exit(f'ошибка {cmd[:3]}: {r.stderr[-2500:]}')
        return r.stdout
    if not a.skip_render:
        run(['node', 'sound/cues.mjs', *T, *(['--out', cues.name] if ru else []), '--ch', '0'])
        run([PY, 'sound/music_plan.py', '--cues', str(cues), '--out', str(plan), *(['--words', str(L / 'animatic/words_ru.json')] if ru else [])])
    C = json.load(open(cues, encoding='utf-8')); chs = C['chapters']; total = tim['total']
    # 1. усиление голоса на весь фильм
    v = R.voice_track(tim, tim.get('audioFile', 'out/voice_fish_en.mp3'), 0, total) if True else None
    from pedalboard import Pedalboard, HighpassFilter, Compressor
    y = Pedalboard([HighpassFilter(80), Compressor(threshold_db=-24, ratio=2.5, attack_ms=6, release_ms=120)])(v.reshape(1, -1), SR).ravel()
    vg = R.MIX['voice_lufs'] - pyln.Meter(SR).integrated_loudness(np.stack([y, y], 1)); del v, y
    print(f'усиление голоса на фильм: {vg:+.2f} дБ', flush=True)
    # 2. главы
    names = []
    for c in chs:
        nm = f'full{sx}_ch{c["ch"]:02d}'; names.append(nm)
        if a.skip_render and (HERE / 'out' / nm / 'premix.wav').exists(): continue
        t1 = total if c is chs[-1] else c['end']
        out = run([PY, 'sound/render.py', '--name', nm, '--t0', f'{c["start"]:.6f}', '--t1', f'{t1:.6f}', '--premaster', '--voice-gain-db', f'{vg:.4f}',
                   '--density', a.density, '--music-plan', str(plan), '--cues', str(cues), *T, '--tail-fade', '0' if c is not chs[-1] else '.6'])
        print(nm, out.strip().splitlines()[-1][:160], flush=True)
    # 3. склейка, громкость, лимитер
    od = HERE / 'out' / f'full{sx}'; od.mkdir(parents=True, exist_ok=True)
    lst = od / 'premix_list.txt'; lst.write_text(''.join(f"file '{(HERE / 'out' / nm / 'premix.wav').as_posix()}'\n" for nm in names), encoding='utf-8')
    raw = od / 'premix_full.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(raw)], check=True)
    m0 = ebur_file(raw); gain = a.target - m0['I']
    for it in range(3):
        with sf.SoundFile(str(od / 'mix.wav'), 'w', SR, 2, 'PCM_24') as fo:
            for nm in names:
                x, _ = sf.read(str(HERE / 'out' / nm / 'premix.wav'), dtype='float32')
                y, _ = R.true_peak_limit(x * R.lin(gain), R.MIX['ceiling_dbtp'] - .3); fo.write(y)
        m = ebur_file(od / 'mix.wav'); print(f'проход {it + 1}: усиление {gain:+.2f} дБ -> {m}', flush=True)
        if abs(m['I'] - a.target) <= .15 and m['TP'] <= R.MIX['ceiling_dbtp']: break
        gain += a.target - m['I']
    for k in ('voice', 'music', 'sfx', 'amb'):
        with sf.SoundFile(str(od / f'{k}.wav'), 'w', SR, 2, 'PCM_24') as fo:
            for nm in names:
                x, _ = sf.read(str(HERE / 'out' / nm / f'{k}.wav'), dtype='float32'); fo.write(x * R.lin(gain))
    raw.unlink(missing_ok=True)
    meter = pyln.Meter(SR); st = {}
    for k in ('voice', 'music', 'sfx', 'amb'):   # громкость стемов — по главам, взвешенно по длине (целиком в память не грузим)
        ls = []
        for nm in names:
            x, _ = sf.read(str(HERE / 'out' / nm / f'{k}.wav'), dtype='float64'); x *= R.lin(gain)
            ls.append((len(x), meter.integrated_loudness(x) if np.abs(x).max() > 1e-6 else -70))
        st[k] = round(10 * np.log10(sum(n * 10 ** (l / 10) for n, l in ls) / sum(n for n, _ in ls)), 1)
    rep = {'lang': a.lang, 'density': a.density, 'voice_gain_db': round(vg, 2), 'master_gain_db': round(gain, 2), 'ebur128': m, 'stem_lufs_approx': st,
           'chapters': [{'name': nm, 'ch': c['ch'], 'start': c['start'], 'end': c['end']} for nm, c in zip(names, chs)], 'total': total}
    json.dump(rep, open(od / 'report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({k: rep[k] for k in ('master_gain_db', 'ebur128', 'stem_lufs_approx')}, ensure_ascii=False))
    if a.video:
        vv = L / a.video; outv = vv.with_name(vv.stem + '_sound' + sx + '.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(vv), '-i', str(od / 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest', str(outv)], check=True); print('->', outv)


if __name__ == '__main__':
    main()
