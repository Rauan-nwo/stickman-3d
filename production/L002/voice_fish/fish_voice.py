# -*- coding: utf-8 -*-
"""fish_voice.py — финальная озвучка L002 на Fish Audio: EN (публикация) и RU (для прослушивания).

  python production/L002/voice_fish/fish_voice.py synth    en|ru|all   — синтез всех строк (кеш out/fish_cache/)
  python production/L002/voice_fish/fish_voice.py verify   en|ru|all   — whisper: текст совпадает, метки не прочитаны вслух
  python production/L002/voice_fish/fish_voice.py fix      en|ru|all   — перегенерация отбракованных строк (до 4 дублей), выбор лучшего
  python production/L002/voice_fish/fish_voice.py assemble en|ru|all   — сведение out/voice_fish_<lang>.mp3 + out/lines_fish*.json
  python production/L002/voice_fish/fish_voice.py edges    en|ru|all   — передубль реплик, у которых сырой дубль оборван на звуке
  python production/L002/voice_fish/fish_voice.py recut    en|ru <N>   — заново разрезать сцену ведущего, где есть строка N
  python production/L002/voice_fish/fish_voice.py all      en|ru|all   — всё по очереди

assemble НЕ двигает тайминги: если out/lines_fish*.json уже есть, старт каждой строки берётся из него («замороженная»
шкала — на ней стоит картинка), строки с прежней длиной переносятся дословно вместе со словами. Пересчитать шкалу с нуля —
assemble <lang> --retime. Уровни, края клипов и лимитер — fish_mix.py.

Вход: narration.txt / narration_ru.txt (чистый текст), voice_fish/narration_directed.txt / narration_ru_directed.txt
(те же строки с метками режиссуры S2), voice_fish/cast.json (голос на каждого говорящего).
Состояние дублей: out/fish_takes_<lang>.json. Отчёт проверки: out/fish_verify_<lang>.json.
Паузы: рассказчик→рассказчик 0.2 с, вокруг реплик героев 0.15 с, перед началом главы 1.0 с.
"""
import difflib, json, os, re, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishlib, fish_mix
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass

D = fishlib.D; L002 = fishlib.L002; OUT = fishlib.OUT
TRIM = os.path.join(OUT, 'fish_trim'); os.makedirs(TRIM, exist_ok=True)
SR = 44100
GAP_NARR, GAP_CHAR, GAP_CHAPTER, GAP_SCENE = 0.2, 0.15, 1.0, 0.3
MAX_TAKES = 4
KEEP_TOL = 0.04     # строка с прежней длиной (±40 мс) сохраняет старые start/end/words дословно
SPK = re.compile(r'^\[([A-Z][A-Z0-9 ]*)\]\s*(.*)$')
TAG = re.compile(r'\[[a-z][a-z \-]*\]\s*')
CAST = {'en': 'cast.json', 'ru': 'cast_ru.json'}
FILES = {'en': ('narration.txt', 'narration_directed.txt'), 'ru': ('narration_ru.txt', 'narration_ru_directed.txt')}
# слова, которые означают, что метка прочитана вслух (если их нет в самой строке)
LEAK_EN = {'emphasis', 'break', 'sarcastic', 'serious', 'confident', 'calm', 'curious', 'mysterious', 'whispering',
           'whisper', 'soft', 'tone', 'skeptical', 'bored', 'hopeful', 'impatient', 'satisfied', 'warm', 'sad', 'happy',
           'excited', 'worried', 'surprised', 'confused', 'sighing', 'chuckling', 'bracket', 'long'}
LEAK_RU = ('эмфа', 'эмфе', 'имфа', 'брейк', 'брэйк', 'сириус', 'конфид', 'кьюри', 'мистер', 'виспер', 'скептик',
           'саркаст', 'хоуп', 'импейш', 'сэд', 'хэппи', 'ворри', 'бордь', 'сатисф', 'софт', 'тоун')


