# sfx_gaps.py — где в фильме не хватает звука: план -> событие шотлиста -> звуки, легшие в микс (sound/out/full_chNN/report.json)
#   python -X utf8 sound/tools/sfx_gaps.py [--lang en] > sound/out/SFX_GAPS.md
import json, re, sys, collections
from pathlib import Path
L = Path(__file__).resolve().parents[2]; ru = '--lang' in sys.argv and sys.argv[sys.argv.index('--lang') + 1] == 'ru'
T = json.load(open(L / ('animatic/timing_ru.json' if ru else 'animatic/timing.json'), encoding='utf-8'))
C = json.load(open(L / ('sound/cues_ru.json' if ru else 'sound/cues.json'), encoding='utf-8'))
placed = []
if '--cues' in sys.argv:   # без сведения: лист cues.json с фильтром плотности mid (MID_SKIP из render.py)
    MS = eval(re.search(r"^MID_SKIP = (\{.*?\})", open(L / 'sound/render.py', encoding='utf-8').read(), re.M | re.S).group(1))
    placed = [{'id': c['id'], 'snd': c['snd'], 't': c['t']} for c in C['cues'] if c['snd'] not in MS]
for p in ([] if '--cues' in sys.argv else sorted((L / 'sound/out').glob(('full_ru_ch' if ru else 'full_ch') + '[0-9][0-9]/report.json'))):
    placed += json.load(open(p, encoding='utf-8'))['placed']
byshot = collections.defaultdict(list); cuesby = collections.defaultdict(list)
idshot = {c['id']: c['shot'] for c in C['cues'] if 'id' in c}
for c in C['cues']: cuesby[c['shot']].append(c)
for p in placed:
    s = idshot.get(p['id'])
    if s is None: s = next((x['n'] for x in T['shots'] if x['start'] <= p['t'] < x['end']), None)
    byshot[s].append(p)
# что на экране -> какой класс звука ожидается (слова события шотлиста)
WANT = [('смех', r'смеё|смеют|смех|хохоч|хихик|ухмыл.*смеш|laugh', r'laugh|chuckle|giggle'),
        ('стук', r'стуч|стук|барабан.*пальц|постучал', r'knock|tap|thud|drum'),
        ('надпись/маркер', r'пишет|пишется|написан|рисует|маркер|мел[ом ]|надпис|выводит|черкает|обвод|круг вокруг', r'marker|chalk|pen|write|scribble|draw'),
        ('печать/штамп', r'штамп|печать|ставит печать|DENIED|APPROVED|CLASSIFIED|CLOSED', r'stamp'),
        ('пишмашинка/набор', r'пишмашин|набива|печатает|клавиатур|набирает|typewriter|бегущая строка|тикер', r'type|key|tick'),
        ('телефон', r'телефон|трубк|звонит|звонок', r'phone|ring|dial|hangup'),
        ('бумага/папка', r'папк|бумаг|документ|листает|лист[ ок]|конверт|снимок|фото', r'paper|folder|page|photo|shutter|envelope'),
        ('дверь', r'двер', r'door'),
        ('камера/вспышка', r'вспышк|фотограф|снимает|затвор', r'shutter|flash'),
        ('удар/падение', r'пада|роняет|бросает|швыря|грохает|хлопает|бьёт|удар', r'hit|thud|impact|drop|slam|boom|bang'),
        ('деньги/монеты', r'монет|купюр|деньг|пачк|\$', r'coin|cash|money|register|bill')]
rows = []; miss = collections.Counter(); per_min = collections.Counter()
for s in T['shots']:
    n = s['n']; ev = (s.get('event') or '') + ' ' + (s.get('framing') or ''); got = byshot.get(n, [])
    snds = [p['snd'] for p in got]; all_cues = [c['snd'] for c in cuesby.get(n, [])]
    per_min[int(s['start'] // 60)] += len(got)
    lacks = [name for name, rx, sx in WANT if re.search(rx, ev, re.I) and not any(re.search(sx, x, re.I) for x in snds)]
    for l in lacks: miss[l] += 1
    if lacks or len(got) <= 1:
        rows.append((n, s['start'], s['dur'], len(got), ','.join(snds) or '—', ','.join(sorted(set(all_cues) - set(snds))) or '—', '; '.join(lacks) or ('мало звука' if len(got) <= 1 else ''), ev[:170]))
print(f'# Где не хватает звука ({"RU" if ru else "EN"}, микс full_chNN, плотность {json.load(open(next((L / "sound/out").glob("full_ch00/report.json")), encoding="utf-8"))["density"]})\n')
print('Звуков в минуту:', ' '.join(f'{m}:{per_min[m]}' for m in sorted(per_min)), '\n')
print('Не хватает по видам:', dict(miss), '\n')
print('| план | время | с | звуков | что легло | в листе, но выкинуто плотностью | чего нет | событие |\n|---|---|---|---|---|---|---|---|')
for r in rows: print(f'| #{r[0]} | {int(r[1]//60)}:{r[1]%60:04.1f} | {r[2]:.1f} | {r[3]} | {r[4]} | {r[5]} | {r[6]} | {r[7]} |')
print(f'\nВсего планов с пробелами: {len(rows)} из {len(T["shots"])}')
