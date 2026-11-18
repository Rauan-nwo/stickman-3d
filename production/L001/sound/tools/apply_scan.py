#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_scan.py — убрать из библиотеки записи с криками/воплями/плачем/визгом/сиренами (по lib/vocal_scan.json) и пересобрать.

  C:/dev/tools/sound-venv/Scripts/python.exe -I sound/tools/apply_scan.py [--dry]

1. Выбор до удалений (lib/_dl/picks_before_scan.json) минус записи с verdict «remove» и MANUAL; файлы — в lib/_removed,
   оказавшиеся чистыми — обратно в lib/rec.
2. Журнал удалений — раздел «Удалено после проверки на крики и визг» в LICENSES_extra.md (вставляется в LICENSES.md при сборке):
   файл, автор, страница, что услышал классификатор и где.
3. Пересборка библиотеки (tools/build_lib.py), палитры (ledger_palette.py — помеченное не берётся, подложка — самая «чистая»),
   выбора (pick_palette.py).
"""
import argparse, json, re, subprocess, sys, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent; PY = sys.executable


# убраны по решению, а не только по порогу скана (у подложек окна 5 с размывают короткий выкрик)
MANUAL = {
    'amb_restaurant_04': 'тот самый «крик» в начале пилота: блеющий выкрик в гуле зала на 0.5–1.0 с (окна 1 с: Sheep 0.09, Meow 0.07, Animal 0.08; старый микс: Bleat 0.12, Sheep 0.10)',
    'amb_birds_day_02': 'Owl 0.29 (окна 5 с, @10 с)',
}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dry', action='store_true'); a = ap.parse_args()
    VS = json.load(open(HERE / 'lib/vocal_scan.json', encoding='utf-8'))
    bk = HERE / 'lib/_dl/picks_before_scan.json'
    base = json.load(open(bk if bk.exists() else HERE / 'lib/picks.json', encoding='utf-8'))   # выбор до любых удалений
    led = {e['id']: e for e in json.load(open(HERE / 'lib/_dl/ledger_before_scan.json' if (HERE / 'lib/_dl/ledger_before_scan.json').exists() else HERE / 'lib/ledger.json', encoding='utf-8'))['files']}
    bad = {Path(k).stem: '; '.join(v['why']) for k, v in VS.items() if k.startswith('lib/rec/') and v['verdict'] == 'remove'}
    bad.update(MANUAL)
    keep = [p for p in base if p['id'] not in bad]; gone = [p for p in base if p['id'] in bad]
    rem = HERE / 'lib/_removed'; rem.mkdir(exist_ok=True)
    back = [f for f in rem.glob('*.wav') if f.stem not in bad]
    print(f'убрать: {len(bad)} ({len(gone)} из выбора); вернуть ошибочно убранных: {len(back)}')
    for pid in sorted(bad): print('  -', pid, '|', bad[pid])
    for f in back: print('  +', f.stem)
    synth_bad = [k for k, v in VS.items() if not k.startswith('lib/rec/') and v['verdict'] == 'remove']
    if synth_bad: print('синтез/кандидаты с подозрением (правятся кодом, не удаляются):', synth_bad)
    if a.dry: return
    for f in back:   # вернуть на место: папка — из пути в выборе
        pk = next((p for p in base if p['id'] == f.stem), None)
        sub = Path(pk['path']).parent.name if pk and pk.get('path') else ('amb' if f.stem.startswith('amb_') else 'foley')
        f.replace(HERE / 'lib/rec' / sub / f.name)
    for pid in bad:
        for f in (HERE / 'lib/rec').rglob(pid + '.wav'): f.replace(rem / f.name)
    (HERE / 'lib/picks.json').write_text(json.dumps(keep, ensure_ascii=False, indent=1), encoding='utf-8')
    ex = HERE / 'LICENSES_extra.md'; s = ex.read_text(encoding='utf-8') if ex.exists() else ''
    s = re.sub(r'\n## Удалено после проверки на крики и визг.*?(?=\n## |\Z)', '', s, flags=re.S)
    rows = [f"| `{pid}` | {led.get(pid, {}).get('author', '—')} | {led.get(pid, {}).get('page_url', '—')} | {why} |" for pid, why in sorted(bad.items())]
    sec = ('\n## Удалено после проверки на крики и визг\n\n'
           f'Проверка {datetime.date.today()} (`tools/library_scan.py`, AudioSet AST, вход 48 кГц): короткий звук — одним окном целиком, '
           'подложка — окнами 5 с. Убрано: крик/вопль/плач/стон ≥ 0.15, визг/мяуканье/блеяние/вой/лай/сова ≥ 0.15, сирена ≥ 0.20 '
           '(в помещении ≥ 0.12), плюс записи, убранные по прослушке. Поводом стал непонятный звук «крик что ли» в начале пилота, '
           'который услышал Рауан. Первый проход того же дня подавал классификатору 16 кГц вместо 48 кГц (звук в 3 раза выше) — '
           'по нему были ошибочно убраны `amb_diner_01`, `amb_port_03`, `phone_ring_02`, `ship_horn_01`; они возвращены. '
           'Полные цифры — `lib/vocal_scan.json`.\n\n'
           '| запись | автор | страница | почему |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    ex.write_text(s.rstrip() + '\n' + sec, encoding='utf-8')
    for cmd in ([PY, '-I', str(HERE / 'tools/build_lib.py')], [PY, str(HERE / 'tools/ledger_palette.py')], [PY, str(HERE / 'tools/pick_palette.py')]):
        r = subprocess.run(cmd, cwd=HERE.parent, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode: sys.exit(f'ошибка {cmd[-1]}: {r.stderr[-2000:]}')
        print(Path(cmd[-1]).name, 'ok')


if __name__ == '__main__':
    main()
