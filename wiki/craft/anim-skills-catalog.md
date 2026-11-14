---
type: technique
status: evergreen
tags: [tools, claude-skills, animation, pipeline]
created: 2026-11-14
updated: 2026-11-14
sources: [2026-11-14-animatsiya-skills-links.md]
---

# Каталог анимационных скиллов (подборка vitalyvlada.ru)

9 скиллов Claude Code со страницы-подборки. Все склонированы для изучения в
`C:\dev\tools\anim-skills\` (вне репо, не установлены). Оценка — насколько скилл помогает
делать ролики в стиле [[style-bible]] (0 — никак, 5 — закрывает весь визуал).

**Главный вывод (пересмотрен 2026-11-14).** Рауан подтвердил: ролики канала пишутся **кодом** —
3D-окружение + 2D-анимированные человечки. Первая оценка (под ИИ-видео) была неверной, ниже —
оценка под код. Готового стыка «3D-мир + плоский 2D-персонаж внутри» нет ни в одном репо,
но все детали для него есть по частям.

## Сводная таблица (под стиль «3D + 2D кодом»)
| Наше название | Репозиторий | Оценка | Что берём в пайплайн |
|---|---|---|---|
| **3D-киностудия на коде** | alexgreensh/anidoodle | 4.5 | Движок: three.js 0.170 (`engine/src/three-core`): камера (`pushIn`, `dolly`, `orbit`, `crane`, `whipPan`, `handheld`, `rackFocus`, `matchCut`), свет `interior`/`sunset`, материалы `toon`/`matte`/`satin`, `outline`, `contactShadow`; таймлайн по словам; озвучка `narrate.mjs` + проверка каждого слова; дакинг музыки; SFX `filmSfx`; рендер 9:16; `gate`/`framecheck`/`ship` |
| **Мультяшка и разбор референса** | alchaincyf/huashu-art-motion | 4 | `lib/toon.js` — `TOON.bean` (круглая голова, обводка, тело-боб, руки-макаронины, шляпа, брови-эмоции), `poseAt`, `blinkAt`, `alive`, рот по громкости голоса `TOON.mouth`; стык three.js → 2D-canvas (`scenes/53_pixar.js`); `render.py` (Playwright → ffmpeg, любой размер); `qa.py`; `breakdown.py`/`compare.py` |
| **Эмоции персонажа** | JohnHeibel/ClaudeAnimationBase | 3 | `src/clawd.js`: таблица `EMO` (31 эмоция: глаза, рот, тело(t)), `emotions()` с переходом-прищуром и overshoot, ~25 глаз, 16 ртов, моргание, повороты, «кипящая» линия `boilSeed` |
| **Мульт на canvas** | iart-ai/javascript-animation-skills | 2 | `references/character.md` (персонаж-функция, лист выражений), `layout-check.mjs` (текст не на лице), `sync-check.mjs`; ссылка на соседний пакет `iart-ai/webgl-animation-skills` (three.js, не изучен) |
| **Рисунок кодом** | cloveric/claude-drawing-skill | 1 | Рецепты «плёнки»: дымка, bloom, DOF-слои, тон-кривая (`lib/soft3d.py`), cel-тени и линии скорости (`lib/cartoon.py`) — как ТЗ для шейдеров three.js |
| **Рисованная доска** | ToBeWin/HandDraw-Skill | 1 | edge-tts (бесплатный голос; умеет границы слов для пословных субтитров) |
| **Принципы моушна** | LottieFiles/motion-design-skill | 1 | Тайминг и easing реакций, вторичное движение |
| **Математическая анимация** | adithya-s-k/manim_skill | 0.5 | Только инфографика |
| **ИИ-клип по картинке** | LunaAI519/motion-skill | 0 | Не код, а генерация (Nano Banana → Kling/Seedance) — к нашему стилю не относится |

## Что придётся написать самим
1. **Персонаж-палочник канала**: внешность из [[style-bible]] на основе `TOON.bean` + таблица эмоций
   по образцу `EMO` из clawd.js + набор ртов эталона (решётка зубов, «O», дуга, черта, смех).
2. **2D-персонаж внутри 3D**: рисуем в 2D-canvas → `CanvasTexture` → плоскость-billboard в three.js
   (паттерн `textPlane` из anidoodle), с сортировкой по глубине и контактной тенью.
3. **Окружение уровня эталона**: туман, DOF (BokehPass), объёмные лучи, пыль/искры/взрыв (Points),
   модели и PBR-текстуры — в репо этого нет.
4. **Пословные субтитры 1–2 слова** по таймингу whisper (у anidoodle — только фразы 2–6 слов).
5. **Липфлап по словам**, а не только по громкости.

## Подробные страницы и результаты тестов (2026-11-14)
Каждый репозиторий изучен целиком и проверен рендером 720×1280 30 fps на этой машине
(RTX 5050 Laptop, i7-13650HX). Подробности — на отдельных страницах.

| Страница | Что проверено | Скорость | Главный результат |
|---|---|---|---|
| [[skill-anidoodle]] | Шахта, 5 ламп, прожектор, пыль, 2D-шахтёр billboard, `pushIn`+handheld, пословные титры | 37 мс/кадр GPU (2.6 с CPU) | Лучшая композиция и камера-кит; `gate` 15/15; запрет GLTF/сети и правило «титр ≥0.7 с» мешают нашему стилю |
| [[skill-javascript-webgl-animation]] | Шахта с шейдерами камня/дерева, bloom, god-ray, 4000 пылинок, удар самородка (900 частиц), DOF, трекинг | ~10 с на 4 с ролика | Лучшая атмосфера и VFX, самый быстрый и простой конвейер |
| [[skill-huashu-art-motion]] | Шахта three.js + `TOON.bean`-шахтёр, рот по огибающей голоса, `qa.py`, `film_gate` | 0.09 с/кадр GPU | Мимика/позы `toon.js`, разбор референса, QA; нужен флаг `--use-angle=d3d11` |
| [[skill-clawd-animation]] | Наш богач на Canvas2D: 6 эмоций, 9 ртов, смех со squash, PNG с альфой | 20–50 мс/кадр | Ближе всех к эталону (~75 %); модуль `stick.js` — основа персонажей |
| [[skill-handdraw-and-drawing]] | HandDraw-рендер; edge-tts с таймкодами слов; ASS-титры; головы палочников `cartoon.py` | 12.7 с на 5 с | Бесплатный черновой голос 225–234 сл/мин + рецепт пословных титров |
| [[skill-motion-manim]] | Manim 3D-балки + палочник; шпаргалка тайминга | ~4× реального времени | Только тайминг-шпаргалка; Manim и motion-skill в стек не идут |

## Решение по стеку
Свой лёгкий движок из лучших частей, а не один скилл целиком:

| Слой | Берём | Откуда |
|---|---|---|
| Рендер | Одна HTML-страница, three.js через esbuild, чистая `draw(frame)`, Playwright + GPU (ANGLE/D3D11) → ffmpeg | javascript-animation `render.mjs` |
| 3D-окружение, атмосфера, VFX | Шейдеры камня/дерева, bloom, god-ray, пыль, удар/искры/взрыв, DOF | webgl-animation-skills (рецепты), тест `anim-tests/jsanim/mine` |
| Камера | `pushIn`, `dolly`+`path`, `orbit`, `crane`, `whipPan`, `handheld`, `matchCut` | anidoodle `three-core/camera.ts` (Apache-2.0) |
| Персонажи | Canvas2D-модуль на каждого героя → `CanvasTexture` на плоскости в 3D + тень силуэта на полу | `stick.js` (по образцу clawd `EMO`) + тайминги `toon.js` |
| Голос (черновой) | edge-tts GuyNeural/ChristopherNeural +35 %, таймкоды слов | HandDraw `.venv` |
| Субтитры | ASS 1–2 слова, Montserrat ExtraBold, центр (360, 900) | рецепт `anim-tests/handdraw/tts` |
| QA и сравнение | `breakdown.py`, `qa.py`, `film_gate.py`; метрики [[reproduction-pipeline]] | huashu |
| Тайминг | Шпаргалка кадров/easing | [[skill-motion-manim]] |
| 3D-модели | Процедурка в three.js; позже GLTF из Blender (при необходимости) | — |

Почему не anidoodle целиком: его контракт запрещает внешние файлы (GLTF-модели), а `framecheck`
валит пословные титры. Его камеру и идеи QA переносим в свой движок.

## Установка (сделано 2026-11-14)
Все 9 репозиториев установлены как скиллы в `~/.claude/skills/` (12 скиллов: у manim 3, у
javascript-animation 2). Клоны-исходники — `C:\dev	oolsnim-skills\`.

| Скилл (вызов) | Папка | Зависимости | Готов |
|---|---|---|---|
| `motion` | motion | MCP nanobanana (ключ Gemini) + Higgsfield MCP | нет ключа Gemini, Higgsfield не авторизован |
| `huashu-art-motion` | huashu-art-motion | uv, Playwright Chromium | да, `breakdown.py` проверен на V001 |
| `anidoodle` | anidoodle | Node 24, ffmpeg; npm/Chromium ставятся при первом рендере | да |
| `clawd-animation` | clawd-animation | своя обёртка SKILL.md; `npm install` в рабочей копии | да |
| `javascript-animation`, `soundtrack` | javascript-animation, soundtrack | playwright-core, Chrome | да |
| `motion-design` | motion-design | нет | да |
| `handdraw-skill` | handdraw-skill | npm build, edge-tts в `.venv` | да, через `packages/cli/dist/index.js` |
| `manim-composer`, `manimce-best-practices`, `manimgl-best-practices` | manim-* | `pip install manim` (v0.22.1) | да, без LaTeX (формулы MathTex не будут) |
| `claude-drawing` (claude绘图) | claude-drawing | numpy, Pillow | да |

Нюансы Windows: HandDraw ищет Python в `.venv/bin`; переменная `HANDDRAW_PYTHON` НЕ помогает (`scripts/handdraw.mjs` подменяет её на `python3`) — запускать `node packages/cli/dist/index.js render ...`. Подробно — [[skill-handdraw-and-drawing]].
Риск подборки: 12 скиллов одновременно могут путать автовыбор — вызывать по имени.

## Sources
- `raw/research/2026-11-14-animatsiya-skills-links.md`
- Клоны репозиториев: `C:\dev\tools\anim-skills\` (вне git)
