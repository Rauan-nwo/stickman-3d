# -*- coding: utf-8 -*-
"""fish_mix.py — сведение дорожки озвучки L002: уровни, края клипов, лимитер. Используется из fish_voice.py (assemble).

Зачем (2026-11-18, жалоба «звук местами пропадает»):
  * голоса из библиотеки Fish записаны с разной громкостью (до 17 дБ разницы) — тихие реплики «исчезали»;
  * ffmpeg silenceremove портил первые/последние 30 мс каждого клипа (оставленный «запас тишины» — перемешанные
    сэмплы, всплески до −21 дБFS = щелчки) и срезал хвосты тише −45 дБ.
Что делает render():
  * клип берётся не из обрезанного wav, а из сырого дубля: обрезанный wav нужен только как эталон места и длины
    (поэтому тайминги строк и слов не меняются), звук — исходный, с запасом 60 мс до и 100 мс после реплики;
  * громкость каждой реплики приводится к TARGET_LUFS (K-взвешивание BS.1770, блоки 100 мс, относительный гейт −10 LU);
    шёпот — на WHISPER_DB тише, [soft tone] — на SOFT_DB; затем «пол»: по метрике check_dropouts.py (средний уровень
    кадров 20 мс громче −45 дБ) ни одна реплика не остаётся тише медианы больше чем на FLOOR_DB;
  * 20 мс плавный вход и выход на каждом клипе; клипы кладутся на свои старты сложением (хвост уходит в паузу);
  * вся дорожка доводится до TARGET_LUFS и проходит лимитер с упреждением (потолок −1 дБFS, без клиппинга).
"""
import json, os, subprocess
import numpy as np
from scipy.signal import lfilter, fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 44100
TARGET_LUFS = -20.0
WHISPER_DB, SOFT_DB = -3.0, -1.5       # шёпот и [soft tone] — чуть тише остальных (не больше 4 дБ)
MAX_GAIN_DB = 26.0
PRE_EXT, TAIL, FADE = 0.06, 0.10, 0.02  # запас до реплики, хвост после, длина фейда (с)
FLOOR_DB, FLOOR_MAX = 4.0, 4.0          # реплика не тише медианы больше чем на FLOOR_DB по метрике check_dropouts.py
CEIL = 10 ** (-1.0 / 20)
ABRUPT_DB = -36.0                       # сырой дубль кончается громче этого уровня — конец слова обрезан


