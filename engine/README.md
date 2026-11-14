# Движок «Стикман 3D»

Ролик = **файл фильма** (`film.js`: данные + несколько функций) поверх готовых модулей: декорации three.js,
плоские 2D-человечки, камера, эффекты. Кадр — чистая функция номера кадра: `draw(frame)`, случайность только
с фиксированным зерном, часов внутри кадра нет. Формат 720×1280, 30 fps.

Выделен из теста `C:\dev\tools\anim-tests\hook2\` (хук V001): `production/V001/film.js` повторяет его рендер только
модулями движка. Нужны: Node ≥ 18, ffmpeg в PATH, Chrome, Python (для субтитров; для озвучки — с `edge-tts`).

```
cd engine && npm install          # three 0.187.0, esbuild 0.28.2, playwright-core 1.65.1 (версии закреплены)
```

## Быстрый старт

```
# отрендерить хук V001 целиком: сборка -> рендер -> субтитры -> звук -> проверка
node engine/tools/make.mjs production/V001                     # -> production/V001/out/final.mp4

# начать новый ролик
node engine/tools/new-film.mjs V003 --title "How Something Worked"
#   поправить production/V003/narration.txt (строка = фраза) и film.js, затем:
node engine/tools/make.mjs production/V003                     # голос -> рендер -> субтитры -> звук -> QA

# дымовой тест движка (4.2 с, обе декорации, речь по словам) и листы персонажей
node engine/tools/make.mjs engine/films/demo --min-dur 4 --max-dur 5 --max-epm 200
node engine/tools/charsheet.mjs                                # -> engine/out/char_sheet.jpg, talk_strip.jpg
```

Сборки роликов лежат в `production/V<NNN>/out/`, движковых фильмов — в `engine/out/<имя>/` (обе папки не в git).

## Что лежит в папке фильма

| Файл | Зачем |
|---|---|
| `film.js` | сам фильм |
| `narration.txt` | текст озвучки: одна строка = одна фраза или реплика; строки с `#` не читаются |
| `words.json` | таймкоды слов `[{word, text, start, end, line}]` — пишет `voice.py`; `new-film` кладёт оценку по тексту |
| `voice.mp3` | голос (не в git, пересоздаётся `voice.py`) |
| `captions.json` | необязательно: ручные субтитры `[[кадр, "текст"], …, ["end", кадр]]` вместо авторазбивки |
| `make.json` | необязательно: постоянные настройки `make.mjs` — `{ "voice": false, "captions": {…}, "audio": {…}, "qa": {…}, "set": {…} }` |

## Как устроен фильм

```js
import { mineShaft, miner, Actor, timeline, look, keyed, withMods, handheld, act, talk, V, MINER } from 'engine';
import words from './words.json';

export default {
  fps: 30, size: [720, 1280],
  options: { gun: '3d' },                    // параметры: ?gun=2d в адресе или render.mjs --set gun=2d
  setup(stage, options) {                    // один раз: построить декорации, героев, пропсы
    const tl = timeline(words);              // время берётся из слов озвучки
    const shaft = mineShaft(stage);
    const hero = new Actor(stage, miner(), { pin: 'chest' }).at(V(0, -MINER.bodyY * .00202, 0));
    return {
      duration: tl.duration + .8,
      scenes: [{
        id: 'shaft', from: 0, to: tl.t('2') - .1,           // секунды; сцена активна при from <= t < to
        set: shaft,                                          // декорация: её группа видна только в этой сцене
        props: [],                                           // объекты в корне сцены, видимые только здесь
        camera: withMods(keyed([[0, look([0, 1.1, 3.7], [0, 1.25, 0], 50)], [1, look([-.5, 1.4, 2], [0, 1.5, 0], 50)]]), handheld(3, .3)),
        update(t, f) { f.look.focus = 3; },                  // до рендера 3D: позы пропсов, фокус, экспозиция
        under(t, f) {},                                      // 2D под персонажами (шлейф)
        chars(t, f) { const p = act(t, [[0, 'neutral'], [tl.t('1'), 'talk']]); p.mouth = talk(t, tl, { line: 1, rest: p.mouth }).mouth; hero.draw(p); },
        over(t, f) {},                                       // 2D поверх всего (вспышка, кольца, завеса)
      }],
      transitions: [{ at: 2.0, type: 'cut' }],              // cut | dissolve {dur} | flash {dur, color} | dip {dur, color}
    };
  },
};
```