def chapter_starts():
    """Номера первых строк глав (кроме первой): первая фраза/реплика каждой главы script.md, поиск по порядку строк.
    (В L001 сравнивались первые 25 букв абзаца — для коротких первых фраз L002 «May 2026.» это не работает.)"""
    import importlib.util
    spec = importlib.util.spec_from_file_location('make_narration', os.path.join(L002, 'make_narration.py'))
    mn = importlib.util.module_from_spec(spec); spec.loader.exec_module(mn)
    script = open(os.path.join(L002, 'script.md'), encoding='utf-8').read()
    body = script[script.index('<!-- SCRIPT START -->'):]
    firsts = []
    for ch in re.split(r'\n## \d+\. [^\n]*', body)[1:]:
        ls = mn.build('<!-- SCRIPT START -->\n' + ch + '\n<!-- SCRIPT END -->')
        if ls: firsts.append(re.sub(r'^\[[A-Z][A-Z0-9 ]*\]\s*', '', ls[0]))
    en = load('en'); res, i = set(), 0
    for f in firsts:
        while i < len(en) and en[i]['text'] != f: i += 1
        if i < len(en):
            if en[i]['line'] > 1: res.add(en[i]['line'])
            i += 1
    return res


def load(lang):
    a, b = FILES[lang]
    plain = [l.strip() for l in open(os.path.join(L002, a), encoding='utf-8') if l.strip()]
    directed = [l.strip() for l in open(os.path.join(D, b), encoding='utf-8') if l.strip()]
    assert len(plain) == len(directed), (lang, len(plain), len(directed))
    cast = json.load(open(os.path.join(D, CAST[lang]), encoding='utf-8'))
    pv = os.path.join(D, '..', '..', '..', 'raw', '_secrets', 'l002_cast_private.json')   # приватные id голосов (не в git)
    if os.path.exists(pv):
        for r, v in json.load(open(pv, encoding='utf-8')).items(): cast.setdefault(r, {}).update(v)
    rows = []
    for i, (p, d) in enumerate(zip(plain, directed), 1):
        m = SPK.match(p); sp, text = (m[1], m[2]) if m else ('NARRATOR', p)
        md = SPK.match(d); dsp, dtext = (md[1], md[2]) if md else ('NARRATOR', d)
        assert sp == dsp, (lang, i, sp, dsp)
        c = cast.get(sp) or {'id': None, 'name': None}
        rows.append({'line': i, 'speaker': sp, 'text': text, 'directed': dtext, 'vid': c['id'], 'voice': c['name'],
                     'speed': c.get('speed', 1.0), 'temperature': c.get('temperature', 0.75), 'top_p': c.get('top_p', 0.75),
                     'scene_tag': c.get('scene_tag')})
    # сцены одним дублем: подряд идущие строки говорящего со scene_tag (HOST) — один запрос на сцену
    sc = None
    for idx, r in enumerate(rows):
        if r['scene_tag'] and idx and rows[idx - 1]['speaker'] == r['speaker'] and sc is not None: sc.append(r)
        elif r['scene_tag']: sc = [r]
        else: sc = None
        r['scene'] = sc
    return rows


def scene_text(scene):
    return scene[0]['scene_tag'] + ' ' + ' '.join(x['directed'] for x in scene)


def refine_cut(x, t, win=0.6):
    """Точка разреза сцены: середина ближайшей к t паузы (whisper ошибается на 0.2–0.4 с и резал посреди слова)."""
    import numpy as np
    hop = int(0.01 * SR); a = max(0, int((t - win) * SR)); b = min(len(x), int((t + win) * SR))
    n = (b - a) // hop
    if n < 8: return t
    db = 20 * np.log10(np.sqrt((x[a:a + n * hop].reshape(n, hop).astype(np.float64) ** 2).mean(1)) + 1e-9)
    for thr in (-50, -45, -40):
        runs, i = [], 0
        while i < n:
            if db[i] < thr:
                j = i
                while j < n and db[j] < thr: j += 1
                if j - i >= 12: runs.append((i, j))
                i = j
            else: i += 1
        if runs:
            i, j = min(runs, key=lambda r: abs((a + (r[0] + r[1]) / 2 * hop) / SR - t))
            return (a + (i + j) / 2 * hop) / SR
    return (a + (int(np.argmin(db)) + 0.5) * hop) / SR


