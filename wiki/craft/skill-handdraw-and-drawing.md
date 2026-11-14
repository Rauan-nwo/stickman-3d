---
type: technique
status: evergreen
tags: [tools, claude-skills, handdraw, tts, captions, drawing]
created: 2026-11-14
updated: 2026-11-14
sources: [2026-11-14-animatsiya-skills-links.md]
---

# Скиллы «Рисованная доска» и «Рисунок кодом» — разбор и тесты

Разбор двух скиллов из [[anim-skills-catalog]] под задачу [[reproduction-pipeline]]: собрать ролик
в стиле [[style-bible]] кодом (3D-шахта + 2D-палочники billboard'ами, пословные субтитры, голос 228 wpm).
Оба репо изучены целиком и проверены руками 2026-11-14. Тестовые файлы — в `C:\dev\tools\anim-tests\`.

**Итог в одну строку:** как движки ролика оба не подходят. Из «Рисованной доски» забираем
**бесплатный черновой голос edge-tts с пословными таймкодами** → пословные субтитры ASS (рецепт ниже,
проверен). Из «Рисунка кодом» — **`lib/cartoon.py` как генератор лиц/ртов палочников в PNG с альфой**
(0.2 с на спрайт) и рецепты «плёнки» из `soft3d.py`.

---

## 1. Рисованная доска — `HandDraw-Skill` (ToBeWin)

### Установка и запуск
- Исходник: `C:\dev\tools\anim-skills\HandDraw-Skill`; установлен и собран в `~/.claude/skills/handdraw-skill`
  (Node 20+, FFmpeg, `.venv` с `edge-tts 7.3.1`).
- Пакеты: `core` (типы DSL, `validateProject`, `synchronizeNarration`), `renderer` (Remotion 4: bundle →
  `renderMedia` h264, один компонент `SceneView`), `audio` (edge-tts через `python -m edge_tts` + ffmpeg
  `adelay`/`amix`), `cli` (`validate` / `render`).
- **Баг Windows (важно):** обёртка `scripts/handdraw.mjs` и `scripts/check-environment.mjs` ищут
  `.venv/bin/python`, а на Windows он в `.venv/Scripts/python.exe`. Обёртка при этом **перезаписывает**
  `HANDDRAW_PYTHON` на `python3` — переменная окружения не помогает (проверено: падает с
  `Edge TTS synthesis failed`). Рабочий запуск — напрямую через `cli/dist`:

```bash
cd ~/.claude/skills/handdraw-skill
export HANDDRAW_PYTHON="$HOME/.claude/skills/handdraw-skill/.venv/Scripts/python.exe"
node packages/cli/dist/index.js validate <project.json>
node packages/cli/dist/index.js render <project.json> --output out.mp4 --assets <assets-dir>
```

- Первый рендер скачивает Chrome Headless Shell (~113 МБ) — один раз.

### Как пользоваться
JSON-DSL v1 (`references/dsl.md`): `project {width,height,fps,background,style}` → `scenes[]` (длительность
в секундах, до **8 объектов**, `camera {zoom,x,y}` — **статичная**, переход только `fade`) → объекты `svg`
(локальный path-SVG), `text`, `shape` (`card|pill|circle|line|bar`). Анимации: `draw` (обводка
stroke-dashoffset), `write` (посимвольное появление), `move`, `rotate`, `scale`, `fade`, `highlight` (жёлтое
свечение). `audio.narration[] {text,start,voice,rate}` → edge-tts. `syncWithNarration` подгоняет `write`
под длину реплики. Стиль `narrative-sketch` (9:16, бумага, кайши-шрифт) + `narrative-character-system.md`
(один персонаж = одни пропорции/палитра; слои фон / проп / поза / текст).

### Что даёт нашему стилю (оценка 0–5)
| Пункт стиля | Оценка | Комментарий |
|---|---|---|
| 3D-окружение, свет, объём, пыль, DOF | 0 | Только плоские SVG и CSS-плашки. Растр запрещён правилами скилла. |
| 2D-палочники | 2 | SVG-персонаж рисуется, но анимация — только сдвиг/масштаб/поворот целиком; нет смены ртов, суставов, сквоша. |
| Камера (53 смены за 61 с) | 1 | Камера сцены статична, только переход `fade`. Push-in можно имитировать `scale`. |
| Пословные субтитры | 1 | `write` — посимвольное «печатание» всей фразы, не 1–2 слова. Шрифт Kaiti/PingFang захардкожен. |
| Голос | 3 | edge-tts бесплатно, без ключа, англ. голоса есть; скорость `rate`. Но только по фразам, без таймкодов слов. |
| Музыка/SFX/−14 LUFS | 0 | Только голос через `amix`, без нормализации. |
| **edge-tts как отдельный инструмент** | **5** | Даёт пословные таймкоды (WordBoundary) — основа наших субтитров. См. раздел 3. |

### Результат теста
- Проект: `C:\dev\tools\anim-tests\handdraw\t1\project.json` — 720×1280, 30 fps, одна сцена 5 с:
  «стена шахты» (`card`), «лампа» (`circle` + `highlight`), палочник `assets/miner.svg` (`draw` + `move` +
  `scale`), текст `syncWithNarration`, реплика `en-US-GuyNeural`, `rate +25%`.
- `validate` — OK. Рендер: **22.2 с** холодный (со скачиванием Chrome), **12.7 с** тёплый на 5 с видео
  (≈2.5× реального времени; на 60 с ролик оценочно 1.5–2.5 мин).
- Выход: `t1/out.mp4` (h264 720×1280 30 fps + AAC, 5.00 с), контакт-лист `t1/contact.png`.
- Замечания: в `narrative-sketch` фон затирается белым градиентом поверх `background`; заливки SVG
  появляются сразу, `draw` анимирует только обводку; толщина линии принудительно 4.25 px; реплика длиннее
  сцены обрезается по длине проекта; текст — засечный кайши.

### Ограничения
- Жанр — whiteboard/эксплейнер; ≤8 объектов в сцене, нет 3D, нет растра, нет ключевых кадров камеры.
- Нет пословных субтитров, музыки, SFX, громкости.
- На Windows ломается обёртка (см. выше). Голос edge-tts требует сети, сервис неофициальный
  (может отвалиться/лимитировать).

### Вердикт
Как движок ролика — **нет**. Забираем только идею и обвязку edge-tts: черновой голос + пословные таймкоды
(свой скрипт `words.py`, обходит скилл целиком). Remotion-рендер у нас и так есть в других движках.

---

## 2. Рисунок кодом — `claude-drawing-skill` (cloveric, «claude绘图»)

### Установка и запуск
- Исходник: `C:\dev\tools\anim-skills\claude-drawing-skill`; зависимости только `numpy` + `Pillow`
  (стоят: numpy 2.4.6, Pillow 13.0.0). Шрифты — системные (CJK для подписей; `INKPAINT_FONT_*` переопределяет).
- Запуск примера: `python examples/<name>.py out.png [--stages DIR]` (`--gif` у части примеров).
- Состав: `SKILL.md` (83 стиля + правила выбора), `docs/STYLES.md` (что моделирует каждый стиль),
  `docs/PRINCIPLES.md` (типичные ошибки по стилям), `docs/USAGE.md`, ~84 модуля `lib/*.py`, по примеру на стиль.

### Как пользоваться
Каждый стиль — класс-холст, который «рисует» физически (бумага, тушь, краска, свет). Рисуешь сзади
вперёд вызовами API, `stage()` снимает промежуточные состояния для GIF «картинка рисуется», `save()`.
Детерминизм через `seed`. Модули, важные для нас:
- **`cartoon.py` (`Cartoon`)** — кадр рисованного мультфильма: кисть-тушь с нажимом, заливка со сдвигом от
  линии, cel-тени, блики, `face(mood=happy|wow|sleepy|smile|wink)`, `arm()` (rubber-hose с перчаткой),
  `sparkle`, `speed_lines`, `steam`, `puff`, `burst`, `crumbs`, надписи. «Кипение» линии (`boil`) — ретрейс
  туши между кадрами.
- **`soft3d.py` (`Soft3D`)** — настоящий маленький рейтрейсер на numpy: поле шаров (DDA), SDF-герои
  (`rbox`, `capsule`, `cylinder`, `torus`, надувной `text`), небо-купол с AO, `key`/`rim`/`softbox`,
  мягкие тени, дымка, тонкая линза DOF (`lens`), плёнка (`film`: tone curve, bloom, виньетка, зерно).
- **`isometric.py`** — изометрический рейтрейсер (G-buffer, PCF-тени, AO) — только ортокамера.
- **`lowpoly.py`** — софт-растеризатор «1999 года» (384×216, туман, 15-бит дизеринг) — нарочно ретро.
- **`storybook.py`** — единственная «настоящая» анимация: персонаж-жёлудь с `frame(t)`, сквош-стретч,
  актинг `act(t0,t1,fn)`, мир дорисовывается за персонажем.

### Что даёт нашему стилю (оценка 0–5)
| Пункт стиля | Оценка | Комментарий |
|---|---|---|
| 3D-окружение шахты | 1 | `soft3d` умеет примитивы, свет, AO, DOF, дымку — но CPU-рейтрейс на numpy, минуты на кадр (см. тест), нет точечных ламп, объёмных лучей и текстур камня/дерева. Для 1800 кадров — нет. |
| «Плёнка»: bloom, DOF-слои, тон-кривая, зерно, дымка | 3 | Хорошо описанные алгоритмы — как ТЗ для шейдеров/постпроцесса three.js. |
| Лица палочников (рты/глаза) | **4** | `face()` + свои рты через `line/fill/outline` → PNG с альфой. 0.2 с на спрайт 360 px. Стиль линии — кисть с нажимом, близко к эталону. |
| Тело палочника (руки-палки, rubber hose) | 3 | `arm()` даёт резиновую руку с перчаткой; ноги/тело — свои `line`/`shape`. |
| VFX (пыль, искры, взрыв, блики) | 3 | `puff`, `burst`, `sparkle`, `speed_lines` — 2D-спрайты для вставки в 3D. |
| Анимация | 1 | Только «кипение» и снимки этапов; нет скелета/твинов (кроме жёлудя в `storybook`). В эталоне линия **не кипит** → `boil=0`. |
| Видео/звук/субтитры | 0 | Нет. |

### Результат теста
Выходы — `C:\dev\tools\anim-tests\drawing\`:
- `examples/cartoon_toaster.py` → `cartoon_toaster.png` (1920×1080) — **36.3 с**. Качество высокое:
  тушь с нажимом, cel-тени, лица с языком.
- `examples/soft3d_rise.py` → `soft3d_rise.png` (1920×1080) — **240 с на один кадр** (рейтрейс на CPU).
  Картинка «студийная» (конфетный 3D, AO, DOF, bloom), но 1800 кадров ролика = ~120 ч → для видео непригодно.
- Для сравнения 3D-модулей: `isometric_weather_island.py` — 21 с/кадр (только ортокамера);
  `lowpoly_canyon.py` — 0.7 с/кадр (быстро, но намеренно пиксельный 1999-й). Сводка: `trio.jpg`.
- Тест лица палочника: `stick_head.py` → `head/head_<mood>.png` (RGBA-спрайты), `head/*_paper.png`
  (на бумаге), контакт-лист `head/contact_heads.png`. Круглая белая голова + толстый контур + 7 лиц:
  5 встроенных (`happy` с языком, `wow` = «O», `sleepy`, `smile`, `wink`) и 2 своих (`teeth` — оскал
  «решёткой», `flat` — прямая черта + злые брови). **0.15–0.25 с на спрайт**, 4 кадра «кипения» 0.14 с.
- Альфа берётся из внутренних буферов `paint`/`ink` (`rgba()` в `stick_head.py`), библиотеку не правили.
- Замечания: белая заливка слегка кремовая (зерно бумаги просвечивает) — для чисто-белой головы
  закрашивать поверх в шейдере/`Pillow`; набор настроений не покрывает эталон (нет оскала, смеха с
  закрытыми глазами-дугами + раскрытым ртом есть только как `happy`), остальное дорисовывается своим кодом.

### Ограничения
- Только статичные картинки (PNG/GIF процесса рисования); нет таймлайна, камеры, звука.
- Тяжёлые модули медленные (numpy на CPU), 3D — нечестный для видео по времени.
- Подписи/надписи заточены под CJK-шрифты.

### Вердикт
Как движок — **нет**. Как библиотека 2D-ассетов — **да, частично**: генерировать набор ртов/глаз/бровей
и VFX-спрайтов палочников (`cartoon.py`, `boil=0`, `rough=False`) в PNG с альфой → текстуры billboard'ов
в three.js-сцене. `soft3d.py` — читать как рецепт постпроцесса (DOF-слои, bloom, тон-кривая, дымка),
а не рендерить им.

---

## 3. Пословные субтитры и черновой голос через edge-tts

Проверено 2026-11-14. Скрипты: `C:\dev\tools\anim-tests\handdraw\tts\` (`words.py`, `make_ass.py`),
шрифт Montserrat ExtraBold уже установлен в Windows.

**Факт:** CLI `edge-tts --write-subtitles` в версии 7.x пишет SRT **по предложениям** (SentenceBoundary) —
для пословных субтитров не годится. Пословные таймкоды даёт только Python-API:
`edge_tts.Communicate(text, voice, rate=..., boundary="WordBoundary")` — события `WordBoundary` с
`offset`/`duration` в тиках 100 нс. Пунктуация в событиях отбрасывается.

### Шаг 1. Голос + таймкоды слов
```bash
PY="$HOME/.claude/skills/handdraw-skill/.venv/Scripts/python.exe"   # venv с edge-tts 7.3.1
cd /c/dev/tools/anim-tests/handdraw/tts
$PY words.py "So he loaded his shotgun with gold dust. Why would anyone shoot gold into a rock? It's called salting." api en-US-GuyNeural +35%
# -> api.mp3 + api.words.json: [{"word":"So","start":0.09,"end":0.26}, ...]
```
`words.py` делает 4 повтора при `NoAudioReceived` (сервис иногда отвечает пусто).

**Темп под эталон 228 wpm** (замер: слов / (конец последнего − начало первого), текст 46 слов):
| Голос | rate | wpm |
|---|---|---|
| en-US-GuyNeural | +25% | 217 |
| en-US-GuyNeural | **+35%** | **234** |
| en-US-GuyNeural | +45% | 251 |
| en-US-ChristopherNeural | +35% | 225 |
| en-US-RogerNeural | +35% | 218 |
| en-US-BrianNeural | +35% | 252 |

Рабочий выбор для черновика: **GuyNeural +30…+35%** или **ChristopherNeural +35%**.
`en-US-AndrewNeural` с `rate ≠ 0` стабильно отвечает `NoAudioReceived` — не использовать с ускорением.

### Шаг 2. ASS по 1–2 слова
```bash
$PY make_ass.py api.words.json api.ass 900 92      # y-центр 900 из 1280, размер шрифта 92
```
Правила группировки в `make_ass.py`: максимум 2 слова и 12 символов; слово длиннее 5 букв идёт одно;
разрыв на паузе > 0.25 с; плашка держится до начала следующей (без мигания), но не дольше +0.6 с после слова.
Стиль: `Montserrat ExtraBold`, белый, чёрная обводка 4, мягкая тень 3 (полупрозрачная),
`\an5\pos(360,900)`, `PlayRes 720×1280`. Замер на кадре: высота строки без выносных 48 px, центр y≈903 —
совпадает со спецификацией (~45 px заглавные, y≈900).

### Шаг 3. Прожиг на видео
```bash
mkdir -p fonts && cp /c/Windows/Fonts/Montserrat-ExtraBold.ttf fonts/   # путь C:/... ломает фильтр в Git Bash
ffmpeg -y -i video.mp4 -i api.mp3 -map 0:v -map 1:a -shortest \
  -vf "ass=api.ass:fontsdir=fonts" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k captioned.mp4
```
Прожиг 6.7 с клипа — 0.5 с. Результат: `tts\captioned.mp4`, контакт-лист `tts\contact_captions.png`,
полный кадр `tts\frame_full.png`.

### Шаг 4. Громкость −14 LUFS
```bash
ffmpeg -i captioned.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=7" -c:a aac -b:a 192k out.mp4
```
Однопроходный `loudnorm` на 7-секундном клипе дал −15.2 LUFS — для финала использовать двухпроходный
режим (`print_format=json` → `measured_*`) после сведения голоса с музыкой и SFX.

### Где это встаёт в пайплайн
`words.json` — единый таймлайн: те же таймкоды кормят субтитры, «слово = кадр» (склейки на
существительных) и липфлап ртов палочников (рот открыт на интервалах слов). Чистовой голос
(ElevenLabs и т. п.) потом выравнивается тем же форматом через whisper word-timestamps.

## Sources
- `raw/research/2026-11-14-animatsiya-skills-links.md`
