"""voice_eleven.py: текст -> голос ElevenLabs (mp3) + таймкоды каждого слова (words.json).

  python engine/tools/voice_eleven.py <папка фильма> --voice-id <id> [--speed 1.0] [--stability 0.5]
                                      [--similarity 0.75] [--style 0] [--model eleven_multilingual_v2]

Читает narration.txt (строка = фраза), пишет voice.mp3 и words.json рядом — в том же формате, что voice.py:
[{ "word", "text", "start", "end", "line" }]. Время слов берётся из посимвольной разметки самого сервиса.
Ключ: переменная ELEVENLABS_API_KEY или файл raw/_secrets/voice-api-key.txt в корне проекта. Ключ не печатается.
Каждый запуск тратит символы тарифа (длина текста). Повтор с теми же настройками без --force не делается:
ответ сервиса кешируется в <папка>/out/eleven_<хеш>.json.
"""
import argparse, base64, hashlib, json, os, re, sys, urllib.request, urllib.error

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUNCT = " \t\r\n.,!?;:\"“”‘()[]…—–"

def read_lines(path):
    return [s.strip() for s in open(path, encoding="utf-8").read().splitlines() if s.strip() and not s.strip().startswith("#")]

def api_key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k:
        p = os.path.join(ROOT, "raw", "_secrets", "voice-api-key.txt")
        k = open(p, encoding="utf-8").read().strip() if os.path.exists(p) else None
    if not k: sys.exit("нет ключа: ELEVENLABS_API_KEY или raw/_secrets/voice-api-key.txt")
    return k

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("film"); ap.add_argument("--voice-id", required=True)
    ap.add_argument("--speed", type=float, default=1.0); ap.add_argument("--stability", type=float, default=0.5)
    ap.add_argument("--similarity", type=float, default=0.75); ap.add_argument("--style", type=float, default=0.0)
    ap.add_argument("--model", default="eleven_multilingual_v2"); ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    lines = read_lines(os.path.join(a.film, "narration.txt"))
    text = " ".join(lines)
    body = {"text": text, "model_id": a.model,
            "voice_settings": {"stability": a.stability, "similarity_boost": a.similarity, "style": a.style, "speed": a.speed}}
    tag = hashlib.sha256(json.dumps([a.voice_id, body], sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
    os.makedirs(os.path.join(a.film, "out"), exist_ok=True)
    cache = os.path.join(a.film, "out", f"eleven_{tag}.json")
    if os.path.exists(cache) and not a.force:
        resp = json.load(open(cache, encoding="utf-8")); print("из кеша:", os.path.basename(cache))
    else:
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice_id}/with-timestamps?output_format=mp3_44100_128",
            data=json.dumps(body).encode(), headers={"xi-api-key": api_key(), "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read())
        except urllib.error.HTTPError as e:
            sys.exit(f"ElevenLabs HTTP {e.code}: {e.read()[:400].decode('utf-8', 'replace')}")
        json.dump(resp, open(cache, "w", encoding="utf-8"))
        print(f"запрос выполнен: {len(text)} символов")

    al = resp.get("alignment") or resp.get("normalized_alignment")
    chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    if "".join(chars) != text:
        print("внимание: разметка сервиса не совпала с текстом посимвольно, слова сопоставляются по порядку", file=sys.stderr)
    # слова по пробелам в размеченной строке
    spans, i, n = [], 0, len(chars)
    while i < n:
        while i < n and chars[i].isspace(): i += 1
        if i >= n: break
        j = i
        while j < n and not chars[j].isspace(): j += 1
        spans.append((i, j - 1)); i = j
    toks = [(li + 1, t) for li, line in enumerate(lines) for t in line.split()]
    if len(spans) != len(toks):
        sys.exit(f"слов в разметке {len(spans)}, в тексте {len(toks)} — проверь narration.txt")
    words = []
    for (i0, i1), (line, tok) in zip(spans, toks):
        bare = tok.strip(PUNCT) or tok
        words.append({"word": bare, "start": round(st[i0], 3), "end": round(en[i1], 3), "line": line, "text": tok})
    open(os.path.join(a.film, "voice.mp3"), "wb").write(base64.b64decode(resp["audio_base64"]))
    json.dump(words, open(os.path.join(a.film, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    dur = words[-1]["end"]
    gaps = [round(words[k + 1]["start"] - words[k]["end"], 2) for k in range(len(words) - 1) if words[k + 1]["line"] != words[k]["line"]]
    print(f"слов {len(words)}, речь {dur:.2f} с, {len(words) / dur * 60:.0f} слов/мин; паузы между фразами: {gaps}")

if __name__ == "__main__":
    main()
