# -*- coding: utf-8 -*-
"""1. Громкость микса и стерео.

- ffmpeg ebur128 (peak=true): интегральная громкость I, LRA, true peak — по всему ролику;
- поток ebur128 (каждые 100 мс): M (окно 400 мс) и S (окно 3 с) → распределения p10/p50/p90;
- по минутам: I по BS.1770 с гейтами (pyloudnorm) на каждом отрезке 60 с, max S, max sample peak;
- стерео: корреляция L/R (весь ролик и по окнам 1 с), уровни mid=(L+R)/2 и side=(L-R)/2.
"""
import re
import numpy as np
from common import *

log = open(os.path.join(TMP, "ebur128_log.txt"), encoding="utf-8", errors="ignore").read()
tail = log[log.rfind("Summary:"):]
g = lambda pat: float(re.search(pat, tail).group(1))
summ = {"I_LUFS": g(r"I:\s+(-?[\d.]+) LUFS"), "LRA_LU": g(r"LRA:\s+(-?[\d.]+) LU"),
        "LRA_low_LUFS": g(r"LRA low:\s+(-?[\d.]+) LUFS"), "LRA_high_LUFS": g(r"LRA high:\s+(-?[\d.]+) LUFS"),
        "true_peak_dBTP": g(r"Peak:\s+(-?[\d.]+) dBFS")}

T, M, S = [], [], []
cur = None
for line in open(os.path.join(TMP, "ebur128_frames.txt"), encoding="utf-8"):
    if line.startswith("frame:"):
        cur = float(line.split("pts_time:")[1])
        T.append(cur)
    elif line.startswith("lavfi.r128.M="):
        M.append(float(line.split("=")[1]))
    elif line.startswith("lavfi.r128.S="):
        S.append(float(line.split("=")[1]))
T, M, S = map(np.array, (T, M, S))
dur = T[-1]
mm = (T >= 0.4) & (M > -70)
ss = (T >= 3.0) & (S > -70)

x = load_wav(MIX_WAV).astype(np.float64)
L, R = x[:, 0], x[:, 1]
mid, side = (L + R) / 2, (L - R) / 2

per_min = []
for k in range(int(np.ceil(dur / 60))):
    a, b = int(k * 60 * SR), int(min(len(x), (k + 1) * 60 * SR))
    seg = x[a:b]
    sel = (T >= k * 60 + 3) & (T < (k + 1) * 60)
    per_min.append({"min": k, "I_LUFS": round(integrated(seg), 1),
                    "S_max": round(float(S[sel].max()), 1) if sel.any() else None,
                    "S_p10": round(float(np.percentile(S[sel & (S > -70)], 10)), 1) if (sel & (S > -70)).any() else None,
                    "sample_peak_dBFS": round(float(db(np.abs(seg).max())), 1)})

# стерео по окнам 1 с (только окна, где есть сигнал)
w = SR
n = len(L) // w
Lw, Rw = L[:n * w].reshape(n, w), R[:n * w].reshape(n, w)
num = (Lw * Rw).sum(1)
den = np.sqrt((Lw ** 2).sum(1) * (Rw ** 2).sum(1)) + 1e-12
corr = num / den
mid_w = db(np.sqrt(((Lw + Rw) / 2) ** 2).mean(1) ** 0.5) if False else None
mw = np.sqrt((((Lw + Rw) / 2) ** 2).mean(1))
sw = np.sqrt((((Lw - Rw) / 2) ** 2).mean(1))
act = db(mw) > -50
s_minus_m = db(sw[act]) - db(mw[act])
stereo = {
    "lr_correlation_whole": round(float(np.corrcoef(L, R)[0, 1]), 4),
    "lr_correlation_1s_windows": pct(corr[act], (10, 50, 90), 3),
    "share_1s_windows_corr_gt_0.99": round(float((corr[act] > 0.99).mean()), 3),
    "share_1s_windows_corr_lt_0.8": round(float((corr[act] < 0.8).mean()), 3),
    "mid_rms_dBFS": round(float(db(np.sqrt(np.mean(mid ** 2)))), 1),
    "side_rms_dBFS": round(float(db(np.sqrt(np.mean(side ** 2)))), 1),
    "side_minus_mid_dB_whole": round(float(db(np.sqrt(np.mean(side ** 2))) - db(np.sqrt(np.mean(mid ** 2)))), 1),
    "side_minus_mid_dB_1s_windows": pct(s_minus_m, (10, 50, 90), 1),
    "L_rms_dBFS": round(float(db(np.sqrt(np.mean(L ** 2)))), 2),
    "R_rms_dBFS": round(float(db(np.sqrt(np.mean(R ** 2)))), 2),
}
# самые «широкие» секунды — где side ближе всего к mid (кандидаты на стерео-музыку/эффекты)
wide = np.argsort(-(db(sw) - db(mw) + np.where(act, 0, -99)))[:12]
stereo["widest_seconds"] = [{"t": int(i), "side_minus_mid_dB": round(float(db(sw[i]) - db(mw[i])), 1),
                             "corr": round(float(corr[i]), 3)} for i in sorted(wide)]

# 50 мс уровень: самые тихие места микса (есть ли цифровая тишина)
r50, t50 = frame_rms(mid, 0.05, 0.01)
d50 = db(r50)
below60 = [(t50[i], (j - i) * 0.01) for i, j in runs(d50 < -60) if (j - i) * 0.01 >= 0.3]

res = {
    "definitions": {
        "I_LUFS": "интегральная громкость BS.1770-4 с гейтами -70 LUFS / -10 LU (ffmpeg ebur128)",
        "LRA_LU": "разброс громкости EBU Tech 3342: p95-p10 краткосрочной (3 с) громкости после гейтов",
        "true_peak_dBTP": "истинный пик (4x передискретизация), по декодированному Opus",
        "M": "моментальная громкость, окно 400 мс, шаг 100 мс, без гейта; считаются кадры > -70",
        "S": "краткосрочная громкость, окно 3 с, шаг 100 мс; считаются кадры с t >= 3 с и > -70",
        "per_minute.I_LUFS": "интегральная громкость отрезка [60k, 60k+60) с, pyloudnorm",
        "stereo.corr": "коэффициент корреляции Пирсона сэмплов L и R",
        "side_minus_mid": "уровень side=(L-R)/2 минус уровень mid=(L+R)/2, дБ RMS",
    },
    "source": "video.mp4, Opus 48 kHz stereo ~135 kbps (единственная дорожка; в video_1080.webm звука нет)",
    "duration_s": round(float(len(L) / SR), 3),
    "ebur128": summ,
    "momentary_LUFS": {**pct(M[mm], (1, 10, 50, 90, 99)), "max": round(float(M[mm].max()), 1)},
    "short_term_LUFS": {**pct(S[ss], (1, 10, 50, 90, 99)), "max": round(float(S[ss].max()), 1),
                        "min": round(float(S[ss].min()), 1)},
    "per_minute": per_min,
    "stereo": stereo,
    "mix_50ms_spans_below_-60dBFS_ge_0.3s": [{"t": round(a, 2), "dur": round(d, 2)} for a, d in below60],
    "mix_50ms_level_dBFS": pct(d50[(t50 > 0.5) & (t50 < dur - 0.5)], (0.1, 1, 5, 50), 1),
}
update_json("mix", res)
print(json.dumps(res, indent=1, ensure_ascii=False)[:6000])
