# Поиск по каталогу incompetech (pieces.json) — печатает кандидатов по ключевым словам.
# Запуск: python -I incompetech_search.py <pieces.json> "<regex>" [--genre 11] [--feel Dark] [--max 40]
import json, re, sys, argparse

sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # -I игнорирует PYTHONIOENCODING

GENRES = {2: "African", 3: "Blues", 4: "Classical", 5: "Contemporary", 6: "Disco", 7: "Electronica",
          8: "Funk", 9: "Holiday", 10: "Horror", 11: "Jazz", 12: "Latin", 13: "Modern", 14: "Musical",
          15: "Polka", 16: "Pop", 18: "Reggae", 19: "Rock", 20: "Silent Film Score", 21: "Ska",
          22: "Soundtrack", 23: "Stings", 24: "Unclassifiable", 25: "World", 26: "Urban"}

ap = argparse.ArgumentParser()
ap.add_argument("pieces")
ap.add_argument("regex")
ap.add_argument("--genre", type=int, default=None)
ap.add_argument("--feel", default=None)
ap.add_argument("--max", type=int, default=40)
ap.add_argument("--minlen", type=int, default=0, help="min length, s")
a = ap.parse_args()

d = json.load(open(a.pieces, encoding="utf-8"))
rx = re.compile(a.regex, re.I)
n = 0
for p in d:
    txt = " | ".join(str(p.get(k) or "") for k in ("title", "description", "instruments", "feel"))
    if not rx.search(txt):
        continue
    try:
        g = int(p.get("genre") or 0)
    except ValueError:
        g = 0
    if a.genre and g != a.genre:
        continue
    if a.feel and a.feel.lower() not in (p.get("feel") or "").lower():
        continue
    hh, mm, ss = (p.get("length") or "0:0:0").split(":")
    secs = int(hh) * 3600 + int(mm) * 60 + int(ss)
    if secs < a.minlen:
        continue
    print(f"- {p['title']} [{GENRES.get(g, g)}] {p.get('length')} bpm={p.get('bpm')} feel={p.get('feel')}\n"
          f"    instr: {p.get('instruments')}\n    desc: {(p.get('description') or '')[:220]}")
    n += 1
    if n >= a.max:
        break
print("count:", n)
