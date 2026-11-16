import json, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
D = r'C:\Users\velar\AppData\Local\Temp\claude\8bd48fdc79c32563\6b93721b-4d73-44f7-bee9-2a1409fa5259\scratchpad\dyn'
OUT = r'C:\dev\projects\youtube-video\production\L001\out\dynamics_curve.png'
F = json.load(open(D + r'\final.json', encoding='utf8'))
T = json.load(open(r'C:\dev\projects\youtube-video\production\L001\animatic\timing.json', encoding='utf8'))
C, A = F['res']['comp'], F['res']['anim']
ch_comp = [0, 6, 53, 268, 364, 435, 549, 724, 954, 1037, 1181]
ch_anim = []
for s in T['shots']:
    if not ch_anim or s['ch'] != len(ch_anim) - 1:
        while len(ch_anim) <= s['ch']: ch_anim.append(s['start'])
names = ['0 Office', '1 Singapore', '2 Key', '3 Door', '4 Cover', '5 Intro', '6 Pipeline', '7 Prize', '8 Memo', '9 Chair', '10 Office']


def comps(R):
    cut = np.array(R['cutsec']) * 60; ev = np.array(R['evsec']) * 60; cam = np.array(R['camsec'])
    an = np.array(R['animsec'])
    return cut, ev, cam, an


cc, ce, cm, ca = comps(C); ac, ae, am, aa = comps(A)
norm = dict(cut=cc.mean(), ev=ce.mean(), cam=cm.mean())


def energy(cut, ev, cam):
    return (cut / norm['cut'] + ev / norm['ev'] + cam / norm['cam']) / 3


def roll(x, k=30):
    p = np.pad(x, k // 2, mode='edge'); return np.convolve(p, np.ones(k) / k, 'valid')[:len(x)]


EC, EA = energy(cc, ce, cm), energy(ac, ae, am)


def chap(x, bounds, total):
    b = [int(v) for v in bounds] + [int(total)]
    return [float(np.mean(x[b[i]:max(b[i] + 1, b[i + 1])])) for i in range(len(bounds))]


chapters = dict(
    comp=dict(energy=chap(EC, ch_comp, len(EC)), cuts=chap(cc, ch_comp, len(cc)), events=chap(ce, ch_comp, len(ce)), cam=chap(cm, ch_comp, len(cm)), anim=chap(ca, ch_comp, len(ca))),
    anim=dict(energy=chap(EA, ch_anim, len(EA)), cuts=chap(ac, ch_anim, len(ac)), events=chap(ae, ch_anim, len(ae)), cam=chap(am, ch_anim, len(am)), anim=chap(aa, ch_anim, len(aa))),
    bounds=dict(comp=ch_comp, anim=ch_anim), norm=norm)
json.dump(chapters, open(D + r'\chapters.json', 'w'), indent=1)

BLUE, ORANGE = '#2a78d6', '#eb6834'
INK, INK2, GRID, SURF = '#0b0b0b', '#52514e', '#e4e3df', '#fcfcfb'
plt.rcParams.update({'font.family': 'Segoe UI', 'font.size': 10, 'axes.edgecolor': GRID, 'axes.labelcolor': INK2,
                     'xtick.color': INK2, 'ytick.color': INK2, 'axes.titlecolor': INK, 'figure.facecolor': SURF, 'axes.facecolor': SURF})
fig, ax = plt.subplots(4, 1, figsize=(13, 13), gridspec_kw=dict(height_ratios=[1.3, 1, 1, 1.2]))
fig.subplots_adjust(hspace=0.55, left=0.07, right=0.97, top=0.93, bottom=0.05)
fig.suptitle('L001 против конкурента: динамика по времени (скользящее окно 30 с)', x=0.07, ha='left', fontsize=14, color=INK, fontweight='bold')
tc = np.arange(len(EC)) / 60; ta = np.arange(len(EA)) / 60


def base(a, title, ylab):
    a.set_title(title, loc='left', fontsize=11)
    a.set_ylabel(ylab); a.grid(axis='y', color=GRID, lw=0.8); a.set_xlim(0, 20)
    for s in ['top', 'right']: a.spines[s].set_visible(False)


a = ax[0]
base(a, 'Индекс энергии: склейки + резкие движения/события + скорость камеры (1.0 = среднее конкурента)', 'индекс')
a.plot(tc, roll(EC), color=BLUE, lw=2, label='конкурент (19:48)')
a.plot(ta, roll(EA), color=ORANGE, lw=2, label='наш аниматик (15:30)')
for b, n in zip(ch_anim[1:], names[1:]):
    a.axvline(b / 60, color=ORANGE, lw=0.6, alpha=0.5, ls=':')
    a.text(b / 60 + 0.05, a.get_ylim()[1] * 0.97 if False else 2.35, n.split()[0], color=ORANGE, fontsize=8, va='top')
for b, n in zip(ch_comp[1:], names[1:]):
    a.axvline(b / 60, color=BLUE, lw=0.6, alpha=0.5, ls=':')
    a.text(b / 60 + 0.05, 0.08, n.split()[0], color=BLUE, fontsize=8)
a.set_ylim(0, 2.4); a.legend(loc='upper right', frameon=False)
a.text(0.0, -0.22, 'пунктир и цифры сверху — главы у нас, снизу — те же главы у конкурента (по сверке compare_scenes.md)', transform=a.transAxes, color=INK2, fontsize=8)

a = ax[1]
base(a, 'Склейки в минуту', 'склеек/мин')
a.plot(tc, roll(cc), color=BLUE, lw=2, label='конкурент')
a.plot(ta, roll(ac), color=ORANGE, lw=2, label='наш аниматик')
a.legend(loc='upper right', frameon=False)

a = ax[2]
base(a, 'Резкие движения камеры (рывок-зум, вип) + события в кадре (появления, вспышки), в минуту', 'событий/мин')
a.plot(tc, roll(ce), color=BLUE, lw=2, label='конкурент')
a.plot(ta, roll(ae), color=ORANGE, lw=2, label='наш аниматик')
a.legend(loc='upper right', frameon=False)

a = ax[3]
x = np.arange(11); w = 0.38
a.bar(x - w / 2 - 0.01, chapters['comp']['energy'], w, color=BLUE, label='конкурент')
a.bar(x + w / 2 + 0.01, chapters['anim']['energy'], w, color=ORANGE, label='наш аниматик')
a.set_xticks(x); a.set_xticklabels(names, fontsize=9)
a.set_title('Индекс энергии по главам', loc='left', fontsize=11); a.set_ylabel('индекс')
a.grid(axis='y', color=GRID, lw=0.8); a.set_axisbelow(True); a.set_ylim(0, 2.6)
for s in ['top', 'right']: a.spines[s].set_visible(False)
a.legend(loc='upper left', frameon=False, ncol=2)
for a in ax[:3]: a.set_xlabel('минуты')
fig.savefig(OUT, dpi=110)
print(OUT)
print(json.dumps({k: [round(v, 2) for v in chapters['comp'][k]] for k in chapters['comp']}))
print(json.dumps({k: [round(v, 2) for v in chapters['anim'][k]] for k in chapters['anim']}))
print(norm)
