# -*- coding: utf-8 -*-
"""4b. Музыка в остатке (no_vocals): где она есть, на каком уровне, где начинается/кончается/меняется.

Признаки по кадрам 0.5 с:
  - AST Music (earshot, окна 3 с, шаг 1.5 с; tmp/ast_res.npz) — вероятность класса Music без голоса;
  - HPSS по остатку (24 кГц, кадр 50 мс): уровень гармонической части, тональность хромы (доля макс. класса),
    MFCC — для поиска смен трека/секции (новизна Фута, ядро ±8 с).
Музыка = AST Music >= P_MUS и гармоническая часть не тише H_FLOOR; сглаживание: куски < 3 с выбрасываются,
разрывы < 2 с закрываются. Маска → tmp/music.npz (по блокам 10 мс, как VAD).
"""
import librosa
from scipy import signal
from scipy.ndimage import median_filter

from common import *

P_MUS = float(sys.argv[1]) if len(sys.argv) > 1 else 0.3
H_FLOOR = float(sys.argv[2]) if len(sys.argv) > 2 else -60.0
FR = 0.5
x = load_wav(RES_WAV, mono=True).astype(np.float64)
dur = len(x) / SR
y = signal.resample_poly(x, 1, 2).astype(np.float32)
sr, hop, nfft = 24000, 1200, 4096
CH, OV = 60 * sr, 4 * sr
nfr = len(y) // hop + 1
Hdb = np.zeros(nfr, np.float32); Pdb = np.zeros(nfr, np.float32)
CHR = np.zeros((12, nfr), np.float32); MF = np.zeros((13, nfr), np.float32)
for s in range(0, len(y), CH):
    a, b = max(0, s - OV), min(len(y), s + CH + OV)
    S = np.abs(librosa.stft(y[a:b], n_fft=nfft, hop_length=hop))
    H, P = librosa.decompose.hpss(S, kernel_size=(17, 31))
    ch = librosa.feature.chroma_stft(S=H ** 2, sr=sr, n_fft=nfft, norm=None)
    mf = librosa.feature.mfcc(S=librosa.power_to_db(librosa.feature.melspectrogram(S=S ** 2, sr=sr, n_mels=64)), n_mfcc=13)
    i0 = (s - a) // hop
    n = min(CH // hop, S.shape[1] - i0, nfr - s // hop)
    o = slice(s // hop, s // hop + n); q = slice(i0, i0 + n)
    Hdb[o] = pw_db((H ** 2).sum(0) / nfft * 2 / nfft)[q]  # грубая шкала дБ ~ dBFS
    Pdb[o] = pw_db((P ** 2).sum(0) / nfft * 2 / nfft)[q]
    CHR[:, o] = ch[:, q]; MF[:, o] = mf[:, q]
k = int(FR / (hop / sr))
nf = nfr // k
agg = lambda v: v[..., :nf * k].reshape(*v.shape[:-1], nf, k).mean(-1)
Hh, Ph, Ch, Mh = agg(Hdb), agg(Pdb), agg(CHR), agg(MF)
tt = (np.arange(nf) + 0.5) * FR
cpeak = Ch.max(0) / (Ch.sum(0) + 1e-12)

A = np.load(os.path.join(TMP, "ast_res.npz"))
lab = list(A["labels"])
pa = A["p"].astype(np.float32)
tc = A["t0"] + float(A["win"]) / 2
pm = np.interp(tt, tc, pa[:, lab.index("Music")])
extra = {nm: np.interp(tt, tc, pa[:, lab.index(nm)]) for nm in
         ("Musical instrument", "Drum", "Bass guitar", "Synthesizer", "Piano", "Ambient music", "Background music",
          "Whoosh, swoosh, swish", "Typing", "Silence", "Speech") if nm in lab}

raw = (pm >= P_MUS) & (Hh >= H_FLOOR)
m = raw.copy()
for a_, b_ in runs(~m):
    if (b_ - a_) * FR < 2.0 and a_ > 0 and b_ < nf:
        m[a_:b_] = True
for a_, b_ in runs(m):
    if (b_ - a_) * FR < 3.0:
        m[a_:b_] = False
segs = [(a_ * FR, b_ * FR) for a_, b_ in runs(m)]
# маска по блокам 10 мс
nb = int(dur / 0.01)
mb = np.zeros(nb, bool)
for a_, b_ in segs:
    mb[int(a_ / 0.01):int(b_ / 0.01)] = True
np.savez_compressed(os.path.join(TMP, "music.npz"), music=mb, segs=np.array(segs), p_mus=P_MUS, h_floor=H_FLOOR)

# новизна (смены трека/секции) по хроме+MFCC
Fz = np.vstack([Ch / (np.linalg.norm(Ch, axis=0) + 1e-9), (Mh[1:] - Mh[1:].mean(1, keepdims=True)) / (Mh[1:].std(1, keepdims=True) + 1e-9) / 3])
Fz = Fz / (np.linalg.norm(Fz, axis=0) + 1e-9)
SSM = Fz.T @ Fz
L = 16
g = np.outer(signal.windows.gaussian(2 * L, L / 2), signal.windows.gaussian(2 * L, L / 2))
ck = g * np.block([[np.ones((L, L)), -np.ones((L, L))], [-np.ones((L, L)), np.ones((L, L))]])
nov = np.zeros(nf)
for i in range(L, nf - L):
    nov[i] = (SSM[i - L:i + L, i - L:i + L] * ck).sum()
nov = np.maximum(nov, 0)
nov /= np.percentile(nov[L:nf - L], 99) + 1e-9
pk, pr = signal.find_peaks(nov, distance=int(6 / FR), prominence=0.25)

# главы и чёрные карточки (по яркости кадров из замера dynamics)
dz = np.load(os.path.join(DYN, "comp.npz"))
luma = dz["luma"]
bl = luma < 6
cards = [(a_ / FPS, b_ / FPS) for a_, b_ in runs(bl) if b_ - a_ >= 9]
CH_T = [c[0] for c in CHAPTERS[1:]]
title_cards = []
for t0 in CH_T:
    best = min(cards, key=lambda c: abs(c[1] - (t0 + 2.5)))
    title_cards.append(best)


def near(t, spans, tol=2.0):
    for a_, b_ in spans:
        if a_ - tol <= t <= b_ + tol:
            return round(a_, 2)
    return None


events = []
for a_, b_ in segs:
    events.append({"t": round(a_, 1), "type": "start"})
    events.append({"t": round(b_, 1), "type": "stop"})
for i in pk:
    t = float(tt[i])
    if m[i] or m[max(0, i - 4)] or m[min(nf - 1, i + 4)]:
        events.append({"t": round(t, 1), "type": "change", "novelty": round(float(nov[i]), 2)})
events.sort(key=lambda e: e["t"])
for e in events:
    e["near_chapter_title"] = near(e["t"], title_cards)
    e["near_black_card"] = near(e["t"], cards, 1.0)
    e["mmss"] = mmss(e["t"])

sp = np.load(os.path.join(TMP, "vad.npz"))["speech"]
Z = np.load(os.path.join(TMP, "blocks.npz"))
NB = min(len(sp), nb, len(Z["res_k"]))
lu = lambda p: -0.691 + pw_db(p)
mus_sp = mb[:NB] & sp[:NB]
mus_pa = mb[:NB] & ~sp[:NB]
v400 = lambda key, msk: lu(Z[key][:NB][msk].mean())
title_hits = sum(1 for tc_ in title_cards if any(abs(e["t"] - tc_[0]) <= 2.5 or abs(e["t"] - tc_[1]) <= 2.5 for e in events))
res = {
    "definitions": {"music": f"AST Music >= {P_MUS} на no_vocals (окна 3 с) и гармоническая часть >= {H_FLOOR} дБ; "
                             "куски < 3 с выброшены, разрывы < 2 с закрыты",
                    "change": "пик новизны Фута (хрома+MFCC, ядро ±8 с, prominence >= 0.25) внутри музыки",
                    "levels": "K-взвешенная мощность по всем блокам 10 мс маски, LUFS"},
    "share_runtime_with_music": round(float(mb.mean()), 3),
    "music_minutes": round(float(mb.sum() * 0.01 / 60), 2),
    "n_segments": len(segs),
    "segment_len_s": pct([b_ - a_ for a_, b_ in segs], (10, 50, 90), 1),
    "segments": [{"start": round(a_, 1), "end": round(b_, 1), "mmss": mmss(a_), "dur": round(b_ - a_, 1)} for a_, b_ in segs],
    "ast_music_prob_percentiles": pct(pm, (10, 25, 50, 75, 90), 2),
    "share_frames_ast_music_ge_0.5": round(float((pm >= 0.5).mean()), 3),
    "music_LUFS_under_speech": round(float(v400("res_k", mus_sp)), 1),
    "voice_LUFS_where_music": round(float(v400("voc_k", mus_sp)), 1),
    "music_LUFS_in_pauses": round(float(v400("res_k", mus_pa)), 1),
    "speech_share_with_music": round(float(mus_sp.sum() / max(1, sp[:NB].sum())), 3),
    "events": events,
    "chapter_title_cards": [{"start": round(a_, 2), "end": round(b_, 2), "mmss": mmss(a_)} for a_, b_ in title_cards],
    "chapter_titles_with_music_event_within_2.5s": f"{title_hits}/{len(title_cards)}",
    "n_black_text_cards": len(cards),
}
# доля времени по классам AST (средняя вероятность) — грубая картина остатка
res["ast_mean_probs_residual"] = {k_: round(float(v.mean()), 3) for k_, v in extra.items()}
res["ast_mean_probs_residual"]["Music"] = round(float(pm.mean()), 3)
np.savez_compressed(os.path.join(TMP, "music_feats.npz"), tt=tt, pm=pm, Hh=Hh, Ph=Ph, cpeak=cpeak, nov=nov)
update_json("music", res)
print(json.dumps({k_: v for k_, v in res.items() if k_ not in ("segments", "events")}, indent=1, ensure_ascii=False))
for e in events:
    print(e)
