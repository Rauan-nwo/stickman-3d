# Log

## [2026-11-14 00:00] setup | архитектура LLM-wiki под YouTube-канал
touched: CLAUDE.md, index.md, log.md, wiki/channel/channel.md, wiki/_todo.md, templates/video.md, templates/donor.md, templates/hypothesis.md

## [2026-11-14 21:30] ingest | разбор эталона V001 и 9 анимационных скиллов (vitalyvlada.ru)
touched: wiki/videos/V001-how-mine-salting-worked.md, wiki/craft/style-bible.md, wiki/craft/anim-skills-catalog.md, wiki/analyses/reproduction-pipeline.md, wiki/channel/channel.md, wiki/_todo.md, index.md, raw/research/2026-11-14-animatsiya-skills-links.md, raw/research/2026-11-14-how-mine-salting-worked-transcript.json

## [2026-11-14 22:10] setup | установлены 9 анимационных скиллов (12 шт.), прогон breakdown.py по V001
touched: wiki/craft/anim-skills-catalog.md, wiki/craft/style-bible.md, wiki/videos/V001-how-mine-salting-worked.md, wiki/analyses/reproduction-pipeline.md

## [2026-11-14 22:50] ingest | пересмотр: стиль канала = 3D + 2D кодом; переоценка 9 скиллов, разбор анимации персонажей
touched: wiki/craft/anim-skills-catalog.md, wiki/craft/style-bible.md, wiki/analyses/reproduction-pipeline.md

## [2026-11-14 23:59] ingest | глубокое изучение 9 репо (+webgl-animation-skills) с тестовыми рендерами; решение по стеку
touched: wiki/craft/skill-anidoodle.md, wiki/craft/skill-javascript-webgl-animation.md, wiki/craft/skill-huashu-art-motion.md, wiki/craft/skill-clawd-animation.md, wiki/craft/skill-handdraw-and-drawing.md, wiki/craft/skill-motion-manim.md, wiki/craft/anim-skills-catalog.md, index.md

## [2026-11-15 00:40] video | тест 1: хук V001 кодом (three.js + 2D billboard), ~65 % сходства
touched: wiki/analyses/reproduction-pipeline.md

## [2026-11-15 02:10] lint | полная перепроверка: замеры V001, монтаж, установка скиллов, wiki, тест хука
touched: wiki/videos/V001-how-mine-salting-worked.md, wiki/craft/style-bible.md, wiki/analyses/reproduction-pipeline.md, wiki/craft/anim-skills-catalog.md

## [2026-11-15 00:30] video | тест 2: хук V001 кодом, ~60 % сходства (тест 1 — ~50–55 %)
touched: wiki/analyses/reproduction-pipeline.md

## [2026-11-15 01:40] setup | упаковка стиля «Стикман 3D»: сценарий, постановка, продакшн, шаблоны, скилл stickman-3d, память
touched: wiki/craft/stickman-3d.md, wiki/craft/script-craft.md, wiki/craft/staging-and-camera.md, wiki/craft/production-workflow.md, wiki/craft/style-bible.md, wiki/channel/channel.md, wiki/_todo.md, templates/script.md, templates/beatsheet.md, CLAUDE.md, index.md, .gitignore

## [2026-11-15 02:20] ingest | выгрузка канала @RicksClips3000: 151 ролик с просмотрами, тексты 30 новых роликов (разбор не сделан)
touched: raw/analytics/2026-11-15-channel-shorts.tsv, raw/research/2026-11-15-channel-transcripts.jsonl

