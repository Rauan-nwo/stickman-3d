# L001 — передача работы в новую сессию (2026-11-19 15:40)

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

## Состояние на 19.11 15:40 — EN-версия собрана
**Готовый EN-ролик: `film/out/full_sound.mp4`** (17:51, 1071.27 с, 32 138 кадров; −14.0 LUFS, −1.3 dBTP, LRA 2.1; сдвиг звука к главам 3.4 мс
в начале и в конце; тишины > 1 с нет). Картинка без звука — `film/out/full.mp4`, стемы — `sound/out/full/`.
- Главы перерендерены с правками: ch0_1 11:23, ch2_3 15:08, ch4_6 13:45, ch7_8 13:55, ch9_10 14:58; звук на каждой главе — на текущей картинке
  (`chNN_sound.mp4`, фон без голоса чист).
- Склейка: `python -I film/tools/assemble_full.py` — между главами final.mjs теряет 1–3 кадра (всего 10), они закрыты повтором
  последнего кадра главы, иначе звук мастера (непрерывная шкала) уехал бы на 0.33 с к концу. Потом
  `sound/master_full.py --lang en --video film/out/full.mp4`.
- ch2_3: ворота мерцания 10/9 — известный сценарный переход #67→#68 (QA_ch2-3.md), не регрессия.
- Проверка замечаний Рауана и выборка 32 кадров — `film/QA.md`, раздел «Проверка замечаний Рауана от 19.11».
- `sound/tools/chapter_runner.sh` не берёт главу, если есть старый `final_<c>_log.txt` с «готово» (берёт его вместо свежего
  `<c>_flicker.txt`) — сводить вручную: `sound/do_chapter.py film/out/<c>.mp4 --density mid`.

## Что осталось до готового ролика
1. Рауан смотрит EN (`film/out/full_sound.mp4`) и даёт правки.
2. Русская версия: **в final.mjs режима RU нет** (timing.json зашит; сборка entries тоже на EN-тайминге). Нужно: флаг тайминга/голоса
   в final.mjs и сборке, перерендер всех глав (~45 мин), `master_full.py --lang ru`. Открытый вопрос Рауану — переводить ли текст
   на экране (карточки-фразы рассказчика, плашки, документы) или оставить английским.
3. Энергия против конкурента: перемерить готовый фильм `dynamics/tools/film_energy.py` (гл. 1 и 10).
4. Описание: блок атрибуции музыки CC BY (`sound/music/MUSIC.md`).
5. Мелочи на решение Рауана (QA.md): #44 оба листка «SUN», #221 CUSTOMS шире жилета, #55 подписи основателей без выноски.

## Уроки процесса
- Агенты с контекстом > ~500 тыс. токенов зависают (watchdog 600 с) — давать новым агентам короткое задание + ссылку на этот файл.
- Лимит использования срабатывает каждые несколько часов — держать не больше 2–3 агентов.
- Зависшие рендеры: проверять, растут ли куски `film/out/tmp/*_final_*.mp4`; дубликаты процессов ломают куски.
