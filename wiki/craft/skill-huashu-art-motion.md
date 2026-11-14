---
type: technique
status: evergreen
tags: [tools, claude-skills, huashu, threejs, character]
created: 2026-11-14
updated: 2026-11-14
sources: [2026-11-14-animatsiya-skills-links.md]
---

# Мультяшка и разбор референса (huashu-art-motion)

## Название

Наше название — **«Мультяшка и разбор референса»**. Репо `alchaincyf/huashu-art-motion` v1.3.0
(MIT, автор 花叔/Huashu), исходник — `C:\dev\tools\anim-skills\huashu-art-motion`, установленная
копия — `~/.claude/skills/huashu-art-motion`. Место в подборке — [[anim-skills-catalog]], роль в
конвейере — [[reproduction-pipeline]]. Документация почти целиком на китайском; ниже — перевод сути.

Что внутри (по `SKILL.md` и `references/`):
- **Движок «кадр = функция времени»** (`scripts/engine/`): `index.html` + `engine.js` собирают фильм
  из сегментов `ERAS` (каждый — `scenes/<id>.js` с `draw(c, lt, t)`), переходы (`transitions.js`, ~45 шт.),
  библиотеки `lib/*`, `render.py` (Playwright → PNG → ffmpeg). Детерминизм обязателен: все случайности — `U.rng(seed)`.
- **36 готовых арт-стилей + 17 исследовательских «рецептов»** (`references/风格配方/`), включая
  53_pixar (единственная сцена на **three.js r160**, `lib/three.min.js` в комплекте) и плоские 37_rick_morty /
  52_south_park.
- **8 «грамматик» эксплейнеров** (`references/09-视频动画语法.md`, `动画语法/*.md`): Kurzgesagt, Vox,
  вайтборд, **y4 storytime** (простые персонажи, позы, рот по голосу), кинетическая типографика,
  3b1b, keynote, финансовые графики — у каждой демо-фильм и параметрический клип по JSON-спеке.
- **Разбор референса** (`01-拆解.md`, `scripts/analyze/breakdown.py`) и **контроль качества**
  (`qa.py`, `film_gate.py`, `deliver.py`, `storyboard_lint.py`, `subzone_gate.py`).
- **Звук**: `scripts/audio/synth_艺术史速通.py` (музыка и SFX синтезом на numpy, нормализация −14 LUFS),
  `koubo.py`/`capabilities.py` — озвучка через платный китайский Volcengine или macOS `say`.

## Установка и запуск на этой машине

Скилл уже установлен. Рабочая копия теста: `C:\dev\tools\anim-tests\huashu\` (скопирован `scripts/`,
оригиналы не трогаем). Зависимости: Python 3.11, `python -m uv` (0.13.8), ffmpeg 8.1, Playwright Chromium.

```powershell
cd C:\dev\tools\anim-tests\huashu\scripts\engine
$env:PYTHONUTF8 = '1'                                   # обязательно на Windows, см. ниже
$env:HUASHU_CHROME_ARGS = '--use-angle=d3d11 --enable-gpu'   # наш патч render.py: WebGL на видеокарте
python -m uv run --with playwright python render.py --film mine --width 720 --height 1280 --fps 30 --out ..\..\out\mine.mp4
python -m uv run --with playwright python render.py --film demos/y4_storytime --fps 30 --out y4.mp4   # демо
python -m uv run --with playwright python render.py --film style_studies --solo 53_pixar --from 0 --to 3 --fps 30 --no-counter --out pixar.mp4
```

**Проблемы Windows и решения (найдены в тесте):**
1. **WebGL по умолчанию идёт через SwiftShader (CPU).** Headless Chromium из Playwright на этой машине
   отдаёт `ANGLE (SwiftShader)`, three.js-сцена рендерится ~300 мс/кадр. С флагом `--use-angle=d3d11`
   — `NVIDIA GeForce RTX 5050 (D3D11)`, ~15 мс/кадр, **в 20 раз быстрее**. В оригинальном `render.py`
   флагов не передать, поэтому в рабочей копии добавлена переменная `HUASHU_CHROME_ARGS` (одна строка
   в `p.chromium.launch(...)`). `--use-angle=vulkan` ломает шейдеры three.js (`VALIDATE_STATUS false`),
   `render.py` честно падает с ошибкой — не использовать. CPU- и GPU-рендер отличаются на уровне
   PSNR 45.9 дБ: глазом одинаково, но попиксельный детерминизм держится только внутри одного бэкенда.
2. **`qa.py` падает с `UnicodeEncodeError` (cp1251)** при записи `qa.md` — `write_text` без кодировки.
   Лечится `$env:PYTHONUTF8='1'`.
3. **ffmpeg `drawtext` на Windows** требует явный шрифт (`Fontconfig error`):
   `drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':...`.
