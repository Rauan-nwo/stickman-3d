# L001 — финальная озвучка Fish Audio

Финальный голос ролика: английская дорожка для публикации и русская для прослушивания (Рауану — понять, что звучит).
Заменяет черновой голос edge-tts (`out/voice_draft.mp3`, `out/lines_draft.json`) как основу таймингов.

## Что где

| файл | что это |
|---|---|
| `voice_fish/narration_directed.txt` | 320 строк `narration.txt` с метками режиссуры Fish S2 |
| `voice_fish/narration_ru_directed.txt` | те же 320 строк по-русски (`narration_ru.txt`) с теми же метками |
| `voice_fish/cast.json` | голос на каждого из 49 говорящих: id, имя в библиотеке Fish, speed, f0 на пробе |
| `voice_fish/fishlib.py` | запрос к API, кеш, ретраи |
| `voice_fish/fish_voice.py` | синтез → проверка whisper → перегенерация → склейка → тайминги слов |
| `out/voice_fish_en.mp3` | английская дорожка целиком |
| `out/voice_fish_ru.mp3` | русская дорожка целиком (своя длина, с английской не синхронизирована) |
| `out/lines_fish.json` | EN: строки и слова с таймингами — как `lines_draft.json` (`line, speaker, voice, text, start, end, words[{w,s,e}]`) |
| `out/lines_fish_ru.json` | RU: строки с таймингами (без слов) |
| `out/fish_verify_en.json`, `out/fish_verify_ru.json` | проверка каждой строки: распознанный текст, сходство, темп |
| `out/fish_takes_*.json`, `out/fish_cache/`, `out/fish_trim/` | дубли, кеш mp3, обрезанные wav (в git не идут) |

## Как пересобрать

```
python production/L001/voice_fish/fish_voice.py all all        # всё: синтез, проверка, перегенерация, склейка
python production/L001/voice_fish/fish_voice.py synth en        # только синтез (кеш: изменённые строки синтезируются заново)
python production/L001/voice_fish/fish_voice.py verify ru       # только проверка
python production/L001/voice_fish/fish_voice.py assemble en     # только склейка и lines_fish.json
```

Поменяли строку в `narration_directed.txt` или голос в `cast.json` — пересинтезируется только она. Кеш — по тексту, голосу,
speed, temperature, top_p. Модель — `s2.1-pro-free`: API-кредит 0, платная `s2.1-pro` отвечает 402.
Долгие шаги — запускать фоном: полный прогон с нуля — около часа (две дорожки × 320 запросов + whisper на CPU).

## Режиссура

Метки S2 в квадратных скобках, одна основная эмоция на фразу, не больше трёх меток в фразе:

- хук и концы глав — `[serious]`, `[mysterious]`, `[soft tone]`, с `[break]` перед последним ударом;
- факты — `[confident]`, `[calm]`;
- раскрытия — `[break]` перед ключевым словом и `[emphasis]` на нём («It was [break] [emphasis] Jensen Huang.»);
- шутки и сценки — `[sarcastic]`, `[bored]`, `[skeptical]`;
- герои сыграны: тост — `[happy]`, агенты — `[whispering]`, чиновник — сухой `[serious]`/`[bored]`, Дженсен — тёплый
  и уверенный, письмо «I was unfaithful…» — `[sad]`, «I am proud…» — `[serious]`.

Помимо меток из документации Fish (`[happy] [calm] [confident] [sarcastic] [bored] [hopeful] [confused] [satisfied]` …)
использованы свободные `[serious] [mysterious] [skeptical] [impatient] [warm]` — S2 их понимает; проверено, что вслух они
не читаются. Единственное расхождение с чистым текстом — тост Дженсена с «!» вместо точки (строка 7, в обоих языках);
в `lines_fish.json` текст оригинальный.

## Паузы при склейке

Тишина по краям каждой реплики обрезается (порог −45 дБ), затем: рассказчик → рассказчик 0,2 с; до и после реплики
героя 0,15 с; перед первой строкой главы 1,0 с (строки 18, 26, 80, 110, 139, 173, 211, 244, 267, 318 — как в
`draft_voice.py`, по `script.md`).

## Проверка

Каждая строка распознаётся faster-whisper (EN — `base.en`, RU — `small`, CPU int8: CUDA-библиотек cuBLAS на машине нет).
Строка бракуется, если в распознанном тексте есть слово-метка (emphasis, break, sarcastic …), если сходство по буквам с
текстом сценария ниже 0,8 (RU 0,7; числа whisper пишет цифрами — перед сравнением они переводятся в слова) или если темп
выпадает из медианы. Брак перегенерируется до 4 дублей, берётся лучший.

## Результат сборки 2026-11-17

