"""voice.py: текст -> голос (mp3) + таймкоды каждого слова (words.json) через edge-tts.

  python voice.py <папка фильма>                      читает narration.txt, пишет voice.mp3 и words.json рядом
  python voice.py --text "..." --out prefix           -> prefix.mp3 и prefix.words.json
  [--voice en-US-GuyNeural] [--rate +35%] [--pitch +0Hz]

narration.txt: одна строка = одна фраза или реплика. Номер строки (с 1) — это 'line' в метках timeline: cue('2:gold').
Пустые строки и строки, начинающиеся с #, пропускаются.
words.json: [{ "word", "text", "start", "end", "line" }], время в секундах; text — слово как в тексте (с пунктуацией
и регистром) для субтитров. Запускать питоном, где стоит edge-tts:
  C:\\Users\\velar\\.claude\\skills\\handdraw-skill\\.venv\\Scripts\\python.exe engine/tools/voice.py production/V002
"""
import argparse, asyncio, json, os, re, sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass

def norm(s):
    return re.sub(r"[^a-z0-9а-яё']", "", s.lower().replace("’", "'"))

def read_lines(path):
    out = []
    for raw in open(path, encoding="utf-8").read().splitlines():
        s = raw.strip()
        if s and not s.startswith("#"):
            out.append(s)
    return out

async def synth(text, voice, rate, pitch):
    import edge_tts
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words, audio = [], bytearray()
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            s = ch["offset"] / 1e7; d = ch["duration"] / 1e7        # тики по 100 нс -> секунды
            parts = ch["text"].split() or [ch["text"]]              # «10 years» приходит одной меткой — делим по длине слов
            total = sum(len(p) for p in parts) or 1; t = s
            for p in parts:
                dd = d * len(p) / total
                words.append({"word": p, "start": round(t, 3), "end": round(t + dd, 3)}); t += dd
    return words, bytes(audio)

def align(words, lines):
    """Каждому слову озвучки — строка narration.txt и написание из текста (с пунктуацией)."""
    toks = [(li + 1, t) for li, line in enumerate(lines) for t in line.split()]
    j, lost = 0, []
    for w in words:
        key = norm(w["word"])
        hit = None
        for k in range(j, min(j + 4, len(toks))):                  # слово могло «съесть» соседей (10-year -> 10 year)
            tk = norm(toks[k][1])
            if tk == key or (key and (tk.startswith(key) or tk.endswith(key) or key.startswith(tk))):
                hit = k; break
        if hit is None:
            w["line"] = toks[min(j, len(toks) - 1)][0] if toks else 1; w["text"] = w["word"]
            continue
        lost += [toks[k][1] for k in range(j, hit) if norm(toks[k][1])]
        w["line"] = toks[hit][0]
        tk = norm(toks[hit][1])
        w["text"] = toks[hit][1] if tk == key else w["word"]
        if tk == key or tk.endswith(key): j = hit + 1              # токен израсходован целиком
        else: j = hit
    lost += [t for _, t in toks[j:] if norm(t)]
    return lost

async def main():
    ap = argparse.ArgumentParser(description="edge-tts: текст -> mp3 + words.json")
    ap.add_argument("film", nargs="?", help="папка фильма с narration.txt")
    ap.add_argument("--text"); ap.add_argument("--out")
    ap.add_argument("--voice", default="en-US-GuyNeural"); ap.add_argument("--rate", default="+35%"); ap.add_argument("--pitch", default="+0Hz")
    a = ap.parse_args()
    if a.film:
        lines = read_lines(os.path.join(a.film, "narration.txt"))
        mp3, wj = os.path.join(a.film, "voice.mp3"), os.path.join(a.film, "words.json")
    elif a.text and a.out:
        lines = [s for s in a.text.split("\n") if s.strip()]
        mp3, wj = a.out + ".mp3", a.out + ".words.json"
    else:
        ap.error("нужна папка фильма или --text вместе с --out")
    if not lines: sys.exit("voice: narration.txt пуст")
    text = " ".join(lines)
    words = audio = None
    for attempt in range(4):                                       # сервис иногда отвечает NoAudioReceived
        try:
            words, audio = await synth(text, a.voice, a.rate, a.pitch)
            if words and audio: break
        except Exception as e:                                     # noqa
            print(f"voice: попытка {attempt + 1} не удалась: {type(e).__name__}: {e}", file=sys.stderr)
        await asyncio.sleep(1.5 * (attempt + 1))
    if not words or not audio: sys.exit("voice: edge-tts не дал звук после 4 попыток (нужна сеть)")
    lost = align(words, lines)
    open(mp3, "wb").write(audio)
    json.dump(words, open(wj, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n_text = sum(len(l.split()) for l in lines); dur = words[-1]["end"]
    print(f"voice: {len(words)} слов озвучено (в тексте {n_text}), {dur:.2f} с, {len(words) / dur * 60:.0f} слов/мин, голос {a.voice} {a.rate}")
    print(f"voice: {mp3}\nvoice: {wj}")
    if lost: print("voice: ВНИМАНИЕ, слова текста без таймкода:", " ".join(lost), file=sys.stderr)

asyncio.run(main())