## [2026-11-15 03:30] ingest | разбор канала: срез 151 ролика, формула по 18 роликам текущего формата
touched: wiki/analytics/report-2026-11.md, wiki/analyses/channel-formula.md, wiki/craft/script-craft.md, wiki/channel/channel.md, raw/analytics/2026-11-15-channel-top18-meta.tsv, index.md
## [2026-11-15 03:40] video | V002: идея, факт-чек, сценарий и черновой голос (status: scripting)
touched: wiki/videos/V002-why-soldiers-never-march-across-bridges.md, wiki/ideas/I001-break-step-on-bridges.md, wiki/ideas/I002-lightning-rod-and-bell-ringers.md, wiki/ideas/I003-crumple-zone.md, wiki/ideas/I004-davy-safety-lamp.md, production/V002/script.md, production/V002/narration.txt, raw/research/2026-11-15-break-step-bridges.md, wiki/_todo.md

## [2026-11-15 05:10] setup | движок «Стикман 3D» в engine/: ядро, камера, 2 локации, 4 героя, эффекты, инструменты; хук V001 перенесён на движок
touched: engine/, production/V001/film.js

## [2026-11-15 05:30] lint | ружьё на средних планах: сравнение 2D и 3D, правило в библии стиля
touched: wiki/craft/style-bible.md

## [2026-11-15 10:55] video | V002: первая полная сборка (картинка, голос Liam, звук, субтитры), status: production
touched: production/V002/film.js, production/V002/ROUNDS.md, wiki/videos/V002-why-soldiers-never-march-across-bridges.md, engine/

## [2026-11-15 14:05] video | V002: правки Рауана (наложения, голоса героев, темп, звук), уроки прогона и памятка для продолжения
touched: production/V002/HANDOFF.md, wiki/craft/production-workflow.md, engine/tools/voice_cast.py

## [2026-11-15 15:10] setup | скилл stickman-3d переписан по итогам прогона и упакован: tools/skill/, tools/pack_skill.py, dist/stickman-3d.skill
touched: tools/skill/SKILL.md, tools/skill/references/quality-gates.md, tools/skill/references/sound-design.md, tools/skill/scripts/setup.mjs, tools/pack_skill.py, .gitignore

## [2026-11-15 17:00] setup | SEO канала, данные загрузки V002, баннер (GPT Image, 2 варианта)
touched: wiki/channel/seo.md, production/V002/upload.md, production/channel/banner_prompt*.txt, index.md

## [2026-11-15 18:30] ingest | разбор конкурента Paper Billions (5 лонгов) и черновик стратегии канала лонгов
touched: wiki/donors/paperbillionstv.md, wiki/analyses/longform-hybrid-style.md, raw/donors/2026-11-15-paperbillions-*, index.md

## [2026-11-15 19:20] setup | канал лонгов: решения, подбор голоса (13 вариантов), проба нуарного фона GPT Image
touched: wiki/channel/longform-channel.md, production/longform/style-test/bg_prompt.txt, index.md

## [2026-11-15 20:30] lint | чек-лист слоёв и движений; ведущий лонгов — moneyman; свет на героях в лонгах
touched: wiki/craft/layering-and-motion.md, wiki/channel/longform-channel.md, tools/skill/references/quality-gates.md, tools/skill/SKILL.md, tools/pack_skill.py, index.md

## [2026-11-16 12:00] setup | стиль «Стикман Нуар» утверждён и записан
touched: wiki/craft/stickman-noir.md, wiki/channel/longform-channel.md, index.md

## [2026-11-16 13:00] video | L001 пилот лонга: факт-чек истории Nvidia/Хуанг, структура и типы сцен на утверждение
touched: raw/research/2026-11-16-nvidia-huang-spy-story.md, production/L001/outline.md, wiki/craft/stickman-noir.md

## [2026-11-16 23:30] video | L001 — сверка с конкурентом по планам перед сборкой
touched: production/L001/review_before_build.md, production/L001/refs/competitor_shot_types.jpg

## [2026-11-16 16:40] video | L001 — 3D-планы в «рисованном» виде: #25 стол (desk3d), #80 конвейер STOP (conveyor), #258 коридор HQ (hq_corridor), #180–186 осмотр ДЦ с героями (dc_inspection); общий набор engine/src/sets/noirInteriors.js
touched: engine/src/sets/noirInteriors.js, production/L001/scenes/desk3d/, production/L001/scenes/conveyor/, production/L001/scenes/hq_corridor/, production/L001/scenes/dc_inspection/, production/L001/prompts/make_prompts_3d.py

