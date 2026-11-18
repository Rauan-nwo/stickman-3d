## Синтез, составные звуки и банк earshot (сделано кодом)

| что | где | лицензия | атрибуция |
|---|---|---|---|
| Процедурные звуки канала: свисты, райзеры, удары, стинги, клики, блики, звонок телефона, гул, подложки-запаски | `sound/synth.py`, рендерится при сборке | наш код; сторонних записей нет | не нужна |
| Банк earshot (`impact/*`, `riser/*`, `tap/*`, `shutter/*`, `swish/*` …) | `earshot sfx render` → `lib/cand/<класс>/bank_*.wav` | код earshot — MIT (`C:\dev\tools\earshot\LICENSE`, © 2026 Leon Lin); звук рендерится кодом, сэмплов внутри нет | не нужна |
| Банк earshot, группа `fit/*` | то же | рецепты, подогнанные под записи **CC0** с Freesound (список — `C:\dev\tools\earshot\docs\CREDITS_FIT.md`) | не нужна |
| Составные звуки `lib/cand/<класс>/layer_*.wav` (`tools/layers.py`): название ролика, титр главы, штамп | слои из строк выше + запись `stamp_01` (CC0, таблица Freesound) | как у слоёв: наш код, MIT, CC0 | не нужна |

Какой звук чем играет сейчас — `palette_rec.json` (собирают `tools/ledger_palette.py` и `tools/pick_palette.py`).

## Музыка

Музыка пилота и рекомендованная на весь фильм — **CC BY 4.0, Kevin MacLeod (incompetech.com)**: подпись автора в описании
каждого ролика обязательна. Точный текст подписи, все 29 кандидатов и их лицензии — `music/MUSIC.md`, реестр —
`music/music_ledger.json`. В пилоте гл. 0–1 звучат «Covert Affair» и «I Knew a Guy». Запас без подписи: шесть треков
CC0 с OpenGameArt (`oga-*`) и своя музыка по `music/SUNO_BRIEF.md` (Suno — только платный тариф).

## Не используется

- **ElevenLabs Sound Effects**: ключ на бесплатном тарифе — «The free plan does not include a commercial license and cannot
  be used for any commercial purpose» (справка ElevenLabs, 2026-11-17). В этой библиотеке сгенерированных звуков нет.
- **BBC Sound Effects** (лицензия RemArc: личное, учебное, исследовательское использование), записи CC BY-NC / ND / SA.
- Модели генерации с некоммерческими весами (AudioCraft/AudioGen, MMAudio — CC-BY-NC 4.0).

## Удалено после проверки на крики и визг

Проверка 2026-11-18: каждая запись прослушана классификатором AudioSet (AST, окна 1–5 с, `tools/library_scan.py`); убраны записи, где крик/вопль/плач/стон, визг/мяуканье/вой/лай или сирена выше порога (подложки, окна 5 с: 0.08 / 0.10 / 0.08 в помещении, 0.12 на улице; короткие звуки, окна 1 с: 0.15 / 0.15 / 0.12–0.20). Поводом стал непонятный звук «крик что ли» в начале пилота, который услышал Рауан. Полные цифры — `lib/vocal_scan.json`.

| запись | автор | страница | что услышано |
|---|---|---|---|
| `amb_birds_day_02` | felix.blume | https://freesound.org/people/felix.blume/sounds/328295 | animal Owl 0.158 @10.0s |
| `amb_diner_01` | ViaTorci | https://freesound.org/people/ViaTorci/sounds/66789 | animal Squeal 0.18 @45.0s |
| `amb_port_03` | sinewave1kHz | https://freesound.org/people/sinewave1kHz/sounds/207386 | siren Emergency vehicle 0.191 @15.0s |
| `amb_restaurant_04` | kyles | https://freesound.org/people/kyles/sounds/455727 | animal Squeal 0.133 @0.0s |
| `phone_ring_02` | meisterleise | https://freesound.org/people/meisterleise/sounds/332073 | animal Squeal 0.612 @0.0s |
| `ship_horn_01` | Kinoton | https://freesound.org/people/Kinoton/sounds/352374 | siren Siren 0.391 @3.0s |
