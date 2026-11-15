# -*- coding: utf-8 -*-
"""pack_skill.py: собрать скилл stickman-3d из текущего состояния проекта.

  python tools/pack_skill.py            # dist/stickman-3d/ + dist/stickman-3d.skill + установка в ~/.claude/skills
  python tools/pack_skill.py --no-install

Скилл самодостаточен: SKILL.md, references (правила из wiki), assets (движок, шаблоны, пример V002), scripts/setup.mjs.
В пакет не попадают ключи, медиа, node_modules, сборки и история git.
"""
import os, re, shutil, sys, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'tools', 'skill')
DIST = os.path.join(ROOT, 'dist', 'stickman-3d')
MEDIA = ('.mp4', '.mov', '.wav', '.mp3', '.m4a', '.png', '.jpg', '.jpeg', '.npy', '.gray', '.rgb', '.pyc')
SKIP_DIRS = {'node_modules', 'out', '__pycache__', '.git', 'tmp', 'stems', 'mix_stems', 'before_stems', 'overrides',
             'sourcing', 'spotting', 'retime_test', 'voices'}

def copy_tree(src, dst, keep=lambda rel: True):
    n = 0
    for base, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            rel = os.path.relpath(os.path.join(base, f), src)
            if f.lower().endswith(MEDIA) or not keep(rel): continue
            os.makedirs(os.path.dirname(os.path.join(dst, rel)), exist_ok=True)
            shutil.copy2(os.path.join(base, f), os.path.join(dst, rel)); n += 1
    return n

if os.path.exists(DIST): shutil.rmtree(DIST)
os.makedirs(DIST)
shutil.copy2(os.path.join(SRC, 'SKILL.md'), DIST)
copy_tree(os.path.join(SRC, 'references'), os.path.join(DIST, 'references'))
copy_tree(os.path.join(SRC, 'scripts'), os.path.join(DIST, 'scripts'))

# правила из wiki -> references (ссылки [[page]] превращаются в имена файлов)
WIKI = {'craft/stickman-3d.md': 'stickman-3d.md', 'craft/script-craft.md': 'script-craft.md',
        'craft/staging-and-camera.md': 'staging-and-camera.md', 'craft/style-bible.md': 'style-bible.md',
        'craft/production-workflow.md': 'production-workflow.md', 'analyses/channel-formula.md': 'channel-formula.md'}
for rel, name in WIKI.items():
    s = open(os.path.join(ROOT, 'wiki', rel), encoding='utf-8').read()
    s = re.sub(r'^---\n.*?\n---\n', '', s, count=1, flags=re.S)            # front-matter wiki не нужен
    s = re.sub(r'\[\[([^\]|#]+)(#[^\]]*)?\]\]', lambda m: f'`{m.group(1)}.md`', s)
    open(os.path.join(DIST, 'references', name), 'w', encoding='utf-8', newline='\n').write(s.lstrip('\n'))
shutil.copy2(os.path.join(ROOT, 'engine', 'README.md'), os.path.join(DIST, 'references', 'engine-README.md'))

# движок: исходники, инструменты, шрифты, дымовой фильм
n_engine = copy_tree(os.path.join(ROOT, 'engine'), os.path.join(DIST, 'assets', 'engine'),
                     keep=lambda rel: not rel.replace('\\', '/').startswith(('films/army-test', 'films/gorge-test', 'films/kit')))
for f in os.listdir(os.path.join(ROOT, 'engine', 'fonts')):                # шрифты нужны, хотя это «медиа» по расширению? (ttf не в списке)
    pass
copy_tree(os.path.join(ROOT, 'templates'), os.path.join(DIST, 'assets', 'templates'))

# пример ролика: тексты, фильм, настройки, скрипты звука
ex = os.path.join(DIST, 'assets', 'example-V002')
copy_tree(os.path.join(ROOT, 'production', 'V002'), ex,
          keep=lambda rel: rel.lower().endswith(('.md', '.js', '.json', '.txt', '.py')) and 'words_raw' not in rel
          and not rel.replace('\\', '/').startswith('audio/') or rel.replace('\\', '/') in (
              'audio/make_audio.py', 'audio/mix.py', 'audio/check.py', 'audio/spotting.py', 'audio/stt_check.py',
              'audio/openverse_fetch.py', 'audio/listen.py', 'audio/NOTES.md', 'audio/SPOTTING.md', 'audio/CREDITS.md', 'audio/cues.json'))

# контроль: в пакете нет секретов
for base, _, files in os.walk(DIST):
    for f in files:
        p = os.path.join(base, f)
        if os.path.getsize(p) < 2_000_000:
            try: t = open(p, encoding='utf-8', errors='ignore').read()
            except Exception: continue
            if re.search(r'sk_[0-9a-f]{40,}', t): sys.exit(f'В пакете найден ключ: {p}')

size = sum(os.path.getsize(os.path.join(b, f)) for b, _, fs in os.walk(DIST) for f in fs)
files = sum(len(fs) for _, _, fs in os.walk(DIST))
pkg = os.path.join(ROOT, 'dist', 'stickman-3d.skill')
with zipfile.ZipFile(pkg, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, fs in os.walk(DIST):
        for f in fs:
            p = os.path.join(base, f); z.write(p, os.path.join('stickman-3d', os.path.relpath(p, DIST)))
print(f'собрано: {files} файлов, {size / 1e6:.1f} МБ; движок {n_engine} файлов; пакет {os.path.getsize(pkg) / 1e6:.1f} МБ -> {pkg}')

if '--no-install' not in sys.argv:
    dst = os.path.join(os.path.expanduser('~'), '.claude', 'skills', 'stickman-3d')
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(DIST, dst)
    print('установлено в', dst)
