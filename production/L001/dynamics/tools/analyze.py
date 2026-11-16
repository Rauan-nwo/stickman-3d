"""Per-frame motion analysis at native fps.
usage: python analyze.py <video> <out.npz> [mask_debug]
Outputs per-frame arrays (index i = transition from frame i-1 to i; i=0 zeros).
"""
import sys, subprocess, time
import numpy as np, cv2

cv2.setNumThreads(2)
src, out = sys.argv[1], sys.argv[2]
mask_debug = len(sys.argv) > 3 and sys.argv[3] == '1'
W, H = 320, 180
FW, FH = 160, 90
cmd = ['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-']
p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10**8)
fs = W * H * 3
keys = ['luma', 'lstd', 'r', 'g', 'b', 'diff', 'hdiff', 'dx', 'dy', 'sc', 'rot', 'nfeat', 'inl',
        'resmag', 'resfrac', 'wdiff', 'wfrac', 'ncomp', 'bigcomp', 'flowmag']
D = {k: [] for k in keys}
thumbs = []
valid = np.ones((FH, FW), np.uint8)
if mask_debug:  # bottom-left debug strip of animatic
    valid[int(FH * 0.87):, :int(FW * 0.30)] = 0
validW = np.ones((H, W), np.uint8)
if mask_debug:
    validW[int(H * 0.87):, :int(W * 0.30)] = 0
ys, xs = np.mgrid[0:FH, 0:FW].astype(np.float32)
prev = prevs = prevh = None
t0 = time.time(); n = 0
k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
while True:
    buf = p.stdout.read(fs)
    if len(buf) < fs:
        break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    gs = cv2.resize(g, (FW, FH), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256]).ravel()
    h /= h.sum() + 1e-9
    thumbs.append(cv2.resize(g, (64, 36), interpolation=cv2.INTER_AREA))
    D['luma'].append(g.mean()); D['lstd'].append(g.std())
    b_, g_, r_ = f.reshape(-1, 3).mean(0)
    D['r'].append(r_); D['g'].append(g_); D['b'].append(b_)
    if prev is None:
        for k in keys[5:]:
            D[k].append(0.0)
        D['sc'][-1] = 1.0
    else:
        D['diff'].append(float(np.abs(g.astype(np.int16) - prev.astype(np.int16))[validW > 0].mean()))
        D['hdiff'].append(float(0.5 * np.abs(h - prevh).sum()))
        # global similarity transform
        A = None; nf = 0; inl = 0
        pts = cv2.goodFeaturesToTrack(prev, 400, 0.01, 6, mask=validW)
        if pts is not None and len(pts) >= 12:
            nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev, g, pts, None, winSize=(21, 21), maxLevel=3)
            ok = st.ravel() == 1
            nf = int(ok.sum())
            if nf >= 12:
                A, m = cv2.estimateAffinePartial2D(pts[ok], nxt[ok], method=cv2.RANSAC, ransacReprojThreshold=1.0)
                if A is not None:
                    inl = int(m.sum())
        if A is None or inl < 10:
            (sx, sy), resp = cv2.phaseCorrelate(prev.astype(np.float32), g.astype(np.float32))
            A = np.array([[1, 0, sx], [0, 1, sy]], np.float64)
        a, b = A[0, 0], A[1, 0]
        sc = float(np.hypot(a, b)); rot = float(np.degrees(np.arctan2(b, a)))
        # express translation as motion of frame centre
        cx, cy = W / 2, H / 2
        dxc = A[0, 0] * cx + A[0, 1] * cy + A[0, 2] - cx
        dyc = A[1, 0] * cx + A[1, 1] * cy + A[1, 2] - cy
        D['dx'].append(float(dxc)); D['dy'].append(float(dyc)); D['sc'].append(sc); D['rot'].append(rot)
        D['nfeat'].append(nf); D['inl'].append(inl)
        # dense residual flow at 160x90
        fl = cv2.calcOpticalFlowFarneback(prevs, gs, None, 0.5, 3, 13, 3, 5, 1.1, 0)
        As = A.copy(); As[:, 2] *= FW / W
        px = As[0, 0] * xs + As[0, 1] * ys + As[0, 2] - xs
        py = As[1, 0] * xs + As[1, 1] * ys + As[1, 2] - ys
        rx = fl[..., 0] - px; ry = fl[..., 1] - py
        rm = np.sqrt(rx * rx + ry * ry)
        # warped intensity residual
        wp = cv2.warpAffine(prevs, As, (FW, FH), borderMode=cv2.BORDER_REPLICATE)
        wd = np.abs(gs.astype(np.int16) - wp.astype(np.int16)).astype(np.float32)
        brd = np.zeros_like(valid); brd[3:-3, 3:-3] = 1
        vv = (valid * brd) > 0
        mov = ((rm > 0.35) & (wd > 6) & vv).astype(np.uint8)
        mov = cv2.morphologyEx(mov, cv2.MORPH_OPEN, k3)
        D['resmag'].append(float(rm[vv].mean()))
        D['resfrac'].append(float(mov[vv].mean()))
        D['wdiff'].append(float(wd[vv].mean()))
        D['wfrac'].append(float((wd[vv] > 12).mean()))
        D['flowmag'].append(float(np.sqrt((fl ** 2).sum(-1))[vv].mean()))
        nc, lab, stats, _ = cv2.connectedComponentsWithStats(cv2.dilate(mov, k3, iterations=2))
        areas = stats[1:, cv2.CC_STAT_AREA] if nc > 1 else np.array([])
        D['ncomp'].append(int((areas >= 12).sum()))
        D['bigcomp'].append(float(areas.max() / vv.sum()) if len(areas) else 0.0)
    prev, prevs, prevh = g, gs, h
    n += 1
    if n % 3000 == 0:
        print(n, f'{time.time() - t0:.0f}s', flush=True)
np.savez_compressed(out, thumbs=np.array(thumbs), **{k: np.array(v, np.float32) for k, v in D.items()})
print('done', n, f'{time.time() - t0:.0f}s', flush=True)
