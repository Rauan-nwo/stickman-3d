"""Per-shot + transition + spice metrics from analyze.py npz.
usage: python shots.py comp|anim|scene:<name>  -> writes <tag>_shots.json"""
import sys, json, re, numpy as np
FPS = 30; W = 320
SCR = r'C:\Users\velar\AppData\Local\Temp\claude\8bd48fdc79c32563\6b93721b-4d73-44f7-bee9-2a1409fa5259\scratchpad'
REPO = r'C:\dev\projects\youtube-video\production\L001'
tag = sys.argv[1]
if tag == 'comp':
    d = np.load(SCR + r'\dyn\comp.npz')
    starts = [0] + [int(x) for x in open(SCR + r'\dyn\comp_cuts_final.txt').read().split()]
    meta = [{} for _ in starts]
elif tag == 'anim':
    d = np.load(SCR + r'\dyn\anim.npz')
    T = json.load(open(REPO + r'\animatic\timing.json', encoding='utf8'))
    starts = [int(round(s['start'] * FPS)) for s in T['shots']]
    meta = [{'n': s['n'], 'ch': s['ch'], 'framing': s['framing'], 'camera': s.get('camera', ''), 'loc': s['loc']} for s in T['shots']]
else:
    name = tag.split(':')[1]
    d = np.load(SCR + rf'\dyn\sc_{name}.npz')
    df = d['diff']
    cand = [i for i in range(1, len(df)) if df[i] > 18 and df[i] > 4 * max(np.median(df[max(0, i - 6):i]), np.median(df[i + 1:i + 7]) if i + 1 < len(df) else 0, 1)]
    starts = [0] + cand
    meta = [{} for _ in starts]
N = len(d['dx'])
_df = d['diff']
def _ref(s):
    if s <= 0: return 0
    w = range(max(1, s - 3), min(N, s + 4))
    return max(w, key=lambda k: _df[k])
_pairs = {}
for _s, _m in zip(starts, meta):
    if _s < N: _pairs.setdefault(_ref(_s), _m)
starts = sorted(_pairs); meta = [_pairs[k] for k in starts]
ends = starts[1:] + [N]
dx = d['dx'] / W * 100; dy = d['dy'] / W * 100  # % of frame width per frame
lz = np.log(np.maximum(d['sc'], 1e-3)) * 100      # % zoom per frame
rot = d['rot']
res = d['resfrac']; wf = d['wfrac']; nc = d['ncomp']; bc = d['bigcomp']
luma = d['luma']; diff = d['diff']; th = d['thumbs'].astype(np.float32)


