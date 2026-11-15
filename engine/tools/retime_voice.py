"""retime_voice.py: подогнать озвучку под темп канала — поджать паузы между фразами и ускорить.

  python engine/tools/retime_voice.py <папка фильма> [--gap 0.2] [--target 63]

Читает voice.mp3 и words.json, сохраняет оригиналы как voice_raw.mp3 / words_raw.json (один раз),
пишет voice_fast.mp3 и новый words.json с пересчитанным временем. voice.mp3 заменяется быстрым вариантом.
"""
import argparse, json, os, shutil, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("film"); ap.add_argument("--gap", type=float, default=0.2); ap.add_argument("--target", type=float, default=63.0)
a = ap.parse_args()
F = a.film
raw_mp3, raw_w = os.path.join(F, "voice_raw.mp3"), os.path.join(F, "words_raw.json")
if not os.path.exists(raw_mp3): shutil.copy(os.path.join(F, "voice.mp3"), raw_mp3)
if not os.path.exists(raw_w): shutil.copy(os.path.join(F, "words.json"), raw_w)
words = json.load(open(raw_w, encoding="utf-8"))

# куски: фразы (по line) с полями по 0.04 с; паузы между ними режутся до --gap
PAD = 0.04
segs = []
for w in words:
    if segs and segs[-1]["line"] == w["line"]: segs[-1]["end"] = w["end"]; segs[-1]["words"].append(w)
    else: segs.append({"line": w["line"], "start": w["start"], "end": w["end"], "words": [w]})
parts, t, out_words = [], 0.0, []
for i, s in enumerate(segs):
    s0 = max(0.0, s["start"] - PAD)
    e0 = s["end"] + PAD
    if i + 1 < len(segs):
        gap = segs[i + 1]["start"] - s["end"]
        e0 = s["end"] + min(gap / 2, a.gap / 2)
    if i > 0:
        gap = s["start"] - segs[i - 1]["end"]
        s0 = s["start"] - min(gap / 2, a.gap / 2)
    parts.append((s0, e0))
    for w in s["words"]:
        out_words.append({**w, "start": t + (w["start"] - s0), "end": t + (w["end"] - s0)})
    t += e0 - s0
tempo = max(1.0, t / a.target)
fc = ";".join(f"[0:a]atrim={s0:.3f}:{e0:.3f},asetpts=PTS-STARTPTS[a{i}]" for i, (s0, e0) in enumerate(parts))
fc += ";" + "".join(f"[a{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=0:a=1,atempo={tempo:.4f}[o]"
script = os.path.join(F, "out", "retime_filter.txt")
os.makedirs(os.path.dirname(script), exist_ok=True)
open(script, "w").write(fc)
fast = os.path.join(F, "voice_fast.mp3")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw_mp3, "-filter_complex_script", script, "-map", "[o]",
                "-c:a", "libmp3lame", "-q:a", "2", fast], check=True)
for w in out_words:
    w["start"] = round(w["start"] / tempo, 3); w["end"] = round(w["end"] / tempo, 3)
json.dump(out_words, open(os.path.join(F, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
shutil.copy(fast, os.path.join(F, "voice.mp3"))
dur = out_words[-1]["end"]
print(f"без пауз {t:.2f} с -> ускорение x{tempo:.3f} -> {dur:.2f} с, {len(out_words) / dur * 60:.0f} слов/мин")
