# L001 — звук (сборка кодом)

Правила и рецепты — `wiki/craft/sound-design-longform.md`. Здесь — как это устроено и как пересобрать.

## Конвейер

```
animatic/timing.json + words.json + conf.js ─┐
film/shots.js (SKIP_PROPS)                   ├─ node sound/cues.mjs ─> cues.json (+ CUES.md)  монтажный лист: каждое событие
sound/cues_manual.mjs (герои, 3D)            ┘                                                   картинки = звук в своём кадре
                                                                                                 + подложки по местам + метки музыки
cues.json + palette (render.py, synth.py, palette_rec.json) + music_plan.json + out/voice_fish_en.mp3
        └─ python sound/render.py ─> out/<name>/{voice,music,sfx,amb,mix}.wav + report.json  (+ <видео>_sound.mp4)
film/out/<name>.mp4 ─ python sound/vis.py ─> out/vis_<name>.json (покадровые признаки картинки)
        └─ python sound/check.py ─> out/<name>/CHECK.md + check.json (громкость, тишина, попадание ±1 кадр, разборчивость)
```

| файл | что делает |
|---|---|
| `cues.mjs` | Монтажный лист. Те же правила, что рисуют картинку в `animatic/core.js`: склейки и переходы `TRANS`, грамматика камеры (рывок на ударном слове, вип-пан, проезд, толчок), события «на «слово»» и слоты событий, вещи-подписи (штамп / маркер / бирка), вспышки, шаблоны (карточка, титр главы, документ, карта, доска, цифра), подписи, название ролика; фоли по словам события (таблица `FOLEY`); подложка по месту действия (`bedOf`). Секунд в коде нет. |
| `cues_manual.mjs` | Звук планов с настоящими героями и нативных 3D-сцен: время по формулам `film/shots.js` (ящики на словах, «дзынь» после реплики Алисы, швабра…) и по картинке 3D (звонок телефона очередями). План ищется по главе + месту + крупности, а не по номеру. |
| `synth.py` | Процедурные звуки (свисты, райзеры, удары, стинги, клики, пишмашинка, маркер, бумага, телефонный звонок, гул) — 100+ классов, детерминированно по seed. `--demo out/synth_demo` — по одному каждого. |
| `render.py` | Сведение: голос на шкале фильма (паузы `timing.inserts`), звуки по меткам (атака/пик/конец звука — на кадр события), реверберация места только у звуков мира, подложки со сменой на склейке, музыка с сайдчейном и вырезом 1–4 кГц под речью, мастер −14 LUFS / ≤ −1 dBTP, стемы. |
| `vis.py` | Признаки картинки по кадрам: разница кадров, яркость, доля красного, зум. |
| `check.py` | Самопроверка (см. ниже). `--stt-only` — распознавание речи (системный питон с faster-whisper). |
| `music_plan.py` | Монтаж музыки по тактам: `music_spec.json` (что звучит где; точки — главы, конец последнего слова главы, название ролика; «hit» — сильная доля источника на кадр) → `music_plan.json`. |
| `ru_fit.py` | Влезает ли русский голос в картинку по английскому таймингу: таблица строк `out/<name>/RU_FIT.md`; если влезает — голос на шкале фильма для `render.py --voice-wav … --suffix _sound_ru`. |
| `tools/audition.py` | Машинное прослушивание кандидатов каждого класса (синтез / банк earshot / составные слои / записи CC0) → `lib/audition.json`. |
| `tools/layers.py` | Составные звуки из слоёв (атака + тело + хвост): стинги, штамп, затвор → `lib/cand/<класс>/layer_*.wav`. |
| `tools/pick_palette.py` | Выбор лучшего кандидата класса по прослушиванию (+ ручные решения `palette_manual.json`) → `palette_rec.json`. |
| `lib/` | Библиотека: `_dl/` — скачанные архивы (не в git), `rec/` — выбранные записи (wav не в git), `cand/` — кандидаты прослушивания, `ledger.json` — учёт лицензий. Лицензии — `LICENSES.md`. |
| `music/` | Кандидаты музыки, анализ, `MUSIC.md`, `SUNO_BRIEF.md`. План музыки фильма — `music_plan.json`. |
| `competitor/` | Замеры звука конкурента (`COMPETITOR_AUDIO.md`, `competitor_audio.json`, `sfx_density.py`). |

## Команды (из `production/L001`)

```
node sound/cues.mjs --ch 0,1          # --cut-all — звук и на склейках внутри одной сцены (по умолчанию они немые)
C:/dev/tools/sound-venv/Scripts/python.exe sound/music_plan.py
C:/dev/tools/sound-venv/Scripts/python.exe sound/render.py --name ch0_1 --frames film/out/ch0_1.frames.json --video film/out/ch0_1.mp4
C:/dev/tools/sound-venv/Scripts/python.exe sound/vis.py film/out/ch0_1.mp4 sound/out/vis_ch0_1.json
python sound/check.py --name ch0_1 --stt-only --whisper medium.en        # системный питон (faster-whisper)
C:/dev/tools/sound-venv/Scripts/python.exe sound/check.py --name ch0_1 --vis sound/out/vis_ch0_1.json
```
Весь фильм: `render.py --name full` без `--frames` (шкала 0…timing.total), видео — финальный монтаж; музыка на все главы —
`music/music_spec_full.json` (скопировать в `music_spec.json`, затем `music_plan.py`).

