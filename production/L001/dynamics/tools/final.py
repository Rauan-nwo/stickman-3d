"""Final metrics: camera base move + snap moves + holds, in-shot animation, pops, flashes, energy curve.
python final.py -> final.json + prints; uses <tag>_shots.json boundaries."""
import json, numpy as np, collections
FPS = 30; W = 320
D = r'C:\Users\velar\AppData\Local\Temp\claude\8bd48fdc79c32563\6b93721b-4d73-44f7-bee9-2a1409fa5259\scratchpad\dyn'
SC = ['dialogue_probe', 'box_path_v2', 'desk3d', 'conveyor', 'dc_inspection', 'hq_corridor', 'kitchen', 'templates_demo',
      'city_final', 'city_singapore', 'city_taipei', 'city_washington']


def sm(x, k):
    if len(x) < k: return x.copy()
    p = np.pad(x, k // 2, mode='edge'); return np.convolve(p, np.ones(k) / k, 'valid')


def bursts(idx, gap):
    out = []
    for i in idx:
        if out and i - out[-1][-1] <= gap: out[-1].append(i)
        else: out.append([i])
    return out


def analyse(npz, shots_json):
    d = np.load(npz); J = json.load(open(shots_json, encoding='utf8'))
    N = len(d['dx'])
    starts = [round(s['start'] * FPS) for s in J['shots']]
    ends = starts[1:] + [N]
    near = np.zeros(N, bool)
    for s in starts[1:]: near[max(0, s - 2):s + 3] = True
    good = (d['inl'] >= 25) & ~near
    dx = np.where(good, d['dx'] / W * 100, 0); dy = np.where(good, d['dy'] / W * 100, 0)
    lz = np.where(good, np.log(np.maximum(d['sc'], 1e-3)) * 100, 0)
    spz = np.abs(sm(lz, 3)); spp = np.hypot(sm(dx, 3), sm(dy, 3))
    snapf = ((spz > 0.8) | (spp > 1.2)) & good
    snaps = [b for b in bursts(np.where(snapf)[0], 3) if len(b) >= 2]
    snap_kind = ['zoom' if spz[b].max() / 0.8 >= spp[b].max() / 1.2 else 'whip' for b in snaps]
    snap_at = np.zeros(N, bool)
    for b in snaps: snap_at[max(0, b[0] - 2):b[-1] + 3] = True
    res = d['resfrac']; wf = d['wfrac']; luma = d['luma']
    mv = ((res > 0.003) | (wf > 0.004)) & ~near & ~snap_at
    # pops / flashes inside shots
    pops = []; flashes = []
    for i in range(6, N - 6):
        if near[i] or snap_at[i]: continue
        base = max(np.median(wf[i - 6:i]), 1e-3)
        if wf[i] > 0.03 and wf[i] > 4 * base and wf[i] >= wf[i - 1] and wf[i] >= wf[i + 1]:
            (flashes if abs(luma[i] - luma[i - 1]) > 10 or luma[i] - luma[i - 3] > 15 else pops).append(i)
    pops = [b[0] for b in bursts(pops, 6)]; flashes = [b[0] for b in bursts(flashes, 6)]
    jit = np.hypot(dx - sm(dx, 5), dy - sm(dy, 5))
    shk = [b for b in bursts(np.where((jit > 0.25) & good & ~snap_at)[0], 2) if len(b) >= 4]
    dl = np.abs(np.diff(luma, prepend=luma[0]))
    flick = bursts(np.where((dl > 2.5) & (d['flowmag'] < 0.3) & ~near)[0], 10)
    rows = []
    for a, b, s in zip(starts, ends, J['shots']):
        lo, hi = a + 2, b - 1
        r = dict(start=a / FPS, dur=(b - a) / FPS, n=s.get('n'), ch=s.get('ch'), framing=s.get('framing'))
        if hi - lo < 6: r['short'] = True; rows.append(r); continue
        sl = slice(lo, hi); base = good[sl] & ~snap_at[sl]
        sec = base.sum() / FPS if base.sum() else 1e-3
        zr = lz[sl][base].sum() / sec; pr = np.hypot(dx[sl][base].sum(), dy[sl][base].sum()) / sec
        pxr, pyr = dx[sl][base].sum() / sec, dy[sl][base].sum() / sec
        sp = np.sqrt(sm(lz[sl], 9) ** 2 + sm(dx[sl], 9) ** 2 + sm(dy[sl], 9) ** 2)
        movingf = (sp > 0.02) & base
        holdrun = 0; cur = 0
        for m in (~movingf):
            cur = cur + 1 if m else 0; holdrun = max(holdrun, cur)
        nsn = sum(1 for bb in snaps if lo <= bb[0] < hi)
        if abs(zr) < 0.5 and pr < 0.6: base_cls = 'static'
        elif abs(zr) >= pr * 1.2: base_cls = 'push' if zr > 0 else 'pull'
        else: base_cls = 'pan' if abs(pxr) >= abs(pyr) else 'tilt'
        # easing of base move
        ease = None
        if base_cls != 'static' and len(sp) >= 14:
            q = max(2, len(sp) // 7); mid = np.median(sp[q:-q]) + 1e-6
            e0, e1 = sp[:q].mean() / mid, sp[-q:].mean() / mid
            ease = 'eased' if (e0 < 0.6 or e1 < 0.6) else ('constant' if sp[q:-q].std() / mid < 0.35 else 'variable')
        m_ = mv[sl]; still = 0; cur = 0
        for m in ~m_:
            cur = cur + 1 if m else 0; still = max(still, cur)
        r.update(base=base_cls, zoom_rate=round(float(zr), 2), pan_rate=round(float(pr), 2), ease=ease,
                 cam_move_share=round(float(movingf.sum() / max(1, base.sum())), 3), hold_max=round(holdrun / FPS, 2),
                 snaps=nsn, anim_share=round(float(m_.mean()), 3), still_max=round(still / FPS, 2),
                 regions=float(np.median(d['ncomp'][sl][m_])) if m_.any() else 0.0,
                 pops=sum(1 for p in pops if lo <= p < hi) + sum(1 for p in flashes if lo <= p < hi),
                 shake=sum(1 for bb in shk if lo <= bb[0] < hi))
        rows.append(r)
    # per-second energy components
    sec_n = int(np.ceil(N / FPS))
    cutsec = np.zeros(sec_n); camsec = np.zeros(sec_n); animsec = np.zeros(sec_n); evsec = np.zeros(sec_n)
    for s in starts[1:]: cutsec[s // FPS] += 1
    for b in snaps: evsec[b[0] // FPS] += 1
    for p in pops + flashes: evsec[p // FPS] += 1
    camspeed = (np.abs(lz) + np.hypot(dx, dy)) * FPS
    for k in range(sec_n):
        sl = slice(k * FPS, min(N, (k + 1) * FPS))
        camsec[k] = np.median(camspeed[sl][good[sl]]) if good[sl].any() else 0
        animsec[k] = mv[sl].mean()
    return dict(N=N, dur=N / FPS, starts=starts, rows=rows, snaps=[(b[0] / FPS, k) for b, k in zip(snaps, snap_kind)],
                pops=[p / FPS for p in pops], flashes=[p / FPS for p in flashes], shake=[b[0] / FPS for b in shk],
                flicker=len(flick), trans=J['trans'], cutsec=cutsec.tolist(), camsec=camsec.tolist(), animsec=animsec.tolist(), evsec=evsec.tolist())


def summary(R, name):
    rows = [r for r in R['rows'] if 'base' in r]; mins = R['dur'] / 60
    n = len(R['rows'])
    c = collections.Counter(r['base'] for r in rows)
    moving = [r for r in rows if r['base'] != 'static' or r['snaps']]
    out = dict(name=name, dur=round(R['dur'], 1), shots=n, cuts_per_min=round((n - 1) / mins, 1), asl=round(R['dur'] / n, 2),
               asl_median=round(float(np.median([r['dur'] for r in R['rows']])), 2),
               share_cam_move=round(len(moving) / len(rows), 3), base_mix={k: round(v / len(rows), 3) for k, v in c.most_common()},
               zoom_med=round(float(np.median([abs(r['zoom_rate']) for r in rows if r['base'] in ('push', 'pull')] or [0])), 2),
               pan_med=round(float(np.median([r['pan_rate'] for r in rows if r['base'] in ('pan', 'tilt')] or [0])), 2),
               ease=dict(collections.Counter(r['ease'] for r in rows if r['ease'])),
               cam_move_share_time=round(float(np.mean([r['cam_move_share'] for r in rows])), 3),
               shots_with_hold1s=round(float(np.mean([r['hold_max'] >= 1.0 for r in rows])), 3),
               snaps_per_min=round(len(R['snaps']) / mins, 2), snap_kinds=dict(collections.Counter(k for _, k in R['snaps'])),
               shots_with_snap=round(float(np.mean([r['snaps'] > 0 for r in rows])), 3),
               share_anim_shots=round(float(np.mean([r['anim_share'] > 0.2 for r in rows])), 3),
               anim_share_med=round(float(np.median([r['anim_share'] for r in rows])), 3),
               still_max=round(max(r['still_max'] for r in rows), 2), still_med=round(float(np.median([r['still_max'] for r in rows])), 2),
               shots_still_over_1s=round(float(np.mean([r['still_max'] >= 1.0 for r in rows])), 3),
               regions_med=round(float(np.median([r['regions'] for r in rows if r['anim_share'] > 0.2] or [0])), 1),
               pops_per_min=round(len(R['pops']) / mins, 2), flashes_per_min=round(len(R['flashes']) / mins, 2),
               shake_per_min=round(len(R['shake']) / mins, 2), flicker_per_min=round(R['flicker'] / mins, 2),
               trans=dict(collections.Counter(t['type'] for t in R['trans'])))
    return out


res = {}
res['comp'] = analyse(D + r'\comp.npz', D + r'\comp_shots.json')
res['anim'] = analyse(D + r'\anim.npz', D + r'\anim_shots.json')
for s in SC:
    res['sc_' + s] = analyse(D + rf'\sc_{s}.npz', D + rf'\scene_{s}_shots.json')
S = {k: summary(v, k) for k, v in res.items()}
# pooled finished scenes
pool = dict(N=0, dur=0, rows=[], snaps=[], pops=[], flashes=[], shake=[], flicker=0, trans=[])
for s in SC:
    r = res['sc_' + s]
    for k in ['rows', 'snaps', 'pops', 'flashes', 'shake', 'trans']: pool[k] += r[k]
    pool['dur'] += r['dur']; pool['flicker'] += r['flicker']
S['scenes'] = summary(pool, 'scenes')
json.dump(dict(summary=S, res=res), open(D + r'\final.json', 'w', encoding='utf8'), ensure_ascii=False)
for k in ['comp', 'anim', 'scenes']:
    print(json.dumps(S[k], ensure_ascii=False))
for s in SC:
    x = S['sc_' + s]
    print(s, x['dur'], 'shots', x['shots'], 'anim_med', x['anim_share_med'], 'snaps/min', x['snaps_per_min'], 'pops/min', x['pops_per_min'], 'still', x['still_max'], x['base_mix'])
