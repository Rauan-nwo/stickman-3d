# L001 — финальная озвучка Fish Audio

Финальный голос ролика: английская дорожка для публикации и русская для прослушивания (Рауану — понять, что звучит).
Заменяет черновой голос edge-tts (`out/voice_draft.mp3`, `out/lines_draft.json`) как основу таймингов.

## Что где

| файл | что это |
|---|---|
| `voice_fish/narration_directed.txt` | 320 строк `narration.txt` с метками режиссуры Fish S2 |
| `voice_fish/narration_ru_directed.txt` | те же 320 строк по-русски (`narration_ru.txt`) с теми же метками |
| `voice_fish/cast.json` | EN: голос на каждого из 49 говорящих: id, имя в библиотеке Fish, speed, f0 на пробе |
| `voice_fish/cast_ru.json` | RU: родные русские голоса Fish на тех же 49 говорящих |
| `voice_fish/host_takes.py`, `voice_fish/host_takes/` | пробы ведущего одним дублем (выбран дубль 1, Leviticus Cornwall) |
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

## Результат сборки 2026-11-17 (финал: ведущий одним дублем на сцену, RU — родные русские голоса)

| | EN | RU |
|---|---|---|
| длина дорожки | 17:18,9 (1038,9 с) | 20:07,7 (1207,7 с) |
| темп с паузами | 165 слов/мин | 128 слов/мин |
| строк перегенерировано | 4 (4, 153, 154, 160) | 6 (165, 168, 219, 298, 303, 305) |
| метка прочитана вслух | ни разу | ни разу |
| медиана сходства с текстом (whisper) | 1,0 | 1,0 |

Для сравнения: черновой голос edge-tts — 18:54.

**EN** чистый. Остался один «флаг»: строка 154 (толпа, «GPU! GPU!») — 2,5 с, это скандирование, так и задумано.
Самые короткие реплики — «A lot.» (0,5 с), «He's in it.», «We're looking.», «Of him?» (~0,6 с): быстрые, но целые.
Самая длинная — строка 110 (7Road → Megaspeed), 12,1 с. При пересборке под ведущего изменились только строки 18–21 и
318–320, остальные 313 строк взяты из кеша без изменений.

**RU** переозвучен родными русскими голосами (`cast_ru.json`) — акцента больше нет. Три строки whisper «бракует»
только из-за цифр (165 «294 миллионов», 168 «в 90 раз», 303 «14%») — текст прочитан верно. Строка 50 распознана
как «Кофе есть в минуту» (вместо «в меню») — стоит послушать. Прежний вариант с англоязычными голосами —
`out/fish_takes_ru.accented_en_voices.json` (только список дублей).

## Ведущий: один дубль на сцену

Каждая сцена ведущего (строки 18–21 и 318–320) синтезируется одним запросом: `scene_tag` из cast (`[confident]`) на
весь дубль, в самих строках только `[emphasis]`/`[break]`, temperature 0.5 / top_p 0.55, speed 1.08 (EN). Дубль режется
по словам whisper посередине пауз, края чистятся, между репликами сцены — 0,3 с. Глава 1 в EN — ровно дубль 1, который
выбрал Рауан (тот же кеш). Ведущий EN — Leviticus Cornwall: Рауан знает, что это клон персонажа RDR2, и принимает риск.

## Голоса

Главные — выбор Рауана. Остальные подобраны из публичной библиотеки Fish по одной пробе на кандидата (80 голосов):
пол и возраст проверены по высоте голоса (f0), пары в одной сценке разведены по тембру и высоте, у каждой роли свой
голос. Клоны знаменитостей, ютуберов и персонажей игр/аниме отсеяны. Важно: два голоса из выбора Рауана сами по себе
клоны игровых персонажей — **HOST = Leviticus Cornwall** (персонаж Red Dead Redemption 2) и **ALICE = Jane Doe**
(персонаж Zenless Zone Zero, по описанию в библиотеке). Leviticus Рауан оставил осознанно; по Jane Doe — (нужно уточнить у Рауана).

| роль | голос Fish | id | speed | f0, Гц |
|---|---|---|---|---|
| NARRATOR | calm storyteller male | `e686ae649ee44f219a108aacba206c1a` | 0.96 | |
| HOST | Leviticus Cornwall (одним дублем на сцену, t 0.5 / top_p 0.55) | `5a6774c58559475dac02eb2c91b26437` | 1.08 | |
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

## Пробы ведущего (выбран дубль 1)

