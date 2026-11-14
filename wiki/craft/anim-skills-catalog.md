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

**Главный вывод.** 8 из 9 рисуют кадры **кодом** (canvas, SVG, Python, Manim) и прямо запрещают
ИИ-картинки или фотореал. Наш стиль — 2D-персонажи в объёмном 3D-мире — так не получить.
Визуал делается связкой «ИИ-кадр → image-to-video», которая уже есть в наших локальных скиллах
(`seedance-studio`, `character-sheet`, `gpt-image`, `higgsfield-studio`). Из подборки берём
**методики**: разбор референса, шотлист, правила камеры, QA готового MP4.

## Сводная таблица
| Наше название | Репозиторий | Оценка | Что берём в пайплайн |
|---|---|---|---|
| **ИИ-клип по картинке** | LunaAI519/motion-skill | 4 | Схема «ключевой кадр Nano Banana → Kling/Seedance через Higgsfield», 9:16 по умолчанию. Как референс конвейера, не ставить |
| **Разбор референса** | alchaincyf/huashu-art-motion | 2.5 | `breakdown.py` (склейки, BPM, карта движения), шотлист + `storyboard_lint`, правила камеры, `film_gate`/`qa` против «слайдшоу», `compare.py` бок о бок |
| **Дудл-студия** | alexgreensh/anidoodle | 2 | Тайминг по словам (whisper), проверка safe-зон 9:16, `camera.md`, `motion-grammar.md` |
| **Мульт-персонаж кистью** | JohnHeibel/ClaudeAnimationBase | 1.5 | `ANIMATION_GUIDE.md`: тайминг эмоций, «в каждой сцене что-то происходит» |
| **Мульт на canvas** | iart-ai/javascript-animation-skills | 1.5 | `sync-check.mjs` — проверка склеек под музыку на любом MP4 |
| **Принципы моушна** | LottieFiles/motion-design-skill | 1 | Easing и тайминг вставок/надписей (например «10 FT») |
| **Рисованная доска** | ToBeWin/HandDraw-Skill | 1 | Идея синхронизации текста с TTS |
| **Математическая анимация** | adithya-s-k/manim_skill | 0.5 | Только инфографика-вставка, если понадобится |
| **Рисунок кодом** | cloveric/claude-drawing-skill | 0.5 | Статичные иллюстрации, к стилю не подходит |

## Карточки

### ИИ-клип по картинке — `motion-skill` (`/motion`)
- **Что даёт:** 5–10 с клип: референс/текст → кадр в Nano Banana (Gemini) → image-to-video
  Kling 3.0 turbo или Seedance 2.0 через Higgsfield MCP → апскейл. 9:16 по умолчанию.
- **Установка:** `git clone https://github.com/LunaAI519/motion-skill ~/.claude/skills/motion`.
  Нужны MCP nanobanana (платный ключ Gemini) и Higgsfield (кредиты: Kling ~7.5/клип, Seedance ×3, тариф Pro+).
- **Шаги:** кадр (`aspect_ratio 9:16`, референсы) → подтверждение → `media_upload` →
  `generate_video` (`start_image`, опц. `end_image`, сначала `get_cost`) → `upscale_video`.
- **Минусы:** пресет «ретро-газетный коллаж» надо заменить на наш; нет голоса, субтитров, монтажа;
  один клип за раз; документация китайская.
- **Вердикт:** единственный подходящий по технологии. Но наш `seedance-studio` покрывает то же
  глубже — берём как сверку, не устанавливаем. Лицензия MIT.

### Разбор референса — `huashu-art-motion`
- **Что даёт:** 36 художественных стилей и 9 «грамматик» эксплейнеров кодом (Kurzgesagt, Vox,
  whiteboard, 3b1b…), вертикаль 1080×1920, safe-зона под субтитры, QA-гейты.
- **Установка:** `npx skills add alchaincyf/huashu-art-motion`; нужны uv, ffmpeg, Playwright Chromium.
  Голос — китайский Volcengine TTS или свой WAV.
- **Разбор референса** (`references/01-拆解.md`, `scripts/analyze/breakdown.py`):
  ffprobe → контактный лист 4 fps + коллаж ключевых кадров + спектрограмма → поиск склеек
  по разнице кадров → подгонка BPM-сетки → контактные листы переходов → тепловая карта движения
  → `分镜表.md` + `spec.json`. Запуск: `uv run scripts/analyze/breakdown.py --video ref.mp4 --out out/`.
  Сравнение копии с оригиналом: `side_by_side.py`, `compare.py`.
- **Правила камеры** (`镜头语言.md`): камера — пунктуация; медленный push-in на переходы,
  быстрый — только акцент; после push-in нужен откат; один приём во всех шотах = «PPT».