4. В доках везде `python3` и `uv run` — у нас `python` и `python -m uv run`.
5. Предупреждения `three.min.js deprecated` и `GPU stall due to ReadPixels` безвредны
   (рендер падает только на `console.error`/`pageerror`).
6. Озвучка: системный голос реализован только для macOS; на Windows из коробки голоса нет.

## Как пользоваться

### Workflow шотлиста (как велит автор)
1. **镜头表 (шотлист)** по `references/镜头表模板.md`: перед таблицей три строки — стиль (один на весь фильм),
   палитра (3–6 цветов, без сине-фиолетового), персонажи. Каждая строка: время | **предмет** | **что он делает**
   (глагол) | движение камеры | текст на экране (≤8 знаков) | способ. Первые 3 с — конкретная мини-сцена, не титул;
   шот 2–6 с; текстовых шотов ≤30 %.
2. `storyboard_lint.py 镜头表.md --script 文稿.txt` — машинная проверка шотлиста (пустой предмет, «появляется»
   вместо глагола, три наезда подряд, финал-титр и т.п.). Красное — до кода не идём.
3. Код по шотам: копия `scripts/engine` → свой `eras_<film>.js` + `scenes/<id>.js`, каждый шот — `镜NN.mp4`,
   склейка ffmpeg `concat` жёсткими склейками.
4. QA → независимое «审片» (ревью готового ролика отдельным агентом в `<проект>/审片/*.md`) → `deliver.py`.

Для нас это ложится на шотлист [[V001-how-mine-salting-worked]]: «правило слово = кадр» из [[style-bible]]
и требование автора «в каждой строке конкретный предмет + глагол» — одно и то же.

### Структура фильма (наш тестовый пример)
```js
// eras_mine.js — фильм, рендер: render.py --film mine
window.FILM_SIZE = [720, 1280]; window.PUNCH = 0; window.FILM_DURATION = 4;
window.SCENE_LIBS = ['lib/three.min.js', 'mine/vo_fake.js', 'mine/miner.js'];  // общие скрипты, грузятся по порядку
window.SCENE_DIR = 'mine';                                                       // где лежат сцены
window.ERAS = [ { id: 'tunnel', dur: 4 } ];   // сегменты; у следующих можно transition: {type:'whip', dur:.26}
window.GLOBAL_OVERLAY = (c, t) => { /* субтитры поверх всего */ };
```

### 3D → 2D-кадр (паттерн из `scenes/53_pixar.js`)
```js
SCENES['tunnel'] = (() => { let R, S, C;
  function init() { if (R) return;
    R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });   // preserveDrawingBuffer обязателен
    R.setSize(STAGE.W, STAGE.H); R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
    S = new THREE.Scene(); S.fog = new THREE.FogExp2('#2b170a', 0.085); C = new THREE.PerspectiveCamera(50, STAGE.W / STAGE.H, .05, 80);
    /* геометрия, свет... */ }
  function draw(c, lt) { init();
    C.position.set(0, .8, U.lerp(6.6, 3.3, MO.sineInOut(lt / 4)));   // камера — только функция времени
    R.render(S, C); c.drawImage(R.domElement, 0, 0, STAGE.W, STAGE.H);  // WebGL → 2D canvas движка
    /* поверх — 2D: персонаж, VFX, грейд */ }
  return { draw }; })();
```
Персонаж «внутри» 3D: проецируем якорь ног и головы `new THREE.Vector3(x,0,z).project(C)` → экранные
координаты и масштаб (растёт при наезде), рисуем 2D поверх + контактная тень. Второй способ (проверен на
напарнике): персонаж рисуется в отдельный `<canvas>` → `THREE.CanvasTexture` на плоскости, которая
каждый кадр поворачивается к камере (`mesh.quaternion.copy(C.quaternion)`) — тогда на него действуют
туман, глубина и заслонение.