## [2026-11-16 16:45] video | L001 — сверка с конкурентом по смыслу сцена за сценой; шотлист 277 → 303 плана (+26, 134 изменено), аниматик 15:30; номера планов сдвинуты (старые → новые: кухня #55–57 → #62–64, стол #25 → #27, конвейер #80 → #90, ДЦ #180–186 → #198–204, коридор #258 → #283; полная карта animatic/renumber_277_to_303.json)
touched: production/L001/compare_scenes.md, production/L001/shotlist.md, production/L001/animatic/conf.js, production/L001/animatic/film.js, production/L001/animatic/make_timing.mjs, production/L001/animatic/render_all.mjs, production/L001/animatic/shotlist_tool.mjs, production/L001/animatic/timing.json, production/L001/animatic/out/

## [2026-11-16 17:20] video | L001 — сцена-метафора «повара» (#62–64 по шотлисту 303): монитор 90-х → один повар CPU у длинного стола (рисованная кухня GPT + 2D-герои) → отъезд к ~5800 одинаковым поварам GPU, синхронные подбросы → все тарелки разом; 13.68 с, 1920×1080
touched: production/L001/scenes/kitchen/

## [2026-11-17 11:48] query | L001 — факт-чек 30 пунктов конкурента: 11 confirmed + 2 частично, 11 reported, 3 contradicted, 3 not found; 28 B-строк в черновик v2 (+3:08; A+B ≈ 19:14); правки: −13% → −14%, «now he runs a company»
touched: raw/research/2026-11-17-l001-factcheck-2.md, production/L001/script_v2_draft.md

## [2026-11-17 15:05] video | L001 — финальный рендер: пилот гл. 0–1 с настоящими героями (out/ch0_1.mp4, 76 с, черновой голос); ядро аниматика вынесено в animatic/core.js (аниматик попиксельно тот же), make_timing пишет words.json (--lines для голоса Fish); конфиги локаций ресторан/салон/кабинет/Кентукки/улица; новые герои — агенты 1 и 2, агент в зале, официант, юный Дженсен, перчатка; 22 дефекта найдено и исправлено (QA.md); V001 не изменился
touched: production/L001/film/, production/L001/animatic/core.js, production/L001/animatic/film.js, production/L001/animatic/make_timing.mjs, production/L001/animatic/words.json, production/L001/animatic/timing.json

## [2026-11-17 15:10] video | L001 — финальная озвучка Fish Audio (s2.1-pro-free): EN 17:20 (165 слов/мин) и RU 20:12 для прослушивания; 320 строк с режиссурой S2, 44 второстепенные роли подобраны из библиотеки Fish (по пробе, f0 для пола), проверка whisper — ни одной прочитанной метки, EN перегенерировано 4 строки, RU 59 (сильный акцент англоязычных голосов, 10 строк слабые); out/lines_fish.json с таймингами слов заменяет черновой голос
touched: production/L001/voice_fish/narration_directed.txt, production/L001/voice_fish/narration_ru_directed.txt, production/L001/voice_fish/cast.json, production/L001/voice_fish/fishlib.py, production/L001/voice_fish/fish_voice.py, production/L001/voice_fish/README.md, production/L001/out/voice_fish_en.mp3, production/L001/out/voice_fish_ru.mp3, production/L001/out/lines_fish.json

