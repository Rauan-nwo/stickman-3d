---
type: technique
status: evergreen
tags: [tools, claude-skills, anidoodle, threejs]
created: 2026-11-14
updated: 2026-11-14
sources: [2026-11-14-animatsiya-skills-links.md]
---

# 3D-киностудия на коде (anidoodle)

## Название и что это

Наше название — **«3D-киностудия на коде»**. Репо `alexgreensh/anidoodle` (Apache-2.0), скилл
установлен в `~/.claude/skills/anidoodle`, исходник — `C:\dev\tools\anim-skills\anidoodle`.
Место в общей подборке — [[anim-skills-catalog]], роль в конвейере — [[reproduction-pipeline]].

Это движок «фильм = чистая функция кадра»: `draw(ctx, frame, env)` рисует любой кадр без
состояния, рендер идёт в headless Chromium (Playwright) параллельно и вне порядка, ffmpeg собирает
MP4. Две половины:
- `engine/src/canvas-core` — 2D-ядро (32 рисованных стиля, камера 2D, субтитры, озвучка, музыка
  кодом, SFX кодом, cue-таблицы);
- `engine/src/three-core` — 3D на three.js 0.170 (вендорен и закреплён по sha256): `draw3d`
  рендерит WebGL и копирует кадр на тот же 2D-canvas, поэтому все инструменты (still, render, gate,
  framecheck, субтитры, звук) работают на 3D без изменений.

Плюс ~80 инструментов в `engine/tools` (QA-гейты, звук, озвучка, сборка HTML-плеера) и толстые
доки ремесла в `references/` (~4.6 тыс. строк: сторителлинг, камера, монтажная грамматика,
музыка, 3D-чеклист «дешёвого 3D»).

## Установка и запуск на этой машине

Точные шаги, которые сработали на Windows 11 (Node 24.16, ffmpeg 8.1 из winget):

```bash
node ~/.claude/skills/anidoodle/engine/tools/scaffold.mjs C:/dev/tools/anim-tests/anidoodle/proj \
     --film test --size 720x1280 --fps 30 --duration 4
cd C:/dev/tools/anim-tests/anidoodle/proj && npm install
```

Проблемы Windows и решения:

1. **`npx playwright-core install chromium` падает** — таймаут CDN `cdn.playwright.dev`
   (Chrome for Testing r1243). Решение: взять уже скачанный браузер из
   `%LOCALAPPDATA%\ms-playwright\chromium*-1255` через junction в отдельную папку и указать её:
   ```powershell
   $b="C:\dev\tools\anim-tests\anidoodle\pw-browsers"; $s="$env:LOCALAPPDATA\ms-playwright"
   New-Item -ItemType Junction -Path "$b\chromium-1243" -Target "$s\chromium-1255"
   New-Item -ItemType Junction -Path "$b\chromium_headless_shell-1243" -Target "$s\chromium_headless_shell-1255"
   $env:PLAYWRIGHT_BROWSERS_PATH=$b
   ```
   Встроенный fallback `tools/detect.mjs` на Windows не помогает: ищет кэш в `~/.cache/ms-playwright`
   (а не `%LOCALAPPDATA%`) и имена без `.exe`.
2. **Сборка падает: «three.js … is not the pinned 0.170.0 build»**. Причина — `git core.autocrlf=true`:
   вендоренный `vendor/three/three.module.js` получил CRLF, sha256 не совпал. Решение: в копии
   проекта перевести файл в LF (или удалить `vendor/three` — тогда возьмётся `node_modules/three`).
   На будущее клонировать с `git -c core.autocrlf=false clone …`.
3. `node <skill>/engine/tools/sfx.mjs` из папки скилла не стартует (нет `esbuild` в скилле) —
   запускать `node tools/…` из проекта после `npm install`.
4. GPU-режим работает: `ANIDOODLE_GL=gpu` (флаги `--use-angle=default --ignore-gpu-blocklist`).

Команды (из папки проекта, с `PLAYWRIGHT_BROWSERS_PATH`):
```bash
node tools/still.mjs test --frames 0,30,60,110 --out out/look/ --sheet out/look-sheet.png
node tools/render.mjs test --out out/test.mp4            # SwiftShader, побитово воспроизводимо
ANIDOODLE_GL=gpu node tools/render.mjs test              # GPU, ~70x быстрее
node tools/gate.mjs test                                 # детерминизм, контракт, dead air, 3D-чеки
node tools/framecheck.mjs test                           # текст: обрезка, время чтения, safe zones
node tools/narrate.mjs providers                         # какие голоса доступны
```

## Как пользоваться

