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

Проверка 2026-11-18 (`tools/library_scan.py`, AudioSet AST, вход 48 кГц): короткий звук — одним окном целиком, подложка — окнами 5 с. Убрано: крик/вопль/плач/стон ≥ 0.15, визг/мяуканье/блеяние/вой/лай/сова ≥ 0.15, сирена ≥ 0.20 (в помещении ≥ 0.12), плюс записи, убранные по прослушке. Поводом стал непонятный звук «крик что ли» в начале пилота, который услышал Рауан. Первый проход того же дня подавал классификатору 16 кГц вместо 48 кГц (звук в 3 раза выше) — по нему были ошибочно убраны `amb_diner_01`, `amb_port_03`, `phone_ring_02`, `ship_horn_01`; они возвращены. Полные цифры — `lib/vocal_scan.json`.

| запись | автор | страница | почему |
|---|---|---|---|
| `amb_birds_day_02` | felix.blume | https://freesound.org/people/felix.blume/sounds/328295 | Owl 0.29 (окна 5 с, @10 с) |
| `amb_cutlery_02` | Berwitz | https://freesound.org/people/Berwitz/sounds/263584 | animal Meow 0.199 @15.0s |
| `amb_night_01` | PhilllChabbb | https://freesound.org/people/PhilllChabbb/sounds/245834 | animal Owl 0.243 @55.0s |
| `amb_night_02` | kyles | https://freesound.org/people/kyles/sounds/450556 | animal Owl 0.159 @55.0s |
| `amb_restaurant_04` | kyles | https://freesound.org/people/kyles/sounds/455727 | тот самый «крик» в начале пилота: блеющий выкрик в гуле зала на 0.5–1.0 с (окна 1 с: Sheep 0.09, Meow 0.07, Animal 0.08; старый микс: Bleat 0.12, Sheep 0.10) |