## [2026-11-17 16:10] video | L001 финал гл. 0–1, раунд 2: 3D — нативные рендеры кадр в кадр (final.mjs, одно кодирование crf 16, PSNR 44.5–50 дБ, 0 повторов кадров), #2 — city_towers; D01 #1 — агент за дальним столиком (плейт plate_v2 + проём из GPT Image); ошибки персонажей: окно #12, хват ключа #21/#24, стол сверху #25/#26, санузел #30, дрейф камеры уводил героев из кадра (#5, #8, #13)
touched: production/L001/film/ (final.mjs, clips3d.js, verify3d.py, audio.mjs, make_plates.py, assets/, raw/, staging/desktop.js, QA.md, README.md), production/L001/animatic/core.js (хук noAmbient)

## [2026-11-17 17:05] video | L001 финал гл. 0–1, раунд 3: #25–26 переделаны на карточки мест (JENSEN HUANG / пустая карточка, нить BEIJING, штамп RESERVED; телефон, мел и кожанка убраны), шотлист и D14 обновлены; полноразмерная проверка 25 планов — исправлены #9 (рука тоста — рукав кожанки), #18 (кисти на краю планшета и папки), #22 (ценник не закрывает логотип)
touched: production/L001/film/, production/L001/shotlist.md, production/L001/decisions_for_owner.md, production/L001/animatic/timing.json

## [2026-11-17 17:58] video | L001 финал гл. 0–1, раунд 5: смаз вип-пана/наезда-удара в общем ядре (core.js smearInto), #12 — сидящие в окне на нарисованных стульях, конец пилота по границе фразы со спадом, временная подложка без цифровой тишины, дорожки голоса и подложки отдельно
touched: production/L001/animatic/core.js, production/L001/film/ (final.mjs, audio.mjs, shots.js, staging/inserts.js, staging/common.js, QA.md)

## [2026-11-17 19:10] video | L001 — озвучка: ведущий (Leviticus Cornwall, выбор Рауана) одним дублем на сцену (18–21, 318–320; t 0.5/top_p 0.55, паузы 0.3 с), EN пересобран 17:18.9, изменились только 7 строк ведущего; RU переозвучен родными русскими голосами Fish (cast_ru.json, 49 ролей) — 20:07.7, акцента нет, медиана сходства whisper 1.0, метки вслух не читаются
touched: production/L001/voice_fish/fish_voice.py, production/L001/voice_fish/cast.json, production/L001/voice_fish/cast_ru.json, production/L001/voice_fish/narration_directed.txt, production/L001/voice_fish/narration_ru_directed.txt, production/L001/voice_fish/host_takes.py, production/L001/voice_fish/host_takes/, production/L001/voice_fish/README.md, production/L001/out/voice_fish_en.mp3, production/L001/out/lines_fish.json, production/L001/out/voice_fish_ru.mp3, production/L001/out/lines_fish_ru.json

## [2026-11-17 19:20] video | L001 звук: исследование (конкурент, лицензии, инструменты), конвейер production/L001/sound (монтажный лист из шотлиста, синтез 100+ классов, прослушивание earshot, сведение −14 LUFS со стемами, самопроверка), пилот гл. 0–1
touched: production/L001/sound/, wiki/craft/sound-design-longform.md, wiki/craft/stickman-noir.md, index.md

## [2026-11-18 09:50] video | L001 звук, пилот гл. 0–1 на новой картинке: 143 звука (53 из записей CC0/слоёв), библиотека 184 записи CC0 с реестром лицензий, музыка по тактам (Covert Affair, I Knew a Guy — CC BY 4.0), мастер −14.0 LUFS / −1.3 dBTP, 67 из 67 событий в ±1 кадр, WER микса 0.5 %; варианты полный и скромный; русский голос в картинку по английскому таймингу не влезает (отчёт RU_FIT.md); замер конкурента и правила — wiki
touched: production/L001/sound/ (cues.mjs, cues_manual.mjs, synth.py, render.py, check.py, vis.py, music_plan.py, ru_fit.py, tools/, lib/, music/, competitor/, LICENSES.md, CUES.md, README.md), production/L001/film/out/ch0_1_sound.mp4, ch0_1_sound_lean.mp4, wiki/craft/sound-design-longform.md, wiki/craft/stickman-noir.md, index.md, .gitignore

