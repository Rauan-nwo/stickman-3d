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
