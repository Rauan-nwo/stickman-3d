# -*- coding: utf-8 -*-
"""2. Склейка стемов Demucs (htdemucs, --two-stems=vocals) из 4 перекрывающихся кусков → полные дорожки 48 кГц.

Куски нарезаны из tmp/mix.wav: c0 = [0, 320), c1 = [290, 610), c2 = [590, 910), c3 = [890, конец).
Demucs отдаёт 44.1 кГц; склеиваем линейным кроссфейдом в середине перекрытий (300-310, 595-605, 895-905 с),
передискретизируем 44.1 → 48 кГц (resample_poly 160/147) и проверяем, что vocals + no_vocals ≈ микс.
Выход: tmp/htdemucs/mix/vocals.wav, tmp/htdemucs/mix/no_vocals.wav (float32, 48 кГц, стерео).
"""
import soundfile as sf
from scipy.signal import resample_poly

from common import *

SEP = os.path.join(TMP, "sep", "htdemucs")
OFFS = [0, 290, 590, 890]
XF = [(300, 310), (595, 605), (895, 905)]
mix = load_wav(MIX_WAV)
N = len(mix)
os.makedirs(os.path.dirname(VOC_WAV), exist_ok=True)
mix_rms = float(np.sqrt(np.mean(mix.astype(np.float64) ** 2)))
err = mix.astype(np.float64)
del mix
for stem, out in (("vocals", VOC_WAV), ("no_vocals", RES_WAV)):
    full = np.zeros((N, 2), np.float64)
    wsum = np.zeros(N, np.float64)
    for k, off in enumerate(OFFS):
        y, sr = sf.read(os.path.join(SEP, f"c{k}", f"{stem}.wav"), dtype="float32", always_2d=True)
        y = resample_poly(y.astype(np.float64), 160, 147, axis=0) if sr == 44100 else y.astype(np.float64)
        a = int(off * SR)
        b = min(N, a + len(y))
        t = np.arange(a, b) / SR
        w = np.ones(b - a)
        if k > 0:  # вход кроссфейда
            x0, x1 = XF[k - 1]
            w *= np.clip((t - x0) / (x1 - x0), 0, 1)
        if k < len(OFFS) - 1:  # выход кроссфейда
            x0, x1 = XF[k]
            w *= np.clip((x1 - t) / (x1 - x0), 0, 1)
        full[a:b] += y[:b - a] * w[:, None]
        wsum[a:b] += w
    assert np.allclose(wsum[int(0.01 * SR):-int(0.01 * SR)], 1.0, atol=1e-6), (wsum.min(), wsum.max())
    sf.write(out, full.astype(np.float32), SR, subtype="FLOAT")
    err -= full
    del full
r = {"sum_error_rms_dBFS": round(float(db(np.sqrt(np.mean(err ** 2)))), 1), "mix_rms_dBFS": round(float(db(mix_rms)), 1)}
print(r)
update_json("separation", {"method": "demucs 4.1.0, htdemucs, --two-stems=vocals, CPU; 4 куска по 320 с с перекрытием, "
                                     "кроссфейд 10 с, 44.1→48 кГц", **r})
