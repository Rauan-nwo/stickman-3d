# -*- coding: utf-8 -*-
"""4a. AudioSet-теги (AST из earshot) по остатку no_vocals окнами 3 с с шагом 1.5 с → tmp/ast_res.npz.

Независимый «слух» для решения «есть ли музыка»: вероятность класса Music и соседей на дорожке без голоса.
Запускать питоном earshot (.venv), долго (~10 мин на CPU) — в фоне.
"""
import warnings

from common import *

warnings.filterwarnings("ignore")
from earshot.models import ast as ast_mod  # noqa: E402

WIN, HOP_S = 3.0, 1.5
x = load_wav(RES_WAV, mono=True)
t = ast_mod.get()
starts = np.arange(0, len(x) / SR - WIN + 1e-9, HOP_S)
P = []
B = 16
for k in range(0, len(starts), B):
    segs = [x[int(s * SR):int((s + WIN) * SR)] for s in starts[k:k + B]]
    P.append(t.probs(segs))
    if k % 160 == 0:
        print(f"{k}/{len(starts)}", flush=True)
P = np.concatenate(P).astype(np.float16)
np.savez_compressed(os.path.join(TMP, "ast_res.npz"), p=P, t0=starts, win=WIN, labels=np.array(t.labels))
print("saved", P.shape)
