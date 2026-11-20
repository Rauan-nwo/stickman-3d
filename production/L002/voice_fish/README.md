# L002 — финальная озвучка Fish Audio (EN)

Английская дорожка ролика на конвейере L001 (`production/L001/voice_fish/`), скопированном без переписывания.
Модель `s2.1-pro-free` (как в L001), настройки голосов NARRATOR / HOST / JENSEN — из L001 без изменений. RU не делался.

## Что где

| файл | что это |
|---|---|
| `../make_narration.py` | `script.md` → `../narration.txt` (380 строк: фраза рассказчика или реплика `[ИМЯ] текст`) |
| `narration_directed.txt` | те же 380 строк с метками режиссуры S2 |
| `cast.json` | голос на каждого из 41 говорящего: id, имя в библиотеке Fish, speed, `f0_hz` (проба), `f0_track_hz` (дорожка), заметка |
| `cast_candidates.json`, `cast_probe.py` | кандидаты и пробы голосов (`out/cast_probe/*.mp3`, `out/cast_probe/probe.json`) |
| `role_f0.py` | медиана f0 каждой роли по её репликам в дорожке → `f0_track_hz` в `cast.json` |
| `fishlib.py`, `fish_voice.py`, `fish_mix.py`, `check_dropouts.py` | конвейер L001 (запрос и кеш, синтез → проверка → перегенерация → сведение, поиск провалов) |
| `out/voice_fish_en.mp3` | дорожка целиком |
| `out/lines_fish.json` | строки и слова с таймингами (`line, speaker, voice, text, start, end, words[{w,s,e}]`) |
| `out/fish_verify_en.json` | проверка каждой строки whisper: распознанный текст, сходство, темп |
| `out/fish_levels_en.json`, `out/dropouts_en.txt` | уровни по строкам и отчёт `check_dropouts.py` |
| `out/fish_takes_en.json`, `out/fish_cache/`, `out/fish_trim/`, `out/fish_run*_en.log` | дубли, кеш mp3, обрезанные wav, логи (в git не идут) |

## Что изменено против L001

