# -*- coding: utf-8 -*-
"""remap_docs.py: перенос номеров планов в текстовых документах L001 по карте старый→новый.

  python production/L001/animatic/remap_docs.py renumber_297_to_298.json [--last '{"19": 20}']

Правит «#N» и «#N–M» в decisions_for_owner.md, compare_scenes.md (там же колонку «наши #») и шапку shotlist.md (до
«## Раскадровка»). Ссылки на старые номера в скобках «(было …)» не трогаются. --last: куда переносить КОНЕЦ диапазона,
если старый план разрезан (по умолчанию — на тот же номер, что и начало)."""
import json, os, re, sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D)
M = {int(k): v for k, v in json.load(open(os.path.join(D, sys.argv[1]))).items()}
LAST = {int(k): v for k, v in json.loads(sys.argv[sys.argv.index('--last') + 1]).items()} if '--last' in sys.argv else {}
m = lambda n: M.get(n, n) if M.get(n, n) is not None else n
me = lambda n: LAST.get(n, m(n))


def old_ctx(text, pos):
    a = text.rfind('(', 0, pos); b = text.rfind(')', 0, pos)
    return a > b and re.search(r'было|бывш', text[a:pos])


def remap_hash(text):
    def f(mt):
        if old_ctx(text, mt.start()): return mt.group(0)
        s = mt[1] + str(m(int(mt[2])))
        if mt[3]: s += mt[3] + str(me(int(mt[4])))
        return s
    return re.sub(r'((?<![A-Za-zА-Яа-я])#)(\d+)(?:(–|-)(\d+))?', f, text)


def remap_bare(text):          # списки номеров без «#» после первого «#N, …» (строки переходов в шапке шотлиста)
    def f(mt):
        if old_ctx(text, mt.start()): return mt.group(0)
        return str(m(int(mt[1])))
    return re.sub(r'(?<![\d.:%A-Za-zА-Яа-я«#$−-])(\d{2,3})(?![\d.:%»с])', f, text)


def remap_cell(cell):
    def f(mt):
        if old_ctx(cell, mt.start()): return mt.group(0)
        s = str(m(int(mt[1])))
        if mt[2]: s += mt[2] + str(me(int(mt[3])))
        return s
    return re.sub(r'(?<![\d.#:])(\d+)(?:(–)(\d+))?(?![\d.:%])', f, cell)


n = 0
for fn in ('decisions_for_owner.md', 'compare_scenes.md'):
    p = os.path.join(L, fn); lines = open(p, encoding='utf-8', newline='').read().split('\n'); col = None
    for i, l in enumerate(lines):
        if fn == 'compare_scenes.md' and l.startswith('| конкурент |'):
            col = [c.strip() for c in l.strip().strip('|').split(' | ')].index('наши #'); continue
        if col is not None and l.startswith('| ') and not l.startswith('|---'):
            c = l.strip().strip('|').split(' | ')
            if len(c) > col: c[col] = remap_cell(c[col]); l = '| ' + ' | '.join(x.strip() for x in c) + ' |'
        elif not l.startswith('|') and l.strip(): col = None
        nl = remap_hash(l); n += nl != lines[i]; lines[i] = nl
    open(p, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
p = os.path.join(L, 'shotlist.md'); s = open(p, encoding='utf-8', newline='').read(); a = s.index('## Раскадровка')
head = '\n'.join(remap_bare(remap_hash(l)) if ('Оформленные переходы' in l or re.match(r'\s+\d{2,3}, \d', l) or l.strip().startswith(('денег', 'вместо')))
                 else remap_hash(l) for l in s[:a].split('\n'))
open(p, 'w', encoding='utf-8', newline='').write(head + s[a:])
print('changed lines', n)