## [2026-11-18 10:20] video | L001 финал гл. 0–1, раунд 6: постановка привязана к планам по тексту (keys.js, check.mjs) — шотлист перенумерован 341 → 352; сцена ведущего заново на 10 планов (рука на коробке, стук, ключ сверхкрупно, зелёный свет, ценник, бирка, ключ к объективу, снимок), ключ перерисован; события по словам; speech_check.py — 5 растянутых пауз в репликах ведущего (ждём новый тайминг); промежуточный рендер на голосе Fish
touched: production/L001/film/ (shots.js, keys.js, check.mjs, maptable.mjs, speech_check.py, clips3d.js, film.js, final.mjs, qa.py, props.js, staging/office.js, staging/inserts.js, QA.md, README.md)

## [2026-11-18 14:30] video | L001 — озвучка: устранены провалы звука. Реплики приведены к −20 LUFS (было −39…−11; RU OFFICIAL был на 14–17 дБ тише), клипы берутся из сырых дублей с хвостом и фейдами 20 мс (silenceremove портил края), 12 оборванных RU-реплик передублированы, разрез RU-сцены ведущего 319/320 убран из слова; обе дорожки −20,2 LUFS, лимитер. Тайминги заморожены: lines_fish.json побайтно тот же, в lines_fish_ru.json изменился только end строки 319. check_dropouts: нет тихих реплик и обрывов
touched: production/L001/voice_fish/fish_mix.py, production/L001/voice_fish/fish_voice.py, production/L001/voice_fish/host_takes.py, production/L001/voice_fish/README.md, production/L001/out/voice_fish_en.mp3, production/L001/out/voice_fish_ru.mp3, production/L001/out/lines_fish_ru.json, production/L001/out/fish_levels_en.json, production/L001/out/fish_levels_ru.json

## [2026-11-18 15:05] video | L001 звук на весь фильм: плотность mid по умолчанию (≈50 звуков/мин, переключатель full/lean), таблица фоли без ложных срабатываний, музыка фильма по главам с попаданиями на фразы (MUSIC_PLAN.md), русский лист и звук по своему таймингу, конвейер по главам (do_chapter.py) и мастер фильма (master_full.py); первый мастер EN аудио −14.0 LUFS / −1.3 dBTP, тишины нет
touched: production/L001/sound/ (cues.mjs, cues_manual.mjs, render.py, check.py, music_plan.py, music_spec.json, snap_cues.py, do_chapter.py, master_full.py, MUSIC_PLAN.md, CUES_ru.md, README.md), wiki/craft/sound-design-longform.md

## [2026-11-18 18:20] video | L001 звук: убран «крик» в начале пилота. Это были два звука: синтетический райзер под ростом башни (2.6–3.9 с, тон 110→500 Гц с тремоло — классификатор AudioSet слышал «Meow/Cat/Owl», ухо — вопль) и подложка ресторана amb_restaurant_04 (0–0.5 с «Police car (siren)», «Squeal»). Райзеры и «зелёный свет» переписаны без скольжения высоты и вибрато; проверка всей библиотеки (581: записи, кандидаты, классы синтеза) убрала 6 записей с визгом/сиреной (журнал в LICENSES.md), у каждого класса остались чистые; ch0_1_sound.mp4 пересведён на картинку 17:37 — первые 10 с чисто (без голоса: человек 0.002, животные 0.015, сирена 0.003 при пороге 0.10), −14.0 LUFS / −1.3 dBTP, 52/52 в кадр, WER 0.5 %; вся гл. 0–1 без голоса тоже чиста (смех зала ≤ 0.02); мастера фильма EN и RU пересобраны на чистой библиотеке — оба −14.0 LUFS / −1.3 dBTP
touched: production/L001/sound/ (out/full, out/full_ru, synth.py, palette_manual.json, palette_rec.json, lib/picks.json, lib/ledger.json, lib/vocal_scan.json, LICENSES.md, LICENSES_extra.md, README.md, tools/library_scan.py, tools/apply_scan.py, tools/verify_vocals.py, tools/ledger_palette.py), wiki/craft/sound-design-longform.md, production/L001/film/out/ch0_1_sound.mp4