Рауан: «тональность резко меняется и в такт не попадает». Причина — каждая реплика ведущего синтезировалась отдельным
запросом со своей меткой: высота голоса по строкам 18–21 прыгала 176–340 Гц. Новые дубли (`host_takes.py`):
все 4 реплики главы 1 — **один запрос**, одна метка `[confident]` на весь дубль, ударения только `[emphasis]` (box,
chips, key), temperature 0.5 / top_p 0.55; дубль режется по словам whisper, реплики склеены через 0.3 с, темп
подогнан под ~155 слов/мин. Метки вслух не прочитаны ни в одном дубле.

| файл | голос | id | speed | длина | слов/мин | f0 по репликам, Гц |
|---|---|---|---|---|---|---|
| `host_takes/1_LeviticusCornwall.mp3` | Leviticus Cornwall (клон персонажа RDR2 — риск для монетизации) | `5a6774c58559475dac02eb2c91b26437` | 1.08 | 13,1 с | 161 | 271 / 200 / 229 / 204 |
| `host_takes/2_OldRadio.mp3` | Old radio — трансатлантический радиоконферансье, шоумен | `190fab3282be4b97bf07c272c86814e2` | 1.0 | 13,3 с | 158 | 271 / 232 / 246 / 242 |
| `host_takes/3_DavidBritishStoryteller.mp3` | David - British Storyteller — зрелый, тёплый, британский | `72324f5951924b2eb27faaf5630153b4` | 1.14 | 13,7 с | 154 | 109 / 105 / 86 / 115 |
| `host_takes/4_BrianBritish.mp3` | Brian British — утончённый британский, самый ровный | `65c0b8155c464a648161af8877404f11` | 1.0 | 13,5 с | 155 | 90 / 89 / 82 / 82 |

Запасной: `out/host_spare/BritishStoryteller.mp3` (British Storyteller, `1d304964fcfe4c5998cfe7b7298aa727`, f0 131–133).
Подробности — `host_takes/takes.json`. Рауан выбрал дубль 1 (Leviticus Cornwall); метод перенесён в `fish_voice.py` для всех сцен ведущего.

## Голоса RU (`cast_ru.json`)

Родные русские голоса из библиотеки Fish (`language=ru`), по одной пробе на кандидата (95 голосов): whisper `small`
разбирает пробу без ошибок, пол проверен по высоте (женские — f0 ≥ 180 Гц, мужские ≤ 165 Гц, чтобы не попасть на
голос с неверной меткой пола). Голоса с именами знаменитостей, блогеров и персонажей отсеяны. Русской «толпы» в
библиотеке нет — CROWD оставлен англоязычный Energetic Crowd («Видеокарта! Видеокарта!» распознаётся чисто).

