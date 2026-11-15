"""voice_cast.py: реплики героев другими голосами ElevenLabs + подгонка темпа.

  python engine/tools/voice_cast.py <папка фильма> --cast cast.json [--gap 0.25] [--target 65] [--pause "12:You=0.25,17:And=0.3"]

cast.json: { "2": {"voice_id": "...", "speed": 1.05}, "6": {...} } — номер строки narration.txt -> голос для
текста в кавычках на этой строке. Рассказчик берётся из voice_raw.mp3 + words_raw.json (их пишет retime_voice.py
или они копируются из voice.mp3 / words.json при первом запуске). Пишет voice_fast.mp3, voice.mp3 и words.json.
--pause: добавочная пауза (секунды, до ускорения) ПЕРЕД словом «строка:слово».
Ответы сервиса кешируются в <папка>/out/cast_<хеш>.json — повторный запуск символы не тратит.
"""
import argparse, base64, hashlib, json, os, re, shutil, subprocess, sys, urllib.request, urllib.error

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUNCT = " \t\r\n.,!?;:\"“”‘()[]…—–"

ap = argparse.ArgumentParser()
ap.add_argument("film"); ap.add_argument("--cast", required=True)
ap.add_argument("--gap", type=float, default=0.25); ap.add_argument("--target", type=float, default=65.0)
ap.add_argument("--pause", default="")
a = ap.parse_args()
F = a.film
OUT = os.path.join(F, "out"); os.makedirs(OUT, exist_ok=True)
raw_mp3, raw_w = os.path.join(F, "voice_raw.mp3"), os.path.join(F, "words_raw.json")
if not os.path.exists(raw_mp3): shutil.copy(os.path.join(F, "voice.mp3"), raw_mp3)
if not os.path.exists(raw_w): shutil.copy(os.path.join(F, "words.json"), raw_w)
words = json.load(open(raw_w, encoding="utf-8"))
cast = json.load(open(a.cast, encoding="utf-8"))
key = (os.environ.get("ELEVENLABS_API_KEY") or open(os.path.join(ROOT, "raw", "_secrets", "voice-api-key.txt")).read()).strip()

def mean_db(path, ss=None, to=None):
    cmd = ["ffmpeg", "-hide_banner", "-nostats"] + (["-ss", str(ss), "-to", str(to)] if ss is not None else []) + ["-i", path, "-af", "volumedetect", "-f", "null", "-"]
    m = re.search(r"mean_volume: (-?[\d.]+) dB", subprocess.run(cmd, capture_output=True, text=True).stderr)
    return float(m.group(1)) if m else -20.0

def tts(text, v):
    body = {"text": text, "model_id": v.get("model", "eleven_multilingual_v2"),
            "voice_settings": {"stability": v.get("stability", 0.4), "similarity_boost": 0.75, "style": v.get("style", 0.3), "speed": v.get("speed", 1.0)}}
    tag = hashlib.sha256(json.dumps([v["voice_id"], body], sort_keys=True).encode()).hexdigest()[:12]
    cache = os.path.join(OUT, f"cast_{tag}.json")
    if os.path.exists(cache): resp = json.load(open(cache, encoding="utf-8"))
    else:
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{v['voice_id']}/with-timestamps?output_format=mp3_44100_128",
                                     data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r: resp = json.loads(r.read())
        except urllib.error.HTTPError as e: sys.exit(f"ElevenLabs HTTP {e.code}: {e.read()[:300].decode('utf-8','replace')}")
        json.dump(resp, open(cache, "w", encoding="utf-8")); print(f"запрос: {len(text)} символов")
    mp3 = os.path.join(OUT, f"cast_{tag}.mp3")
    open(mp3, "wb").write(base64.b64decode(resp["audio_base64"]))
    al = resp["alignment"]; ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    spans, i = [], 0
    while i < len(ch):
        while i < len(ch) and ch[i].isspace(): i += 1
        if i >= len(ch): break
        j = i
        while j < len(ch) and not ch[j].isspace(): j += 1
        spans.append((st[i], en[j - 1])); i = j
    return mp3, spans