## [2026-11-18 21:30] video | L001 звук: исправлен разбор «крика». Классификатор AudioSet получал 16 кГц вместо 48 кГц (слышал звук в 3 раза выше) — прежние оценки недействительны. По верному замеру крик в начале пилота — блеющий выкрик в гуле зала ресторана amb_restaurant_04 на 0.5–1.0 с (Bleat 0.12, Sheep 0.10); райзер под башней был чистым, старый «зелёный свет» звучал как вой (Howl 0.14) и переписан. Библиотека переслушана верно (575): убраны amb_restaurant_04, amb_birds_day_02, amb_cutlery_02, amb_night_01/02 (совы), возвращены ошибочно убранные amb_diner_01, amb_port_03, phone_ring_02, ship_horn_01; синтез факса переписан (был «сиреной» 0.43). snap_cues: второй проход для точных звуков на 2–5 кадров от события. Главы сводятся заново по одной (chapter_runner.sh)
touched: production/L001/sound/ (synth.py, snap_cues.py, palette_manual.json, palette_rec.json, lib/picks.json, lib/ledger.json, lib/vocal_scan.json, LICENSES.md, LICENSES_extra.md, tools/library_scan.py, tools/verify_vocals.py, tools/vocal_scan.py, tools/apply_scan.py, tools/chapter_runner.sh), wiki/craft/sound-design-longform.md

## [2026-11-18 22:20] video | L001 звук по главам на финальной картинке (mid, чистая библиотека): ch0_1 (картинка 22:04) −14.0 LUFS / −1.3 dBTP, 52/52 в кадр, WER 1.5 %; ch4_6 (19:21) 204/204, WER 4.2 → 4.1 %; ch7_8 (18:22) 141/141, WER 2.3 %; ch9_10 (19:32) 111/113 (2 — слабый всплеск картинки), WER 1.9 %; тишины нет; фон без голоса чист во всех главах (ch4_6: «Bleat 0.125» на маркере по карточке — pyin: голосовой высоты нет). Мотор погрузчика (гл. 0, 24.4 с) звучал как сирена 0.57 — переписан на ровный гул; синтез на настоящих длительностях — 57 классов чисты. Мастера фильма EN и RU пересобраны: −14.0 LUFS / −1.3 dBTP. ch2_3 ещё не отрендерен — chapter_runner.sh ждёт
touched: production/L001/sound/ (synth.py, snap_cues.py, README.md, CHAPTERS.md, out/ch0_1, out/ch4_6, out/ch7_8, out/ch9_10, out/full, out/full_ru), production/L001/film/out/{ch0_1,ch4_6,ch7_8,ch9_10}_sound.mp4

## [2026-11-19 02:00] video | L001 динамика: удары камеры по словам (s.beats: make_timing «удары ×N» / «удары по словам», core.js beatXf — перекадровка всего кадра за 8 кадров, без яркости) на 223 планах + 9 вещей на словах (гл. 0, 4). Аниматик 1.15 → 1.27 против 1.00: главы 0, 2–9 и все 18 минут выше конкурента; ниже — гл. 1 (1.98/2.90) и 10 (1.91/2.11), у него там 3D-пролёт 42–58 %/с; пик хука ≈2.02/2.01, финала 1.64/1.45. Фильм (пробные рендеры): гл. 1 1.32 → 1.71, гл. 4 0.96 → 1.14 (его 1.16 — постановка не берёт сдвиг камеры). Мерцание: «пила» яркости не выросла (16–58 против 18–61 до)
touched: production/L001/animatic/{make_timing.mjs,core.js,timing.json,out/animatic_nodebug.mp4}, production/L001/shotlist.md, production/L001/dynamics/tools/film_energy.py, production/L001/dynamics_compare.md