- **Персонажи** (`references/10-角色.md`): людей кодом не рисовать — только ИИ-спрайты на
  зелёном фоне + композитинг. Совпадает с нашим подходом.
- **Вердикт:** лучший источник методики. Брать `breakdown.py`, `compare.py`, `film_gate.py`.
  Лицензия MIT (кроме образа автора, шрифтов, `strokes.js`).

### Дудл-студия — `anidoodle`
- **Что даёт:** картинки, фильмы, эксплейнеры в 32 рисованных стилях, музыка кодом, вертикаль
  `--format 9x16`, озвучка (Kokoro бесплатно / ElevenLabs / OpenAI / Gemini), тайминг по словам
  через whisper.cpp, прожиг субтитров, `framecheck.mjs` (текст вне зон интерфейса Shorts).
- **Установка:** плагин Claude Code (`.claude-plugin/`), Node 20+, ffmpeg, Playwright.
- **Минусы:** принцип «no generated image assets» — наши ИИ-клипы не принимает без доработки;
  субтитры фразовые, не пословные; тяжёлый.
- **Вердикт:** знания (`camera.md`, `motion-grammar.md`, `storytelling.md`) и идея проверки safe-зон.
  Лицензия Apache-2.0.

### Мульт-персонаж кистью — `ClaudeAnimationBase`
- **Что даёт:** акварельная 2D-анимация p5.brush, персонаж Clawd с 31 эмоцией, MP4.
  Холст 1920×1080 жёстко (`src/core.js`), вертикаль — правкой кода.
- **Установка:** `npm install` → `node render.mjs --clip --out=out/video.mp4`.
- **Минусы:** правила запрещают текст и 3D; нет голоса и липсинка.
- **Вердикт:** `ANIMATION_GUIDE.md` как справочник мимики и тайминга эмоций для промптов. MIT.

### Мульт на canvas — `javascript-animation-skills`
- **Что даёт:** фильм, где каждый кадр рисуется кодом в одном HTML, + синтезированная музыка,
  склейки на сильную долю, MP4 через headless Chrome. Любой размер, 720×1280 подходит.
- **Установка:** `npx skills add iart-ai/javascript-animation-skills`; Node 18+, playwright-core, ffmpeg.
- **Минусы:** запрещены внешние ассеты (нельзя ИИ-фон), звук — только синтез, без голоса.
- **Вердикт:** `soundtrack/scripts/sync-check.mjs` для проверки синхрона склеек и музыки. MIT.

### Принципы моушна — `motion-design-skill`
- **Что даёт:** только документация: таблицы длительностей и easing, 12 принципов Диснея для UI,
  эмоция → движение, хореография элементов. Без рендера.
- **Установка:** `npx skills add LottieFiles/motion-design-skill`.
- **Вердикт:** для анимации надписей и вставок. На монтаж ролика ложится слабо. MIT.

### Рисованная доска — `HandDraw-Skill`
- **Что даёт:** whiteboard-видео (рука рисует SVG), JSON-DSL → Remotion → MP4, Edge TTS бесплатно.
- **Установка:** `npm install && npm run build`, `node scripts/handdraw.mjs render project.json --output out.mp4`.
- **Минусы:** только векторные линии, растр и text-to-video запрещены.
- **Вердикт:** не наш стиль. MIT.

### Математическая анимация — `manim_skill`
- **Что даёт:** правила Manim (Community и 3b1b-версия), планировщик сцен в стиле 3Blue1Brown.
- **Установка:** `npx skills add adithya-s-k/manim_skill`, Python, LaTeX, `pip install manim`.
- **Вердикт:** только графики/формулы. ManimGL-часть — CC BY-NC-SA (некоммерческая), остальное MIT.

### Рисунок кодом — `claude-drawing-skill`
- **Что даёт:** PNG-иллюстрации в 83 стилях на Python + GIF процесса рисования. Видео нет.
- **Вердикт:** к стилю канала не подходит. MIT.

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
| `handdraw-skill` | handdraw-skill | npm build, edge-tts в `.venv`, env `HANDDRAW_PYTHON` | да |
| `manim-composer`, `manimce-best-practices`, `manimgl-best-practices` | manim-* | `pip install manim` (v0.22.1) | да, без LaTeX (формулы MathTex не будут) |
| `claude-drawing` (claude绘图) | claude-drawing | numpy, Pillow | да |

Нюансы Windows: HandDraw ищет Python в `.venv/bin` — исправлено переменной `HANDDRAW_PYTHON`.
Риск подборки: 12 скиллов одновременно могут путать автовыбор — вызывать по имени.

## Sources
- `raw/research/2026-11-14-animatsiya-skills-links.md`
- Клоны репозиториев: `C:\dev\tools\anim-skills\` (вне git)
