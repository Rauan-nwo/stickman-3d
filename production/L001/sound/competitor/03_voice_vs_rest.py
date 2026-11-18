# -*- coding: utf-8 -*-
"""3. Голос против всего остального (музыка + эффекты + фон) по стемам Demucs.

- интегральная громкость vocals / no_vocals (pyloudnorm, BS.1770 с гейтами);
- VAD по стему голоса: K-взвешенный уровень в окнах 20 мс (шаг 10 мс) выше порога (по умолчанию −30 LUFS,
  ≈15 LU ниже медианы голоса); провалы < 40 мс закрыты, всплески < 40 мс выброшены → маска речи 10 мс → tmp/vad.npz;
  (первая версия с окнами 50 мс и закрытием разрывов < 150 мс «съела» почти все паузы: у конкурента межфразовые
  щели 80-200 мс, пауз > 300 мс почти нет);
- под речью: окна 400 мс (шаг 100 мс), целиком (>= 90 %) в речи → голос − остаток, дБ (LU);
- в щелях (>= 80 мс без речи) и паузах (>= 300 мс): уровень остатка (K-мощность по щели без краёв 10 мс), LUFS,
  и разница «остаток в щели − остаток под соседней речью (±1 с)» — признак дакинга.
"""
import sys

from common import *

Z = np.load(os.path.join(TMP, "blocks.npz"))
BLK = float(Z["blk"])
NB = len(Z["voc_k"])


def mov(p, nb):
    """средняя мощность в окне из nb блоков; индекс i = окно [i, i+nb)"""
    c = np.concatenate([[0.0], np.cumsum(p)])
    return (c[nb:] - c[:-nb]) / nb


def lu(p):
    return -0.691 + pw_db(p)


THR = float(sys.argv[1]) if len(sys.argv) > 1 else -30.0

# --- VAD (окна 20 мс, индекс i = окно [i, i+2) блоков) ---
v20 = lu(mov(Z["voc_k"], 2))
v20 = np.concatenate([v20, np.full(NB - len(v20), v20[-1])])
hist = pct(v20, (5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95), 1)
sp = v20 > THR
for a, b in runs(~sp):  # закрыть провалы < 40 мс (смычки внутри слов)
    if b - a < 4 and a > 0 and b < NB:
        sp[a:b] = True
for a, b in runs(sp):  # выбросить щелчки короче 40 мс
    if b - a < 4:
        sp[a:b] = False
np.savez_compressed(os.path.join(TMP, "vad.npz"), speech=sp, blk=BLK, thr=THR)

# --- уровни стемов ---
import soundfile as sf
I = {}
for nm, pth in (("vocals", VOC_WAV), ("no_vocals", RES_WAV)):
    x, _ = sf.read(pth, dtype="float32", always_2d=True)
    I[nm] = round(integrated(x), 1)
    del x

# --- под речью: окна 400 мс ---
v400, r400 = lu(mov(Z["voc_k"], 40)), lu(mov(Z["res_k"], 40))
sfrac = mov(sp.astype(float), 40)
inS = sfrac >= 0.9
diff = v400[inS] - r400[inS]
# --- паузы и межфразовые щели ---
gaps = [(a, b) for a, b in runs(~sp) if (b - a) >= 8 and a > 0 and b < NB]
P = []
for a, b in gaps:
    pr = Z["res_k"][a + 1:b - 1].mean()
    pm = Z["mix_k"][a + 1:b - 1].mean()
    # остаток под речью вокруг щели: по 1 с до и после
    ctx = np.r_[max(0, a - 100):a, b:min(NB, b + 100)]
    ctx = ctx[sp[ctx]]
    rs = lu(Z["res_k"][ctx].mean()) if len(ctx) else np.nan
    P.append((a * BLK, (b - a) * BLK, lu(pr), lu(pm), rs))