**Workflow скилла** (`SKILL.md`): интейк по одному вопросу → бриф → история в 3 предложениях →
один «look still» на утверждение → 8-секундный музыкальный сэмпл → весь фильм → свежий
критик-субагент (до 3 раундов) → финальное утверждение. Максимум 3 точки согласования.

**Фильм — это данные**: `{ meta: { W, H, fps, bpm, durationFrames, … }, shots: [{ id, start, end, draw }], audio? }`.
Шоты должны стыковаться без дыр и резаться по сетке бита (`bpm`; при `bpm: 60` и 30 fps — каждые 30 кадров).

**3D-шот** (паттерн из `three-d.md`, проверен):
```ts
import * as THREE from "three";
import { draw3d, memo, rand } from "../three-core/stage";
import { look, place, pushIn, withMods, handheld } from "../three-core/camera";
import { interior, matte, emissiveGlow, vignette, grain } from "../three-core/look";

const base = look([0.15, 1.45, 5.6], [0, 1.2, 0], 40);
const move = withMods(pushIn(base, 0.42, 0, 120), handheld(5, 0.5, { fps: 30 }));
const shot = (ctx, f, env) => {
  const s = memo(env, "mine", build);        // сцена строится один раз
  place(s.cam, move(f), env);                // всё движущееся ЗАДАЁТСЯ из f каждый кадр
  draw3d(ctx, env, s.scene, s.cam, { clear: "#120a05", ss: 2, exposure: 1.1 });
  vignette(ctx, env, 0.45, "#1a0d04"); grain(ctx, env, f, 0.03);   // 2D-финиш поверх
};
```

**2D-персонаж внутри 3D** (наш паттерн, по образцу `textPlane` из `three-core/type3d.ts`):
```ts
const layer = env.canvas(512, 896);                         // 2D-холст из env (единственный легальный способ)
const tex = new THREE.CanvasTexture(layer.canvas); tex.colorSpace = THREE.SRGBColorSpace;
const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, toneMapped: false });
// в draw: перерисовать персонажа из f, загрузить, повернуть к камере вокруг Y
drawMiner(layer, f); tex.needsUpdate = true;
miner.rotation.set(0, Math.atan2(cam.position.x - miner.position.x, cam.position.z - miner.position.z), 0);
```

**Ключевые API three-core**:
- `stage.ts`: `draw3d`, `memo`, `rand(seed)`, `probe3d` (объект → проверка обрезки кадром).
- `camera.ts`: `look`, `place`, `pushIn`/`pullBack` (лог-шкала), `dolly`+`path` (по длине дуги),
  `orbit`, `crane`, `truck`, `pan`, `tilt`, `whipPan` (без смаза), моды `handheld`/`dutch`/`zoom`,
  `fitTo`, `rackFocus` (только число дистанции — самого DOF нет), `matchCut`, `screenPx`, `worldForPx`.
- `look.ts`: риги `studio`/`night`/`interior`/`sunset`, материалы `matte`/`satin`/`toon`/`glass`/
  `emissiveGlow`, `outline` (обводка-оболочка, `screen: true` — в пикселях), `contactShadow`,
  `softShadows`, пост `grain`/`vignette`.
- `mograph.ts`: `popIn`, `dropIn`, `explode`/`assemble`, `shatter`, `wiggle`, `moveAlongPath`, `kinetic`.
- `rig.ts`: 3D-риги из примитивов (IK `solveTwoBone`, `walkCycle`, `squashStretch`, `anticipate`).
- `time.ts`/`timeline.ts`: `seg`, `tween`, `ease.*`, `spring` (замкнутая форма), `storyClock`
  (перетайминг под озвучку), таймлайн с привязкой к словам `{ word: "gold" }`.
- `transitions.ts`: `crossfade`, `wipe`, `radialWipe`, `noiseWipe`, `slide`, `zoomThrough`.
- `checks3d.ts`: `registerSize`, `registerGrip`, `runChecks` — гейт проверяет их на ~48 кадрах.

**Озвучка и субтитры**: `narration.json` → `narrate.mjs say|time|check|bake` → модуль с PCM и
таймингом слов в бандле фильма; `cue(timing, "line3:gold")` даёт кадр слова; `phrases()` +
`drawSubtitles()` — фразы 2–6 слов на плашке; `narrationAudio()` — дакинг музыки −9 дБ под голос.

**Звук**: музыка компонуется как данные (`music.mjs`), SFX — 14 синтезированных кодом видов
(`sfx.mjs list`: whoosh, impact boom, pop, chime/glint, riser, paper…); чужой трек — `track.mjs`
(`cut` по тактам, `mix`, `master`).

