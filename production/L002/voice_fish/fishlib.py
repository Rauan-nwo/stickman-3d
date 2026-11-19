# -*- coding: utf-8 -*-
"""fishlib.py — общий код финальной озвучки L002 на Fish Audio (S2, модель s2.1-pro-free).

synth(text, voice_id, speed, temperature, top_p) -> путь к mp3 в кеше out/fish_cache/.
Кеш по sha1(model|voice|speed|temperature|top_p|text): повторный запуск ничего не перегенерирует.
Ретраи с экспоненциальной паузой на 429/5xx/сетевые ошибки; 402 (нет кредита) — сразу ошибка.
"""
import hashlib, json, os, subprocess, sys, time, urllib.request, urllib.error

D = os.path.dirname(os.path.abspath(__file__))
L002 = os.path.dirname(D)
ROOT = os.path.dirname(os.path.dirname(L002))
OUT = os.path.join(L002, 'out')
CACHE = os.path.join(OUT, 'fish_cache')
os.makedirs(CACHE, exist_ok=True)
MODEL = 's2.1-pro-free'
KEY = open(os.path.join(ROOT, 'raw', '_secrets', 'fish-api-key.txt'), encoding='utf-8').read().strip()
MIN_INTERVAL = 0.6          # не чаще ~1.6 запроса в секунду на поток
_last = [0.0]
import threading
_lock = threading.Lock()


def key(text, vid, speed, temp, top_p):
    return hashlib.sha1(f'{MODEL}|{vid}|{speed}|{temp}|{top_p}|{text}'.encode('utf-8')).hexdigest()[:16]


def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def synth(text, vid, speed=1.0, temp=0.75, top_p=0.75, tries=7, tag=''):
    k = key(text, vid, speed, temp, top_p)
    if tag: k += '_' + tag
    path = os.path.join(CACHE, k + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return path
    body = json.dumps({'text': text, 'reference_id': vid, 'format': 'mp3', 'temperature': temp, 'top_p': top_p,
                       'prosody': {'speed': speed}}).encode('utf-8')
    err = None
    for a in range(tries):
        with _lock:
            wait = _last[0] + MIN_INTERVAL - time.time()
            if wait > 0: time.sleep(wait)
            _last[0] = time.time()
        req = urllib.request.Request('https://api.fish.audio/v1/tts', data=body, method='POST', headers={
            'Authorization': 'Bearer ' + KEY, 'model': MODEL, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if len(data) < 1000: raise RuntimeError(f'short audio {len(data)} B')
            tmp = path + '.part'
            open(tmp, 'wb').write(data); os.replace(tmp, path)
            return path
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode('utf-8', 'replace')
            err = f'HTTP {e.code}: {msg}'
            if e.code in (400, 401, 402, 403, 404): raise RuntimeError(err)
            ra = e.headers.get('Retry-After')
            delay = float(ra) if ra and ra.replace('.', '').isdigit() else min(90, 3 * 2 ** a)
        except Exception as e:
            err = f'{type(e).__name__}: {e}'; delay = min(90, 3 * 2 ** a)
        print(f'  retry {a + 1}/{tries} in {delay:.0f}s: {err}', flush=True)
        time.sleep(delay)
    raise RuntimeError(err)
