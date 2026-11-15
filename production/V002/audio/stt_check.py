#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
stt_check.py <audio> <narration.txt> [model]     (interpreter with faster-whisper:
                                                  ~/.claude/skills/faster-whisper/.venv/Scripts/python)

Intelligibility check: local speech-to-text (faster-whisper, CPU) on the finished mix, compared word by word with
the script. Prints and writes stt_report.json: words of the script that the recogniser did not return (dropped or
misheard), per sentence, and the same for the voice alone when a second audio file is given via --ref.
Nothing leaves the machine.
"""
import difflib
import json
import re
import sys
from pathlib import Path

from faster_whisper import WhisperModel

NUM = {"41st": "fortyfirst", "40": "forty", "600": "sixhundred", "2000": "twothousand", "2,000": "twothousand"}


def norm(s):
    s = s.lower().replace("’", "'")
    for k, v in NUM.items():
        s = s.replace(k, v)
    s = s.replace("forty-first", "fortyfirst").replace("six hundred", "sixhundred").replace("two thousand", "twothousand")
    return [w for w in re.sub(r"[^a-z0-9' ]+", " ", s).replace("'", "").split() if w]


def main():
    audio, nar = sys.argv[1], sys.argv[2]
    args = [a for a in sys.argv[3:] if not a.startswith("--")]
    ref = next((a.split("=", 1)[1] for a in sys.argv[3:] if a.startswith("--ref=")), None)
    name = args[0] if args else "small.en"
    model = WhisperModel(name, device="cpu", compute_type="int8")
    lines = [l.strip() for l in Path(nar).read_text(encoding="utf-8").splitlines() if l.strip()]
    script, owner = [], []
    for i, l in enumerate(lines, 1):
        for w in norm(l):
            script.append(w)
            owner.append(i)
    out = {"model": name, "script_words": len(script)}
    for tag, f in (("mix", audio), ("voice_only", ref)):
        if not f:
            continue
        segs, _ = model.transcribe(f, language="en", beam_size=5, condition_on_previous_text=False)
        text = " ".join(s.text for s in segs)
        got = norm(text)
        sm = difflib.SequenceMatcher(None, script, got, autojunk=False)
        miss = []
        for op, a0, a1, b0, b1 in sm.get_opcodes():
            if op in ("delete", "replace"):
                miss.append({"sentence": owner[a0], "script": " ".join(script[a0:a1]), "heard": " ".join(got[b0:b1])})
        n_miss = sum(len(m["script"].split()) for m in miss)
        out[tag] = {"text": text.strip(), "words_not_returned": n_miss, "diffs": miss}
        print("%s: %d of %d script words not returned" % (tag, n_miss, len(script)))
        for m in miss:
            print("   s%d: script '%s' -> heard '%s'" % (m["sentence"], m["script"], m["heard"]))
    json.dump(out, open(Path(audio).parent / "stt_report.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
