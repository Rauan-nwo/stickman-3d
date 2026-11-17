# -*- coding: utf-8 -*-
"""make_narration.py: narration.txt из script.md (строка = фраза рассказчика или реплика «[ИМЯ] текст»).

  python production/L001/make_narration.py [script.md] [narration.txt]     — пишет narration.txt
  python production/L001/make_narration.py --check                         — сверка: narration.txt == сборка из script.md

Берётся текст между <!-- SCRIPT START --> и <!-- SCRIPT END -->; заголовки глав, [SCENE: …] и комментарии пропускаются.
Абзац рассказчика режется на фразы по . ? ! (за которыми пробел и заглавная буква или цифра); реплика «NAME: текст» —
одна строка «[NAME] текст». Так строки совпадают с кешем чернового голоса (draft_voice.py) для неизменённых фраз.
"""
import os, re, sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__))
SPK = re.compile(r'^([A-Z][A-Z0-9 ]{1,20}):\s+(.*)$')


def build(md):
    body = md[md.index('<!-- SCRIPT START -->'):md.index('<!-- SCRIPT END -->')]
    out = []
    for raw in body.split('\n'):
        s = raw.strip()
        if not s or s.startswith('[SCENE') or s.startswith('<!--') or s.startswith('#'): continue
        m = SPK.match(s)
        if m: out.append(f'[{m[1]}] {m[2]}'); continue
        out += [x for x in re.split(r'(?<=[.?!])\s+(?=[A-Z0-9"“])', s) if x]
    return out


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