## [2026-11-19 05:05] video | L001 звук: ch2_3 (картинка 04:50) −14.0 LUFS / −1.3 dBTP, 139/140 в кадр (1 — слабый всплеск картинки), WER 2.7 → 3.8 % (разница — запись чисел Whisper'ом: «$2 million» вместо «two million dollars», не маскировка), фон без голоса чист; пересведены перерендеры ch7_8 (01:55) 141/141 и ch9_10 (02:04) 111/113 — фон чист. Все главы фильма со звуком на текущей картинке
touched: production/L001/sound/CHAPTERS.md, production/L001/sound/out/{ch2_3,ch7_8,ch9_10}, production/L001/film/out/{ch2_3,ch7_8,ch9_10}_sound.mp4

## [2026-11-19 07:58] video | L001 звук на финальной картинке глав: ch2_3 (05:33) 139/140, WER 2.9 → 3.7 %; ch4_6 (05:46) 202/203, WER 4.8 → 5.0 %; ch7_8 (05:21) 141/141, WER 2.5 %; ch9_10 (05:38, глава до 1071.27 с) 114/116, WER 1.7 → 1.9 %; всё −14.0 LUFS / −1.3 dBTP, тишины нет, фон без голоса чист. Промахи синхрона — только при слабом всплеске картинки; потери слов в миксе — запись чисел Whisper'ом и пропуск фразы при голосе на 19.8 дБ выше фона. ch0_1 остаётся на картинке 22:04 (старый тайминг). Мастера фильма устарели после перетайминга 04:31
touched: production/L001/sound/CHAPTERS.md, production/L001/sound/tools/chapter_runner.sh, production/L001/film/out/{ch2_3,ch4_6,ch7_8,ch9_10}_sound.mp4

## [2026-11-19 08:10] video | L001 3D-пролёты в главах ведущего: desk3d #29–30 — влёт к телефону (пик 52 %/с), падение на папку, разгон в папку; новый #348 — отъезд от ресторана над Марина-Бэй (city singapore rev=1, 4.5 с, пик 53 %/с); make_timing — хвост из нескольких планов без голоса; timing_ru.json пересобран с ударами. Аниматик: хук 2.03/2.01, гл. 1 2.03/2.90; фильм гл. 10 1.31/2.11. Перерендер ch0_1 с влётом прерван системой (нехватка памяти)
touched: production/L001/scenes/desk3d/film.js, production/L001/scenes/city/film.js, production/L001/scenes/{desk3d/out/desk3d.mp4,city/out/city_sg_out.mp4}, production/L001/animatic/{core.js,make_timing.mjs,prep_clips.py,clipframes.js,timing.json,timing_ru.json}, production/L001/shotlist.md, production/L001/dynamics_compare.md

## [2026-11-19 15:40] video | L001 EN собран целиком: film/out/full_sound.mp4 (17:51, −14.0 LUFS / −1.3 dBTP, звук к главам ±3.4 мс). Проверка 7 замечаний Рауана в полный размер: 6 исправлены, #301 (агент на книгах) переделан; найдены и исправлены #55 SAN JOSE срезан, #70 голова закрывала GPU, #34 подписи карты; перерендер ch2_3, ch9_10 (завис в 13:59 — снят), звук на всех главах; склейка с закрытием дыр 1–3 кадра между главами (film/tools/assemble_full.py)
touched: production/L001/film/shots/{ch02_B.js,ch03.js,ch09.js}, production/L001/animatic/conf.js, production/L001/film/tools/assemble_full.py, production/L001/film/QA.md, production/L001/HANDOFF.md, production/L001/film/out/{ch2_3,ch9_10,ch0_1,ch7_8}_sound.mp4, production/L001/film/out/full_sound.mp4