def scene_cut(lang, scene, k=0, force=False):
    """Один запрос на всю сцену -> режем по словам whisper (разрез посередине паузы) -> wav каждой реплики."""
    r0 = scene[0]
    mp3 = fishlib.synth(scene_text(scene), r0['vid'], r0['speed'], r0['temperature'], r0['top_p'],
                        tag='host' if k == 0 else f'host_r{k}')
    base = os.path.basename(mp3)[:-4]
    outs = [os.path.join(TRIM, f'{base}_l{i}.wav') for i in range(len(scene))]
    if not force and all(os.path.exists(o) for o in outs): return mp3, outs
    full = os.path.join(TRIM, base + '_full.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ar', str(SR), '-ac', '1', full], check=True)
    _, ws = transcribe(lang, full, words=True)
    texts = [x['text'] for x in scene]
    al = align(' '.join(texts), ws, fishlib.probe(full))
    ends, n = [], 0
    for t in texts:
        n += len([w for w in t.split() if re.search(r'\w', w)]); ends.append(n)
    x = fish_mix.dec(full)
    cuts = [0.0] + [refine_cut(x, (al[e - 1]['e'] + al[e]['s']) / 2) for e in ends[:-1]] + [fishlib.probe(full)]
    for i, o in enumerate(outs):
        # -ss/-to ДО -i: иначе фильтр обрезки получает всю сцену, а вырезка идёт по уже сдвинутой шкале
        # (так до 2026-11-18 резались сцены: клипы шли встык, без обрезки пауз, разрез на 0.15–0.19 с позже задуманного)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{cuts[i]:.3f}', '-to', f'{cuts[i + 1]:.3f}', '-i', full,
                        '-af', TRIM_AF, '-ar', str(SR), '-ac', '1', o], check=True)
    return mp3, outs


def take_path(r, k):
    return fishlib.synth(r['directed'], r['vid'], r['speed'], r['temperature'], r['top_p'], tag='' if k == 0 else f'r{k}')


def takes_file(lang): return os.path.join(OUT, f'fish_takes_{lang}.json')


def load_takes(lang):
    p = takes_file(lang)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


_tl = threading.RLock()


def save_takes(lang, t):
    with _tl:
        tmp = takes_file(lang) + '.tmp'
        data = json.dumps(t, ensure_ascii=False, indent=1)
        with open(tmp, 'w', encoding='utf-8') as f: f.write(data)
        for a in range(20):   # Windows: файл может быть на миг занят индексатором/антивирусом
            try: os.replace(tmp, takes_file(lang)); break
            except PermissionError: time.sleep(0.25)


TRIM_AF = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,'
           'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse')


def trimmed(mp3):
    """mp3 -> wav 44.1k mono без тишины по краям (оставляем 30 мс). Готовый wav из fish_trim/ возвращается как есть."""
    w = os.path.join(TRIM, os.path.splitext(os.path.basename(mp3))[0] + '.wav')
    if not os.path.exists(w):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-af', TRIM_AF, '-ar', str(SR), '-ac', '1', w], check=True)
    return w