| | EN | RU |
|---|---|---|
| длина дорожки | 17:20,2 (1040,2 с) | 20:12,3 (1212,3 с) |
| темп с паузами | 165 слов/мин | 128 слов/мин |
| темп рассказчика без пауз | 179 слов/мин | 137 слов/мин |
| строк перегенерировано | 4 (4, 153, 154, 160) | 59 |
| метка прочитана вслух | ни разу | ни разу |
| медиана сходства с текстом (whisper) | 1,0 | 0,85 |

Для сравнения: черновой голос edge-tts — 18:54.

**EN** чистый. Остался один «флаг»: строка 154 (толпа, «GPU! GPU!») — 2,5 с, это скандирование, так и задумано.
Самые короткие реплики — «A lot.» (0,5 с), «He's in it.», «We're looking.», «Of him?» (~0,6 с): быстрые, но целые.
Самая длинная — строка 110 (7Road → Megaspeed), 12,1 с.

**RU** понятный, но с сильным английским акцентом: голоса англоязычные, Fish S2 читает ими русский текст «как иностранец»
(«Йо компания» вместо «Её компания»). Проба без меток и с temperature 0,6 не помогла — дело в голосах, не в режиссуре.
Хуже всего звучат 10 строк (whisper `small` и `medium` разбирает их плохо): 36 «Каждый божий день», 60, 65 «Уолл-стрит
не поняла», 70, 84, 138 «Но это скоро изменится», 165, 194 «Он включён?», 195, 299. Если русская дорожка нужна
чище — поставить в неё русские голоса из библиотеки Fish (`language=ru`); в `cast.json` для этого нужен отдельный
блок RU (нужно уточнить у Рауана).

## Голоса

Главные — выбор Рауана. Остальные подобраны из публичной библиотеки Fish по одной пробе на кандидата (80 голосов):
пол и возраст проверены по высоте голоса (f0), пары в одной сценке разведены по тембру и высоте, у каждой роли свой
голос. Клоны знаменитостей, ютуберов и персонажей игр/аниме отсеяны. Важно: два голоса из выбора Рауана сами по себе
клоны игровых персонажей — **HOST = Leviticus Cornwall** (персонаж Red Dead Redemption 2) и **ALICE = Jane Doe**
(персонаж Zenless Zone Zero, по описанию в библиотеке). Решение оставить или заменить — за Рауаном.

| роль | голос Fish | id | speed | f0, Гц |
|---|---|---|---|---|
| NARRATOR | calm storyteller male | `e686ae649ee44f219a108aacba206c1a` | 0.96 | |
| HOST | Leviticus Cornwall | `5a6774c58559475dac02eb2c91b26437` | 1.0 | |
| JENSEN (юный Дженсен — отдельный детский голос) | Alok | `b7204d4e40ef4a548c7c8547b7f73492` | 1.0 | |
| ALICE | Jane Doe | `9c90cae418834058b5aa51adb21dac41` | 1.0 | |
| AGENT | Secret Agent | `77daaa587ee54edaa5c92931b49f4fa0` | 1.0 | |

Второстепенные роли (44) с id, speed и f0 — в `cast.json`; кратко: AGENT 2 — alex; AUNT — Laura; UNCLE — BOOK RECORD
REGULAR; ROOMMATE — boy; YOUNG JENSEN — Child (детский, f0 269 Гц); WAITRESS — Bella; CHRIS — Ethan; INVESTOR —
Valentino; CUSTOMER — Energetic Male; SALESMAN — Tom Pearl; AIDE — News reporter; AIDE 2 — Sarah; OFFICER —
Psychological; OFFICER 2 — Jordan; OFFICIAL — Adrian; ASSISTANT — Paula; CLERK — Hannah; STAFFER — Nex Watch TV;
RENTER — Marcus the worm; REP — James FE; FAN — Alex; FAN 2 — Friendly Women; PHOTOGRAPHER — Larrry (Advertising);
CROWD — Energetic Crowd; ACCOUNTANT — w2w; ACCOUNTANT 2 — Upbeat Woman; BANKER — Documentary; BANKER 2 — Abby (US
audiobook); CUSTOMS — Voice DL; DRIVER — adam adam; INSPECTOR — Stoic; GUIDE — Selene; SENATOR — «Hi there — this is a
quick sample» (пожилой мужской); COMMERCE — SK1; JUSTICE — horror; REPORTER — Adam; EDITOR — Measured Storyteller;
CITIZEN — Man - Mae; BOARD — Deep Voice; CONGRESSMAN — peter; IMMIGRATION — Mp40; SPOKESMAN — ton; ANALYST — American
Tech Review Voice; ANALYST 2 — New History. Женские роли — как в черновике аниматика: AUNT, WAITRESS, ASSISTANT,
FAN 2, CLERK, ACCOUNTANT 2, EDITOR, BANKER 2, GUIDE, AIDE 2 (+ ALICE).

## Sources

- `production/L001/narration.txt`, `production/L001/narration_ru.txt`, `production/L001/script.md`
- голоса — публичная библиотека Fish Audio (`GET https://api.fish.audio/model`), документация меток — docs.fish.audio
