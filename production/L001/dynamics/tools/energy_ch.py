"""Индекс энергии по главам нового шотлиста (холодное начало) против конкурента на тех же сюжетных отрезках.
python energy_ch.py  (после analyze.py -> anim.npz, shots.py anim, final.py) -> печать таблицы + energy_ch.json"""
import json, numpy as np
D = r'C:\Users\velar\AppData\Local\Temp\claude\8bd48fdc79c32563\6b93721b-4d73-44f7-bee9-2a1409fa5259\scratchpad\dyn'
T = json.load(open(r'C:\dev\projects\youtube-video\production\L001\animatic\timing.json', encoding='utf8'))
F = json.load(open(D + r'\final.json', encoding='utf8'))
C, A = F['res']['comp'], F['res']['anim']
def comps(R): return np.array(R['cutsec']) * 60, np.array(R['evsec']) * 60, np.array(R['camsec'])
cc, ce, cm = comps(C); ac, ae, am = comps(A)
norm = dict(cut=cc.mean(), ev=ce.mean(), cam=cm.mean())
E = lambda c, e, m: (c / norm['cut'] + e / norm['ev'] + m / norm['cam']) / 3
EC, EA = E(cc, ce, cm), E(ac, ae, am)
names = ['0 Сингапур (холодное начало)', '1 Кабинет ведущего', '2 Человек с ключом', '3 Запертая дверь', '4 Прикрытие', '5 Знакомство',
         '6 Трубопровод', '7 Настоящий приз', '8 Меморандум', '9 Пустое кресло', '10 Кабинет']
comp_b = [0, 37.2, 53, 268, 364, 435, 549, 724, 954, 1037, 1181, len(EC)]   # те же сюжетные отрезки у конкурента
ours_b = []
for s in T['shots']:
    while len(ours_b) <= s['ch']: ours_b.append(s['start'])
ours_b.append(len(EA))
def seg(x, b, i): a, z = int(b[i]), int(b[i + 1]); return x[a:max(a + 1, z)]
rows = []
for i, n in enumerate(names):
    rows.append(dict(ch=n, comp=round(float(seg(EC, comp_b, i).mean()), 2), ours=round(float(seg(EA, ours_b, i).mean()), 2),
                     comp_ev=round(float(seg(ce, comp_b, i).mean()), 1), ours_ev=round(float(seg(ae, ours_b, i).mean()), 1),
                     comp_cut=round(float(seg(cc, comp_b, i).mean()), 1), ours_cut=round(float(seg(ac, ours_b, i).mean()), 1)))
tot = dict(comp=round(float(EC.mean()), 2), ours=round(float(EA.mean()), 2))
json.dump(dict(rows=rows, total=tot, norm=norm), open(D + r'\energy_ch.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for r in rows: print(f"{r['ch']:32s} конк {r['comp']:.2f}  мы {r['ours']:.2f}   события/мин {r['comp_ev']:5.1f} / {r['ours_ev']:5.1f}   склейки/мин {r['comp_cut']:4.1f} / {r['ours_cut']:4.1f}")
print('весь ролик: конк', tot['comp'], 'мы', tot['ours'])