def smooth(x, k=9):
    if len(x) < k: return x.copy()
    p = np.pad(x, k // 2, mode='edge'); return np.convolve(p, np.ones(k) / k, 'valid')


def runs(mask):
    best = cur = 0
    for m in mask:
        cur = cur + 1 if m else 0; best = max(best, cur)
    return best


shots = []
for si, (a, b) in enumerate(zip(starts, ends)):
    dur = (b - a) / FPS
    lo, hi = a + 2, b - 1   # inner frames (skip transition frames)
    s = dict(i=si, start=a / FPS, dur=round(dur, 3), **meta[si])
    if hi - lo < 6:
        s['short'] = True; shots.append(s); continue
    X, Y, Z, R = dx[lo:hi], dy[lo:hi], lz[lo:hi], rot[lo:hi]
    sec = (hi - lo) / FPS
    zr = Z.sum() / sec; pxr = X.sum() / sec; pyr = Y.sum() / sec  # net rates
    sp = np.sqrt(smooth(X) ** 2 + smooth(Y) ** 2 + smooth(Z) ** 2)
    jit = np.sqrt((X - smooth(X)) ** 2 + (Y - smooth(Y)) ** 2)
    shake = float(np.percentile(jit, 75))
    good = d['inl'][lo:hi] >= 25
    if good.sum() >= 6:
        X, Y, Z, R = np.where(good, X, 0), np.where(good, Y, 0), np.where(good, Z, 0), np.where(good, R, 0)
        zr = Z.sum() / sec; pxr = X.sum() / sec; pyr = Y.sum() / sec
        sp = np.sqrt(smooth(X) ** 2 + smooth(Y) ** 2 + smooth(Z) ** 2)
        jit = np.sqrt((X - smooth(X)) ** 2 + (Y - smooth(Y)) ** 2); shake = float(np.percentile(jit, 75))
    maxz = float(np.percentile(np.abs(smooth(Z, 5)), 90)) * FPS; maxp = float(np.percentile(np.hypot(smooth(X, 5), smooth(Y, 5)), 90)) * FPS
    # parallax: camera moving and large structured residual
    rm = float(np.median(res[lo:hi]))
    moving = abs(zr) > 0.6 or abs(pxr) > 0.8 or abs(pyr) > 0.8 or abs(R.sum() / sec) > 0.5
    if maxz > 40 or maxp > 60: cls = 'fast'  # whip / snap zoom
    elif shake > 0.06 and moving is False and np.mean(np.abs(X - smooth(X)) > 0.05) > 0.3: cls = 'shake'
    elif not moving: cls = 'static'
    elif rm > 0.15 and (abs(pxr) > 0.8 or abs(pyr) > 0.8 or abs(zr) > 0.6): cls = 'parallax'
    elif abs(zr) >= max(abs(pxr), abs(pyr)) * 0.8: cls = 'push' if zr > 0 else 'pull'
    elif abs(pxr) >= abs(pyr): cls = 'pan'
    else: cls = 'tilt'
    if cls not in ('static', 'shake') and shake > 0.06: cls += '+shake'
    # easing: speed at first/last 15% vs middle
    ease = None
    if moving and len(sp) >= 12:
        q = max(2, len(sp) // 7)
        mid = np.median(sp[q:-q]) + 1e-6
        e0, e1 = sp[:q].mean() / mid, sp[-q:].mean() / mid
        cv = sp[q:-q].std() / mid
        ease = 'eased' if (e0 < 0.6 or e1 < 0.6) else ('constant' if cv < 0.35 else 'variable')
    # in-shot animation
    R_ = res[lo:hi]; WF = wf[lo:hi]
    mv = (R_ > 0.003) | (WF > 0.004)
    still = runs(~mv) / FPS
    med = np.median(R_) if len(R_) else 0
    ev = [i for i in range(1, len(R_) - 1) if R_[i] > max(0.01, 3 * med) and R_[i] >= R_[i - 1] and R_[i] >= R_[i + 1]]
    regions = float(np.median(nc[lo:hi][mv])) if mv.any() else 0.0
    # interval between change frames (cadence)
    idx = np.where(WF > 0.002)[0]
    gaps = np.diff(idx) if len(idx) > 2 else np.array([])
    s.update(cam=cls, zoom_rate=round(float(zr), 2), pan_x=round(float(pxr), 2), pan_y=round(float(pyr), 2),
             max_zoom=round(maxz, 1), max_pan=round(maxp, 1), shake=round(shake, 3), ease=ease,
             anim_share=round(float(mv.mean()), 3), anim_mean=round(float(R_.mean()), 4), still_max=round(still, 2),
             events=len(ev), regions=regions, gap_hist={int(k): int(v) for k, v in zip(*np.unique(gaps, return_counts=True))} if len(gaps) else {},
             particles=round(float(np.mean((nc[lo:hi] >= 6) & (bc[lo:hi] < 0.03))), 3))
    shots.append(s)

# transitions
def blend_err(k, A, B):
    f = th[k].ravel(); a_ = th[A].ravel(); b_ = th[B].ravel()
    M = np.stack([a_, b_], 1)
    c, *_ = np.linalg.lstsq(M, f, rcond=None)
    e = np.abs(M @ c - f).mean()
    return e, c


trans = []
for s in starts[1:]:
    w0, w1 = max(1, s - 12), min(N - 1, s + 12)
    D = diff[w0:w1]
    pk = s
    # frames in the window with notable change
    act = [k for k in range(w0, w1) if diff[k] > 4]
    span = (max(act) - min(act) + 1) if act else 1
    lb, la = luma[max(0, s - 4)], luma[min(N - 1, s + 4)]
    lpk = luma[max(0, s - 3):min(N, s + 4)]
    typ = 'hard'
    if lpk.max() > max(lb, la) + 30 and lpk.max() > 120: typ = 'flash'
    elif lpk.min() < 6 and min(lb, la) > 20: typ = 'dip'
    else:
        A, B = max(0, s - 10), min(N - 1, s + 9)
        mids = [k for k in range(s - 6, s + 6) if A < k < B]
        errs = [blend_err(k, A, B) for k in mids]
        # dissolve: several in-between frames that are genuine mixes of A and B
        mixed = [k for k, (e, c) in zip(mids, errs) if e < 6 and 0.15 < c[0] < 0.85 and 0.15 < c[1] < 0.85]
        sub = diff[s - 6:s + 6] if s >= 6 else diff[:s + 6]
        if len(mixed) >= 3 and np.sort(sub)[-1] < 2.5 * np.sort(sub)[-2] + 1: typ = 'dissolve'
        pre = slice(max(0, s - 4), s); post = slice(s + 1, min(N, s + 5))
        mp = max(np.abs(dx[pre]).max(initial=0), np.abs(dx[post]).max(initial=0), np.abs(dy[pre]).max(initial=0), np.abs(dy[post]).max(initial=0))
        mz = max(np.abs(lz[pre]).max(initial=0), np.abs(lz[post]).max(initial=0))
        if typ == 'hard' and mp > 4: typ = 'whip'
        elif typ == 'hard' and mz > 3: typ = 'zoom'
    # structural similarity across the cut (match-cut candidate)
    a_ = th[max(0, s - 2)].ravel() - th[max(0, s - 2)].mean(); b_ = th[min(N - 1, s + 1)].ravel() - th[min(N - 1, s + 1)].mean()
    corr = float(a_ @ b_ / (np.linalg.norm(a_) * np.linalg.norm(b_) + 1e-6))
    trans.append(dict(f=s, t=round(s / FPS, 3), type=typ, span=span, corr=round(corr, 3), luma_pre=round(float(lb), 1), luma_post=round(float(la), 1)))

# spice (whole video, excluding ±3 frames around boundaries)
nearcut = np.zeros(N, bool)
for s in starts[1:]:
    nearcut[max(0, s - 3):s + 4] = True
dl = np.diff(luma, prepend=luma[0])
flash = [i for i in range(2, N - 3) if not nearcut[i] and luma[i] - luma[i - 2] > 18 and luma[i] - luma[min(N - 1, i + 3)] > 8 and luma[i] >= luma[i - 1] and luma[i] >= luma[i + 1]]
lowmot = d['flowmag'] < 0.3
flick = [i for i in range(1, N) if not nearcut[i] and abs(dl[i]) > 2.5 and lowmot[i]]
zsm = smooth(lz, 5)
def bursts(idx, gap=6):
    out = []
    for i in idx:
        if not out or i - out[-1][-1] > gap: out.append([i])
        else: out[-1].append(i)
    return out
emph = [b for b in bursts([i for i in range(N) if not nearcut[i] and abs(zsm[i]) > 1.0]) if len(b) >= 3]
jit = np.sqrt((dx - smooth(dx, 5)) ** 2 + (dy - smooth(dy, 5)) ** 2)
shk = [b for b in bursts([i for i in range(N) if not nearcut[i] and jit[i] > 0.35 and d['inl'][i] > 20]) if len(b) >= 3]
# pop-ins: local sudden appearance with no camera move, then stable
pops = []
for i in range(2, N - 4):
    if nearcut[i]: continue
    if wf[i] > 0.01 and wf[i] < 0.35 and wf[i] > 5 * max(wf[i - 1], 1e-4) and wf[i + 2] < 0.3 * wf[i] and abs(dx[i]) < 0.3 and abs(lz[i]) < 0.3 and abs(dl[i]) < 6:
        pops.append(i)
pops = [b[0] for b in bursts(pops, 4)]
spice = dict(flash=[round(i / FPS, 2) for i in flash], flicker_frames=len(flick), flicker_bursts=len(bursts(flick, 10)),
             emph_zoom=[round(b[0] / FPS, 2) for b in emph], shake_bursts=[round(b[0] / FPS, 2) for b in shk],
             pops=[round(i / FPS, 2) for i in pops], particle_frames=int(((nc >= 6) & (bc < 0.03) & ~nearcut).sum()))
json.dump(dict(tag=tag, N=N, dur=N / FPS, shots=shots, trans=trans, spice=spice), open(SCR + rf'\dyn\{tag.replace(":", "_")}_shots.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print(tag, 'shots', len(shots), 'trans', len(trans))
