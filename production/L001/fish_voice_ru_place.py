# -*- coding: utf-8 -*-
"""fish_voice_ru_place.py: русская дорожка Fish (родные голоса) на таймлайне фильма.

  python production/L001/fish_voice_ru_place.py      (потом: pwsh production/L001/mux_ru.ps1)

Берёт out/voice_fish_ru.mp3 + out/lines_fish_ru.json (строка в строку с английской дорожкой из animatic/timing.json →
linesFile), режет по строкам и ставит каждую на старт её английской строки на таймлайне аниматика (вставки тишины из
timing.json). Если русская строка длиннее окна до следующей — ускоряет atempo (не больше MAX_TEMPO), если и так не влезает —
следующая строка сдвигается позже. Пишет out/voice_ru.mp3 (длина = animatic_nodebug.mp4) и out/voice_ru_report.json;
строки, которые не уложились (tempo на пределе, сдвиг или вылет за окно), — в out/voice_ru_misfit.txt.
"""
import json, os, subprocess, sys, wave
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'out'); C = os.path.join(OUT, 'fish_ru_cache')
os.makedirs(C, exist_ok=True)
SR, MAX_TEMPO, GAP, PAD = 24000, 1.3, 0.05, 0.03


def probe(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip())


def main():
    tm = json.load(open(os.path.join(D, 'animatic', 'timing.json'), encoding='utf-8'))
    en = json.load(open(os.path.join(D, tm.get('linesFile', 'out/lines_fish.json')), encoding='utf-8'))
    ru = json.load(open(os.path.join(OUT, 'lines_fish_ru.json'), encoding='utf-8'))
    assert len(en) == len(ru), (len(en), len(ru))
    for a, b in zip(en, ru): assert a['speaker'] == b['speaker'], (a['line'], a['speaker'], b['speaker'])
    vid = os.path.join(D, 'animatic', 'out', 'animatic_nodebug.mp4'); total = probe(vid) if os.path.exists(vid) else tm['total']
    ins = tm['inserts']; amap = lambda t: t + sum(x['dur'] for x in ins if x['at'] <= t)
    starts = [amap(l['start']) for l in en]
    # вся дорожка -> wav один раз, строки режутся из неё
    full = os.path.join(C, 'full.wav'); src_mp3 = os.path.join(OUT, 'voice_fish_ru.mp3')
    if not os.path.exists(full) or os.path.getmtime(full) < os.path.getmtime(src_mp3):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src_mp3, '-ac', '1', '-ar', str(SR), full], check=True)
    w = wave.open(full, 'rb'); n_all = w.getnframes(); pcm = w.readframes(n_all); w.close()

    def cut(i, a, b):
        p = os.path.join(C, f'l{i:03d}.wav'); f0 = max(0, int((a - PAD) * SR)); f1 = min(n_all, int((b + PAD) * SR))
        o = wave.open(p, 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(pcm[f0 * 2:f1 * 2]); o.close()
        return p, (f1 - f0) / SR

    def sil(g):
        p = os.path.join(C, f'sil_{int(round(g * 1000))}.wav')
        if not os.path.exists(p):
            o = wave.open(p, 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(b'\0\0' * int(round(g * SR))); o.close()
        return p
    rep, parts, cur = [], [], 0.0
    for i, l in enumerate(ru):
        src, dur = cut(i + 1, l['start'], l['end'])
        target = starts[i]; st = max(target, cur + (GAP if i else 0)); nxt = starts[i + 1] if i + 1 < len(starts) else total
        avail = nxt - GAP - st; t = 1.0
        if dur > avail:
            t = min(MAX_TEMPO, dur / max(avail, .01)); dst = os.path.join(C, f'l{i + 1:03d}_t{int(round(t * 1000))}.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter:a', f'atempo={t:.4f}', '-ar', str(SR), '-ac', '1', dst], check=True)
            src = dst; dur = probe(src)
        rep.append({'line': i + 1, 'speaker': l['speaker'], 'voice': l.get('voice', ''), 'text': l['text'], 'target': round(target, 3), 'start': round(st, 3),
                    'end': round(st + dur, 3), 'tempo': round(t, 3), 'shift': round(st - target, 3), 'overrun': round(max(0, st + dur - (nxt - GAP)), 3)})
        parts.append((src, st, dur)); cur = st + dur
    lst = os.path.join(OUT, 'voice_ru_concat.txt'); t0 = 0.0
    with open(lst, 'w', encoding='utf-8') as f:
        for src, st, dur in parts:
            if st - t0 > .001: f.write(f"file '{sil(st - t0)}'\n")
            f.write(f"file '{src}'\n"); t0 = st + dur
        if total - t0 > .001: f.write(f"file '{sil(total - t0)}'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-af', f'apad,atrim=0:{total:.3f}',
                    '-c:a', 'libmp3lame', '-q:a', '3', os.path.join(OUT, 'voice_ru.mp3')], check=True)
    json.dump({'total': total, 'source': 'voice_fish_ru.mp3', 'lines': rep}, open(os.path.join(OUT, 'voice_ru_report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    bad = [r for r in rep if r['tempo'] >= MAX_TEMPO - 1e-3 or r['shift'] > .25 or r['overrun'] > .05]
    with open(os.path.join(OUT, 'voice_ru_misfit.txt'), 'w', encoding='utf-8') as f:
        for r in bad: f.write(f"#{r['line']} {r['speaker']} x{r['tempo']} сдвиг {r['shift']} с, вылет {r['overrun']} с: {r['text']}\n")
    sp = [r['tempo'] for r in rep]
    print('film', round(total, 3), 'voice_ru.mp3', round(probe(os.path.join(OUT, 'voice_ru.mp3')), 3), 'last end', rep[-1]['end'])
    print(f"ускорено строк: {sum(t > 1.001 for t in sp)} из {len(sp)}; средний темп {sum(sp) / len(sp):.3f}; на пределе x{MAX_TEMPO}: {sum(t >= MAX_TEMPO - 1e-3 for t in sp)}")
    print(f"сдвиг > 0.25 с: {sum(r['shift'] > .25 for r in rep)}, максимум {max(r['shift'] for r in rep):.2f} с; не уложилось строк: {len(bad)}")


if __name__ == '__main__':
    main()
