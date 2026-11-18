#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
do_chapter.py — звук на одну отрендеренную главу (или кусок): лист → музыка → признаки картинки → микс → проверки → mux.

  C:/dev/tools/sound-venv/Scripts/python.exe sound/do_chapter.py film/out/ch02.mp4 [--lang en|ru] [--density mid|full|lean] [--no-stt]
  (из production/L001)

Окно берётся из <видео>.frames.json (F0, F1 — кадры фильма); нет файла — из номера главы в имени (chNN) по cues.json.
Результат: <видео>_sound.mp4 (у русского — _sound_ru.mp4), стемы и отчёты в sound/out/<имя>/, строка в sound/CHAPTERS.md.
Русская версия идёт по своему таймингу: animatic/timing_ru.json, words_ru.json, cues_ru.json, голос out/voice_fish_ru.mp3.
"""
import argparse, json, re, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent; L = HERE.parent
PY = r'C:/dev/tools/sound-venv/Scripts/python.exe'; PY_STT = 'python'   # системный питон — faster-whisper


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=L, capture_output=True, text=True, encoding='utf-8', errors='replace', **kw)
    if r.returncode: sys.exit(f'ошибка: {" ".join(map(str, cmd))}\n{r.stdout[-1500:]}\n{r.stderr[-3000:]}')
    return r.stdout


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--lang', default='en', choices=['en', 'ru'])
    ap.add_argument('--density', default='mid', choices=['full', 'mid', 'lean']); ap.add_argument('--no-stt', action='store_true')
    ap.add_argument('--name', default=None)
    a = ap.parse_args()
    v = (L / a.video).resolve() if not Path(a.video).is_absolute() else Path(a.video)
    ru = a.lang == 'ru'; sfx = '_ru' if ru else ''
    name = (a.name or v.stem) + sfx + ('' if a.density == 'mid' else '_' + a.density)
    T = ['--timing', 'animatic/timing_ru.json', '--words', 'animatic/words_ru.json'] if ru else []
    cues = 'cues_ru.json' if ru else 'cues.json'
    t_start = time.time()
    # 1. лист (все главы — картинка этой главы проверяется по своим кадрам), 2. музыка по текущему таймингу
    run(['node', 'sound/cues.mjs', *T, *(['--out', cues] if ru else []), '--ch', '0'])
    plan = HERE / 'out' / f'music_plan{sfx}.json'
    run([PY, 'sound/music_plan.py', '--cues', str(HERE / cues), '--out', str(plan), *(['--words', str(L / 'animatic/words_ru.json')] if ru else [])])
    C = json.load(open(HERE / cues, encoding='utf-8'))
    fr = v.with_suffix('.frames.json')
    if fr.exists():
        F = json.load(open(fr)); t0, t1 = F['F0'] / 30, F['F1'] / 30; frames_arg = ['--frames', str(fr)]
    else:
        m = re.search(r'ch(\d+)', v.stem); chs = [int(m.group(1))] if m else []
        span = [c for c in C['chapters'] if c['ch'] in chs]
        if not span: sys.exit('нет frames.json и номера главы в имени')
        t0, t1 = span[0]['start'], span[-1]['end']; frames_arg = ['--t0', f'{t0:.4f}', '--t1', f'{t1:.4f}']
    chs = [c['ch'] for c in C['chapters'] if c['end'] > t0 + .05 and c['start'] < t1 - .05]
    # 3. признаки картинки, 4. микс и mux
    vis = HERE / 'out' / f'vis_{name}.json'
    run([PY, 'sound/vis.py', str(v), str(vis), '--t0', f'{t0:.4f}'])
    # приблизительные звуки (слоты шотлиста) — к событиям этой картинки; лист главы — свой файл
    (HERE / 'out' / name).mkdir(parents=True, exist_ok=True); ccues = HERE / 'out' / name / 'cues_chapter.json'
    print(run([PY, 'sound/snap_cues.py', str(HERE / cues), str(vis), str(ccues), '--t0', f'{t0:.4f}', '--t1', f'{t1:.4f}']).strip())
    out = run([PY, 'sound/render.py', '--name', name, *frames_arg, '--video', str(v), '--suffix', '_sound' + sfx + ('' if a.density == 'mid' else '_' + a.density),
               '--density', a.density, '--music-plan', str(plan), *T, '--cues', str(ccues)])
    # 5. проверки
    if not a.no_stt:
        run([PY_STT, 'sound/check.py', '--name', name, '--stt-only', '--lang', a.lang, *(['--words', 'animatic/words_ru.json'] if ru else [])])
    run([PY, 'sound/check.py', '--name', name, '--vis', str(vis), '--lang', a.lang, '--cues', str(ccues), *(['--words', 'animatic/words_ru.json'] if ru else [])])
    od = HERE / 'out' / name
    rep = json.load(open(od / 'report.json', encoding='utf-8')); chk = json.load(open(od / 'check.json', encoding='utf-8'))
    stt = json.load(open(od / 'stt.json', encoding='utf-8')) if (od / 'stt.json').exists() else {}
    dn = json.load(open(od / 'density.json', encoding='utf-8')) if (od / 'density.json').exists() else None
    d10 = dn['by_thr']['10.0']['summary'] if dn else {}
    Lo = chk['loudness']; S = chk['sync']; rows = chk['rows']
    n_cues = len(rows); mins = (t1 - t0) / 60
    row = (f"| {name} | {', '.join(map(str, chs))} | {t0:.2f}–{t1:.2f} | {Lo['mix']['I']} / {Lo['mix']['TP']} | {len(Lo['silence_spans_lt_-60dBFS_ge_0.3s'])} | "
           f"{S['ok_pm1']}/{S['checked_vs_picture']} | {len(chk['orphans'])} | {stt.get('wer_voice', float('nan')) * 100:.1f} / {stt.get('wer_mix', float('nan')) * 100:.1f} | "
           f"{n_cues / mins:.0f} | {d10.get('per_min', '—')} | {Lo['voice_minus_music_speech_dB']} | {Lo['voice_minus_rest_speech_dB']} | {a.density} | "
           f"`film/out/{v.stem}_sound{sfx}{'' if a.density == 'mid' else '_' + a.density}.mp4` |")
    tab = HERE / 'CHAPTERS.md'
    if not tab.exists():
        tab.write_text('# L001 — звук по главам\n\nСобирает `sound/do_chapter.py` (строка на каждую сборку, последние — внизу). Столбцы: громкость мастера '
                       '(LUFS / dBTP); участков цифровой тишины ≥ 0.3 с; событий в ±1 кадр из сверяемых по картинке; всплесков картинки без звука '
                       '(смотреть `out/<имя>/CHECK.md`); WER Whisper сухого голоса / микса, %; звуков листа в минуту; событий в минуту детектором '
                       'конкурента (порог 10 дБ); голос − музыка и голос − всё остальное под речью, дБ.\n\n'
                       '| сборка | главы | окно, с | LUFS / TP | тишина | синхрон | без звука | WER, % | звуков/мин | детектор/мин | голос−музыка | голос−всё | плотность | файл |\n'
                       '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n', encoding='utf-8')
    with open(tab, 'a', encoding='utf-8') as f: f.write(row + '\n')
    print(row); print(f'готово за {time.time() - t_start:.0f} с')


if __name__ == '__main__':
    main()
