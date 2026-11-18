# L001 — бриф на музыку в Suno (запасной путь к библиотечной музыке)

Статус: черновик на решение Рауана. Ничего не сгенерировано и не оплачено. Основной путь — библиотечные треки из
`MUSIC.md` (CC BY 4.0 / CC0). Suno — если библиотечные не устроят по характеру или нужна своя тема канала.

Тайминги — из `production/L001/animatic/timing.json` в версии 2026-11-17 19:01 (352 плана, фильм 17:58.4). Аниматик
ещё правят: перед генерацией сверить времена ударов с актуальным timing.json. Подход — из скилла `soundtrack`:
**музыку, которую мы не пишем сами, не двигаем — двигаем картинку**: после генерации меряем сетку тактов
(`sound/tools/music_analyze.py`) и подгоняем паузы-вставки (`inserts` в timing.json) или растягиваем трек не больше
чем на 2 %, чтобы смены глав и удары попали на сильную долю.

## 1. Условия Suno (проверено 2026-11-17)

Источники: [suno.com/terms](https://suno.com/terms) («Date of Last Revision: August 10, 2026», «Effective Date:
September 3, 2026») и справка [Upcoming Changes FAQ](https://help.suno.com/en/articles/13614785). Цитаты дословно:

- Бесплатный тариф: пользователь обязуется использовать результаты «only … for your lawful, personal and
  non-commercial purposes»; справка: «You do not get commercial rights to trial downloaded songs».
- Pro / Premier: «Suno hereby assigns to you all of its right, title and interest in and to any Output owned by Suno»;
  справка: «Pro: 20 downloads per month, with commercial use rights», «Premier: 60 downloads per month, with
  commercial use rights». Лимиты действуют «starting September 3, including songs created before that date»;
  неиспользованные скачивания не переносятся («unused downloads don't carry over»), сверх лимита — докупка.
- Коммерция — только для скачанного через тариф: «You may not commercially exploit Output that has not been
  downloaded by you through an approved channel». Права на скачанное «are perpetual and are not affected by …
  the expiry, cancellation, downgrade or suspension of your subscription».
- Неуникальность: «Output may not be unique across users and the Service may generate the same or similar output
  for a third party».
- Сторонние платформы: «Applicable rights holders may also have the right to collect revenue related to distribution
  of Outputs on third party platforms». То есть **заявка Content ID на ролик возможна**.
- Атрибуция Suno в условиях не требуется. Запрещено удалять водяные знаки и метаданные: «not to remove, alter,
  obscure or circumvent any fingerprint, watermark or metadata Suno appends».
- Что будет с треками, созданными на бесплатном тарифе, после перехода на Pro, условия прямо не говорят.

**Вывод для монетизируемого канала:** генерировать и скачивать только на Pro (20 скачиваний/мес хватает на 12–13
реплик этого ролика плюс дубли) или Premier. Треки, сделанные на Free, в ролик не брать. Сами в Content ID треки
Suno не регистрировать: из-за неуникальности это создаёт споры с чужими роликами. Скриншот страницы тарифа и дату
скачивания держать рядом с файлами. Цена тарифа и оплата — решение Рауана (нужно уточнить у Рауана).

## 2. Звук «Стикман Нуар» — общие правила для всех реплик

- Одна семья тональностей: **D minor** (тема ведущего, Сингапур, финал) и **A minor** (шпионские и холодные
  реплики), тёплые воспоминания — **F major** (родственная D minor). Так стыки глав не режут слух.
- Палитра: контрабас, щётки по малому, тихий райд, приглушённая труба (Harmon mute), Rhodes, низкое фортепиано,
  пиццикато струнных, вибрафон, редкий тенор-сакс. Дождь — эффектами из звуковой дорожки, не в музыке.
- **Под голосом — пусто в 1–4 кГц**: мелодия низко или только в паузах между фразами. В каждый стиль входят слова
  «sparse underscore for narration, melody only between phrases».
- Без вокала, хора, EDM, трэп-хэтов, ярких синт-лидов, гитарных соло, «эпических» барабанов.
- Темы-лейтмотивы: тема ведущего (M2) возвращается в M6 «Сингапур» и M12 «Финал»; фортепианный мотив Кентукки (M3)
  возвращается в M11 на флешбэке Denny's (989 с). В Suno это делается функцией кавера («Cover») или продлением
  («Extend») от выбранного дубля, без повторной генерации с нуля (функции — по памяти, перепроверить в интерфейсе).

**Как вставлять:** поле Style — строка «Style»; поле Exclude (если есть на тарифе) — строка «Exclude»; в поле
Lyrics — блок «Structure»; переключатель Instrumental — включён. Тег `[Instrumental]` в начале структуры дублирует
переключатель. Таймингов по секундам Suno не держит: длину и места смен задаём числом тактов в тегах, генерируем
с запасом (трек длиннее реплики), лишнее режем по тактам.

## 3. Реплики по главам

Колонки «такт N = t» — где должна стоять сильная доля при заданном темпе, если реплика начинается в «старт».
Погрешность до ±1.5 с снимается сдвигом пауз-вставок или растяжкой ≤2 %.

| Реплика | Глава / время фильма | Темп, размер, такт | Тональность | Удары (такт → время фильма) |
|---|---|---|---|---|
| M1 Rain Table | 0 «A Table in Singapore», 0.00–44.53 | 86, 4/4, 2.791 с | A minor | такт 17 = 44.65 (лампа ведущего 44.53) |
| M2 Host / The Key | 1 «The Office», 44.53–69.60 | 92, 4/4, 2.609 с | D minor | такт 9 = 65.40 — **стинг названия ролика (≈65.3, пауза голоса 65.15–67.30)** |
| M3 Kentucky | 1→2, 70.08–186.63 | 72, 4/4, 3.333 с | F major | такт 2 = 73.41 — **титр «2. THE MAN WITH THE KEY»** (без голоса 72.70–75.51); такт 20 = 133.41 (кухня Denny's 134.58) |
| M4 The Rise | 2, 186.63–247.65 | 96, 4/4, 2.500 с | F major → D minor | такт 7 = 201.63 (зал 202.38); такт 17 = 226.63 (дата-центр 226.98); такт 25 = 246.63 (Пекин/Вашингтон 247.65) |
| M5 Locked Door | 2→3, 247.26–352.70 | 60, 4/4, 4.000 с | A minor | такт 5 = 263.26 — **титр «3. THE LOCKED DOOR»**; такт 23 = 335.26 (Пекин 334.46) |
| M6 The Cover | 4, 352.70–448.79 | 92, 4/4, 2.609 с | D minor | такт 1 = 352.70 — **титр «4. THE COVER»**; такт 20 = 402.27 (шутка «сдаём в аренду» 403.25) |
| (тишина) | 5, 448.79–453.30 | — | — | **титр «5. THE INTRODUCTION» на тишине** (450.59) |
| M7a Computex & Whisky | 5, 453.30–511.16 | 96, 4/4, 2.500 с | D minor | такт 15 = 488.30 (бар в Тайбэе 488.78); такт 24 = 510.80 (доска 511.16) |
| M7b The Board | 5, 511.16–555.98 | 107, 4/4, 2.243 с | A minor | такт 21 = 556.02 — **титр «6. THE PIPELINE»** (555.98) |
| M8 The Pipeline | 6, 555.98–690.82 | 120, 4/4, 2.000 с | A minor | такт 22 = 597.98 (таможня 598.93); такт 34 = 621.98 (дата-центр 621.57); такт 51 = 655.98 (нераспакованные коробки 656.30); такт 66 = 685.98 (улица 686.23) |
| M9 The Real Prize | 7, 690.82–816.02 | 100, 4/4, 2.400 с | A minor | такт 1 = 690.82 — **титр «7»**; такт 32 = 765.22 (Пекин 765.10); такт 47 = 801.22 (дата-центр 801.20) |
| M10 The Memo | 8, 816.02–901.90 | 60, 4/4, 4.000 с | A minor | такт 1 = 816.02 — **титр «8»**; такт 15 = 872.02 (редакция NYT 872.74) |
| M11 The Empty Chair | 9, 901.90–1066.29 | 76, 4/4, 3.158 с | D minor | такт 1 = 901.90 — **титр «9»**; такт 29 = 990.32 (Denny's 989.43); такт 47 = 1047.16 (повтор ресторана 1047.38); такт 52 = 1062.95 (карточка 1064.00) |
| M12 Outro | 10, 1066.01–1078.45 | 92, 4/4, 2.609 с | D minor | такт 5 = 1076.45 — последний аккорд на гаснущей лампе (план без голоса 1076.45–1078.45) |

### M1 — Rain Table (холодное начало, 0–44.5 с)

Style:
```
dark film noir underscore, instrumental, 86 BPM, A minor, slow upright bass pulse on every beat, clock-like rimshot ticks, brushed snare, muted trumpet low sparse phrases, low Rhodes chords, late-night rainy city tension, surveillance thriller, sparse underscore for narration, melody only between phrases, dry close mics, dark room reverb, 1950s detective film meets modern documentary
```
Exclude: `vocals, choir, lyrics, EDM, trap hi-hats, dubstep, bright synth lead, guitar solo, epic drums`

Structure:
```
[Instrumental]
[Intro: 4 bars, upright bass pulse and soft clock ticks only]
[Verse: 8 bars, brushes enter, low muted trumpet phrase, Rhodes chords]
[Build: 4 bars, pizzicato strings join, tension rises, no drums fill]
[Stop: bass and low piano hit, then silence]
[End]
```
Монтаж: 16 тактов = 44.65 с. Последний такт — стоп-удар, тишина на «Not tonight.» и щелчке лампы (44.53).
Правило скилла: на сильную долю смены — смена гармонии, не громкость (не больше +6 дБ к предыдущей секунде).

### M2 — Host / The Key (тема ведущего, 44.5–69.6 с; источник лейтмотива)

Style:
```
cool noir jazz combo, instrumental, 92 BPM, D minor, walking upright bass, brushes and soft ride cymbal, Harmon-muted trumpet theme, vibraphone comping, smoky late-night office, wry and confident, sparse underscore for narration, melody only between phrases, warm vintage recording, ends with a single punchy final chord
```
Exclude: как в M1.

Structure:
```
[Instrumental]
[Intro: 1 bar, bass pickup]
[Theme: 7 bars, muted trumpet melody, brushes]
[Final hit: big sustained chord with cymbal swell, trumpet fall]
[Outro: 2 bars, ringing tail fades]
[End]
```
Монтаж: старт 44.53 (лампа), финальный удар на такте 9 = 65.40 — стинг названия ролика (≈65.3) в паузе после
«Washington». Хвост гаснет к 69.6, где начинается Кентукки. Этот дубль — эталон темы: из него делаются M6 и M12.

### M3 — Kentucky (тёплые воспоминания, 70.1–186.6 с)

Style:
```
warm nostalgic solo piano, instrumental, 72 BPM, F major, gentle felt piano, soft upright bass enters later, light brushes in second half, small-town memory, childhood, hopeful but humble, slightly worn vintage tone, sparse underscore for narration, low and mid register melody
```
Exclude: `vocals, choir, strings swell, EDM, synth, drums fill, bright high piano runs`

Structure:
```
[Instrumental]
[Intro: 1 bar pickup]
[Theme: 8 bars, solo piano motif]
[Verse: 10 bars, piano with soft bass]
[Bridge: 8 bars, brushes enter, diner warmth]
[Verse 2: 8 bars, theme returns, fuller]
[Outro: soft ending]
[End]
```
Монтаж: начало под «His first job in America was» (70.08), такт 2 = 73.41 — титр «2. THE MAN WITH THE KEY» (музыка
без голоса 72.70–75.51). Мост с щётками — на Denny's (кухня 134.58, зал 141.23). Если дубль короче 117 с — Extend с конца
Verse 2.

### M4 — The Rise (Nvidia поднимается, 186.6–247.7 с)

Style:
```
noir jazz building from piano trio to full combo, instrumental, 96 BPM, F major turning to D minor, steady upright bass, brushes to sticks on ride, vibraphone and muted trumpet, momentum, ambition, documentary underscore, sparse in the upper mids, ends on an ominous suspended chord
```
Structure:
```
[Instrumental]
[Intro: 2 bars, piano and bass]
[Verse: 8 bars, trio groove]
[Build: 8 bars, vibraphone and trumpet enter, energy rises]
[Peak: 6 bars, full combo]
[Turn: 1 bar, harmony darkens to minor, suspended chord holds]
[End]
```
Монтаж: такт 7 ≈ 201.6 (зал 202.4), такт 17 ≈ 226.6 (дата-центр 227.0), такт 25 ≈ 246.6 — поворот в минор на сплите
Пекин/Вашингтон (247.65), оттуда стык в M5.

### M5 — The Locked Door (холодный Вашингтон, 247.3–352.7 с)

Style:
```
cold bureaucratic minimal drone, instrumental, 60 BPM, A minor, low string pad and bowed bass drone, ticking clock pulse on every beat, distant typewriter-like clicks, sterile government office, unease, very sparse, no melody in the upper mids, slow evolving texture, subtle low brass swells every 8 bars
```
Exclude: `vocals, choir, EDM, beat drop, melody lead, guitar, epic drums`

Structure:
```
[Instrumental]
[Intro: 4 bars, clock ticks and low drone]
[Section A: 8 bars, drone with soft low brass swell]
[Section B: 8 bars, pulse tightens, muted piano low notes]
[Section C: 6 bars, tension holds, sparse]
[Stop: lock clank, silence]
[End]
```
Монтаж: такт 5 = 263.26 — титр «3. THE LOCKED DOOR». Конец — к 352.7 (такт 27.4): режем на такте 27 (351.26)
и даём хвосту звенеть до титра «4».

### M6 — The Cover (Сингапур, Megaspeed, 352.7–448.8 с)

Cover/Extend от M2 (та же тема, ночной сингапурский вариант). Style:
```
cool noir jazz, instrumental, 92 BPM, D minor, walking upright bass, brushes, muted trumpet and tenor sax trade the theme, Rhodes, neon-lit rainy Singapore night, sly and smooth, sparse underscore for narration, melody only between phrases
```
Structure:
```
[Instrumental]
[Title hit: 1 bar]
[Theme: 8 bars, muted trumpet]
[Verse: 10 bars, tenor sax answers, light]
[Break: 1 bar, stop-time for a joke]
[Verse 2: 12 bars, theme returns]
[Outro: 4 bars, final button chord]
[End]
```
Монтаж: такт 1 = 352.70 (титр «4»), стоп-тайм на такте 20 ≈ 402.3 под шутку про аренду (403.25), финальный аккорд
на такте 37 ≈ 446.6, хвост до 448.8, затем **тишина** под титр «5» (450.59).

### M7a — Computex & Whisky (453.3–511.2 с) и M7b — The Board (511.2–556.0 с)

M7a Style:
```
lounge noir jazz, instrumental, 96 BPM, D minor, piano trio with brushes, clinking late-night hotel bar warmth with a hint of suspicion, vibraphone, soft muted trumpet answers, sparse underscore for narration
```
M7a Structure: `[Instrumental] [Intro: 2 bars] [Verse: 12 bars, trio] [Bar scene: 9 bars, vibraphone and trumpet, intimate] [Stop] [End]`
— такт 15 ≈ 488.3 (бар в Тайбэе 488.78), стоп на такте 24 ≈ 510.8.

M7b Style:
```
spy suspense underscore, instrumental, 107 BPM, A minor, pizzicato strings ostinato, low staccato cellos, soft tick percussion, muted piano stabs, investigation board, photographs, red string, dramatic irony, sparse in the upper mids, ends with a sharp short hit
```
M7b Structure: `[Instrumental] [Intro: 2 bars, pizzicato] [Verse: 8 bars] [Build: 8 bars, cellos join] [Rise: 2 bars] [Hit] [End]`
— удар на такте 21 = 556.02 — титр «6. THE PIPELINE» (555.98).

### M8 — The Pipeline (контрабанда, 556.0–690.8 с)

Style:
```
driving investigative pulse, instrumental, 120 BPM, A minor, relentless eighth-note muted bass ostinato, low staccato strings, tight brushed snare and rim, ticking hi-hat, occasional muted trumpet stabs, shipping containers, customs, money trail, propulsive but restrained documentary underscore, nothing bright in the upper mids
```
Exclude: `vocals, choir, EDM drop, dubstep, rock guitar, epic drums, synth lead`

Structure:
```
[Instrumental]
[Title hit: 1 bar]
[Pulse: 12 bars, bass ostinato and rim]
[Verse: 8 bars, staccato strings]
[Section B: 12 bars, pulse continues, trumpet stabs]
[Break: 1 bar]
[Section C: 16 bars, full pulse]
[Climax: 14 bars, strings rise, tension peaks]
[Stop: hit and silence]
[End]
```
Монтаж: таможня ≈ такт 22 (598.0), дата-центр ≈ такт 34 (622.0), нераспакованные коробки ≈ такт 51 (656.0),
финальный удар ≈ такт 66 (686.0) перед фразой про «счета». Если Suno сократит — Extend с середины Section C.

### M9 — The Real Prize (влияние, 690.8–816.0 с)

Style:
```
spy suspense underscore, instrumental, 100 BPM, A minor, pizzicato strings and low clarinet, walking bass, light brushes, chess-game tension between two capitals, wry and intelligent, sparse underscore for narration, melody only between phrases
```
Structure: `[Instrumental] [Title hit: 1 bar] [Verse: 16 bars] [Section B: 14 bars, darker] [Verse 2: 15 bars] [Build: 6 bars] [Stop] [End]`
— Пекин ≈ такт 32 (765.2), дата-центр ≈ такт 47 (801.2), стоп к 816.0 (титр «8»).

### M10 — The Memo (секретный меморандум, 816.0–901.9 с)

Style:
```
cold minimal suspense, instrumental, 60 BPM, A minor, low drone, ticking clock, sparse low piano notes, distant typewriter rhythm in the second half, closed-door meeting, classified memo, newsroom deadline building, no melody in the upper mids
```
Structure: `[Instrumental] [Title hit: 1 bar] [Drone: 13 bars, clock ticks] [Newsroom: 6 bars, typewriter rhythm, pulse rises] [Stop: paper slam] [End]`
— редакция ≈ такт 15 (872.0), стоп к 901.9 (титр «9»).

### M11 — The Empty Chair (финальный нарастающий блок, 901.9–1066.3 с)

Style:
```
dark noir build, instrumental, 76 BPM, D minor, starts with lonely piano and bowed bass, slowly adds low strings, brushes, muted trumpet theme, gradual build over three minutes to a restrained climax, then a sudden quiet, empty chair, unanswered question, cinematic documentary finale, sparse in the upper mids under narration
```
Structure:
```
[Instrumental]
[Intro: 4 bars, lonely piano]
[Verse: 8 bars, bowed bass joins]
[Memory: 8 bars, warm piano motif callback]
[Build: 8 bars, low strings and brushes]
[Build 2: 10 bars, muted trumpet theme, rising]
[Climax: 12 bars, full but restrained]
[Drop to silence: 1 bar]
[End]
```
Монтаж: «Memory» ставим на флешбэк Denny's ≈ такт 29 (990.3; план с 989.43) — сюда же лучше всего лег бы мотив M3 (Cover от M3),
повтор ресторана/улицы ≈ такт 47 (1047.2) — пик, на карточке 1064.0 — обрыв в тишину, затем M12.

### M12 — Outro (ведущий кладёт ключ, 1066.0–1078.45 с)

Cover/Extend от M2: последние 4 такта темы ведущего. Style как у M2 плюс `short ending, final button chord, lamp
goes out`. Structure: `[Instrumental] [Theme: 4 bars, muted trumpet] [Final chord: hold and fade] [End]`.
Старт 1066.01 (за 0.28 с до первой реплики ведущего), последний аккорд — такт 5 = 1076.45, на гаснущей лампе; хвост до 1078.45.

## 4. Как резать под картинку

1. На каждую реплику — 2 генерации (4 дубля). Скачать WAV только выбранного дубля (на Pro скачивание = из лимита).
2. Прогнать `sound/tools/music_analyze.py` → темп, сетка тактов, разделы, петли, громкость по 5 с, доля 1–4 кГц.
   Если темп ушёл от заданного больше чем на 2 % — пересчитать такты из таблицы выше по фактическому темпу.
3. Резать только по сильным долям: склейка внутри реплики — кроссфейд 30–80 мс ровно на доле; удлинение петлёй —
   с конца такта B на начало такта A, где `loops[].similarity` из анализа выше 0.6.
4. Смены глав — правило скилла: смена гармонии на сильной доле, без всплеска громкости (не больше +6 дБ против
   предыдущей секунды; проверка `sync-check.mjs` из скилла `javascript-animation`/`soundtrack`).
5. Под голосом: провал −3 дБ в районе 2.5 кГц на шине музыки и приглушение (sidechain) на 6–9 дБ, когда звучит
   голос; на титрах без голоса музыку поднимать. Отправная точка, проверять замером и слухом.
6. Если удар не попал (±0.1 с) — сдвинуть паузу-вставку в `timing.json` (картинка следует за музыкой), а не резать
   музыку посреди такта.

## Sources

- `production/L001/animatic/timing.json`, `production/L001/outline.md`
- [suno.com/terms](https://suno.com/terms) (ревизия 2026-08-10, действует с 2026-09-03), прочитано 2026-11-17
- [help.suno.com — Upcoming Changes FAQ](https://help.suno.com/en/articles/13614785), прочитано 2026-11-17
- скилл `soundtrack` (`SKILL.md`, `references/ai-music.md`)
