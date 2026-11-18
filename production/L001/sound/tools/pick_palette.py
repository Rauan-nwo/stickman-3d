#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pick_palette.py — из прослушивания (lib/audition.json) собрать sound/palette_rec.json: какие классы звучат записью/банком.

  python sound/tools/pick_palette.py [--margin 0.3] [--keep 2]

Правило: класс берёт лучшего кандидата-не-синтез (банк earshot или запись CC0), если его z выше лучшего синтеза на margin;
иначе остаётся синтез (render.py берёт synth.py). До keep лучших файлов становятся вариантами (по очереди по звукам).
Ручные решения — sound/palette_manual.json (тот же формат, перекрывает автоматику; "класс": null — принудительно синтез).
Подложки (amb.*) сюда не попадают автоматически: только из palette_manual.json.
"""
import argparse, json
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--margin', type=float, default=.3); ap.add_argument('--keep', type=int, default=2)
    a = ap.parse_args()
    A = json.load(open(HERE / 'lib/audition.json', encoding='utf-8'))
    out, why = {}, {}
    for c, r in A.items():
        ranked = [x for x in r['ranked'] if x.get('z') is not None]
        syn = max([x['z'] for x in ranked if x['kind'] == 'syn'] or [-99])
        other = [x for x in ranked if x['kind'] != 'syn' and x['z'] >= syn + a.margin]
        if other:
            out[c] = [{'path': x['path'], 'src': x['kind'], 'name': x['name'], 'z': x['z']} for x in other[:a.keep]]
            why[c] = f"{other[0]['kind']}:{other[0]['name']} z {other[0]['z']} > синтез {syn}"
        else:
            why[c] = f"синтез z {syn}" + (f" (лучший другой {max([x['z'] for x in ranked if x['kind'] != 'syn'] or [None], key=lambda v: v or -99)})" if any(x['kind'] != 'syn' for x in ranked) else '')
    man = HERE / 'palette_manual.json'
    if man.exists():
        for c, v in json.load(open(man, encoding='utf-8')).items():
            if c.startswith('_'): continue
            if v is None: out.pop(c, None); why[c] = 'вручную: синтез'
            else: out[c] = v; why[c] = 'вручную: ' + ', '.join(x['path'].split('/')[-1] for x in v)
    json.dump(out, open(HERE / 'palette_rec.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for c in sorted(why): print(f'{c:16s} {why[c]}')


if __name__ == '__main__':
    main()
