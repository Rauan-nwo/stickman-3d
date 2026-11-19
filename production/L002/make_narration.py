# -*- coding: utf-8 -*-
"""make_narration.py: narration.txt из script.md (строка = фраза рассказчика или реплика «[ИМЯ] текст»).

  python production/L002/make_narration.py [script.md] [narration.txt]     — пишет narration.txt
  python production/L002/make_narration.py --check                         — сверка: narration.txt == сборка из script.md

Берётся текст после <!-- SCRIPT START --> (до <!-- SCRIPT END -->, если она есть); заголовки глав, [SCENE: …] и комментарии пропускаются.
Абзац рассказчика режется на фразы по . ? ! (за которыми пробел и заглавная буква или цифра; внутри цитаты "…" не режется); реплика «NAME: текст» —
одна строка «[NAME] текст». Так строки совпадают с кешем чернового голоса (draft_voice.py) для неизменённых фраз.
"""
import os, re, sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__))
SPK = re.compile(r'^([A-Z][A-Z0-9 ]{1,20}):\s+(.*)$')


def build(md):
    end = md.find('<!-- SCRIPT END -->')   # в L002 метки конца нет — текст до конца файла
    body = md[md.index('<!-- SCRIPT START -->'):end if end >= 0 else len(md)]
    out = []
    for raw in body.split('\n'):
        s = raw.strip()
        if not s or s.startswith('[SCENE') or s.startswith('<!--') or s.startswith('#'): continue
        m = SPK.match(s)
        if m: out.append(f'[{m[1]}] {m[2]}'); continue
        out += sentences(s)
    return out


def sentences(s):
    """Фразы по . ? ! (и по ." ?" !" после закрытой цитаты); внутри цитаты "…" не режем (L002: «…evil. Fix it.»)."""
    res, a = [], 0
    for m in re.finditer(r'(?:(?<=[.?!])|(?<=[.?!]"))\s+(?=[A-Z0-9"“])', s):
        if s[:m.start()].count('"') % 2: continue
        res.append(s[a:m.start()]); a = m.end()
    res.append(s[a:])
    return [x for x in res if x]


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    sc = args[0] if args else os.path.join(D, 'script.md'); nt = args[1] if len(args) > 1 else os.path.join(D, 'narration.txt')
    lines = build(open(sc, encoding='utf-8').read())
    if '--check' in sys.argv:
        old = [l.rstrip('\n') for l in open(nt, encoding='utf-8') if l.strip()]
        bad = [(i, a, b) for i, (a, b) in enumerate(zip(old, lines)) if a != b]
        print('lines', len(old), len(lines), 'diff', len(bad) + abs(len(old) - len(lines)))
        for i, a, b in bad[:5]: print(i, repr(a), '|', repr(b))
        sys.exit(1 if bad or len(old) != len(lines) else 0)
    open(nt, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
    print('narration lines', len(lines))