def dec(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def _biquad_hs(fc=1500.0, g=4.0, q=1 / np.sqrt(2)):
    a_ = 10 ** (g / 40); w = 2 * np.pi * fc / SR; al = np.sin(w) / (2 * q); c = np.cos(w); s = 2 * np.sqrt(a_) * al
    b = np.array([a_ * ((a_ + 1) + (a_ - 1) * c + s), -2 * a_ * ((a_ - 1) + (a_ + 1) * c), a_ * ((a_ + 1) + (a_ - 1) * c - s)])
    a = np.array([(a_ + 1) - (a_ - 1) * c + s, 2 * ((a_ - 1) - (a_ + 1) * c), (a_ + 1) - (a_ - 1) * c - s])
    return b / a[0], a / a[0]


def _biquad_hp(fc=38.0, q=0.5):
    w = 2 * np.pi * fc / SR; al = np.sin(w) / (2 * q); c = np.cos(w)
    b = np.array([(1 + c) / 2, -(1 + c), (1 + c) / 2]); a = np.array([1 + al, -2 * c, 1 - al])
    return b / a[0], a / a[0]


_HS, _HP = _biquad_hs(), _biquad_hp()


def kweight(x):
    return lfilter(*_HP, lfilter(*_HS, x.astype(np.float64)))


def loudness(x, block=0.1, hop=0.05):
    """Громкость в LUFS: K-взвешивание, блоки block с шагом hop, гейты −70 LUFS и −10 LU (BS.1770; для реплик блок 100 мс)."""
    y = kweight(x); nb, nh = int(block * SR), int(hop * SR)
    if len(y) < nb: nb = max(1, len(y)); nh = nb
    cs = np.concatenate([[0.0], np.cumsum(y ** 2)])
    idx = np.arange(0, len(y) - nb + 1, nh)
    z = (cs[idx + nb] - cs[idx]) / nb
    l = -0.691 + 10 * np.log10(z + 1e-12)
    g = z[l > -70]
    if not len(g): return -99.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = z[(l > -70) & (l > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean()))


def locate(T, R):
    """Смещение обрезанного клипа T внутри сырого дубля R (минимум суммы квадратов по самому громкому окну T)."""
    n = min(len(T), 8192)
    ct = np.concatenate([[0.0], np.cumsum(T.astype(np.float64) ** 2)]); e = ct[n:] - ct[:-n]
    j = int(np.argmax(e)); probe = T[j:j + n].astype(np.float64); R64 = R.astype(np.float64)
    c = fftconvolve(R64, probe[::-1], mode='valid')
    cs = np.concatenate([[0.0], np.cumsum(R64 ** 2)]); win = cs[n:] - cs[:-n]
    k = int(np.argmin(win - 2 * c + (probe ** 2).sum())) - j
    k = max(0, min(k, len(R) - 1))     # T бывает на 1 сэмпл длиннее остатка R (ffmpeg дополняет) — k не сдвигаем
    m = min(len(T), len(R) - k); core = slice(int(0.05 * SR), max(int(0.05 * SR) + 1, m - int(0.05 * SR)))
    err = float(np.abs(R[k:k + m][core] - T[:m][core]).max()) if m > int(0.12 * SR) else 0.0
    return k, err


def rms_db(x):
    return float(20 * np.log10(np.sqrt(float((x.astype(np.float64) ** 2).mean()) + 1e-12))) if len(x) else -120.0


def edge_info(raw_path, trim_path):
    """Где обрезанный клип лежит в сыром дубле и что на краях."""
    R, T = dec(raw_path), dec(trim_path)
    k, err = locate(T, R); n = min(len(T), len(R) - k); f = int(FADE * SR)
    post, pre = len(R) - k - n, k
    last20, first20 = rms_db(R[k + n - f:k + n]), rms_db(R[k:k + f])
    # звук обрублен, а дальше цифровая тишина: 10 мс перед последним сэмплом громче −45 дБ — громче −30, после — тише −60
    idx = np.nonzero(np.abs(R[k:k + n]) > 0.0056)[0]; hard_stop = False; stop_db = -120.0
    if len(idx):
        j = k + int(idx[-1]); w = int(0.01 * SR)
        stop_db = rms_db(R[max(k, j - w):j + 1]); hard_stop = bool(stop_db > -30 and rms_db(R[j + 1:j + 1 + w]) < -60)
    return {'raw': raw_path, 'k': k, 'n': n, 'len_raw': len(R), 'err': round(err, 5), 'last20': round(last20, 1),
            'first20': round(first20, 1), 'stop_db': round(stop_db, 1),
            'abrupt_end': bool((post < 0.01 * SR and last20 > ABRUPT_DB) or hard_stop),
            'abrupt_start': bool(pre < 0.005 * SR and first20 > ABRUPT_DB),
            'garbage_db': round(float(20 * np.log10(max(np.abs(R[k:k + int(0.04 * SR)] - T[:int(0.04 * SR)]).max(),
                                                         np.abs(R[k + n - int(0.04 * SR):k + n] - T[n - int(0.04 * SR):n]).max(), 1e-6))), 1)
            if n > int(0.1 * SR) else -120.0,
            'post_tail_db': round(rms_db(R[k + n:k + n + int(TAIL * SR)]), 1)}


def limiter(x, ceil=CEIL, look=0.005):
    """Лимитер с упреждением: усиление = ceil/огибающая (макс. по ±5 мс), сглаженное по 5 мс. Не клиппинг."""
    la = int(look * SR)
    env = maximum_filter1d(np.abs(x), size=2 * la + 1, mode='constant')
    g = np.minimum(1.0, ceil / np.maximum(env, 1e-9)).astype(np.float32)
    n_red = int((g < 0.999).sum())
    if not n_red: return x, 0.0, 0
    gs = uniform_filter1d(g, size=la, mode='nearest')
    return (x * gs).astype(np.float32), float(-20 * np.log10(g.min())), n_red


def write_mp3(x, path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                          '-c:a', 'libmp3lame', '-b:a', '192k', path], stdin=subprocess.PIPE)
    p.communicate(np.ascontiguousarray(x, np.float32).tobytes())
    if p.returncode: raise RuntimeError('ffmpeg mp3 failed')


def ebur(path):
    """Интегральная громкость и истинный пик файла по ffmpeg ebur128 (независимая проверка)."""
    e = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    tail = e[e.rfind('Summary:'):]
    import re
    i = re.search(r'I:\s+(-?[\d.]+) LUFS', tail); pk = re.search(r'Peak:\s+(-?[\d.]+) dBFS', tail)
    lra = re.search(r'LRA:\s+(-?[\d.]+) LU', tail)
    return (float(i[1]) if i else None, float(pk[1]) if pk else None, float(lra[1]) if lra else None)