### Персонаж: ключевые API `lib/toon.js`
- `TOON.bean(c, {x, y, s, char, pose, expr, mouth, blink, look, squash, tilt, bob, lw})` — «боб»-персонаж:
  круглая голова, тело-капля, руки-макаронины (квадратичная кривая), брови решают эмоцию, рот 0/1/2.
- `TOON.poseAt(keys, t, poses)` — поза к позе: руки за 0.1 с `expoOut` + squash 7 % с пружиной (`MO.settle`).
- `TOON.blinkAt(t, [1.2, 2.25])` — моргание по таблице; `TOON.alive(t, R)` — дыхание ±1.2 % и кивок на слогах.
- `TOON.env(t)` / `TOON.mouth(t, 12)` — рот по огибающей голоса `window.VO_ENV = {fps, a:[0..1]}`
  (0 закрыт / 1 полуоткрыт / 2 открыт, смена 12 раз/с — «через кадр»). Огибающую в демо пишет
  внешний `build_y4.py` (RMS WAV); в репо его нет — пишем сами (10 строк numpy).
- `TOON.sweat`, `TOON.mark('!')`, `TOON.glow`, `TOON.flat`.

### Камера, тайминги, текст
- `MO.*` — кривые (`sineInOut`, `expoOut`, `longTail`, `springHz`, `settle`, `slamK`), `MO.PULSE`
  (наезд 0.9 с, панч 0.28 с, slam 0.17 с), `MO.step(t, 12)` — ступенчатое время.
- `CAM.track(base, [{at, kind:'push'|'pull'|'glide'|'punch'|'pan'|'slam'|'shake'|'cut'}], t)` — монтажный
  план камеры, но для **2D-канваса**; для three.js те же кривые и времена переносим на `PerspectiveCamera` руками.
  `CAM.drift` — ручная дрожь, `CAM.motionBlur` — смаз на рывке.
- `TY.text/slam/pop` (текст с обводкой), `PAINT.bloom/film/vhs` (`post.js`), `finish.js` (виньетка, грейн, тепло).

### Разбор референса и сравнение
```powershell
python -m uv run scripts/analyze/breakdown.py --video V001.mp4 --out разбор/   # контакт-листы, склейки, BPM, тепловые карты движения
python engine/compare.py --a V001.mp4 --b копия.mp4 --times 1.5,2.0 --out сравнение.jpg
```
`breakdown.py` уже дал нам метрику «53 смены картинки за 61 с» ([[style-bible]]). **Баг для вертикали:**
`compare.py` жёстко ресайзит кадр в 16:9 (`a.w*9//16`) — для 720×1280 картинка сплющится, нужен свой вариант.

### QA
```powershell
python -m uv run scripts/qa.py --project scripts/engine --film mine --fps 30 --out out/qa   # детерминизм, мс/кадр, движение, скачки, текст
python -m uv run scripts/film_gate.py ролик.mp4    # гейт «PPT-эффекта»: красный если <3.5 % быстрых кадров, пустые кадры, сине-фиолетовый фон
python -m uv run scripts/deliver.py ролик.mp4 --project scripts/engine --out output/   # гейт + копия + 交付说明.md с отпечатком
```

## Что даёт для нашего стиля