# ---------------------------------------------------------------- synth
def cmd_synth(lang, workers=3):
    rows = load(lang); takes = load_takes(lang); done = [0]

    def scene_job(scene):
        sig = [scene_text(scene), scene[0]['vid'], scene[0]['speed'], scene[0]['temperature'], scene[0]['top_p'], 'scene']
        keys = [str(x['line']) for x in scene]
        if all(takes.get(k, {}).get('sig') == sig + [i] and os.path.exists(takes[k]['path']) for i, k in enumerate(keys)): return
        mp3, outs = scene_cut(lang, scene)
        with _tl:
            for i, (k, o) in enumerate(zip(keys, outs)):
                takes[k] = {'sig': sig + [i], 'path': o, 'scene_mp3': mp3, 'k': 0, 'attempts': []}
        save_takes(lang, takes); done[0] += len(keys)
        print(lang, 'scene take', keys[0], '-', keys[-1], flush=True)

    for r in rows:   # сцены — последовательно, до общего пула (нужен whisper)
        if r['scene'] and r['scene'][0] is r and r['vid']: scene_job(r['scene'])

    def job(r):
        key = str(r['line'])
        if not r['vid'] or r['scene']: return
        t = takes.get(key)
        sig = [r['directed'], r['vid'], r['speed'], r['temperature'], r['top_p']]
        if t and t.get('sig') == sig and os.path.exists(t['path']): return
        p = take_path(r, 0)
        with _tl: takes[key] = {'sig': sig, 'path': p, 'k': 0, 'attempts': []}
        save_takes(lang, takes)
        done[0] += 1
        if done[0] % 20 == 0: print(lang, 'synth', done[0], flush=True)

    errs = []
    with ThreadPoolExecutor(workers) as ex:
        for r, f in [(r, ex.submit(job, r)) for r in rows]:
            try: f.result()
            except Exception as e: errs.append((r['line'], str(e))); print('ERR', r['line'], e, flush=True)
    print(lang, 'synth done; new', done[0], 'errors', len(errs))
    return errs


# ---------------------------------------------------------------- verify
_models = {}


def model(lang):
    from faster_whisper import WhisperModel
    name = 'base.en' if lang == 'en' else 'small'
    if name not in _models: _models[name] = WhisperModel(name, device='cpu', compute_type='int8', cpu_threads=8)
    return _models[name]


def norm_tokens(s):
    s = s.lower().replace('ё', 'е').replace('’', "'")
    return re.findall(r"[a-zа-я0-9]+(?:'[a-z]+)?", s)


NUMW = set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen '
           'eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion trillion '
           'point and half a percent dollars dollar'.split())


def transcribe(lang, wav, words=False):
    segs, _ = model(lang).transcribe(wav, language=lang, beam_size=5 if words else 2, word_timestamps=words, vad_filter=False,
                                     condition_on_previous_text=False)
    segs = list(segs)
    text = ' '.join(s.text.strip() for s in segs)
    ws = [{'w': w.word.strip(), 's': w.start, 'e': w.end} for s in segs for w in (s.words or [])] if words else []
    return text, ws


_ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
_TENS = 'zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split()