# куски: рассказчик режется по строкам и по границам реплик; реплика целиком берётся из другого голоса
chunks = []   # {src, s0, e0, words:[(word, relstart, relend)], gain}
narr_db = mean_db(raw_mp3)
i = 0
while i < len(words):
    w = words[i]; line = str(w["line"])
    if line in cast and w["text"].startswith('"'):
        j = i
        while not words[j]["text"].rstrip().endswith('"'): j += 1
        grp = words[i:j + 1]
        text = " ".join(x["text"] for x in grp).strip('"')
        mp3, spans = tts(text, cast[line])
        if len(spans) != len(grp): sys.exit(f"строка {line}: слов в реплике {len(grp)}, в разметке {len(spans)}")
        s0 = max(0, spans[0][0] - .03); e0 = spans[-1][1] + .05
        chunks.append({"src": mp3, "s0": s0, "e0": e0, "gain": narr_db - mean_db(mp3) + cast[line].get("gain_db", 0),
                       "words": [(x, sp[0] - s0, sp[1] - s0) for x, sp in zip(grp, spans)], "gap_before": a.gap, "role": "char"})
        i = j + 1; continue
    j = i
    while j + 1 < len(words) and words[j + 1]["line"] == w["line"] and not (str(words[j + 1]["line"]) in cast and words[j + 1]["text"].startswith('"')): j += 1
    grp = words[i:j + 1]
    prev_end = words[i - 1]["end"] if i else 0.0
    next_start = words[j + 1]["start"] if j + 1 < len(words) else grp[-1]["end"] + .2
    s0 = max(0.0, grp[0]["start"] - min(.04, (grp[0]["start"] - prev_end) / 2))
    e0 = grp[-1]["end"] + min(.06, (next_start - grp[-1]["end"]) / 2)
    chunks.append({"src": raw_mp3, "s0": s0, "e0": e0, "gain": 0.0, "words": [(x, x["start"] - s0, x["end"] - s0) for x in grp],
                   "gap_before": a.gap if i else 0.0, "role": "narr"})
    i = j + 1

extra = {}
for item in filter(None, a.pause.split(",")):
    k, v = item.split("="); extra[k.strip()] = float(v)
for c in chunks:
    w0 = c["words"][0][0]; k = f'{w0["line"]}:{w0["word"]}'
    if k in extra: c["gap_before"] += extra[k]

srcs = sorted({c["src"] for c in chunks}); idx = {s: n for n, s in enumerate(srcs)}
total = sum(c["gap_before"] + c["e0"] - c["s0"] for c in chunks)
tempo = max(1.0, total / a.target)
fc, labels, t, out_words = [], [], 0.0, []
for n, c in enumerate(chunks):
    d = c["gap_before"]
    fc.append(f"[{idx[c['src']]}:a]atrim={c['s0']:.3f}:{c['e0']:.3f},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=mono,volume={c['gain']:.2f}dB,adelay={int(d * 1000)}:all=1[c{n}]")
    labels.append(f"[c{n}]")
    t += d
    for x, rs, re_ in c["words"]:
        out_words.append({**x, "start": round((t + rs) / tempo, 3), "end": round((t + re_) / tempo, 3), **({"voice": "char"} if c["role"] == "char" else {})})
    t += c["e0"] - c["s0"]
fc.append("".join(labels) + f"concat=n={len(chunks)}:v=0:a=1,atempo={tempo:.4f}[o]")
script = os.path.join(OUT, "cast_filter.txt"); open(script, "w").write(";".join(fc))
fast = os.path.join(F, "voice_fast.mp3")
cmd = ["ffmpeg", "-v", "error", "-y"]
for s in srcs: cmd += ["-i", s]
subprocess.run(cmd + ["-filter_complex_script", script, "-map", "[o]", "-c:a", "libmp3lame", "-q:a", "2", fast], check=True)
shutil.copy(fast, os.path.join(F, "voice.mp3"))
json.dump(out_words, open(os.path.join(F, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
dur = out_words[-1]["end"]
print(f"кусков {len(chunks)}, до ускорения {total:.2f} с, ускорение x{tempo:.3f}, итог {dur:.2f} с, {len(out_words) / dur * 60:.0f} слов/мин")
