# youtube-video — «Стикман 3D»

Проект для производства YouTube Shorts кодом: плоские 2D-человечки внутри 3D-мира, закадровая история
о настоящей странной вещи (формат «Why / How X Worked»), 56–67 секунд, 720×1280.

Внутри три вещи:
- **Движок** `engine/` — декорации three.js, персонажи, толпы, камера, эффекты, голос, субтитры, звук, проверки.
- **Знания** `wiki/` — формула канала, правила сценария и постановки, библия стиля, порядок производства.
- **Ролики** `production/` — V001 (хук эталона на движке), V002 (полный ролик: текст, постановка, фильм, звук).

## Быстрый старт

Нужны: Node.js 18+, ffmpeg, Python 3.10+, Chrome; для чернового голоса — `pip install edge-tts`.

```
cd engine && npm install && cd ..
node engine/tools/make.mjs engine/films/demo --min-dur 4 --max-dur 5 --max-epm 200   # проверка: пробный ролик за ~20 с
node engine/tools/new-film.mjs V003 --title "Why Something Works"                      # заготовка нового ролика
node engine/tools/make.mjs production/V003                                             # голос → рендер → субтитры → звук → проверка
```

Медиа (видео, аудио) и ключи в репозиторий не входят: ролики пересобираются командами выше, ключ ElevenLabs
кладётся в `raw/_secrets/voice-api-key.txt`.

## Работа с Claude Code

Скилл `stickman-3d` ведёт от идеи до готового ролика. Собрать и установить его из проекта:

```
python tools/pack_skill.py        # dist/stickman-3d.skill + установка в ~/.claude/skills/stickman-3d
```

После этого в Claude Code: «сделай ролик в стиле стикман 3д», «идеи для канала», «продолжаем V002».

## С чего читать

| Что | Где |
|---|---|
| Что такое стиль и где что лежит | `wiki/craft/stickman-3d.md` |
| Формула канала и отбор идей | `wiki/analyses/channel-formula.md` |
| Сценарий | `wiki/craft/script-craft.md` |
| Постановка и камера | `wiki/craft/staging-and-camera.md` |
| Этапы, уроки, экономия токенов | `wiki/craft/production-workflow.md` |
| Приёмка перед показом | `tools/skill/references/quality-gates.md` |
| Звук | `tools/skill/references/sound-design.md` |
| Движок | `engine/README.md` |
| Где остановились по ролику | `production/V002/HANDOFF.md` |

Правила ведения проекта для Claude — в `CLAUDE.md`, каталог страниц — в `index.md`, хронология — в `log.md`.

## Что ставится отдельно и чего в репозитории нет

| Что | Нужно ли | Как получить |
|---|---|---|
| Node.js 18+, ffmpeg, Python 3.10+, Chrome | обязательно | с официальных сайтов; `cd engine && npm install` ставит three, esbuild, playwright-core |
| edge-tts | для бесплатного чернового голоса | `pip install edge-tts` |
| Ключ ElevenLabs | для голосов рассказчика и героев и генерации звуков | свой ключ в `raw/_secrets/voice-api-key.txt` |
| earshot | только для машинной проверки звука (`production/V002/audio/listen.py`, `pick.py`, `whoosh_check.py`) | `git clone https://github.com/Leonxlnx/earshot`, установка по его README; в скриптах путь `C:/dev/tools/earshot` поправить на свой |
| Записи звуков (CC0) и готовые видео | не хранятся в git | записи скачиваются заново `production/V002/audio/openverse_fetch.py` по списку из `CREDITS.md`; ролик пересобирается `make.mjs` |

Движок самодостаточен: сторонние анимационные скиллы для работы не нужны. Их разбор (что из них взято и почему
остальное не подошло) — в `wiki/craft/anim-skills-catalog.md`; камера перенесена из anidoodle (Apache-2.0, пометка в файле).
В нескольких скриптах звука V002 остались пути этой машины (`C:/dev/tools/…`, `C:/Users/velar/…`) — на другой
машине их нужно заменить.