## Что даёт для нашего стиля

Оценки 0–5 против [[style-bible]].

| Пункт стиля | Что есть | Оценка |
|---|---|---|
| 3D-окружение (шахта, балки, рельсы, вагонетки, лампы) | three.js целиком + риги `interior()`, материалы без «пластика». Геометрию пишем сами (box/plane + seeded-смещение). Моделей нет; GLTF-лоадер противоречит контракту (без файлов/сети) — встраивать модели придётся отдельно, не проверено | 3 |
| Объёмные лучи, пыль, туман | Готовых нет. Сделал сам за ~40 строк: конус с аддитивным шейдером + `SpotLight` + пятно на полу, 500 `Points` с позицией из `f`, `FogExp2`. Выглядит близко к эталону | 3 |
| DOF | Нет в ките. `BokehPass` из `three/examples` через `EffectComposer` подключается и размывает фон, на GPU почти бесплатен, НО: кадр стал «NOT REPRODUCIBLE» и сместился цвет — нужна доводка | 2 |
| 2D-персонаж в 3D (billboard) | Нет готового (скилл даже против гибридов «по умолчанию»), но паттерн `env.canvas` → `CanvasTexture` → плоскость работает чисто: персонаж масштабируется по перспективе, рот меняется 3 формами, отскок/моргание. Персонажа-палочника рисовать самим | 4 (как механизм) |
| Камера | Лучшая часть: push-in, dolly по пути, трекинг (`dolly` с target-кривой), низкий ракурс, handheld, whip pan, dutch. Тряски «удар взрыва» нет — собирается из `handheld`+`spring` | 5 |
| VFX (пыль-удар, искры, взрыв, блики) | `explode`/`shatter` для осколков, `emissiveGlow`, `indicate`; частицы пишем сами. Готового взрыва нет | 2 |
| Субтитры 1–2 слова, ~70 % высоты | Встроенный `drawSubtitles` — фразы 2–6 слов на тёмной плашке. Пословные с обводкой написал сам (контуры Poppins из `ttf.ts`, белый + чёрная обводка + тень, y = 0.70H) — работает. **`framecheck` валит такие титры**: правило «≥ 0.7 с на текст», а у нас слово висит 0.17–0.47 с. Значит, титры надо помечать как исключение или не регистрировать в probe | 3 |
| Озвучка 228 wpm | `narrate.mjs` с word-timing и проверкой каждого слова через whisper.cpp. На машине готов только `files` (свои wav). Kokoro ставится (`kokoro-tts` есть на PyPI), но тянет модель ~310 МБ и требует whisper.cpp для `check` — не ставил. ElevenLabs/OpenAI/Gemini — по ключу, платно. Предел темпа 4.5 слов/с ≥ наши 3.8 — проходит | 3 |
| Музыка / SFX / −14 LUFS | Музыка кодом (стили, гармония, мастер), SFX синтезом, дакинг, `verify-export --delivery`. Звуки «дизайнерские/UI», вестерн-выстрела и т.п. нет; для эталонной подложки, вероятно, нужен внешний трек (`track.mjs`). Громкость меряется | 3 |
| Рендер 720×1280@30 | Работает, детерминированно. SwiftShader: медиана 2.6 с/кадр на странице (4 страницы параллельно), 4 с ролика = 90 с, ≈ 0.75 с/кадр эффективно → 60 с ≈ 23 мин. GPU: 37 мс/кадр, 4 с = 12.7 с (9.4 fps) → 60 с ≈ 3–4 мин. Картинка GPU визуально идентична | 5 |
| QA | `gate` (детерминизм, контракт, dead air, артефакт, 3D-чеки) — PASS 15/15; `framecheck` (обрезка, время чтения, safe zones Shorts), `verify-export`, `ship`. Сильнейший QA из подборки | 5 |

## Результат теста

Что построено (`C:\dev\tools\anim-tests\anidoodle\proj\src\canvas-core\test.ts`, ~200 строк, 4 с, 120 кадров):
- тоннель шахты: стены/свод из «бугристых» плоскостей (seeded-смещение), крепь каждые 2.4 ед.
  (стойки + верхняк), рельсы и шпалы, вагонетка с золотом в глубине, туман;
- свет: `interior()` приглушённый, 5 подвесных ламп (провод + абажур + `emissiveGlow` + `PointLight`,
  покачиваются), `SpotLight` + фейковый объёмный конус + световое пятно на полу;