| роль | голос Fish | id | speed | f0, Гц |
|---|---|---|---|---|
| NARRATOR | Russian | `fa3e3b7d3c2a44d88d9f018bc45db1ce` | 1.04 | 84 |
| HOST | Wan04 | `61a282fd80014a9d9e98af25b6c3a8ef` | 1.08 | 134 |
| JENSEN | Вдумчивый Мужской Голос | `05affa5285c34563937c4f25eed3f130` | 0.96 | 126 |
| ALICE | картье | `e1fe0abac1ff43f1a21187b2a5e0d9c7` | 0.98 | 192 |
| AGENT | Max wise | `c6fba1388e6b47d68be886441ccc3674` | 1.12 | 87 |
| AGENT 2 | Парень | `419b5f8f5ce743a8a14654f3f9cf5ba0` | 1.0 | 116 |
| AUNT | КАТЯ О | `3d421e49cae44556a9b93d610e979cfe` | 0.9 | 184 |
| UNCLE | Анатолий | `563736b1eb904cb29572f5eb5d9c46d2` | 1.0 | 132 |
| ROOMMATE | Подросток | `1815048e71504b989206225ff23a3516` | 1.08 | 119 |
| YOUNG JENSEN | Голос мальчика | `76d4aadd0fdf40fabdf0364a70efb99e` | 1.0 | 136 |
| WAITRESS | Девушка | `a7b8d6d0a7b84fe093822d5d2877b002` | 1.06 | 203 |
| CHRIS | Молодой Аналитик | `868377a7b08f4c0d9acf8c9f059571aa` | 0.96 | 123 |
| INVESTOR | Мужской | `4f5636abab7145598e4c2d613fe4813f` | 0.96 | 110 |
| CUSTOMER | Игровой Рассказчик | `ad345871bcbd4ab0af5f3af9940287d2` | 0.9 | 165 |
| SALESMAN | Дерзкий Парень | `6ada82e315e648b6a30a2e2210844cbf` | 0.94 | 110 |
| AIDE | точно | `f175cd7c61de4898960f1fa4b8044124` | 0.96 | 137 |
| OFFICER | Мощный русский голос | `8336207c3431432cb60e8851e78ba437` | 0.94 | 142 |
| OFFICER 2 | Brian | `a611cca7a2034922b9cc7fd9f44b61fd` | 1.12 | 94 |
| OFFICIAL | С | `34e963c56d11421889e3c31b05ea33f7` | 1.12 | 148 |
| ASSISTANT | Полина Polina | `bf75c2e80b0e441485eeec20330a75fa` | 0.94 | 186 |
| CLERK | Женский Голос | `345193fc9ae942888141767d2bc9c4c9` | 0.96 | 203 |
| STAFFER | Артём Artyom | `b871e425b6c0442baa5cf73f6c336bbe` | 0.9 | 113 |
| RENTER | Мужской | `e89993ec089b4ff5ad397c0acbdb0877` | 1.0 | 87 |
| REP | Nikolay | `eb06e4b6ea8e4069bd7e574ba35d289b` | 1.04 | 150 |
| FAN | Молодой Рассказчик | `22f1ef912fa04918944a848e3e831d9e` | 0.9 | 113 |
| FAN 2 | Энергичная собеседница | `1b2a928d297c4d649de2ef500be1d59c` | 1.04 | 211 |
| PHOTOGRAPHER | Энергичный Рассказчик | `48ec28a45588422b977a86460c11977f` | 0.9 | 134 |
| ACCOUNTANT | Бот Максим | `0a438fbf645d4b84b83f763fd8617dc6` | 1.12 | 113 |
| ACCOUNTANT 2 | Девушка | `69b8fcfee5be4fd78e44078dbe39d8e6` | 1.0 | 221 |
| BANKER | Опытный Диктор | `c0ad8bbb01ed4ad5aac75bf6d0fa294d` | 1.1 | 131 |
| BANKER 2 | женский | `682f9e9fa02d47c1a9b15115038fa0ef` | 0.94 | 205 |
| CUSTOMS | Опытный Диктор | `a8c4213986e041ca92026419d81badf1` | 1.08 | 126 |
| DRIVER | Егор Egor | `de9a2c99fcee4dfbbaec90327eab36d8` | 1.08 | 102 |
| INSPECTOR | Мужской Рассказчик | `15744b178a9944f6b5a4f7a9f3556309` | 1.0 | 128 |
| GUIDE | Приятный женский голос | `86bf8939ad424601b5202d8109e8acec` | 1.12 | 190 |
| SENATOR | Опытный Мужской Голос | `f0204d13a1264265809a24c656553b3e` | 1.0 | 137 |
| COMMERCE | Обычный Голос | `5c29f23e8d0848b880a57397df6e8692` | 1.0 | 125 |
| JUSTICE | Мужской голос рассказчика | `b199cff0e9ec47559e9bf207acb8f92e` | 1.0 | 79 |
| AIDE 2 | Кира Kira | `911cdc7841634850ba72d88f5ed8c576` | 1.12 | 239 |
| REPORTER | Мужской Профессиональный213 | `7312c38557eb4fb384e3874e8e9cea67` | 1.12 | 120 |
| EDITOR | Мария Maria | `7adab54c80d34cba8c11463ab1502c9a` | 1.08 | 203 |
| CITIZEN | Спокойный Мужской Голос | `cfd7057a69204777af3a570d3e3ef164` | 1.0 | 90 |
| BOARD | Тик ток | `99b95f49173d4660b73ae59799867e51` | 1.0 | 143 |
| CONGRESSMAN | Уверенный Мужской Голос | `0a3fdc100457433bbd7f9ef94d4d0106` | 0.96 | 143 |
| IMMIGRATION | Дмитрий Dmitri | `2911dfe1c9d54419b24ed8c4a1489355` | 1.12 | 132 |
| SPOKESMAN | Игорь Igor | `55ece81d65564775ab448bab3b525599` | 1.06 | 121 |
| ANALYST | Замена 1 | `172565be42474bf093d16c9b60885357` | 0.9 | 152 |
| ANALYST 2 | Кава | `c5a116bd8e394797961147c518222431` | 1.12 | 108 |
| CROWD | Energetic Crowd (англоязычная толпа — русской нет) | `35a41c4c9e754e49a124a4bab5aa47e6` | 1.0 |  |

## Sources

- `production/L001/narration.txt`, `production/L001/narration_ru.txt`, `production/L001/script.md`
- голоса — публичная библиотека Fish Audio (`GET https://api.fish.audio/model`), документация меток — docs.fish.audio
