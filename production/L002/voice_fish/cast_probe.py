# -*- coding: utf-8 -*-
"""cast_probe.py — пробы голосов для ролей L002: одна проба (реплики роли с метками) на кандидата -> f0, темп, whisper.

  python production/L002/voice_fish/cast_probe.py              # все кандидаты из CANDS
  python production/L002/voice_fish/cast_probe.py MUSK DARIO   # только эти роли

Пробы — out/cast_probe/<РОЛЬ>_<голос>.mp3 (через fishlib, кеш тот же), отчёт — out/cast_probe/probe.json.
f0 — медианная высота голоса (YIN, 60–400 Гц, только озвученные кадры). Голоса из публичной библиотеки Fish;
клоны знаменитостей, реальных людей, персонажей игр/аниме отсеяны до проб (по названию, описанию и тегам).
"""
import json, os, shutil, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishlib
import fish_voice as F

OUTD = os.path.join(fishlib.OUT, 'cast_probe'); os.makedirs(OUTD, exist_ok=True)

LINES = {   # реплики роли из сценария с метками режиссуры (как в narration_directed.txt)
    'MUSK': '[confident] Up thirty-four percent. [break] [bored] That was February. [break] [sarcastic] Now they pay rent. [break] I\'m against other people doing it badly.',
    'DARIO': '[calm] Somewhere we can say no. [break] We\'ll find out. [break] [sarcastic] Don\'t read the comments. [break] He\'s a very good landlord.',
    'DANIELA': '[calm] Where do we go? [break] [sarcastic] Once was enough. [break] We\'re busy. [break] [warm] Is that real?',
    'ALTMAN': '[soft tone] A billion? [break] No thank you. But we\'ll buy Twitter for nine point seven four. [break] Should we have kept them?',
    'SBF': '[excited] AI safety. Good cause. [break] [confident] Everything pays off. [break] Eventually. [break] [calm] For a while.',
    'GROK': '[happy] Hello, humans. [break] [sarcastic] Define funny. [break] Your subscription renewed. [break] It is to me. [break] Did I do that?',
    'SBF_CALM': '[calm] For a while. [break] Everything else. [break] Everything pays off. [break] AI safety. Good cause.',
    'GEN_M': '[confident] Look at it go. [break] Who\'s buying? [break] Everyone.',
    'GEN_F': '[confident] Sir. In February you called them evil. [break] And now?',
}
SR = 16000


def yin_f0(path, fmin=60, fmax=400):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    W, hop = 640, 160; tmin, tmax = SR // fmax, SR // fmin; out = []
    peak = np.abs(x).max() + 1e-9
    for i in range(0, len(x) - W - tmax, hop):
        s = x[i:i + W + tmax]
        if np.sqrt((s[:W] ** 2).mean()) < 0.03 * peak: continue
        d = np.array([((s[:W] - s[t:t + W]) ** 2).sum() for t in range(1, tmax + 1)])
        cm = d * np.arange(1, tmax + 1) / (np.cumsum(d) + 1e-12)
        cand = np.where(cm[tmin - 1:] < 0.15)[0]
        if not len(cand): continue
        t = cand[0] + tmin - 1
        while t + 1 < len(cm) and cm[t + 1] < cm[t]: t += 1
        out.append(SR / (t + 1))
    return round(float(np.median(out))) if out else 0


def role_lines(role):
    """Реплики роли из narration_directed.txt одной пробой (через [break])."""
    rs = [r['directed'] for r in F.load('en') if r['speaker'] == role]
    return ' [break] '.join(rs[:5])


def probe(role, label, vid, speed=1.0, line_key=None):
    text = LINES.get(line_key or role) or role_lines(line_key or role)
    mp3 = fishlib.synth(text, vid, speed, 0.75, 0.75, tag='probe')
    dst = os.path.join(OUTD, f'{role}_{label}.mp3'.replace(' ', '_'))
    shutil.copyfile(mp3, dst)
    w = F.trimmed(mp3); dur = fishlib.probe(w)
    hyp, _ = F.transcribe('en', w)
    plain = F.TAG.sub('', text)
    s = F.score('en', plain, hyp, dur)
    return {'role': role, 'label': label, 'id': vid, 'speed': speed, 'f0': yin_f0(w), 'dur': round(dur, 2),
            'wpm': s['wpm'], 'sim': s['sim'], 'leak': s['leak'], 'asr': hyp, 'file': os.path.basename(dst)}


if __name__ == '__main__':
    cands = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cast_candidates.json'), encoding='utf-8'))
    roles = sys.argv[1:] or list(cands)
    rp = os.path.join(OUTD, 'probe.json')
    rep = json.load(open(rp, encoding='utf-8')) if os.path.exists(rp) else {}
    for role in roles:
        for c in cands[role]:
            k = f"{role}|{c['label']}|{c['id']}|{c.get('speed', 1.0)}|{c.get('line', role)}"
            if k in rep: continue
            try: r = probe(role, c['label'], c['id'], c.get('speed', 1.0), c.get('line'))
            except Exception as e: print('ERR', role, c['label'], e, flush=True); continue
            rep[k] = r
            json.dump(rep, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print(f"{role:14s} {c['label'][:26]:26s} f0={r['f0']:3d} wpm={r['wpm']:3d} sim={r['sim']} leak={r['leak']} | {r['asr'][:70]}", flush=True)