| Элемент [[style-bible]] | Что есть в репо | Оценка |
|---|---|---|
| 3D-окружение (шахта, городок, машина) | three.js r160 + один пример (53_pixar: процедурная геометрия, CanvasTexture-ткани, тени). Нет GLTFLoader, EffectComposer, Bokeh — только ядро three | 2/5 — паттерн, не контент |
| 2D-персонаж | `TOON.bean` + `poseAt/blinkAt/alive/mouth` — ровно наша механика (позы, моргание, рот по голосу, squash). Внешность — не наша: пришлось форкнуть (~150 строк) | 3.5/5 как основа |
| Камера | `CAM.track` (push/pull/punch/pan/slam/shake/cut) — только 2D; кривые и тайминги `MO.PULSE` переносимы; справка `镜头语言.md` — лучший текст про ритм камеры | 3/5 |
| VFX (пыль, искры, взрыв, блики) | Для 3D нет. Есть 2D: `TOON.glow`, `PAINT.bloom`, `finish.js`, переходы. Пыль/лучи/блики в тесте написаны с нуля | 2/5 |
| Субтитры по словам | `TY.text` с обводкой, шрифты Poppins-800/Anton/Bangers в комплекте; пословного тайминга нет (в y4 — целые фразы); `qa.py` ловит текст в зоне субтитров | 2.5/5 |
| Озвучка | Volcengine (платно, китайский рынок), macOS `say`; на Windows ничего. Ценна связка «огибающая WAV → рот» | 1.5/5 |
| Музыка / SFX / −14 LUFS | Синтез-шаблон на numpy с покомпонентной нормализацией к −14 LUFS; музыку вестерна придётся писать | 2/5 |
| Рендер | `render.py`: любой размер/fps, детерминизм, звук, ошибки страницы → ненулевой код. Минусы: один поток, PNG через base64, SwiftShader без патча | 4/5 (с патчем) |
| QA | `qa.py` + `film_gate.py` + `deliver.py` + `storyboard_lint.py` — самое сильное, что есть в подборке | 4.5/5 |
| Разбор референса | `breakdown.py` — уже в работе | 5/5 |

## Результат теста