def _n2w(n):
    if n < 20: return _ONES[n]
    if n < 100: return _TENS[n // 10] + ('' if n % 10 == 0 else ' ' + _ONES[n % 10])
    if n < 1000: return _ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' ' + _n2w(n % 100))
    for v, w in ((10 ** 12, 'trillion'), (10 ** 9, 'billion'), (10 ** 6, 'million'), (1000, 'thousand')):
        if n >= v: return _n2w(n // v) + ' ' + w + ('' if n % v == 0 else ' ' + _n2w(n % v))


def _year(n):
    if 2000 <= n <= 2009: return 'two thousand ' + _ONES[n % 10] if n % 10 else 'two thousand'
    if 1100 <= n <= 2099: return _n2w(n // 100) + ' ' + (_n2w(n % 100) if n % 100 >= 10 else 'oh ' + _ONES[n % 10])
    return _n2w(n)


def en_numbers(s):
    """Цифры whisper -> слова, чтобы сравнивать с текстом сценария."""
    s = s.replace(',000', '000')
    s = re.sub(r'\$(\d+(?:\.\d+)?)\s*(trillion|billion|million|thousand)?', lambda m: m[1] + ' ' + (m[2] + ' ' if m[2] else '') + 'dollars', s)
    s = s.replace('%', ' percent')
    def dec(m):
        a, b = m[1], m[2]
        return _n2w(int(a)) + ' point ' + ' '.join(_ONES[int(c)] for c in b)
    s = re.sub(r'(\d+)\.(\d+)', dec, s)
    s = re.sub(r'\d+', lambda m: _year(int(m[0])) if (len(m[0]) == 4 and 1100 <= int(m[0]) <= 2099) else _n2w(int(m[0])), s)
    return s


def letters(lang, s):
    if lang == 'en': s = en_numbers(s)
    s = s.lower().replace('ё', 'е').replace('-', ' ')
    return re.sub(r'[^a-zа-я0-9]', '', s)


def score(lang, ref, hyp, dur):
    """Сходство по буквам (имена и числа whisper пишет по-своему), утечка меток, длительность на букву."""
    R, H = norm_tokens(ref), norm_tokens(hyp)
    sim = difflib.SequenceMatcher(a=letters(lang, ref), b=letters(lang, hyp), autojunk=False).ratio()
    refset = set(R)
    if lang == 'en': leak = [t for t in H if t in LEAK_EN and t not in refset]
    else:
        leak = [t for t in H if any(t.startswith(x) for x in LEAK_RU) and not any(u.startswith(t[:4]) for u in refset)]
        leak += [t for t in H if t in LEAK_EN]
    n = max(1, len(letters(lang, ref)))
    return {'sim': round(sim, 3), 'leak': sorted(set(leak)), 'cps': round(n / max(dur, 0.1), 1),
            'wpm': round(len(ref.split()) / max(dur, 0.1) * 60), 'dur': round(dur, 2)}


CPS = {}   # медиана букв/с по (lang, рассказчик/герой) — считается в cmd_verify


def bad(s, lang, speaker):
    med = CPS.get((lang, speaker == 'NARRATOR'), s['cps'])
    slow, fast = (0.55, 1.75) if speaker == 'NARRATOR' else (0.4, 2.2)
    return bool(s['leak']) or s['sim'] < (0.8 if lang == 'en' else 0.7) or not (slow * med <= s['cps'] <= fast * med)


def rank(s):  # чем больше, тем лучше
    return s['sim'] - 1.0 * len(s['leak'])


def check(lang, r, path):
    w = trimmed(path)
    hyp, _ = transcribe(lang, w)
    s = score(lang, r['text'], hyp, fishlib.probe(w)); s['asr'] = hyp; s['path'] = path
    s['bad'] = bad(s, lang, r['speaker'])
    return s


def rescore(lang, r, s):
    if 'asr' not in s: return s
    n = score(lang, r['text'], s['asr'], s['dur']); n['asr'] = s['asr']; n['path'] = s['path']
    n['bad'] = bad(n, lang, r['speaker']); return n


def cmd_verify(lang):
    rows = load(lang); takes = load_takes(lang); rep = []
    import statistics
    for narr in (True, False):   # медианы темпа по уже проверенным строкам
        v = [takes[str(r['line'])]['score']['cps'] for r in rows if (r['speaker'] == 'NARRATOR') == narr
             and takes.get(str(r['line']), {}).get('score', {}).get('cps')]
        if v: CPS[(lang, narr)] = statistics.median(v)
    for r in rows:
        t = takes[str(r['line'])]
        if t.get('score') and t['score'].get('path') == t['path']: s = rescore(lang, r, t['score'])
        else: s = check(lang, r, t['path'])
        t['score'] = s; save_takes(lang, takes)
        rep.append({'line': r['line'], 'speaker': r['speaker'], 'text': r['text'], **{k: v for k, v in s.items() if k != 'path'}})
        if r['line'] % 40 == 0: print(lang, 'verify', r['line'], flush=True)
    json.dump(rep, open(os.path.join(OUT, f'fish_verify_{lang}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    badl = [x for x in rep if x['bad']]
    print(lang, 'verify: bad', len(badl), 'of', len(rep))
    for x in badl: print(f"  {x['line']:3d} {x['speaker']:12s} sim={x['sim']} cps={x['cps']} dur={x['dur']} leak={x['leak']} | {x['asr'][:90]}")
    return badl


def cmd_fix(lang):
    rows = {r['line']: r for r in load(lang)}; takes = load_takes(lang)
    for key, t in takes.items():
        r = rows[int(key)]
        if not t.get('score') or not t['score']['bad']: continue
        if r['scene']: print('  scene line', key, 'bad — перегенерировать сцену вручную'); continue
        best = t['score']; t['attempts'] = t.get('attempts') or [best]
        for k in range(len(t['attempts']), MAX_TAKES):
            try: p = take_path(r, k)
            except Exception as e: print('ERR', key, e); break
            s = check(lang, r, p); t['attempts'].append(s)
            print(f'  {lang} line {key} take {k}: sim={s["sim"]} cps={s["cps"]} leak={s["leak"]} bad={s["bad"]}', flush=True)
            if rank(s) > rank(best) or (best['bad'] and not s['bad']): best = s
            if not s['bad']: break
        t['path'] = best['path']; t['score'] = best; t['k'] = len(t['attempts']) - 1
        save_takes(lang, takes)
    return cmd_verify(lang)


# ---------------------------------------------------------------- assemble
def align(orig_text, asr_words, dur):
    """Слова оригинала -> времена из whisper (difflib по нормализованным токенам, пропуски — интерполяция)."""
    toks = [t for t in orig_text.split() if re.search(r'\w', t)]
    clean = [re.sub(r'^[^\w]+|[^\w%]+$', '', t) for t in toks]
    on = [(norm_tokens(t) or [''])[0] for t in toks]
    an = [(norm_tokens(w['w']) or [''])[0] for w in asr_words]
    times = [None] * len(toks)
    sm = difflib.SequenceMatcher(a=on, b=an, autojunk=False)
    for op, a1, a2, b1, b2 in sm.get_opcodes():
        if op == 'equal':
            for i in range(a2 - a1): times[a1 + i] = (asr_words[b1 + i]['s'], asr_words[b1 + i]['e'])
        elif op == 'replace' and b2 > b1:
            s0, e0 = asr_words[b1]['s'], asr_words[b2 - 1]['e']
            L = [max(1, len(clean[i])) for i in range(a1, a2)]; tot = sum(L); acc = 0
            for j, i in enumerate(range(a1, a2)):
                times[i] = (s0 + (e0 - s0) * acc / tot, s0 + (e0 - s0) * (acc + L[j]) / tot); acc += L[j]
    # интерполяция для несопоставленных
    i = 0
    while i < len(toks):
        if times[i] is None:
            j = i
            while j < len(toks) and times[j] is None: j += 1
            s0 = times[i - 1][1] if i > 0 else 0.0
            e0 = times[j][0] if j < len(toks) else dur
            L = [max(1, len(clean[k])) for k in range(i, j)]; tot = sum(L); acc = 0
            for n, k in enumerate(range(i, j)):
                times[k] = (s0 + (e0 - s0) * acc / tot, s0 + (e0 - s0) * (acc + L[n]) / tot); acc += L[n]
            i = j
        else: i += 1
    out, prev = [], 0.0
    for w, (s, e) in zip(clean, times):
        s = max(s, prev); e = max(e, s + 0.02); prev = s
        out.append({'w': w, 's': s, 'e': min(e, dur)})
    return out


def lines_file(lang): return os.path.join(OUT, 'lines_fish.json' if lang == 'en' else 'lines_fish_ru.json')


def raw_of(tk):
    """Сырой (необрезанный) звук дубля: mp3/flac из кеша, для сцены ведущего — весь дубль сцены."""
    if tk.get('scene_mp3'): return os.path.join(TRIM, os.path.splitext(os.path.basename(tk['scene_mp3']))[0] + '_full.wav')
    return tk['path']


def new_item(lang, r, w, t, dur):
    item = {'line': r['line'], 'speaker': r['speaker'], 'voice': r['voice'], 'text': r['text'],
            'start': round(t, 3), 'end': round(t + dur, 3)}
    if lang == 'en':
        _, ws = transcribe('en', w, words=True)
        item['words'] = [{'w': x['w'], 's': round(t + x['s'], 3), 'e': round(t + x['e'], 3)} for x in align(r['text'], ws, dur)]
    return item


def cmd_assemble(lang, retime=False):
    rows = load(lang); takes = load_takes(lang); chs = chapter_starts()
    lf = lines_file(lang)
    old = {x['line']: x for x in json.load(open(lf, encoding='utf-8'))} if os.path.exists(lf) and not retime else {}
    if old and len(old) != len(rows): print(lang, 'lines json has other line count — retiming'); old = {}
    t = 0.0; res = []; clips = []; changed = []
    for idx, r in enumerate(rows):
        tk = takes[str(r['line'])]
        w = trimmed(tk['path']); dur = fishlib.probe(w); o = old.get(r['line'])
        if o:                      # замороженная шкала: старт строки не двигается никогда
            t = o['start']
            if o['text'] == r['text'] and abs((o['end'] - o['start']) - dur) <= KEEP_TOL:
                item = dict(o)
            else:
                item = new_item(lang, r, w, t, dur)
                changed.append((r['line'], r['speaker'], round(o['end'] - o['start'], 3), round(dur, 3)))
            nxt = old.get(r['line'] + 1)
            if nxt and item['end'] > nxt['start'] - 0.05:
                print(f"  WARNING line {r['line']}: clip ends {item['end']} but next line starts {nxt['start']}", flush=True)
        else:
            if idx > 0:
                prev = rows[idx - 1]
                if r['line'] in chs: t += GAP_CHAPTER
                elif r['scene'] and r['scene'] is prev.get('scene'): t += GAP_SCENE
                elif prev['speaker'] == 'NARRATOR' and r['speaker'] == 'NARRATOR': t += GAP_NARR
                else: t += GAP_CHAR
            item = new_item(lang, r, w, t, dur); t += dur
        res.append(item)
        off = fish_mix.WHISPER_DB if '[whispering]' in r['directed'] else fish_mix.SOFT_DB if '[soft tone]' in r['directed'] else 0.0
        clips.append({'raw': raw_of(tk), 'trim': w, 'offset_db': off})
        if r['line'] % 80 == 0: print(lang, 'layout', r['line'], flush=True)
    for i, c in enumerate(clips):
        c['prev_same_raw'] = i > 0 and clips[i - 1]['raw'] == c['raw']
        c['next_same_raw'] = i + 1 < len(clips) and clips[i + 1]['raw'] == c['raw']
    mp3 = os.path.join(OUT, f'voice_fish_{lang}.mp3')
    summ = fish_mix.render(res, clips, mp3, os.path.join(OUT, f'fish_levels_{lang}.json'))
    json.dump(res, open(lf, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    total = fishlib.probe(mp3); words = sum(len(r['text'].split()) for r in rows)
    print(f'{lang}: {len(res)} lines, {total:.1f} s = {int(total // 60)}:{total % 60:04.1f}, {words} words, '
          f'{words / total * 60:.0f} wpm overall; last line end {res[-1]["end"]:.1f}')
    print(f'{lang}: timeline', 'frozen' if old else 'recomputed', '| lines with new length:', changed or 'none')
    print(f'{lang}: mix', json.dumps(summ, ensure_ascii=False))


# ---------------------------------------------------------------- edges: оборванные дубли
def cmd_edges(lang, tries=5, max_tempo=1.08):
    """Реплики, у которых сырой дубль Fish кончается (или начинается) прямо на звуке, — передубль. Новый дубль подгоняется
    по темпу (atempo, от ×0.94 до ×1.08) под прежнюю длину строки, чтобы шкала не сдвинулась. Если ни один дубль не
    влезает в окно до следующей строки — остаётся прежний (его конец уйдёт в 20 мс фейд), об этом пишется в лог."""
    import math
    rows = {r['line']: r for r in load(lang)}; takes = load_takes(lang)
    old = {x['line']: x for x in json.load(open(lines_file(lang), encoding='utf-8'))}
    todo = []
    for key in sorted(takes, key=int):
        tk = takes[key]; r = rows[int(key)]
        if r['scene']: continue
        e = fish_mix.edge_info(tk['path'], trimmed(tk['path']))
        if e['abrupt_end'] or e['abrupt_start']: todo.append((key, e))
    print(lang, 'edges: cut takes', [(k, e['last20'], e['stop_db']) for k, e in todo], flush=True)
    for key, e in todo:
        tk = takes[key]; r = rows[int(key)]; want = old[int(key)]['end'] - old[int(key)]['start']; cands = []
        nxt = old.get(int(key) + 1); room = want + ((nxt['start'] - old[int(key)]['end']) if nxt else 1.0) - 0.08
        for k in range(1, tries + 1):
            p = fishlib.synth(r['directed'], r['vid'], r['speed'], r['temperature'], r['top_p'], tag=f'e{k}')
            e2 = fish_mix.edge_info(p, trimmed(p)); s = check(lang, r, p)
            ok = not (e2['abrupt_end'] or e2['abrupt_start'] or s['bad'])
            print(f"  {lang} line {key} retake {k}: dur {s['dur']} (was {want:.2f}) sim {s['sim']} end {e2['last20']} dB ok={ok}", flush=True)
            if ok:
                cands.append((abs(math.log(s['dur'] / want)), p, s))
                if 0.94 <= s['dur'] / want <= 1.06: break
        if not cands: print(f'  {lang} line {key}: NO CLEAN RETAKE — оставлен прежний дубль', flush=True); continue
        _, p, s = min(cands); tempo = min(max_tempo, max(0.94, s['dur'] / want))
        if s['dur'] / tempo > room:
            print(f"  {lang} line {key}: лучший дубль {s['dur']} с при ×{tempo:.2f} не влезает в окно {room:.2f} с — "
                  f"оставлен прежний дубль (конец {e['last20']} дБ уйдёт в фейд)", flush=True); continue
        if abs(tempo - 1) > 0.004:
            fit = os.path.join(fishlib.CACHE, os.path.splitext(os.path.basename(p))[0] + '_fit.flac')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-af', f'atempo={tempo:.5f}', '-c:a', 'flac', fit], check=True)
            ft = os.path.join(TRIM, os.path.splitext(os.path.basename(fit))[0] + '.wav')
            if os.path.exists(ft): os.remove(ft)
            p = fit; s = check(lang, r, p)
        tk.setdefault('orig_path', tk['path'])
        tk.update({'path': p, 'score': s, 'retake': 'cut_end', 'tempo': round(tempo, 4)})
        save_takes(lang, takes)
        print(f"  {lang} line {key}: new take {os.path.basename(p)} tempo {tempo:.3f} dur {s['dur']} (slot {want:.2f}) sim {s['sim']} | {s['asr'][:70]}", flush=True)


def cmd_recut(lang, line):
    """Заново разрезать сцену ведущего (по паузам), в которой есть строка line."""
    rows = load(lang); takes = load_takes(lang)
    scene = rows[line - 1]['scene']
    if not scene: print('line', line, 'is not a scene line'); return
    mp3, outs = scene_cut(lang, scene, force=True)
    for r, o in zip(scene, outs):
        tk = takes[str(r['line'])]; tk['path'] = o; tk['scene_mp3'] = mp3
        tk['score'] = check(lang, r, o)
        print(f"  {lang} line {r['line']}: {fishlib.probe(o):.2f} s sim {tk['score']['sim']} | {tk['score']['asr']}", flush=True)
    save_takes(lang, takes)


if __name__ == '__main__':
    cmd, which = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'all')
    langs = ['en', 'ru'] if which == 'all' else [which]
    for lang in langs:
        if cmd in ('synth', 'all'): cmd_synth(lang)
        if cmd in ('verify',): cmd_verify(lang)
        if cmd in ('fix', 'all'):
            if cmd == 'all': cmd_verify(lang)
            cmd_fix(lang)
        if cmd == 'edges': cmd_edges(lang)
        if cmd == 'recut': cmd_recut(lang, int(sys.argv[3]))
        if cmd in ('assemble', 'all'): cmd_assemble(lang, retime='--retime' in sys.argv)