P = np.array(P)
G = P
P = G[G[:, 1] >= 0.3]
vmed = float(np.median(v400[inS]))
dur = NB * BLK
res = {
    "definitions": {
        "VAD": f"стем vocals, K-уровень в окнах 20 мс; речь = выше {THR} LUFS (≈15 LU ниже медианы голоса); "
               f"провалы < 40 мс закрыты, всплески < 40 мс выброшены",
        "gap": "межфразовая щель — провал голоса ниже порога >= 80 мс; pause — щель >= 300 мс",
        "voice_minus_rest": "окна 400 мс (шаг 100 мс), >= 90 % окна — речь: K-уровень vocals − K-уровень no_vocals, LU",
        "pause_level": "K-мощность no_vocals/микса по щели/паузе без краёв 10 мс",
        "caveat": "no_vocals содержит и подтёки голоса (артефакты Demucs) — под речью остаток немного завышен, "
                  "значит реальная разница голос−музыка не меньше измеренной",
    },
    "integrated_LUFS": {"vocals": I["vocals"], "no_vocals": I["no_vocals"]},
    "vad_20ms_level_percentiles": hist,
    "speech_share_of_runtime": round(float(sp.mean()), 3),
    "speech_minutes": round(float(sp.sum() * BLK / 60), 2),
    "under_speech": {
        "n_frames_400ms": int(inS.sum()),
        "voice_LUFS": pct(v400[inS], (10, 50, 90), 1),
        "rest_LUFS": pct(r400[inS], (10, 50, 90), 1),
        "voice_minus_rest_LU": {**pct(diff, (10, 25, 50, 75, 90), 1), "mean": round(float(diff.mean()), 1)},
        "share_frames_rest_within_10LU_of_voice": round(float((diff < 10).mean()), 3),
        "share_frames_rest_more_than_20LU_below": round(float((diff > 20).mean()), 3),
    },
    "gaps_ge_80ms": {
        "count": int(len(G)), "per_minute": round(len(G) / (dur / 60), 1),
        "dur_ms": pct(G[:, 1] * 1000, (10, 50, 90), 0),
        "count_by_dur": {"80-150ms": int(((G[:, 1] >= 0.08) & (G[:, 1] < 0.15)).sum()),
                         "150-300ms": int(((G[:, 1] >= 0.15) & (G[:, 1] < 0.3)).sum()),
                         "300-1000ms": int(((G[:, 1] >= 0.3) & (G[:, 1] < 1.0)).sum()),
                         ">=1000ms": int((G[:, 1] >= 1.0).sum())},
        "rest_LUFS_in_gap": pct(G[:, 2], (10, 50, 90), 1),
        "rest_in_gap_minus_rest_under_adjacent_speech_LU": pct(G[:, 2] - G[:, 4], (10, 25, 50, 75, 90), 1),
    },
    "pauses": {
        "count": int(len(P)),
        "per_minute": round(len(P) / (dur / 60), 1),
        "dur_s": pct(P[:, 1], (10, 50, 90), 2),
        "total_s": round(float(P[:, 1].sum()), 1),
        "rest_LUFS": pct(P[:, 2], (10, 50, 90), 1),
        "mix_LUFS": pct(P[:, 3], (10, 50, 90), 1),
        "rest_vs_voice_median_LU": pct(P[:, 2] - vmed, (10, 50, 90), 1),
        "by_duration": {},
    },
}
res["pauses"]["list"] = [{"t": round(float(r[0]), 2), "mmss": mmss(r[0]), "dur": round(float(r[1]), 2),
                          "rest_LUFS": round(float(r[2]), 1)} for r in P]
for lo_, hi_ in ((0.3, 0.6), (0.6, 1.0), (1.0, 2.0), (2.0, 99)):
    m = (P[:, 1] >= lo_) & (P[:, 1] < hi_)
    if m.any():
        res["pauses"]["by_duration"][f"{lo_}-{hi_}s"] = {"n": int(m.sum()), "rest_LUFS_median": round(float(np.median(P[m, 2])), 1)}
update_json("voice_vs_rest", res)
np.save(os.path.join(TMP, "pauses.npy"), G)
print(json.dumps(res, indent=1, ensure_ascii=False))
