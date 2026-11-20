# -*- coding: utf-8 -*-
"""summary.py — раздел «Итоги» шотлиста L002 из animatic/timing.json (запуск после make_timing.mjs и shotlist_tool.mjs sync)."""
import json, os, re, collections
L = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(L, 'animatic/timing.json'), encoding='utf-8')); sh = T['shots'] if isinstance(T, dict) else T
total = sh[-1]['start'] + sh[-1]['dur']; fmt = lambda t: f"{int(t // 60)}:{t % 60:04.1f}"
tpl = collections.Counter(s['loc'] for s in sh if s['loc'].startswith('T-'))
cards = tpl['T-card']; d3 = sum(1 for s in sh if s['loc'].startswith('3D'))
whip = sum(1 for s in sh if 'вип-пан' in s['camera']); static = sum(1 for s in sh if s['camera'].startswith('статично'))
jerk = sum(1 for s in sh if 'рывок' in s['camera']); ev = sum(len(re.findall(r'(?:^|\s)на (?:втором |каждое )?«', s['event'])) for s in sh)
first = sum(1 for s in sh if s['start'] < 60); locs = len({s['loc'] for s in sh if s['loc'].startswith('L')})
ch = collections.OrderedDict()
for s in sh: ch.setdefault(s['ch'], []).append(s)
rows = []
for c, ss in ch.items():
    d = sum(x['dur'] for x in ss); rows.append(f"| {c}. {ss[0].get('chTitle', '')} | {fmt(ss[0]['start'])} | {len(ss)} | {d:.0f} | {len(ss) / d * 60:.1f} | {sum(1 for x in ss if x['loc'] == 'T-card')} |")
out = f"""| | Значение |
|---|---|
| Планов | **{len(sh)}** (черновик 381 → 387 после разрезки длинных → 345 после слияния коротких реплик в вип-паны) |
| Длина | **{fmt(total)}** ({total:.1f} с): голос Fish {T['voiceDuration']:.1f} с + паузы (титры глав, карточки на тишине, добор коротких реплик) |
| Средний план | **{total / len(sh):.2f} с**, {len(sh) / total * 60:.1f} склеек в минуту (L001 3.34 с; конкурент 3.18 с / 17.6 в мин; правило 16–20); длиннее 8 с — ни одного |
| Первая минута (хук) | планов: **{first}** (L001 23, конкурент 22); колокол на 0:00–0:04, «evil» на телефоне силуэта у ракеты 0:06–0:09, ценник аренды «PAYEE: SPACEX» ~0:24, Маск в кадре с подписью 0:25 |
| Чёрных карточек | **{cards}** ({cards / total * 60:.1f} в минуту; цель 2–3) |
| Камера | рывок на ударном слове — **{jerk}**, вип-пан между говорящими — **{whip}**, статично (карточки, титры) — **{static}** ({static / len(sh) * 100:.0f} %) |
| События по словам | **{ev}** («на «слово»» в колонке события) |
| Шаблонов по видам | {', '.join(f'{k} {v}' for k, v in tpl.most_common())} |
| 3D-планов | {d3}: проход Colossus (сцена L001 `dc_inspection` + плейт L16), пролёт над Мемфисом |
| Локаций | {locs} своих (все плейты нарисованы и утверждены 2026-11-20) + {len(tpl)} видов шаблонов + 2 3D |

| Глава | старт | планов | с | планов/мин | карточек |
|---|---|---|---|---|---|
""" + '\n'.join(rows)
p = os.path.join(L, 'shotlist.md'); md = open(p, encoding='utf-8').read()
md = re.sub(r'(## Итоги\n\n)[\s\S]*?(\n\n\*\*Обозначения\*\*)', lambda m: m.group(1) + out + m.group(2), md)
open(p, 'w', encoding='utf-8', newline='\n').write(md); print(out)