def render(items, clips, out_mp3, report_path=None):
    """items — строки с locked start/end; clips — на каждую строку dict(raw, trim, prev_same_raw, next_same_raw, offset_db).
    Возвращает сводку. Старт каждой реплики в дорожке = items[i]['start'] (сэмпл в сэмпл)."""
    info = [edge_info(c['raw'], c['trim']) for c in clips]
    total = int(round(items[-1]['end'] * SR)) + int(TAIL * SR) + 1
    mix = np.zeros(total, np.float32); rep = []; cache = {}
    nf = int(FADE * SR)

    def raw(c):
        R = cache.get(c['raw'])
        if R is None:
            cache.clear(); R = cache[c['raw']] = dec(c['raw'])
        return R

    def frames_db(seg, hop=int(0.02 * SR)):
        m = len(seg) // hop
        if m < 3: return None
        return 20 * np.log10(np.sqrt((seg[:m * hop].reshape(m, hop).astype(np.float64) ** 2).mean(1)) + 1e-9)

    def chk(d, g_db):   # метрика check_dropouts.py: средний дБ кадров 20 мс громче −45 дБ
        if d is None: return None
        d = d + g_db; d = d[d > -45]
        return float(d.mean()) if len(d) else None

    # проход 1: усиление по громкости (LUFS) + «пол» по метрике проверки
    lus, gains, fdb = [], [], []
    for c, e in zip(clips, info):
        seg = raw(c)[e['k']:e['k'] + e['n']]; lu = loudness(seg)
        lus.append(lu); gains.append(min(MAX_GAIN_DB, TARGET_LUFS + c.get('offset_db', 0.0) - lu)); fdb.append(frames_db(seg))
    floor_add = [0.0] * len(clips)
    for _ in range(3):
        cv = [chk(d, g + f) for d, g, f in zip(fdb, gains, floor_add)]
        med = float(np.median([v for v in cv if v is not None]))
        for j, v in enumerate(cv):
            if v is not None and v < med - FLOOR_DB:
                floor_add[j] = min(FLOOR_MAX, floor_add[j] + (med - FLOOR_DB - v) + 0.3)

    for i, (it, c, e) in enumerate(zip(items, clips, info)):
        R = raw(c)
        k, n = e['k'], e['n']
        lo = info[i - 1]['k'] + info[i - 1]['n'] if c.get('prev_same_raw') else 0
        hi = info[i + 1]['k'] if c.get('next_same_raw') else len(R)
        pre = max(0, min(k - lo, int(PRE_EXT * SR))); post = max(0, min(hi - (k + n), int(TAIL * SR)))
        s0 = int(round(it['start'] * SR)) - pre
        if s0 < 0: pre += s0; s0 = 0
        lu = lus[i]; g_db = gains[i] + floor_add[i]
        clip = R[k - pre:k + n + post].astype(np.float32) * np.float32(10 ** (g_db / 20))
        m = min(nf, len(clip) // 2)
        ramp = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, m, endpoint=False))).astype(np.float32)
        clip[:m] *= ramp; clip[-m:] *= ramp[::-1]
        if s0 + len(clip) > len(mix): clip = clip[:len(mix) - s0]
        mix[s0:s0 + len(clip)] += clip
        rep.append({'line': it['line'], 'speaker': it['speaker'], 'lufs_before': round(lu, 1), 'gain_db': round(g_db, 1),
                    'offset_db': c.get('offset_db', 0.0), 'floor_db': round(floor_add[i], 1), 'pre_ms': round(pre / SR * 1000), 'tail_ms': round(post / SR * 1000),
                    'abrupt_end': e['abrupt_end'], 'abrupt_start': e['abrupt_start'], 'last20_db': e['last20'],
                    'old_edge_garbage_db': e['garbage_db'], 'tail_after_old_trim_db': e['post_tail_db'], 'locate_err': e['err']})
    before = loudness(mix, 0.4, 0.1)
    mix *= np.float32(10 ** ((TARGET_LUFS - before) / 20))
    mix, red_db, n_red = limiter(mix)
    write_mp3(mix, out_mp3)
    i_lufs, peak, lra = ebur(out_mp3)
    summ = {'lines': len(items), 'track_lufs_before_trim': round(before, 2), 'global_trim_db': round(TARGET_LUFS - before, 2),
            'limiter_max_reduction_db': round(red_db, 2), 'limiter_samples': n_red, 'ebur128_I': i_lufs, 'ebur128_peak': peak,
            'ebur128_LRA': lra, 'gain_min_db': min(r['gain_db'] for r in rep), 'gain_max_db': max(r['gain_db'] for r in rep),
            'floor_boosted_lines': [(r['line'], r['floor_db']) for r in rep if r['floor_db'] > 0],
            'abrupt_end_lines': [r['line'] for r in rep if r['abrupt_end']],
            'not_located': [r['line'] for r in rep if r['locate_err'] > 1e-3]}
    if report_path:
        json.dump({'summary': summ, 'lines': rep}, open(report_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    return summ