## [2026-11-19 18:00] video | L001 второй раунд правок Рауана: тень на лице Алисы (shadeCutY в движке, все сцены; перерендер ch0_1/4_6/7_8); сверка 48 ролей рисунок↔голос — BANKER 2, EDITOR, GUIDE → мужские, BOARD, ANALYST 2 → женские, толпа «GPU» из двух голосов (recast без сдвига шкалы); проход по звуку: звук вещей в планах с героями (SKIP_PROPS больше не глушит), смех героев (CC0), cues_extra.mjs (~140 звуков), тихие склейки, mid без осмысленных фоли не режет — 35–85 → 52–120 звуков/мин; full_sound.mp4 −14 LUFS, синхрон 3.4 мс
touched: engine/src/chars/{presetsLong.js,stickman.js}, production/L001/sound/{cues.mjs,cues_extra.mjs,cues_manual.mjs,render.py,synth.py,palette_*.json,lib/picks.json,LICENSES.md,tools/sfx_gaps.py}, production/L001/voice_fish/{recast.py,cast.json,README.md}, production/L001/film/QA.md, production/L001/HANDOFF.md, wiki/craft/sound-design-longform.md

## [2026-11-19 20:37] video | L001 смех и добор звука: смех не был слышен (записи испорчены затуханием с 0 с, уровень −26 дБ к голосу) — Дженсен смеётся своим голосом (дубли Fish, laugh.jensen), смех FEATURED, −7…−10 дБ к голосу; ещё 30 звуков в планах без звука действия (cues_extra.mjs, 128 групп); full_sound.mp4 20:37, синхрон 3.4 мс
touched: production/L001/sound/{render.py,cues.mjs,cues_extra.mjs,cues_manual.mjs,palette_*.json}, production/L001/HANDOFF.md

## [2026-11-19 21:30] publish | L001 упаковка для YouTube: 3 названия (реком. «How a Suspected Chinese Spy Got Close to Jensen Huang»), описание с главами, дисклеймером, источниками и атрибуцией музыки CC BY, 20 тегов, категория Education, 3 обложки для «Тест и сравнение» (из кадров фильма, формула лидеров Paper Billions), английские субтитры по разметке слов
touched: production/L001/publish/{upload.md,make_thumbs.py,thumb_A..C.{png,jpg},L001_en.srt}, raw/donors/2026-11-19-paperbillions-meta/

## [2026-11-19 23:30] ingest | идея лонга I005: Маск — сооснователь OpenAI (2015), ушёл (2018), xAI, иск к OpenAI и Альтману (2024), суд 2026; факт-чек не сделан
touched: wiki/ideas/I005-musk-vs-altman-openai.md, index.md

## [2026-11-19 23:50] video | L002 «Маск и Anthropic: враг платит врагу» — замысел и сюжет по 9 главам утверждены Рауаном (с линией FTX/Бэнкман-Фрида); запущен факт-чек
touched: production/L002/outline.md

## [2026-11-20 01:30] video | L002 факт-чек (25 расхождений разобраны, первичка SEC: проспекты Anthropic и SpaceX, 10-Q SpaceX, 8-K Nvidia) и сценарий EN, черновик 3 + перевод для Рауана: ~2500 слов ≈ 16 мин, реплик 10.1/мин, карточек 1.9/мин, цифр 3.4/100; Grok — ключ истории, линия Маск ↔ Амодеи, отступления о мотивах через улики
touched: raw/research/2026-11-19-l002-factcheck.md, production/L002/{script.md,script_ru.md}

## [2026-11-20 03:30] video | L002 голос EN (Fish, 380 строк, 15:13, 41 роль, каст по рисунку, без клонов реальных людей), 23 фона (13 приняты, 10 на перегенерации — сингапурский пейзаж из эталона), герои по фото
touched: production/L002/{voice_fish/,narration.txt,make_narration.py,prompts/,assets/}
