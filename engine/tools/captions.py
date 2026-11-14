"""captions.py: words.json -> ASS-субтитры по 1–2 слова в стиле эталона.

  python captions.py words.json out.ass [--y 900] [--size 66] [--max-words 2] [--max-chars 14] [--short 0.08]
                                        [--gap 0.25] [--hold 0.6] [--fps 30] [--snap floor|round]
  python captions.py --cues cues.json out.ass       ручные реплики: [[кадр, "текст"], ...] и последним ["end", кадр]

Стиль (замер эталона, wiki/craft/style-bible.md §4): Montserrat ExtraBold 66 px, белый, чёрная обводка 5 + тень,
центр строки в точке (360, 900), слово меняется жёсткой подменой на кадре начала слова, без анимации.

Правило группировки (замер эталона: 175 реплик на 231 слово, 73 % реплик — одно слово, остальные — короткое служебное
слово, приклеенное к соседу). На тексте эталона с голосом edge-tts +35 % правило даёт близкую картину; порог --short
подобран под длительности слов edge-tts (для более медленного голоса его нужно поднять):
  1. По умолчанию одно слово = одна реплика.
  2. Очень короткое слово (звучит не дольше --short секунд) или короткое служебное слово (артикль, предлог, местоимение;
     звучит не дольше 1.5 x --short) приклеивается к СЛЕДУЮЩЕМУ слову: «the gold», «a rich», «he spent», «of the».
  3. Если такое слово стоит в конце фразы (после него знак препинания или пауза > --gap) или это короткое дополнение
     после глагола (it, him, them, up, down, off), оно приклеивается к ПРЕДЫДУЩЕМУ слову: «fired it», «lights it,».
  4. Союз (So, But, And, and, but) всегда остаётся отдельным словом — это ритмический удар.
  5. В реплике не больше --max-words слов и --max-chars знаков.
Реплика держится до начала следующей, но не дольше --hold секунд после конца своего последнего слова.
Время начала привязывается к кадру (--snap floor): субтитр появляется ровно на кадре начала слова.
"""
import argparse, json, math, re, sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass

FUNC = set("a an the of in on to into for with as like at by from his her its their my your our he she it we they you i is are was".split())
CONJ = set("and but so or because while when then yet".split())
BACK = set("it him them me us up down off".split())            # короткие слова, которые тянутся к предыдущему
ENDP = re.compile(r"[.,!?;:…]+[\"'”’)]*$")

def ts(t):
    t = max(0.0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def snap(t, fps, mode):
    f = round(t * fps)                                             # кадр, на котором начинается слово
    cs = f / fps * 100
    return (math.floor(cs + 1e-6) if mode == "floor" else round(cs)) / 100

def key(w): return re.sub(r"[^a-z0-9а-яё']", "", w.lower().replace("’", "'"))

def group(words, max_words=2, max_chars=14, short=0.13, gap=0.25):
    n, cues, i = len(words), [], 0
    txt = lambda w: w.get("text") or w["word"]
    dur = lambda w: w["end"] - w["start"]
    def clause_end(k):                                             # после слова k кончается фраза или идёт пауза
        return k == n - 1 or bool(ENDP.search(txt(words[k]))) or words[k + 1]["start"] - words[k]["end"] > gap or words[k + 1].get("line") != words[k].get("line")
    def weak(k):
        w = words[k]; d = dur(w)
        return d <= short or (key(txt(w)) in FUNC and d <= short * 1.5)
    def fits(cur, w): return len(cur) < max_words and len(" ".join(txt(x) for x in cur + [w])) <= max_chars
    while i < n:
        w, k = words[i], key(txt(words[i]))
        starts = i == 0 or clause_end(i - 1)
        if weak(i) and k not in CONJ:
            if (clause_end(i) or k in BACK) and cues and not starts and len(cues[-1]) == 1 and fits(cues[-1], w):   # правило 3: в конец предыдущей реплики
                cues[-1].append(w); i += 1; continue
            cur = [w]                                              # правило 2: тянет за собой следующие слова
            while not clause_end(i) and key(txt(words[i + 1])) not in CONJ and fits(cur, words[i + 1]):
                i += 1; cur.append(words[i])
                if not weak(i): break
            cues.append(cur); i += 1; continue
        cues.append([w]); i += 1
    return cues

def main():
    ap = argparse.ArgumentParser(description="words.json -> ASS")
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--cues", action="store_true", help="src — ручные реплики [[кадр, текст], ...]")
    ap.add_argument("--y", type=int, default=900); ap.add_argument("--x", type=int, default=360); ap.add_argument("--size", type=int, default=66)
    ap.add_argument("--max-words", type=int, default=2); ap.add_argument("--max-chars", type=int, default=14)
    ap.add_argument("--short", type=float, default=0.08); ap.add_argument("--gap", type=float, default=0.25); ap.add_argument("--hold", type=float, default=0.6)
    ap.add_argument("--fps", type=float, default=30); ap.add_argument("--snap", choices=["floor", "round"], default="floor")
    ap.add_argument("--width", type=int, default=720); ap.add_argument("--height", type=int, default=1280)
    a = ap.parse_args()
    data = json.load(open(a.src, encoding="utf-8"))
    rows = []                                                      # (start, end, text)
    if a.cues:
        cues = [c for c in data if c[0] != "end"]; end = next((c[1] for c in data if c[0] == "end"), None)
        for i, (f, text) in enumerate(cues):
            nf = cues[i + 1][0] if i + 1 < len(cues) else (end + a.fps if end is not None else f + 2 * a.fps)
            rows.append((snap(f / a.fps, a.fps, a.snap), snap(nf / a.fps, a.fps, a.snap), text))
    else:
        words = data if isinstance(data, list) else data.get("words", [])
        cues = group(words, a.max_words, a.max_chars, a.short, a.gap)
        for i, c in enumerate(cues):
            start = snap(c[0]["start"], a.fps, a.snap)
            end = snap(cues[i + 1][0]["start"], a.fps, a.snap) if i + 1 < len(cues) else c[-1]["end"] + a.hold
            end = min(end, c[-1]["end"] + a.hold)
            rows.append((start, max(end, start + 1 / a.fps), " ".join(w.get("text") or w["word"] for w in c)))
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {a.width}
PlayResY: {a.height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,Montserrat ExtraBold,{a.size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,0,0,0,0,100,100,0,0,1,5,2,5,20,20,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [f"Dialogue: 0,{ts(s)},{ts(e)},Word,,0,0,0,,{{\\pos({a.x},{a.y})}}{t}" for s, e, t in rows]
    open(a.out, "w", encoding="utf-8", newline="\n").write(head + "\n".join(lines) + "\n")
    n1 = sum(1 for r in rows if len(r[2].split()) == 1)
    print(f"captions: {len(rows)} реплик ({n1} по одному слову, {len(rows) - n1} склеенных) -> {a.out}")

main()
