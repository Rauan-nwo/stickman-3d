# -*- coding: utf-8 -*-
"""host_takes.py — дубли ведущего (HOST, глава 1, строки 18–21) одним непрерывным запросом на голос.

  python production/L001/voice_fish/host_takes.py

Все 4 реплики — один запрос Fish (тембр и высота держатся по всему дублю), одна метка [confident] на весь дубль,
ударения только [emphasis] (box, chips, key), temperature 0.5, top_p 0.55. Дубль режется по границам реплик по
словам faster-whisper (разрез посередине паузы), края реплик чистятся от тишины, реплики склеиваются через 0.3 с.
Скорость подбирается вторым проходом под ~155 слов/мин по склеенному файлу.
Пишет voice_fish/host_takes/<n>_<голос>.mp3 и host_takes/takes.json (id, speed, темп, высота голоса по репликам).
Сборка 2026-11-17: дубли Leviticus и Brian British взяты из прогона без [break] между репликами (текст DIRECTED без
[break]; ровнее по темпу), Old radio и David — из прогона с [break] (текущий DIRECTED); см. text_variant в takes.json.

ВНИМАНИЕ (2026-11-18): вырезка ниже стоит с -ss/-to ПОСЛЕ -i, поэтому реплики идут встык с паузами дубля внутри
(между репликами получается пауза дубля + 0.3 с = 0.7–0.9 с). Именно так звучали пробы, из которых Рауан выбрал дубль 1,
поэтому здесь не исправлено; в fish_voice.py (scene_cut) для новых сцен разрез уже правильный.
"""
import json, os, re, subprocess, sys, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishlib, fish_voice as F
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass

OUTD = os.path.join(fishlib.D, 'host_takes'); os.makedirs(OUTD, exist_ok=True)
TMP = os.path.join(fishlib.OUT, 'host_tmp'); os.makedirs(TMP, exist_ok=True)
LINES = ["Evening. Mind the box, it's expensive.", "Inside, the most wanted chips on Earth.",
         "Thirty grand apiece, by the maker's own count.", "And the man at that table held the key to every one of them."]
DIRECTED = ("[confident] Evening. Mind the [emphasis] box, it's expensive. [break] Inside, the most wanted [emphasis] chips on Earth. [break] "
            "Thirty grand apiece, by the maker's own count. [break] And the man at that table [break] held the [emphasis] key to every one of them.")
TEMP, TOP_P, GAP, TARGET_WPM, SR = 0.5, 0.55, 0.3, 155, 44100
VOICES = [  # n, имя файла, id, название в библиотеке
    (1, 'LeviticusCornwall', '5a6774c58559475dac02eb2c91b26437', 'Leviticus Cornwall (клон персонажа RDR2 — текущий выбор)'),
    (2, 'OldRadio', '190fab32', 'Old radio'),
    (3, 'DavidBritishStoryteller', '72324f59', 'David - British Storyteller'),
    (4, 'BritishStoryteller', '1d304964', 'British Storyteller'),
    (5, 'BrianBritish', '65c0b8155c464a648161af8877404f11', 'Brian British'),
]
FULL = {'190fab32': '190fab3282be4b97bf07c272c86814e2', '72324f59': '72324f5951924b2eb27faaf5630153b4',
        '1d304964': '1d304964fcfe4c5998cfe7b7298aa727'}
NW = sum(len(l.split()) for l in LINES)


def wav(src, dst, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src] + (['-af', af] if af else []) + ['-ar', str(SR), '-ac', '1', dst]
    subprocess.run(cmd, check=True); return dst


TRIM_AF = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,'
           'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse')


def f0(path):
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32); out = []
    for i in range(0, len(x) - 640, 320):
        s = x[i:i + 640]
        if np.sqrt((s ** 2).mean()) < 0.02: continue
        s = s - s.mean(); ac = np.correlate(s, s, 'full')[639:]; j = 40 + int(np.argmax(ac[40:266]))
        if ac[j] > 0.45 * ac[0]: out.append(16000 / j)
    return round(float(np.median(out))) if out else 0


def build(n, name, vid, speed):
    mp3 = fishlib.synth(DIRECTED, vid, speed, TEMP, TOP_P, tag='host')
    full = wav(mp3, os.path.join(TMP, f'{n}_{speed}_full.wav'))
    _, ws = F.transcribe('en', full, words=True)
    al = F.align(' '.join(LINES), ws, fishlib.probe(full))
    ends, k = [], 0
    for l in LINES:
        k += len([t for t in l.split() if re.search(r'\w', t)]); ends.append(k)
    cuts = [0.0]
    for e in ends[:-1]:
        cuts.append((al[e - 1]['e'] + al[e]['s']) / 2)
    cuts.append(fishlib.probe(full))
    parts = []
    for i in range(4):
        p = os.path.join(TMP, f'{n}_{speed}_l{i}.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', full, '-ss', f'{cuts[i]:.3f}', '-to', f'{cuts[i + 1]:.3f}',
                        '-af', TRIM_AF, '-ar', str(SR), '-ac', '1', p], check=True)
        parts.append(p)
    sil = os.path.join(TMP, 'gap.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', str(GAP), sil], check=True)
    lst = os.path.join(TMP, f'{n}_list.txt')
    with open(lst, 'w', encoding='utf-8') as f:
        for i, p in enumerate(parts):
            if i: f.write(f"file '{sil}'\n")
            f.write(f"file '{p}'\n")
    out = os.path.join(OUTD, f'{n}_{name}.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c:a', 'libmp3lame', '-b:a', '192k', out], check=True)
    dur = fishlib.probe(out)
    hyp, _ = F.transcribe('en', out)
    durs = [fishlib.probe(p) for p in parts]
    return {'file': os.path.relpath(out, fishlib.L001), 'speed': speed, 'dur': round(dur, 2), 'wpm': round(NW / dur * 60),
            'line_durs': [round(d, 2) for d in durs], 'line_wpm': [round(len(l.split()) / d * 60) for l, d in zip(LINES, durs)],
            'f0_per_line': [f0(p) for p in parts], 'asr': hyp,
            'sim': F.score('en', ' '.join(LINES), hyp, dur)['sim'], 'leak': F.score('en', ' '.join(LINES), hyp, dur)['leak']}


if __name__ == '__main__':
    res = []
    for n, name, vid, title in VOICES:
        vid = FULL.get(vid, vid)
        r = build(n, name, vid, 1.0)
        sp = round(round(min(1.15, max(0.85, TARGET_WPM / r['wpm'])) / 0.02) * 0.02, 2)
        if abs(sp - 1.0) >= 0.03: r = build(n, name, vid, sp)
        f = r['f0_per_line']
        r.update({'n': n, 'voice': title, 'id': vid, 'f0_spread_hz': max(f) - min(f)})
        res.append(r)
        print(f"{n} {title}: speed {r['speed']} {r['dur']} s {r['wpm']} wpm, line wpm {r['line_wpm']}, f0 {f}, "
              f"sim {r['sim']}, leak {r['leak']} | {r['asr']}", flush=True)
    json.dump(res, open(os.path.join(OUTD, 'takes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
