#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_scan.py — убрать из библиотеки записи с криками/воплями/плачем/визгом/сиренами (по lib/vocal_scan.json) и пересобрать.

  C:/dev/tools/sound-venv/Scripts/python.exe -I sound/tools/apply_scan.py [--dry]

1. Каждая запись lib/rec с verdict «remove» выкидывается из lib/picks.json (копия до правки — lib/_dl/picks_before_scan.json).
2. Журнал удалений — раздел «Удалено после проверки на крики и визг» в LICENSES_extra.md (вставляется в LICENSES.md при сборке):
   файл, автор, страница, что услышал классификатор и где.
3. Пересборка библиотеки (tools/build_lib.py), палитры (ledger_palette.py — помеченное не берётся, подложка — самая «чистая»),
   выбора (pick_palette.py).
"""
import argparse, json, re, subprocess, sys, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent; PY = sys.executable


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dry', action='store_true'); a = ap.parse_args()
    VS = json.load(open(HERE / 'lib/vocal_scan.json', encoding='utf-8'))
    led = {e['id']: e for e in json.load(open(HERE / 'lib/ledger.json', encoding='utf-8'))['files']}
    # пороги пересчитываются здесь: длинные подложки слушались окнами 5 с, где короткий визг «размывается», — для них строже
    def verdict(k, v):
        long_ = '/amb/' in k or '/tone/' in k; indoor = any(w in k for w in ('restaurant', 'cutlery', 'office', 'clock', 'drip', 'bar', 'diner', 'dishpit', 'hall', 'hvac', 'newsroom', 'trading', 'servers', 'warehouse', 'fluor'))
        th = {'human': .08, 'animal': .10, 'siren': .08 if indoor else .12} if long_ else {'human': .15, 'animal': .15, 'siren': .12 if indoor else .20}
        why = [f"{g} {v[g]['label']} {v[g]['p']} @{v[g]['t']}s" for g in th if v[g]['p'] >= th[g]]
        return ('remove' if why else 'ok'), why
    for k, v in VS.items(): v['verdict'], v['why'] = verdict(k, v)
    json.dump(VS, open(HERE / 'lib/vocal_scan.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    bad = {Path(k).stem: v for k, v in VS.items() if k.startswith('lib/rec/') and v['verdict'] == 'remove'}
    picks = json.load(open(HERE / 'lib/picks.json', encoding='utf-8'))
    keep = [p for p in picks if p['id'] not in bad]; gone = [p for p in picks if p['id'] in bad]
    print(f'записей с криками/визгом/сиренами: {len(bad)}; убирается из picks: {len(gone)}')
    for p in gone: print('  -', p['id'], '|', '; '.join(bad[p['id']]['why']))
    synth_bad = [k for k, v in VS.items() if not k.startswith('lib/rec/') and v['verdict'] == 'remove']
    if synth_bad: print('синтез/банк/слои с подозрением (правятся кодом, не удаляются):', synth_bad)
    if a.dry: return
    bk = HERE / 'lib/_dl/picks_before_scan.json'
    if not bk.exists(): bk.write_text(json.dumps(picks, ensure_ascii=False, indent=1), encoding='utf-8')
    (HERE / 'lib/picks.json').write_text(json.dumps(keep, ensure_ascii=False, indent=1), encoding='utf-8')
    # журнал удалений в LICENSES_extra.md (раздел пересоздаётся целиком)
    ex = HERE / 'LICENSES_extra.md'; s = ex.read_text(encoding='utf-8') if ex.exists() else ''
    s = re.sub(r'\n## Удалено после проверки на крики и визг.*?(?=\n## |\Z)', '', s, flags=re.S)
    rows = []
    for pid, v in sorted(bad.items()):
        e = led.get(pid, {})
        rows.append(f"| `{pid}` | {e.get('author', '—')} | {e.get('page_url', '—')} | {'; '.join(v['why'])} |")
    sec = ('\n## Удалено после проверки на крики и визг\n\n'
           f'Проверка {datetime.date.today()}: каждая запись прослушана классификатором AudioSet (AST, окна 1–5 с, `tools/library_scan.py`); '
           'убраны записи, где крик/вопль/плач/стон, визг/мяуканье/вой/лай или сирена выше порога (подложки, окна 5 с: 0.08 / 0.10 / 0.08 в помещении, 0.12 на улице; '
           'короткие звуки, окна 1 с: 0.15 / 0.15 / 0.12–0.20). '
           'Поводом стал непонятный звук «крик что ли» в начале пилота, который услышал Рауан. Полные цифры — `lib/vocal_scan.json`.\n\n'
           '| запись | автор | страница | что услышано |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    ex.write_text(s.rstrip() + '\n' + sec, encoding='utf-8')
    for cmd in ([PY, '-I', str(HERE / 'tools/build_lib.py')], [PY, str(HERE / 'tools/ledger_palette.py')], [PY, str(HERE / 'tools/pick_palette.py')]):
        r = subprocess.run(cmd, cwd=HERE.parent, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode: sys.exit(f'ошибка {cmd[-1]}: {r.stderr[-2000:]}')
        print(Path(cmd[-1]).name, 'ok')


if __name__ == '__main__':
    main()
