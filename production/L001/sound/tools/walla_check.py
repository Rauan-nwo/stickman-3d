#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""walla_check.py OUT.json f1.wav f2.wav ...   how many words a speech recogniser can pull out of a crowd bed.

A walla / murmur bed must have no intelligible words. faster-whisper (base.en, CPU, int8, local model cache) is run
on each file; words with probability >= 0.6 are counted as 'intelligible'. Lower is better.
"""
import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel

m = WhisperModel("base.en", device="cpu", compute_type="int8")
out = {}
for f in sys.argv[2:]:
    segs, info = m.transcribe(f, language="en", word_timestamps=True, vad_filter=False, beam_size=1,
                              condition_on_previous_text=False)
    words, text = [], []
    for s in segs:
        if s.no_speech_prob > 0.6:
            continue
        text.append(s.text.strip())
        words += [w for w in (s.words or []) if w.probability >= 0.6]
    dur = info.duration or 1
    out[Path(f).stem] = {"clear_words": len(words), "per_min": round(len(words) / dur * 60, 1),
                         "text": " ".join(text)[:300]}
    print("%-24s %3d clear words (%.1f/min)  %s" % (Path(f).stem, len(words), len(words) / dur * 60,
                                                    " ".join(text)[:120]), flush=True)
Path(sys.argv[1]).write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
