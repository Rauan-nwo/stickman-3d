#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ledger_palette.py — записи CC0 из lib/ledger.json (поле class, оценка earshot z) -> palette_manual.json.

  python sound/tools/ledger_palette.py [--margin 0.3]

Запись берётся в палитру, если её z (earshot: насколько она похожа на описание нужного звука) выше лучшего
синтеза/банка того же класса из lib/audition.json на margin; без конкурента — если z >= 2 и нет пометки «слабый».
До 3 вариантов на класс (по очереди по звукам), подложки amb.* — одна, лучшая. ALIAS — какие ещё классы листа
играет та же запись (маркер пишет/подчёркивает/обводит, снимок падает/ладонь на снимок…).
Ручные правки поверх — в palette_manual.json (ключи с «!» в начале этим скриптом не трогаются).
"""
import argparse, json
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ALIAS = {'marker.write': ['marker.line', 'marker.hl', 'marker.circle', 'marker.cross'], 'photo.drop': ['photo.pat', 'paper.place'],
         'tag.slap': ['tag.pop'], 'crate.set': ['box.set'], 'cloth.rustle': ['cloth.slide'], 'paper.handle': ['page.turn']}
KEEP_SYNTH = {'phone.ring'}   # длительность очереди звонка задаёт картинка — синтез (z 3.1) с естественным затуханием колоколов


def zof(e):
    es = e.get('earshot') or {}
    return e['z'] if isinstance(e.get('z'), (int, float)) else (es.get('rank_z') or es.get('find_z'))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--margin', type=float, default=.3); a = ap.parse_args()
    led = json.load(open(HERE / 'lib/ledger.json', encoding='utf-8'))['files']
    aud = json.load(open(HERE / 'lib/audition.json', encoding='utf-8'))
    man_p = HERE / 'palette_manual.json'; man = json.load(open(man_p, encoding='utf-8'))
    # проверка на крики/визг/сирены (tools/library_scan.py): помеченные «remove» в палитру не берутся; подложки — самая «чистая»
    vs_p = HERE / 'lib' / 'vocal_scan.json'; VS = json.load(open(vs_p, encoding='utf-8')) if vs_p.exists() else {}
    vsk = lambda e: VS.get('lib/' + e['path'].replace(chr(92), '/').split('lib/', 1)[-1], {})
    dirt = lambda e: max([vsk(e).get(g, {}).get('p', 0) for g in ('human', 'animal', 'siren', 'laugh')] or [0])
    by = {}
    for e in led:
        if vsk(e).get('verdict') == 'remove': continue
        by.setdefault(e['class'], []).append(e)
    rep = []
    for c, es in sorted(by.items()):
        es = [e for e in sorted(es, key=(lambda e: dirt(e)) if c.startswith('amb.') else (lambda e: -(zof(e) or 0))) if not e.get('weak')]
        rival = max([x['z'] for x in aud.get(c, {}).get('ranked', []) if x.get('z') is not None] or [None], key=lambda v: v if v is not None else -99)
        if c in KEEP_SYNTH: rep.append(f'{c:16s} синтез (решение: {KEEP_SYNTH and "длительность по картинке"}); записи z {[zof(e) for e in es]}'); continue
        ok = [e for e in es if (zof(e) or 0) >= (rival + a.margin if rival is not None else 2.0) or c.startswith('amb.')]
        if not ok: rep.append(f'{c:16s} синтез/банк (z {rival}); записи слабее: {[zof(e) for e in es]}'); continue
        val = [{'path': 'sound/' + e['path'].replace(chr(92), '/'), 'src': 'rec', 'name': e['id'], 'z': zof(e)} for e in ok[:1 if c.startswith('amb.') else 3]]
        for cc in [c] + ALIAS.get(c, []):
            man[cc] = val
        rep.append(f"{c:16s} {', '.join(x['name'] + ' z ' + str(x['z']) for x in val)}" + (f"  (синтез/банк {rival})" if rival is not None else '') + (f"  -> ещё {ALIAS[c]}" if c in ALIAS else ''))
    json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n'.join(rep))


if __name__ == '__main__':
    main()