- Пути: `L001` → `L002` (`fishlib.py` берёт пути от своего места, ключ — `raw/_secrets/fish-api-key.txt`).
- `make_narration.py`: в `script.md` L002 нет `<!-- SCRIPT END -->` — текст берётся до конца файла; фразы не режутся
  внутри цитаты `"…"` (иначе «"This is misanthropic and evil. Fix it."» и «"I was clearly wrong… leader in AI."»
  разваливались на две строки) и режутся после `."` / `?"` (раньше «…evil." Today, …» шло одной строкой).
- `fish_voice.py chapter_starts()`: начала глав ищутся по первой фразе главы, собранной тем же `make_narration.build`,
  по порядку строк. Старый способ (первые 25 букв абзаца) не находил короткие первые фразы «May 2026.», «Go back to
  April 2022.», «So, back to Thursday.». Пауза 1,0 с — перед строками 16, 21, 100, 152, 188, 258, 314, 378.

## Как пересобрать

```
python production/L002/make_narration.py                         # narration.txt из script.md (--check — сверка)
python production/L002/voice_fish/fish_voice.py all en           # синтез, проверка, перегенерация, склейка
python production/L002/voice_fish/fish_voice.py assemble en      # только склейка (по замороженной шкале lines_fish.json)
python production/L002/voice_fish/fish_voice.py assemble en --retime   # склейка с пересчётом шкалы
python production/L002/voice_fish/fish_voice.py edges en         # передубль оборванных дублей
python production/L002/voice_fish/check_dropouts.py production/L002/out/voice_fish_en.mp3 production/L002/out/lines_fish.json
python production/L002/voice_fish/role_f0.py                     # f0 ролей по дорожке
```

Поменяли строку в `narration_directed.txt` или голос в `cast.json` — пересинтезируется только она (кеш по тексту,
голосу, speed, temperature, top_p). Если в `narration.txt` меняется число строк, `narration_directed.txt` надо
поправить так же (строки 1:1). **Шкала сейчас не заморожена картинкой**: последняя сборка — `--retime`. Как только по
`lines_fish.json` начнут ставить аниматик, пересобирать только без `--retime`.

## Режиссура

Тот же стиль, что в L001: одна основная эмоция на фразу, не больше трёх меток.

- хук и концы глав — `[serious]`, `[mysterious]`, `[soft tone]`, `[break]` перед последним ударом;
- факты и цифры — `[confident]`, `[calm]`; ключевое слово — `[break]` + `[emphasis]` («…from [break] [emphasis] Elon Musk.»);
- сухой юмор рассказчика — `[sarcastic]` («Today, they rent his computers.», «Grok's did not.»);
- сценки — живая подача: Маск `[satisfied]`/`[bored]`/`[confident]`, Грок `[happy]`/`[confused]`/`[sarcastic]`,
  Дарио `[calm]`/`[curious]`, Даниэла `[sarcastic]`/`[bored]`/`[worried]`, инженеры — `[whispering]`, клерк — `[bored]`;
- ведущий (16–17, 378–380) — одним дублем на сцену, `scene_tag` `[confident]`, в строках только `[emphasis]`/`[break]`.

Частота меток: confident 69, calm 68, serious 46, emphasis 37, sarcastic 37, curious 35, mysterious 21, break 21,
bored 13, skeptical 13, satisfied 11, worried 10, confused 9 и реже прочие. Текст строк — ровно как в `narration.txt`
(сверено скриптом). Одна правка после проверки: строка 355 (ALTMAN «Either.») — `[sighing]` → `[sad]`: со вздохом
Fish добавлял «Huh, either».

## Голоса

Главные из L001 — без изменений. Остальные — публичная библиотека Fish (`GET https://api.fish.audio/model`, теги
пол/возраст, 1562 голоса → фильтр), по одной пробе на кандидата (74 пробы, реплики роли с метками), выбор по описанию, тегам
и высоте. Отсеяны: голоса с именами реальных людей и знаменитостей (в том числе все «Elon Musk», «Trump», «elon»),
клоны блогеров, персонажи игр/аниме/мультфильмов, «watermark»-голоса, теги `character-voice`. f0 — медиана YIN по
репликам роли в готовой дорожке (в эмоциональных репликах высота выше, чем на ровной пробе).

| роль | голос Fish | id | speed | f0 дорожки, Гц | кто |
|---|---|---|---|---|---|
| NARRATOR | Calm Storyteller | `e686ae649ee44f219a108aacba206c1a` | 0.96 | 92 | как в L001 |
| HOST | Leviticus Cornwall | `5a6774c58559475dac02eb2c91b26437` | 1.08 | 239* | как в L001 (клон персонажа RDR2 — риск принят Рауаном) |
| JENSEN | Alok | `b7204d4e40ef4a548c7c8547b7f73492` | 1.0 | 108 | как в L001 |
| MUSK | Jordan | `79d0bd3e4e5444b18f7b6d89b5927bf1` | 1.0 | 106 | м, ~55, зрелый, напористый (пресет Fish «motivational speaker») |
| DARIO | History Voice | `fbac16744ffa49a9a51c29b1bf19242a` | 1.0 | 142 | м, ~43, спокойный, тёплый, размеренный |
| DANIELA | Bella | `4c7e8d91253145b582ff36622ecf193c` | 1.0 | 229 | ж, ~39, тёплый, уверенный, с иронией (в L001 — WAITRESS) |
| ALTMAN | Christopher | `5242b14421644f79967a481e5debed0b` | 1.0 | 132 | м, ~41, мягкий, тихий, с придыханием |
| SBF | Nerd | `467e68c990b0404ba54e38bebc4fb5d6` | 1.1 | 186 (ровная проба 167) | м, ~30, небрежный, быстрый |
| GROK | facty! fact attack adventures | `f8fb3d11726f44849b9ebc07f499abe6` | 1.0 | 244 | игривый, дерзкий, гендерно-нейтральный |

\* у Leviticus Cornwall и в L001 высота «прыгала» 200–271 Гц — это тот же дубль-стиль, голос не менялся.

Второстепенные (id и заметки — в `cast.json`), f0 по дорожке: TRADER — Energetic Male (м, 224, азарт); TRADER 2 —
Friendly Women (ж, 167); AIDE — Paula (ж, 235); STUDENT — natasha - valley (ж, 276); REPORTER — Adam (м, 140); USER —
boy (м, 144); WORKER — adam adam (м, 144); FOREMAN — BOOK RECORD REGULAR (м, 92); ENGINEER — Alex (м, 158); ENGINEER 2 —
Women KatKat (ж, 235); COACH — Tom Pearl (м, 143; оба тренера); BOXER — Alex American Young male (м, 99); ASSISTANT —
Hannah (ж, 271; ассистент SBF и Альтмана); CUSTOMER — ADAM VOICE (м, 131); CLERK — Sheila (ж, 296); BUYER — Valentino
(м, 109); LAWYER — Measured Storyteller (ж, 163; все три сценки); INMATE — Marcus the worm (м, 102); NEIGHBOR — «Hello.
My name is Mrs. Doris» (ж, пожилая, 195); NEIGHBOR 2 — old man (calm friendly) (м, пожилой, 128); GUARD — Psychological
(м, 89); CHIP — twixxel (м, 100); CHIP 2 — Gigi (ж, 294); USHER — Lisa (ж, 208); ACCOUNTANT — w2w (м, 130); ACCOUNTANT 2
— Upbeat Woman (ж, 254); BOARD MEMBER — Woman (professional deep) (ж, 165); STAFFER — Nex Watch TV (м, 167); STAFFER 2 —
Woman woman woman (ж, 308); AMAZON BANKER — Documentary (м, британский, 114); GOOGLE BANKER — Soft (ж, 219); INTERVIEWER —
Natasa (ж, 232). Повторы голосов из L001 — только для общих ролей (трейдер, репортёр, бухгалтеры, банкир и т. п.).

## Проверка — сборка 2026-11-20

| | EN |
|---|---|
| длина дорожки | **15:13,0** (913,0 с; последняя строка кончается на 912,9 с) |
| строк / слов | 380 / 2480; темп с паузами 163 слова/мин (L001 — 165) |
| синтез | 380 запросов `s2.1-pro-free`, ни одного 402/429 |
| метка прочитана вслух | ни разу (whisper base.en по всем строкам и small.en по выбросам) |
| сходство с текстом (whisper base.en) | медиана 1,0; ниже 0,95 — 12 строк, все — написание whisper (см. ниже) |
| перегенерировано | 3 строки по тексту (104, 128, 218 — со 2-го дубля сходство 0,96 / 1,0 / 1,0) + 355 (лишний вздох) + 6 коротких по темпу |
| громкость (ebur128) | −20,2 LUFS, пик −1,2 дБFS, LRA 2,6; лимитер до 0,5 дБ |
| `check_dropouts.py` | «тише остальных» — 0, «обрыв» — 0; паузы внутри реплик ≥ 0,25 с — 69 (самые длинные 0,70–0,76 с: строка 290 `[break]` перед цитатой, 155 SBF «AI safety. Good cause.», 9 AIDE «Sir. In February…» — по замыслу) |
| `edges` | оборванных дублей нет |
| паузы | рассказчик→рассказчик 0,2 с, вокруг реплик героев 0,15 с, перед главой 1,0 с, между репликами ведущего 0,3 с |

**Выбросы сходства — не брак.** Все 12 переслушаны вторым распознаванием (whisper small.en): 47 «To what?» (base:
«So what?», small: «To what?»), 50 и 341 «Anthropic» (base: «and Tropic», «And Thorpek»; small — верно), 273 «Claude»
(base: «clawed»), 328 «Musk» (base: «mask»), 147 «Grok's» («Grox»), 316 «Amodeis» («Amadeus»), 198 «Nvidia» («in video»),
81/177/223/345 — числа цифрами («$37 billion», «3-6 months»).

**Флаги темпа — не брак.** `verify` помечает 5 строк из одного-двух слов как «медленные» (36 ALTMAN «No.», 43 «Why?»,
142 DANIELA «No.», 261 MUSK «You. Evil?», 311 MUSK «No.»): правило темпа считает буквы в секунду, на одном слове оно
не работает. Перегенерация (по второму дублю каждой) дала то же. Самые короткие реплики — «Me.» 0,40 с, «No.» 0,43 с,
«And?» 0,44 с — целые. Самая длинная — строка 290 (цитата «I was clearly wrong…»), 9,0 с.

## Решить Рауану

1. **Главные голоса** — послушать пробы в `out/cast_probe/` (MUSK_*, DARIO_*, DANIELA_*, ALTMAN_*, SBF_*, GROK_*) и
   подтвердить или выбрать другой: по всем ролям есть 4–7 кандидатов. Смена голоса → пересинтез только этой роли.
2. **GROK** — выбран игривый нейтральный голос без «робота»; если нужен заметный машинный оттенок — запасной
   «youthful male robot» (`6a34f272acc04453bc40fec158287a30`, роботизированный, ровный) или эффект на миксе.
3. **SBF** звучит молодо (f0 186 в азартных репликах) — по рисунку ему ~30; если покажется мальчишеским — запасной
   Adam (`8f0d80aa445544ff82d1237bbba7e270`) или NERD CK (`64e236afbebb43949b4efc5deffc21a6`).
4. **TRADER / TRADER 2**: мужской трейдер в азарте выше по высоте (224 Гц), чем женщина-трейдер (167 Гц); на слух
   их разводит тембр — (нужно уточнить у Рауана), не перепутаются ли.
5. «X.AI» (строка 62) и «xAI» whisper записал как «X.AI»/«XAI» — по распознаванию читается «икс-эй-ай», без «dot».
   «Amodei» звучит как «Амодэй».

## Sources

- `production/L002/script.md`, `production/L002/narration.txt`
- конвейер — `production/L001/voice_fish/` (README, cast.json, fishlib/fish_voice/fish_mix/check_dropouts)
- голоса — публичная библиотека Fish Audio (`GET https://api.fish.audio/model`), документация меток — docs.fish.audio

## Решение Рауана 2026-11-20: голос MUSK
Роль MUSK переозвучена другим голосом из публичной библиотеки Fish (выбор Рауана; было — Jordan). Id голоса — только
локально в `raw/_secrets/l002_cast_private.json` (не в git), `fish_voice.py` подмешивает его к `cast.json`.
32 реплики, брак Whisper перезаписан; шкала пересобрана `--retime` (15:07.9), раскадровка пересчитана (15:57.8).
При публикации: YouTube Studio → «Altered or synthetic content» = Yes; в описании — общая фраза о драматизации и
синтезированных голосах (без имён).