Варианты и добавки:
```
... sound/render.py --name ch0_1_lean --lean --frames … --video … --suffix _sound_lean    # «скромный»: без мелкой жизни кадра
... sound/ru_fit.py --frames film/out/ch0_1.frames.json                                    # влезает ли русский голос (RU_FIT.md)
... sound/render.py --name ch0_1_ru --voice-wav sound/out/ch0_1/voice_ru_film.wav --suffix _sound_ru …   # если влезает
... sound/tools/build_lib.py            # lib/picks.json -> lib/rec + ledger.json + LICENSES.md (python -I)
... sound/tools/ledger_palette.py       # записи -> palette_manual.json;  затем tools/pick_palette.py -> palette_rec.json
C:/dev/tools/earshot/.venv/Scripts/python.exe sound/tools/audition.py --classes stamp,shutter   # прослушивание кандидатов
```

Питон для звука — `C:\dev\tools\sound-venv` (numpy, scipy, soundfile, pyloudnorm, pedalboard, librosa); прослушивание —
`C:\dev\tools\earshot\.venv`; разделение голоса (для замеров чужих роликов) — `C:\dev\tools\sep-venv` (demucs).

## Перетайминг и новые планы

Перетайминг голоса или вставка планов — просто перезапуск `cues.mjs` и `render.py`: всё считается из `timing.json`
и `words.json`. Новый план с героями — запись в `cues_manual.mjs` (по образцу; время — та же формула, что в `shots.js`).
Для глав 2–10, пока у них нет постановки, работают общие правила: события шотлиста + фоли по словам (`FOLEY`).

## Замена звука

- Запись вместо синтеза для класса: строка в `palette_rec.json` — `"класс": [{"path": "sound/lib/rec/…wav", "gain_db": 0}]`
  (несколько файлов — варианты по очереди). Лицензия файла — в `LICENSES.md` до использования.
- Уровень класса — `LEVEL` в `render.py` (дБ к уровню голоса); «главные» звуки (не приглушаются речью) — `FEATURED`.

## Фильм целиком и главы (с 2026-11-18)

**Плотность** (`render.py --density`): `mid` — по умолчанию, ≈ 50–60 звуков в минуту, только смысловые события (переходы,
рывки на ударных словах, вещи-доказательства, шаблоны, действия героев); `full` — весь лист (≈ 60–90 в минуту, в хуке выше);
`lean` — ≈ 45 в минуту. Подложка: full +3 дБ, mid 0, lean −2. Музыка под речью −20 дБ к голосу.

**Глава от картинки** — когда фильм-агент кладёт `film/out/chNN*.mp4` (+ `.frames.json`):
```
C:/dev/tools/sound-venv/Scripts/python.exe sound/do_chapter.py film/out/ch02.mp4 [--density mid] [--lang ru]
```
лист по текущему таймингу → музыка (`music_spec.json` → `out/music_plan.json`) → признаки картинки (`vis.py`) →
приблизительные звуки (слоты шотлиста) подгоняются к событиям картинки (`snap_cues.py`, отчёт `out/<имя>/cues_chapter.md`) →
микс и `film/out/chNN_sound.mp4` → проверки (`out/<имя>/CHECK.md`, Whisper) → строка в `CHAPTERS.md`.

**Фильм целиком** — главы рендерятся по очереди без мастера (общее усиление голоса на весь фильм), склейка встык,
одна громкость −14 LUFS и лимитер истинного пика по главам (память — одна глава за раз):
```
C:/dev/tools/sound-venv/Scripts/python.exe sound/master_full.py --lang en [--video film/out/full.mp4]
C:/dev/tools/sound-venv/Scripts/python.exe sound/master_full.py --lang ru [--video film/out/full_ru.mp4]
```
→ `out/full<_ru>/{mix,voice,music,sfx,amb}.wav`, `report.json`.

**Русская версия** идёт по своему таймингу: `animatic/timing_ru.json`, `words_ru.json` (те же планы и события, русское
время), голос `out/voice_fish_ru.mp3`; лист — `cues_ru.json` / `CUES_ru.md`; WER — Whisper medium по-русски.

**Музыка фильма** — `music_spec.json` (гл. 0–1 — пилот, гл. 2–10 — план `music/MUSIC.md`); попадания внутри глав привязаны
к фразам голоса (`text:<фраза>`), поэтому переживают перетайминг. Читаемый план — `MUSIC_PLAN.md`.
