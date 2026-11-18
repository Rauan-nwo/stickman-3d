#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check.py — самопроверка звука после render.py.

  python sound/check.py --name ch0_1 --vis sound/out/vis_ch0_1.json [--whisper medium.en] [--chs 0,1]
  (питон с faster-whisper: системный python 3.11; numpy/scipy/soundfile нужны тоже — есть в sound-venv; WER считается
   отдельным запуском: --stt-only в системном питоне)

Пишет sound/out/<name>/CHECK.md и check.json:
  1. громкость мастера (ebur128: I, LRA, TP), краткосрочная громкость голоса в речи, разница голос − музыка (под речью / в паузах);
  2. цифровая тишина: участки мастера тише −60 dBFS (RMS 50 мс) длиннее 0.3 с;
  3. попадание в картинку: для каждого звука — кадр звука и ближайший кадр события на картинке (vis.py: всплеск
     покадровой разницы / появление красного / скачок яркости) в окне ±6 кадров; «по формуле» — событие без всплеска,
     время то же, что у движения в shots.js/core.js;
  4. разборчивость: распознавание речи по сухому голосу и по миксу, WER к тексту голоса (words.json).
"""
import argparse, json, re, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent; L = HERE.parent; SR = 48000


def load(p):
    import soundfile as sf
    x, sr = sf.read(str(p), dtype='float32'); assert sr == SR; return x


def ebur(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true:framelog=verbose', '-f', 'null', '-'],
                         capture_output=True).stderr.decode('utf-8', 'replace')
    tail = err[err.rfind('Summary:'):]; g = lambda p: float(re.search(p, tail).group(1))
    S = [float(m.group(2)) for m in re.finditer(r't:\s*([\d.]+).*?M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)', err)]
    frames = [(float(m.group(1)), float(m.group(2)), float(m.group(3))) for m in re.finditer(r't:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)', err)]
    return {'I': g(r'I:\s+(-?[\d.]+) LUFS'), 'LRA': g(r'LRA:\s+(-?[\d.]+) LU'), 'TP': g(r'Peak:\s+(-?[\d.]+) dBFS')}, frames


def rms_db(x, win=.05):
    m = x.mean(axis=1) if x.ndim == 2 else x; n = int(win * SR); c = np.cumsum(np.r_[0, m.astype(np.float64) ** 2])
    r = np.sqrt(np.maximum(c[n::n] - c[:-n:n][:len(c[n::n])], 0) / n)
    return 20 * np.log10(np.maximum(r, 1e-9))


def silence_spans(x, thr=-60, min_len=.3, win=.05):
    d = rms_db(x, win); low = d < thr; spans, i = [], 0
    while i < len(low):
        if low[i]:
            j = i
            while j < len(low) and low[j]: j += 1
            if (j - i) * win >= min_len: spans.append([round(i * win, 2), round(j * win, 2)])
            i = j
        else: i += 1
    return spans, float(d.min())


def vis_onset(vis, f, kind, win=6):
    """ближайший к кадру f кадр-событие на картинке: всплеск покадровой разницы (для appear — ещё и рост доли красного,
    для flash — скачок яркости). Из всех всплесков окна ±win берётся БЛИЖАЙШИЙ к f (а не самый сильный)."""
    mad, red, luma = np.array(vis['mad']), np.array(vis['red']), np.array(vis['luma'])
    lo, hi = max(2, f - win), min(len(mad) - 1, f + win)
    if hi <= lo: return None, None
    base = float(np.median(mad[max(0, lo - 24):lo])) if lo > 4 else float(np.median(mad[:max(3, lo)]))
    cand = []
    for k in range(lo, hi + 1):
        rise = mad[k] - mad[k - 1]                                   # начало всплеска: разница выросла относительно прошлого кадра
        score = max((mad[k] - max(base, .3)) / max(base, .5) if rise > .25 * max(base, .5) else 0,
                    abs(red[k] - red[k - 1]) * 1500 if kind == 'appear' else 0, abs(luma[k] - luma[k - 1]) / 1.5 if kind == 'flash' else 0)
        if score > 1.2: cand.append((abs(k - f), -score, k))
    if not cand: return None, None
    d, sc, k = min(cand)
    return k, round(-sc, 2)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--name', default='ch0_1'); ap.add_argument('--vis', default=None)
    ap.add_argument('--whisper', default='medium.en'); ap.add_argument('--stt-only', action='store_true'); ap.add_argument('--no-stt', action='store_true')
    a = ap.parse_args(); od = HERE / 'out' / a.name
    rep = json.load(open(od / 'report.json', encoding='utf-8')); t0, t1 = rep['t0'], rep['t1']
    words = [w for w in json.load(open(L / 'animatic/words.json', encoding='utf-8'))['words'] if w['s'] >= t0 and w['e'] <= t1 + .05]
    ref = ' '.join(w['w'] for w in words)

    if a.stt_only:   # отдельный запуск в питоне с faster-whisper
        from faster_whisper import WhisperModel
        m = WhisperModel(a.whisper, device='cpu', compute_type='int8', cpu_threads=8); dev = 'cpu int8'   # CUDA-сборка без cuBLAS на этой машине
        out = {'model': a.whisper, 'device': dev}
        for k in ('voice', 'mix'):
            segs, _ = m.transcribe(str(od / f'{k}.wav'), language='en', beam_size=5, vad_filter=False, condition_on_previous_text=False)
            out[k] = ' '.join(s.text.strip() for s in segs)
        out['ref'] = ref
        nw = lambda s: re.sub(r"[^a-z0-9$%' ]", ' ', s.lower().replace('-', ' ')).split()
        def wer(r, h):
            r, h = nw(r), nw(h); d = list(range(len(h) + 1))
            for i in range(1, len(r) + 1):
                p, d[0] = d[0], i
                for j in range(1, len(h) + 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
            return d[len(h)] / max(1, len(r))
        out['wer_voice'] = round(wer(ref, out['voice']), 4); out['wer_mix'] = round(wer(ref, out['mix']), 4)
        json.dump(out, open(od / 'stt.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(json.dumps({k: out[k] for k in ('model', 'device', 'wer_voice', 'wer_mix')})); return

    mix = load(od / 'mix.wav'); stems = {k: load(od / f'{k}.wav') for k in ('voice', 'music', 'sfx', 'amb')}
    m, frames = ebur(od / 'mix.wav')
    # голос: краткосрочная громкость в речи
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    ph = rep['phrases']; mask = np.zeros(len(mix), bool)
    for a0, a1 in ph: mask[max(0, int((a0 - t0) * SR)):int((a1 - t0) * SR)] = True
    def st_loud(x, sel):   # краткосрочная (3 с) громкость в окнах с речью > 70 %
        out = []
        for i in range(0, len(x) - 3 * SR, SR // 2):
            if sel[i:i + 3 * SR].mean() > .7: out.append(meter.integrated_loudness(x[i:i + 3 * SR]) if np.abs(x[i:i + 3 * SR]).max() > 0 else -99)
        return np.array(out)
    vS = st_loud(stems['voice'], mask)
    # голос − музыка и голос − (всё кроме голоса), окна 400 мс
    def win_db(x, sel_val):
        r = []
        for i in range(0, len(x) - int(.4 * SR), int(.2 * SR)):
            s = mask[i:i + int(.4 * SR)].mean()
            if (s > .8) == sel_val and (s > .8 or s < .05): r.append(10 * np.log10(np.mean(x[i:i + int(.4 * SR)] ** 2) + 1e-12))
        return np.array(r)
    v_sp, mu_sp, mu_pa = win_db(stems['voice'], True), win_db(stems['music'], True), win_db(stems['music'], False)
    rest = stems['music'] + stems['sfx'] + stems['amb']; re_sp, re_pa = win_db(rest, True), win_db(rest, False)
    sil, mind = silence_spans(mix)
    loud = {'mix': m, 'voice_S_speech_LUFS': {'p10': round(float(np.percentile(vS, 10)), 1), 'p50': round(float(np.median(vS)), 1), 'p90': round(float(np.percentile(vS, 90)), 1)} if len(vS) else None,
            'stem_LUFS': {k: (round(meter.integrated_loudness(x), 1) if np.abs(x).max() > 1e-6 else None) for k, x in stems.items()},
            'voice_minus_music_speech_dB': round(float(np.median(v_sp) - np.median(mu_sp)), 1) if len(mu_sp) and np.median(mu_sp) > -120 else None,
            'music_pause_minus_speech_dB': round(float(np.median(mu_pa) - np.median(mu_sp)), 1) if len(mu_pa) and len(mu_sp) else None,
            'voice_minus_rest_speech_dB': round(float(np.median(v_sp) - np.median(re_sp)), 1), 'rest_pause_vs_speech_dB': round(float(np.median(re_pa) - np.median(re_sp)), 1) if len(re_pa) else None,
            'silence_spans_lt_-60dBFS_ge_0.3s': sil, 'min_rms50_dBFS': round(mind, 1)}

    # попадание в картинку
    cues = {c['id']: c for c in json.load(open(HERE / 'cues.json', encoding='utf-8'))['cues']}
    vis = json.load(open(a.vis)) if a.vis else None
    rows = []
    for p in rep['placed']:
        c = cues.get(p['id'])
        if not c or c['t'] < t0 or c['t'] > t1: continue
        vt = c.get('vt', c['t']); f_cue = round(c['t'] * 30); f_ev = int(np.ceil(vt * 30 - 1e-6)); f_snd = (p['sample'] / SR + t0) * 30   # событие в момент t впервые видно в кадре ceil(t·30)
        place_err = round(f_snd - c['t'] * 30, 3)          # звук против своей метки (кадры)
        kind = c.get('vis', 'formula'); vf, sc = (None, None)
        if vis and kind in ('cut', 'motion', 'flash', 'appear'): vf, sc = vis_onset(vis, f_ev - round(vis['t0'] * 30), kind)
        if vf is not None: vf += round(vis['t0'] * 30)
        d = None if vf is None else f_ev - vf
        ok = 'по формуле' if kind in ('formula', 'slot') or vf is None else ('✓' if abs(d) <= 1 else '✗')
        rows.append({'id': c['id'], 'shot': c['shot'], 'what': c.get('what', ''), 'snd': c['snd'], 't': round(c['t'], 3), 'frame': f_cue, 'ev_frame': f_ev, 'offset_frames': f_cue - f_ev,
                     'vis_frame': vf, 'delta_frames': d, 'place_err_frames': place_err, 'score': sc, 'check': ok, 'kind': kind})
    nchk = [r for r in rows if r['check'] in ('✓', '✗')]
    # склейки картинки без звука перехода/события в ±1 кадр (дизайн: склейки внутри одной локации — только смена подложки нет)
    cuts = []
    if vis:
        mad = np.array(vis['mad'])
        for f in range(2, len(mad)):
            if mad[f] > 25 and mad[f] > 4 * np.median(mad[max(0, f - 10):f]):
                F = f + round(vis['t0'] * 30); near = [r for r in rows if abs(r['frame'] - F) <= 1]
                cuts.append({'frame': F, 't': round(F / 30, 3), 'mad': round(float(mad[f]), 1), 'sounds': [r['snd'] for r in near]})
    # обратная проверка: резкие всплески картинки, рядом с которыми (±2 кадра) нет ни одного звука
    orphans = []
    if vis:
        mad = np.array(vis['mad']); F0 = round(vis['t0'] * 30); fr_all = sorted(set([r['ev_frame'] for r in rows] + [r['frame'] for r in rows]))
        import bisect
        for k in range(12, len(mad)):
            base = float(np.median(mad[k - 12:k - 1])); thr = max(3 * base, base + 3)
            if mad[k] > thr and mad[k - 1] <= thr:
                F = k + F0; i = bisect.bisect_left(fr_all, F - 2)
                if not (i < len(fr_all) and fr_all[i] <= F + 2): orphans.append({'frame': F, 't': round(F / 30, 3), 'mad': round(float(mad[k]), 1), 'base': round(base, 2)})
    out = {'loudness': loud, 'orphans': orphans, 'sync': {'cues': len(rows), 'checked_vs_picture': len(nchk), 'ok_pm1': sum(r['check'] == '✓' for r in nchk),
           'bad': [r for r in nchk if r['check'] == '✗'], 'max_place_err_frames': max(abs(r['place_err_frames']) for r in rows) if rows else None},
           'cuts': cuts, 'rows': rows}
    json.dump(out, open(od / 'check.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    stt = json.load(open(od / 'stt.json', encoding='utf-8')) if (od / 'stt.json').exists() else None
    # плотность эффектов тем же детектором, что у конкурента (competitor/sfx_density.py) — по дорожке без голоса
    dens = None
    det = HERE / 'competitor' / 'sfx_density.py'
    if det.exists():
        import soundfile as sf
        rest_p = od / '_rest.wav'; sf.write(str(rest_p), (stems['music'] + stems['sfx'] + stems['amb']).astype(np.float32), SR, subtype='PCM_24')
        dj = od / 'density.json'
        subprocess.run([sys.executable, str(det), str(rest_p), '--multi', '6,10,15', '--json', str(dj)], capture_output=True)
        rest_p.unlink(missing_ok=True)
        if dj.exists():
            D = json.load(open(dj, encoding='utf-8')); dens = {t: D['by_thr'][t]['summary'] for t in D.get('by_thr', {})}
    mm = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
    md = [f'# Проверка звука — {a.name}', '', f'Окно {mm(t0)}–{mm(t1)}; звуков {len(rows)}, из записей {rep["from_recordings"]}.', '',
          '## Громкость', '', f'- Мастер: **{m["I"]} LUFS**, LRA {m["LRA"]} LU, true peak **{m["TP"]} dBTP** (цель −14 / ≤ −1).',
          f'- Голос в речи, краткосрочная (3 с): {loud["voice_S_speech_LUFS"]}.', f'- Стемы, LUFS: {loud["stem_LUFS"]}.',
          f'- Голос − музыка под речью: {loud["voice_minus_music_speech_dB"]} дБ; музыка в паузах выше, чем под речью, на {loud["music_pause_minus_speech_dB"]} дБ.',
          f'- Голос − всё остальное под речью: {loud["voice_minus_rest_speech_dB"]} дБ; остальное в паузах против речи: {loud["rest_pause_vs_speech_dB"]} дБ.',
          f'- Цифровая тишина (< −60 dBFS ≥ 0.3 с): {len(sil)} участков {sil}; минимум RMS 50 мс {loud["min_rms50_dBFS"]} dBFS.', '',
          '## Разборчивость', '', (f'- Whisper {stt["model"]} ({stt["device"]}): WER сухого голоса **{stt["wer_voice"]*100:.1f} %**, микса **{stt["wer_mix"]*100:.1f} %** '
                                    f'(разница {(stt["wer_mix"]-stt["wer_voice"])*100:+.1f} п.п.).' if stt else '- (распознавание не запускалось)'), '',
          '## Плотность эффектов (детектор конкурента)', '',
          *([f'- порог {t} дБ: **{v.get("per_min")} событий/мин**; по классам/мин: {v.get("class_per_min")}' for t, v in dens.items()] if dens else ['- (детектор не запускался)']), '',
          '## Попадание в картинку', '',
          f'Сверено с картинкой {len(nchk)} звуков из {len(rows)}: в ±1 кадр — **{out["sync"]["ok_pm1"]}**; остальное — «по формуле»: событие без резкого всплеска '
          f'на картинке (движение руки, маркер, пыль), время звука = время того же движения в коде кадра. Звук к своей метке: макс. ошибка '
          f'{out["sync"]["max_place_err_frames"]} кадра.', '',
          'Столбцы: «кадр события» — кадр события по монтажному листу; «на картинке» — найденный всплеск картинки; Δ — их разница; '
          '«сдвиг звука» — намеренный сдвиг точки звука от кадра события (пик свиста после склейки, удар штампа на приземлении).', '',
          '| план | событие | звук | время | кадр события | на картинке | Δ, кадров | сдвиг звука | проверка |', '|---|---|---|---|---|---|---|---|---|']
    for r in rows: md.append(f'| {r["shot"]} | {r["what"][:70]} | {r["snd"]} | {mm(r["t"])} | {r["ev_frame"]} | {r["vis_frame"] if r["vis_frame"] is not None else "—"} | {r["delta_frames"] if r["delta_frames"] is not None else "—"} | {r["offset_frames"]:+d} | {r["check"]} |')
    md += ['', '## Склейки картинки и звук на них', '', '| кадр | время | звуки ±1 кадр |', '|---|---|---|'] + [f'| {c["frame"]} | {mm(c["t"])} | {", ".join(c["sounds"]) or "— (подложка меняется / склейка в той же локации)"} |' for c in cuts]
    md += ['', '## Всплески картинки без звука рядом (±2 кадра)', '', 'Резкие изменения кадра (разница выросла втрое к фону), у которых нет звука: кандидаты на пропущенное событие; '
           'движение героя внутри плана сюда тоже попадает — смотреть кадр.', '', '| кадр | время | разница | фон |', '|---|---|---|---|'] + [f'| {o["frame"]} | {mm(o["t"])} | {o["mad"]} | {o["base"]} |' for o in orphans]
    (od / 'CHECK.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(json.dumps({'mix': m, 'silence': len(sil), 'sync_checked': len(nchk), 'ok': out['sync']['ok_pm1'], 'bad': len(out['sync']['bad']), 'cuts': len(cuts),
                      'v-m': loud['voice_minus_music_speech_dB'], 'v-rest': loud['voice_minus_rest_speech_dB']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
