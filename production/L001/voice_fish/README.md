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

## Sources

- `production/L001/narration.txt`, `production/L001/narration_ru.txt`, `production/L001/script.md`
- голоса — публичная библиотека Fish Audio (`GET https://api.fish.audio/model`), документация меток — docs.fish.audio