Слои кадра (порядок — главный признак стиля): **[1]** 3D-окружение (тени, DOF, bloom, тон-маппинг, грейд) →
**[2]** 2D-персонажи вектором в точке проекции 3D-якоря — сцена их не освещает, туман, конус света и bloom на них
не ложатся, голова остаётся чисто белой → **[3]** 3D-пропсы переднего плана (`stage.fg(obj)`: ружьё, самородок)
→ **[4]** 2D-эффекты, затемнение (`look.dark`), виньетка.

Правила фильма: всё внутри сцены считается из `t`; между кадрами ничего не копится; `Math.random()` и часы запрещены
(`rng(seed)`, `noise1(seed, x)`). Проверка: `node engine/tools/determinism.mjs <film.html>`.

## Справочник модулей (`import { … } from 'engine'`)

### Ядро — `src/core/`
- **`film.js`** `runFilm(def)` — раннер: сцены, видимость декораций и пропсов, переходы; отдаёт странице
  `window.draw(frame)`, `FRAMES`, `FPS`, `CUES`. Контекст кадра `f = { t, frame, stage, look, ctx, cam, scene, local }`.
- **`stage.js`** `createStage()` — рендерер и слои. Важное: `stage.look` (см. ниже), `stage.project(p) → [x, y, глубина]`,
  `stage.pxs()` (пикселей на метр на глубине 1 м), `stage.fg(obj)`, `stage.both(light)`, `stage.add(obj)`, `stage.envTex`,
  `stage.drawOccluded(p, fn)`, `stage.setVignette({alpha, color})`.
- **`look`** (сбрасывается каждый кадр в `set.look` + `scene.look`, правится в `update` через `f.look`):
  `bg`, `fogColor`, `fogDensity`, `exposure`, `bloom` / `bloomRadius` / `bloomThreshold`, `dof`, `focus` (м), `aperture`,
  `maxblur`, `grade: { sat, tint:[r,g,b], lift:[r,g,b], contrast }` (только слой окружения), `dark` (0..1, затемнение
  всего кадра вместе с героями), `vignette`.
- **`timeline.js`** `timeline(words, {fps})`: `cue('2:gold') → кадр`, `t('2:gold') → секунды`, `t('3')` — начало строки,
  `t('3:$')` — её последнее слово, `'gold#2'` — второе вхождение, `end(spec)`, `line(n) → {from, to, words}`,
  `speaking(t, {line})`, `wordAt(t)`, `duration`. Ненайденная метка — ошибка с перечнем слов строки.
- **`ease.js`** `clamp, lerp, seg(t, a, b), smooth, E.{linear, inOutCubic, outCubic, inCubic, inOutSine, inOutExpo,
  outExpo, inExpo, inOutQuint, outBack}`, `spring`, `keys([[t, v, ease]], t)`, `step`.
- **`rng.js`** `rng(seed)`, `hash`, `vn3`, `fbm3`, `noise1(seed, x)`; **`noise.js`** `NOISE` (GLSL-шум для материалов);
  **`particles.js`** `points`, `sprite`; **`textures.js`** `canvasTex`, `glowTex`, `softTex`.

### Камера — `src/camera.js` (порт anidoodle, Apache-2.0, + свои движения)
Состояние `{ pos, target, fov, roll }`. `look(pos, target, fov, roll)`, `keyed([[t, state, ease]])` (наезд идёт
в логарифме дистанции — сам тормозит), `blend`, `withMods(move, …mods)`; модификаторы `handheld(seed, amount, freq)`,
`shake(t0, deg, decay, freq)`; движения `pushIn`, `pullBack`, `creep` (медленный наезд), `whip` (переброс 4–12 кадров),
`track(targetFn, offset)` (трекинг за предметом), `orbit`, `sequence`; `splineState(keys, t)` + `fwdOf(yaw, pitch)` +
`aimState` — путь по ключам «позиция + yaw/pitch» со сглаживанием Catmull-Rom; `rackFocus`.

### Декорации — `src/sets/`
- **`kit.js`** (`import { kit } from 'engine'`): материалы `rockMaterial(o)` + палитры `ROCK.{darkShaft, warmGallery,
  paleRoof}`, `procMaterial`, `wood`, `woodMat`, `dirt`; геометрия `panelSheet(o)` (лист плит на любой поверхности),
  `rockWall`, `rockTunnel`, `panelEdges`; предметы `timberFrame`, `rails` (рельсы + шпалы по кривой), `hangingLamp`
  (абажур, прожектор с тенями, `.addCone()`, `.addSparks()`), `candleSconce`, `lantern`, `crate` (трафаретная надпись),
  `barrel`, `stump`, `bottle`, `pot`, `stone` / `stones` / `STONES`, `debris`, `rodRack`, `chalkMark`, `box`, `cyl`.