- 500 пылинок, дрейф задан чистой функцией кадра;
- 2D-шахтёр на `CanvasTexture`-плоскости: белая голова с тёмно-коричневым контуром, глаза-точки,
  моргание, брови, рот 3 формы (зубы-решётка / «O» / улыбка) каждые ~3.5 кадра, отскок и squash
  под слоги, руки-дуги, шляпа с фонарём, клетчатая рубаха с градиентом;
- камера `pushIn(0.42)` + `handheld`, финиш `vignette` + `grain`;
- пословные титры «He loaded the shotgun with gold…» (15 слов ≈ 228 wpm).

Файлы:
- MP4 (SwiftShader, эталон): `C:\dev\tools\anim-tests\anidoodle\proj\out\test-swiftshader.mp4` (= `out\test.mp4`)
- MP4 (GPU): `C:\dev\tools\anim-tests\anidoodle\proj\out\test-gpu.mp4`
- MP4 с DOF (GPU, экспериментально): `C:\dev\tools\anim-tests\anidoodle\proj\out\test-dof-gpu.mp4`, кадр `out\dof60.png`
- Контакт-лист: `C:\dev\tools\anim-tests\anidoodle\proj\out\contact-swiftshader.png` (и `contact-gpu.png`)

Скорость (720×1280, ss 2 = внутренний рендер 1440×2560):
| Бэкенд | draw, медиана | 120 кадров, стена | Детерминизм |
|---|---|---|---|
| SwiftShader (по умолчанию) | 2589 мс (p95 2962) | 90 с (1.3 fps) | 6/6 и gate 12/12 побитово |
| `ANIDOODLE_GL=gpu` | 37 мс (p95 92) | 12.7 с (9.4 fps) | 3/6 побитово (ожидаемо для GPU) |
| GPU + BokehPass | 33 мс | 12.3 с | 4/6 |

Гейты: `gate.mjs` — **PASS 15/15** (297 модулей, 41 кадр 3D-чеков). `framecheck.mjs` — PASS по
обрезке и safe zones, **FAIL 15/15 по времени чтения** пословных титров (см. выше).

Проблемы по ходу: Chromium не скачался (CDN) → junction на кэш; CRLF в three.js → LF; первая
версия обводки титров вызывала `ctx.stroke("nonzero")` (не существует) — исправлено.

## Ограничения

- Нет готового персонажа нашего типа, нет пословных титров, нет DOF, частиц, взрыва, объёмного
  света — всё это наш код поверх движка (моя грубая оценка: 1–2 недели на библиотеку модулей под стиль).
- Нет ассетов: всё процедурно. Загрузка GLTF/текстур идёт вразрез с контрактом «без файлов и сети»;
  встроенные картинки допускаются только «по хэшу» — для моделей путь не проверен.
- Строгий контракт: никакого `Math.random`/`Date`, всё из кадра; гейт ловит нарушения. Это плюс
  для качества, но требует дисциплины в каждом эффекте (DOF через composer сразу его нарушил).
- QA-правила заточены под «спокойные» фильмы: время чтения ≥ 0.7 с, фразы 2–6 слов, шоты по сетке
  бита — наш темп (смена картинки каждые 1.15 с, слово 0.26 с) придётся явно исключать.
- Философия скилла против гибрида 2D+3D «по умолчанию» и за 3 точки согласования — для серийного
  производства Shorts её надо обходить своим workflow.
- Windows: два бага окружения (кэш браузера, CRLF) — решаются, но не «из коробки».
- Голос: бесплатный локальный путь (Kokoro + whisper.cpp) требует ~0.4–0.5 ГБ загрузок; проверки
  `narrate check` без whisper.cpp не работают.

## Вердикт: роль в нашем стеке

**Основной движок рендера и QA для V-роликов.** Берём: рендер-конвейер (Playwright → MP4,
детерминизм, GPU-режим ~3–4 мин на 60 с), `three-core` (камера, свет, материалы, переходы,
таймлайн по словам), `gate`/`verify-export`, `narrate.mjs` как оболочку для голоса и тайминга слов.
Дописываем свой слой стиля поверх: модуль 2D-персонажа-палочника на `CanvasTexture`
(рты/глаза/брови по таймингу слов), пословные титры, «атмосферу» (конус-луч, пыль, искры, взрыв,
DOF — детерминированный), библиотеку декораций (шахта, городок, машина). Персонажный риг и
2D-стили anidoodle для нас вторичны. Сравнение с другими кандидатами — в [[anim-skills-catalog]]
и [[reproduction-pipeline]]; эталон — [[V001-how-mine-salting-worked]].

## Sources
- `raw/research/2026-11-14-animatsiya-skills-links.md`