Файлы: `C:\dev\tools\anim-tests\huashu\`
- Сцена: `scripts\engine\eras_mine.js`, `mine\tunnel.js` (three.js-тоннель), `mine\miner.js`
  (форк `TOON.bean`), `mine\vo_fake.js` (фейковая огибающая 228 слов/мин); профайлер `profile_mine.py`.
- Видео: `out\mine_test_gpu.mp4` (GPU), `out\mine_test.mp4` (CPU/SwiftShader), контакт-лист
  `out\mine_contact.jpg` (16 кадров, 4 fps), кадры `out\stills_row.jpg`, QA `out\qa_mine\`.
- Демо: `out\y4_demo.mp4` (storytime, 1920×1080), `out\pixar_demo.mp4` (53_pixar).

Что в кадре (4 с, 720×1280, 30 fps, 120 кадров): тоннель с крепью (стойки, верхняки, раскосы), рельсы и
шпалы, вагонетка с золотыми самородками, 6 подвесных ламп (PointLight + ореол-спрайт + аддитивный
конус-«луч»), тени от одной лампы, туман FogExp2, 500 пылинок, мерцающие золотые блики в стенах, фейковый
DOF (размытие вокруг точки схода), тёплая виньетка; наезд камеры 6.6→3.3 м + низкий ракурс + дрожь.
Шахтёр — 2D поверх (якорь в 3D, масштаб по перспективе), рот переключается flat/smile/o/зубы-решётка/open/
смех по огибающей, моргание, смена поз с отскоком, на смехе — подпрыгивания и squash, в конце подмигивание.
Напарник в жёлтой шапке — billboard-текстура внутри 3D (туман на нём работает). Пословные субтитры
Poppins-800 на 70 % высоты.

| Замер | SwiftShader (по умолчанию) | GPU `--use-angle=d3d11` |
|---|---|---|
| Рендер кадра в странице | 285–298 мс | ~15 мс |
| Кадр целиком (рендер + PNG + ffmpeg) | **0.46 с** | **~0.09 с** |
| 4-секундный клип (с запуском) | 62.9 с | 14.9 с |
| Прогноз на 60-с ролик (1800 кадров) | ~14 мин | ~2.7 мин |

Для сравнения: y4-демо 1920×1080 (без WebGL) — 0.05 с/кадр; 53_pixar 1920×1080 на SwiftShader — 0.17 с/кадр.
Из 298 мс CPU-кадра: размытие DOF ≈ 63 мс, тени точечного света ≈ 37 мс.

`qa.py`: движение 10.45 %, статичных пар 0 %, скачков 0, **детерминизм ✓**, проблем с текстом 0.
`film_gate.py`: гейт пройден (быстрых кадров 34 %); жёлтый — «15 наездов/мин» (весь 4-с клип — один наезд,
для теста ожидаемо).

Что не сработало / пришлось писать самим: облик персонажа (TOON.bean — нейтральный «боб» с румянцем и
чёрной линией, рот 3 уровня) — форк; объёмный свет, пыль, блики, DOF — с нуля; запуск WebGL на GPU — патч
`render.py`; огибающая голоса — свой генератор.

## Ограничения

- **Авторский запрет на кодовых человечков.** `SKILL.md` (ошибка №6 «AI-привкус») и `角色精细度.md`:
  кодом нарисованные Q-человечки (круглая голова, глаза-точки, румянец, без шеи), белые роботы, «лица на
  предметах» и **палочники, разыгрывающие историю, запрещены в готовых роликах**; `TOON.bean` оставлен
  только для демо и превиза, `storyboard_lint` красным ловит «火柴人/小人» в шотлисте, если персонаж не
  из AI-кадров. Исключение — только стили 37_rick_morty/52_south_park с оригинальными SVG-персонажами.
  Наш стиль сознательно и есть кодовые палочники (решение Рауана, [[style-bible]]) — **запрет к нам не
  применяем**, `storyboard_lint` ⑭ для нас ложноположительный. Но его «линия сдачи» — хороший чек-лист:
  1. силуэт читается залитым в чёрное (шляпа, ружьё, рост);
  2. пропорции постоянны во всём ролике;
  3. рука реально держит предмет (ружьё, лупа, динамит), а не висит рядом;
  4. минимум два слоя света: заливка + тень/градиент, свет с той же стороны, что лампа в 3D;
  5. минимум три детали материала (клетка рубахи, подтяжки, кокарда, вязка шапки);
  6. игра конкретна под реплику (не только моргание и покачивание);
  7. персонаж «в той же картинке», что фон: контактная тень, тёплый рефлекс, туман/DOF на дальних;
  8. одинаковый облик во всех шотах.
  Плюс самопроверка: нет ли «дефолтного AI-человечка», нет ли лиц у предметов (золото не улыбается).
- three.js только ядро r160 (старый UMD-билд): нет загрузчиков моделей и постпроцессинга — GLTF,
  настоящий bokeh DOF, bloom-пасс подключать самим (или CDN-модули).
- Камера `CAM` и переходы — 2D; для 3D-сцен нужна своя обвязка.
- Рендер последовательный, один браузер; PNG через base64 — при 720×1280 это ~25–37 мс/кадр накладных.
- Без патча WebGL на CPU; `qa.py` запускает свой Chromium без GPU-флагов — его мс/кадр завышены.
- Озвучка платная китайская или только macOS; пословных субтитров нет.
- Документация китайская, много авторских правил «вкуса» под китайские эксплейнеры (запрет сине-фиолетового,
  «не PPT») — полезны, но не всё про нас.

## Вердикт: роль в стеке

**Не движок целиком, а «скелет + контроль качества + библиотека мимики».** Берём:
1. **Каркас** «фильм = `ERAS` + `scenes/<id>.js` + `render.py`» (с GPU-патчем) — работает на Windows,
   детерминирован, 720×1280@30 даёт ~0.09 с/кадр с three.js.
2. **Механику персонажа** из `toon.js` (`poseAt`, `blinkAt`, `alive`, `env/mouth`) — под наш форк
   `MINER.draw` с набором ртов/глаз/шляп.
3. **QA-конвейер** (`breakdown.py` для референса, `qa.py`, `film_gate.py`, `storyboard_lint.py` без правила ⑭)
   и справку `镜头语言.md` по ритму камеры.
3D-контент, VFX, субтитры, озвучку и музыку берём из других скиллов — см. [[reproduction-pipeline]] и
[[anim-skills-catalog]]; эталон для сравнения — [[V001-how-mine-salting-worked]].

## Sources
- `raw/research/2026-11-14-animatsiya-skills-links.md`