- **`mineShaft(stage)`** — декорация A «тёмный штрек»: `{ group, look, tick, lamp, plank, lights, stand }`.
- **`mineGallery(stage, { origin })`** — декорация B «светлая галерея»: `{ group, look, tick, w(x, y, z), seat, wall:
  { hit, uOf, onWall, U, N }, addCandle(u, v), flames, lights }`.
- Своя декорация — объект `{ group, look, tick(t, stage) }` (пример: `films/kit/film.js`). Декорации разносятся
  в мире через `origin`; видима только та, что названа в `set` активной сцены.

### Персонажи — `src/chars/`
- **`stickman.js`** — один параметрический человечек: `new Stickman(spec).draw(ctx, pose, { only })`.
  - `spec`: голова, тело-«капля» + одежда (`CLOTHES.plaid / shadeLR / band / pocket / suspenders / dots / lapels / rose /
    poly / stroke / disc`), шляпа (`wideBrim`, `beanie`, `topHat`, `bowler`, `none`), волосы, лицо (глаза, брови, усы,
    очки), контур, конечности-дуги, кисти, стойки (`stand`, `sit`), 2D-предметы.
  - `pose`: `dx, dy, bob, sq, lean, tilt, turn`; `eyes` (`rest | dot | lid | closed | wide | flat`, пара — подмигивание),
    `lid`, `look`, `blink`, `brows`, `mouth`, `mouthAt`, `stache`, `blush`, `sweat`, `hatDy / hatLag / hatTip`;
    руки `hL, hR, bL, bR` или явные `arms: [{to, L, bend, hand}]`; `held: [{layer, draw}]`; `stance`.
  - Рты: большие `flat, smile, smirk, O, open, laugh, laughBig, teeth, teethOpen`; маленькие `o, oSmall, flatS, smirkS,
    smileS, chew`.
  - Игра: `EMO` (`neutral, talk, laugh, nervous, shock, smug, wink`), `feel(name, t, over)`, `act(t, [[t, 'emotion',
    over]])` — смена с прищуром, «тейком» и перелётом ~10 %; `poseSeq`, `tweenPose`; `talk(t, timeline, { line, set,
    rest })` — рот меняется каждые 3–4 кадра, пока звучит слово, в паузах закрыт; `blinkAt(t, seed)`.
- **`presets.js`** `miner()`, `buddy()`, `richGuy()`, `expert()`; `spec.unit` — метров на единицу, `spec.pins` — точки
  привязки (`feet`, `chest`, `seat`).
- **`billboard.js`** `new Actor(stage, char, { pin, occlude, bias }).at(V)`: `.draw(pose, opt)`, `.xf()`, `.toLocal(V)`
  (3D-точка → координаты фигуры: кисть на 3D-ружье), `.with(fn)`; `drawActors([[actor, pose], …])` — дальние первыми;
  `occlude: true` — декорация перед героем закрывает его попиксельно; `blobShadow(parent, { pos, size, rot })`.
- **`props2d.js`** `gun2D`, `gun2DPoint`, `sandwich`, `nugget2D`.

### Пропсы и эффекты — `src/props/`, `src/vfx/`
`createShotgun(stage)` (`.pose`, `.chamber`, `.muzzle`, `.foreGrip`, `.local`), `createNugget`, `goldBright`, `goldDeep`;
`lightCone`, `dustMotes`, `sparkles`, `sparkBurst` (сноп искр или фитиль `loop`), `muzzleFlash`, `glint`, `glowTrail`,
`shockRings`, `impactDecal` (воронка + клякса + трещины), `dustBurst`, `explosion` (`setAge`, `flash2D`, `veil2D` —
пылевая завеса поверх кадра для перехода), `screenShake`, `shakeOffset`.

## Инструменты — `tools/`

| Команда | Что делает |
|---|---|
| `make.mjs <фильм> [--no-voice] [--set k=v] [--music f --sfx f@t] [пороги qa]` | весь конвейер |
| `new-film.mjs V<NNN> [--title …]` | заготовка `production/V<NNN>/` |
| `build.mjs <фильм>` | `film.js` → одна HTML-страница без сети |
| `render.mjs film.html out.mp4` · `--stills 0,24,2.5s [--png]` · `--sheet 0.5` · `--set k=v` | рендер на видеокарте |
| `voice.py <фильм> [--voice en-US-GuyNeural] [--rate +35%]` | edge-tts → `voice.mp3` + `words.json` |
| `captions.py words.json out.ass [--short 0.08 --max-words 2 …]` · `--cues captions.json` | субтитры ASS |
| `assemble.mjs --video … --ass … --voice … [--music … --duck 10] [--sfx f@t:дБ] [--bed -30]` | звук −14 LUFS + сборка |
| `qa.mjs final.mp4 [--ass …] [пороги]` | автопроверка, код 1 при провале |
| `compare.mjs --ref … --ours … --out dir [--pairs 8,24] [--shots …] [--mad-size full]` | сравнение с эталоном |
| `charsheet.mjs` | лист эмоций и ртов, лента липфлапа |
| `determinism.mjs film.html` | кадр зависит только от номера |

