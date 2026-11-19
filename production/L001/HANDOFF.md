# L001 — передача работы в новую сессию (2026-11-19 18:00)

Ролик: «How China Got a Seat at Jensen Huang's Table», стиль «Стикман Нуар», ~17:51 EN / ~20:39 RU.
Конкурент и цели — `compare_scenes.md`, `shot_for_shot.md`, `dynamics_compare.md`, решения Рауана — `decisions_for_owner.md`.
Правила стиля — `wiki/craft/stickman-noir.md` (разделы 4–8, много правил добавлено по замечаниям Рауана), звук —
`wiki/craft/sound-design-longform.md`. Память Claude: `longform-competitor-basis`, `longform-voice-fish`, `verify-before-reporting`.

## Где что
| Что | Где |
|---|---|
| Сценарий (утверждён, A1–A9 + B1–B28 + факт-правки) | `script.md`, RU — `script_full_ru.md`, `narration*.txt` |
| Раскадровка (352 плана, события, камера, удары `+ удары ×N`) | `shotlist.md` |
| Голос Fish (EN/RU, режиссура, каст) | `voice_fish/` (README), `out/voice_fish_en.mp3`, `out/voice_fish_ru.mp3`, `out/lines_fish*.json` |
| Тайминги (без пауз внутри фраз; проверка в сборке) | `animatic/make_timing.mjs` → `animatic/timing.json`, `timing_ru.json` |
| Аниматик (заглушки героев, общий код кадра) | `animatic/core.js`, `animatic/render_all.mjs`, `animatic/out/` |
| Финальный фильм с героями | `film/` (README — архитектура и команды), постановка `film/shots/chNN.js` (ключ = глава + текст плана), 3D-клипы `film/clips3d/`, рендер `film/final.mjs` |
| QA по главам (таблицы вердиктов по каждому плану) | `film/QA.md`, `film/QA_ch2-3.md`, `QA_ch4-6.md`, `QA_ch7-10.md` |
| 3D-сцены | `scenes/{city,desk3d,kitchen,conveyor,dc_inspection,hq_corridor,box_path_v2,dialogue_probe}` |
| Звук (разметка, библиотека CC0, музыка CC BY, сведение) | `sound/` (README, CHAPTERS.md, LICENSES.md, music/MUSIC.md) |
| Энергия против конкурента | `dynamics/tools/` (`film_energy.py`, `energy_ch.py`, `plot.py`), `out/dynamics_curve.png` |

## Состояние на 19.11 18:00 — EN собран, второй раунд правок Рауана внесён
**Готовый EN-ролик: `film/out/full_sound.mp4`** (20:37 — смех Дженсена его голосом (Fish), +30 звуков в «немых» планах, громкость смеха/ручки/стука; ранее 18:00; 17:51, −14.0 LUFS, −1.3 dBTP; сдвиг звука к главам 3.4 мс; тишины > 1 с нет).
Второй раунд (после просмотра 15:35): лицо Алисы (тень, `shadeCutY` в движке), 5 голосов не по рисунку + толпа «GPU»
(`voice_fish/recast.py`, шкала не сдвинута), проход по звуку (wiki `sound-design-longform` §9б: звук вещей в планах с героями,
смех героев, `sound/cues_extra.mjs`, тихие склейки, плотность 52–120/мин). Подробно — `film/QA.md`, «второй раунд».
- Главы: ch0_1 16:38, ch2_3 15:08, ch4_6 16:49, ch7_8 16:55, ch9_10 14:58; звук всех глав 17:03–17:55, фон без голоса чист
  (ch0_1: «Owl» от хвоста записи ящика + гитара — первый ящик #8 теперь `box.set`).
- Склейка: `python -I film/tools/assemble_full.py` (закрывает 10 кадров дыр между главами) → `sound/master_full.py --lang en --video film/out/full.mp4`.
- ch2_3: ворота мерцания 10/9 — сценарный переход #67→#68 (QA_ch2-3.md), не регрессия.
- `sound/tools/chapter_runner.sh` не берёт главу при старом `final_<c>_log.txt` — сводить вручную `sound/do_chapter.py film/out/<c>.mp4 --density mid`.
- Пробелы звука: `python -X utf8 sound/tools/sfx_gaps.py --cues` → таблица (остаток — ложные срабатывания по словам и тихие реакции).
- Следы ИИ в файле (проверено 19.11): метаданных ИИ/C2PA нет; есть только подписи ffmpeg/x264 (теги контейнера и SEI x264).
  Метка OpenAI C2PA есть в исходных `assets/bg_huang_hall.png`, `bg_oneida_gate.png` (в видео не переходит).

## Что осталось до готового ролика
1. Рауан смотрит EN (`film/out/full_sound.mp4`) и даёт правки.
2. Русская версия: проверить каст `voice_fish/cast_ru.json` на те же 5 ролей + толпу (сверка рисунок ↔ голос, как EN). **В final.mjs режима RU нет** (timing.json зашит; сборка entries тоже на EN-тайминге). Нужно: флаг тайминга/голоса
   в final.mjs и сборке, перерендер всех глав (~45 мин), `master_full.py --lang ru`. Открытый вопрос Рауану — переводить ли текст
   на экране (карточки-фразы рассказчика, плашки, документы) или оставить английским.
3. Энергия против конкурента: перемерить готовый фильм `dynamics/tools/film_energy.py` (гл. 1 и 10).
4. Описание: блок атрибуции музыки CC BY (`sound/music/MUSIC.md`).
5. Мелочи на решение Рауана (QA.md): #44 оба листка «SUN», #221 CUSTOMS шире жилета, #55 подписи основателей без выноски.

## Уроки процесса
- Агенты с контекстом > ~500 тыс. токенов зависают (watchdog 600 с) — давать новым агентам короткое задание + ссылку на этот файл.
- Лимит использования срабатывает каждые несколько часов — держать не больше 2–3 агентов.
- Зависшие рендеры: проверять, растут ли куски `film/out/tmp/*_final_*.mp4`; дубликаты процессов ломают куски.
