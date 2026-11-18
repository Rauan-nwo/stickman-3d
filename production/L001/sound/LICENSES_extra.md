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