`voice.py` запускается питоном с edge-tts: `C:\Users\velar\.claude\skills\handdraw-skill\.venv\Scripts\python.exe`
(`make.mjs` находит его сам; другой путь — переменная `STICK_PY`).

**Субтитры**: Montserrat ExtraBold 66 px (`fonts/Montserrat-ExtraBold.ttf`, лицензия SIL OFL), белые, обводка 5 + тень, центр (360, 900), подмена слова на кадре его начала.
Разбивка как в эталоне (замер: 175 реплик на 231 слово, 73 % — одно слово): слово = реплика; очень короткое служебное
слово приклеивается к следующему («the gold», «a rich»), в конце фразы — к предыдущему («fired it»); союзы отдельно.

**Звук**: голос + музыка (приглушается под голосом, `--duck`) + шумы `--sfx файл@секунда[:дБ]` → loudnorm в два прохода →
тихий «воздух» `--bed` (иначе в паузах цифровая тишина) → контрольный замер и доводка до −14 LUFS.

**QA** (нормы — аргументы): формат 720×1280/30; длительность 58–62 с; −14 ±1 LUFS; нет тишины < −40 дБ; зрительных
событий 45–60 в минуту; окно без события ≤ 3.6 с; субтитры в зоне x 24–696, y 845–955. Сам эталон проходит все пункты:
59 событий (58 в минуту), окно 3.5 с, −14.0 LUFS.

## Ружьё на средних планах V001: `gun: '3d' | '2d'`

`options.gun` в `production/V001/film.js`. `'3d'` (по умолчанию, как в hook2) — рисованное ружьё только на общем плане
(до 0.55 с), дальше 3D-модель. `'2d'` — рисованное ружьё и на средних планах (повторяет позу 3D-ружья), 3D остаётся
в крупном плане затвора (0.84–1.62 с) и с прицеливания в объектив (1.75 с).

```
node engine/tools/render.mjs production/V001/out/film.html production/V001/out/gun/g2d --stills 24,52 --set gun=2d
node engine/tools/make.mjs production/V001 --set gun=2d        # весь хук с рисованным ружьём
```

## Известные ограничения

- **Сходство с эталоном прежнее, ~60 %** (самооценка теста hook2, независимо не проверялась): движок переносит картинку
  без изменений, слабые места те же — скала в светлой галерее читается как плитка, вспышка и попадание плоские.
- Готовы две декорации (штрек, галерея) и четыре героя. Эксперт собран по описанию из style-bible, с кадрами эталона
  не сверялся. Экстерьеров, лавки, дороги, автомобиля, вагонетки, газеты нет — их надо добавлять модулями.
- Герои нарисованы анфас (напарник — в 3/4). Ходьбы, бега и вида сбоку/сзади нет.
- Персонаж перекрывается декорацией (`occlude`) как плоскость на глубине якоря: закрыть его наполовину объектом,
  который пересекает эту плоскость, нельзя. 3D-пропсы слоя FG всегда поверх персонажей. Частицы, дым и конус света
  персонажей не закрывают — для пыли поверх героя есть 2D-завеса `explosion.veil2D`.
- `look.grade` действует только на слой окружения; персонажи и FG-пропсы им не красятся.
- Растворение (`dissolve`) рендерит обе сцены целиком — эти кадры вдвое дороже. Функции сцены должны работать и чуть
  раньше своего `from`.
- Рендер видеокарты не битово повторяем: единичные пиксели между запусками расходятся на 1–2 уровня, MP4 двух запусков
  не совпадают побайтно (так было и в hook2).
- Число «только draw()» в выводе рендера — JS-часть кадра; работа видеокарты входит в общее время на кадр.
- Правило склейки субтитров подобрано под длительности слов edge-tts +35 %; для другого голоса подстраивается `--short`.
  С эталоном совпадает статистика разбивки, а не каждая реплика.
- Музыки и шумов в движке нет — `assemble.mjs` только принимает готовые файлы. Финальный голос не выбран; edge-tts —
  черновой, ему нужна сеть.
- События в `qa.mjs` считаются по покадровой разнице: долгий наезд и смех крупным планом дают по событию на 1.5 с,
  а тихая смена эмоции событием не считается. Это оценка плотности, а не замена ручного счёта.
- Пути и поиск Python рассчитаны на эту машину (Windows, Chrome через ANGLE/D3D11).
