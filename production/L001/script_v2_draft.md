# L001 — черновик правок текста v2 (на утверждение Рауаном)

Статус: **черновик**. `script.md` не меняется, пока Рауан не утвердит эти строки. Утверждённые строки переносятся в
`script.md`. После этого нужно перегенерировать `narration.txt` и `narration_ru.txt`, перезаписать черновой голос и
пересобрать шотлист.

**Откуда строки.** Это биты конкурента, которых нет в нашем тексте: `compare_scenes.md`, «У конкурента есть, у нас нет»,
и сверка кадр в кадр `shot_for_shot.md`. Каждая строка написана нашими словами.

**Что проверено.** Каждый факт сверен с двумя файлами:
- `raw/research/2026-11-16-l001-factcheck.md` (дальше — ФЧ);
- `raw/research/2026-11-16-nvidia-huang-spy-story.md` (дальше — СТ).

В текст идут только confirmed и reported, и reported подаётся со ссылкой на источник («по данным…», «сообщает…»).
Факты, которых в этих файлах нет, вынесены в конец, в раздел «Нужен факт-чек». В текст они не идут.

**Длина** посчитана по темпу чернового голоса: 152 слова в минуту, то есть 2.5 слова в секунду.

## Предлагаемые добавления

| # | Куда (после строки `script.md`) | Бит конкурента | Новая строка (EN) | Слов / +с | Факт | Источник |
|---|---|---|---|---|---|---|
| A1 | гл. 2, после «As a teenager he washed dishes at Denny's.» | 1:52–2:04: «посудомойка → басбой → официант», башня тарелок | «He started at the sink and worked his way up to busboy.» | 11 / +4.4 | confirmed | ФЧ: «Denny's: посудомойщик, потом помощник официанта» |
| A2 | гл. 3, вместо «In April 2025, that one was blocked as well.» | 4:43: «And the slower ones? Those too» + списание | «In April 2025, that one was blocked as well, and Nvidia took a five-and-a-half-billion-dollar charge.» | +8 / +3.2 | confirmed | ФЧ: «H20 — апр. 2025, списание $5.5 млрд» |
| A3 | гл. 4, перед «In March 2023, a small Singapore company…» | 6:03: 7Road отделили от игрового бизнеса | «It had been registered back in 2015, under a gamer's name.» | 11 / +4.4 | confirmed (дата регистрации) | ФЧ: «Megaspeed зарегистрирована в 2015 как 7Road International» |
| A4 | гл. 5, после «…had jumped to about three billion dollars.» | 8:45: «About ninety times bigger in one year» + доходы | «Its revenue that year: about two hundred ninety-four million.» | 9 / +3.6 | confirmed (отчётность, Reuters) | ФЧ: «выручка $294 млн в 2024» |
| A5 | гл. 6, перед «That's what made it so hard to catch.» | 11:13: «Real smugglers hid chips next to live lobsters… a bust» | «Real smugglers do get caught. Prosecutors charged one Chinese national over nine hundred and seventeen smuggled servers.» | 18 / +7.2 | reported (Tom's Hardware) | СТ: «обвинение предъявлено гражданину Китая по делу о 917 серверах» |
| A6 | гл. 8, после «The memo went around before the president's trip to Beijing in May.» | 16:14: «the President had been briefed…» | «According to Axios, even Commerce Secretary Howard Lutnick got a copy.» | 11 / +4.4 | reported (Axios) | ФЧ: «получил и министр торговли Латник» |
| A7 | гл. 9, после «IMMIGRATION: Alice Huang? Entry denied.» | 18:10: реакция властей; у нас — своя | «President Trump said the FBI was looking into it.» | 9 / +3.6 | confirmed (его слова) | ФЧ: «Трамп: ФБР изучает ситуацию» |
| A8 | гл. 9, после «That day, Nvidia's stock fell as much as thirteen percent.» | 19:03: «Nvidia reports its earnings on the seventeenth…» | «And its next earnings report was due five days later.» | 10 / +4.0 | confirmed (дата отчёта 17 ноября) | СТ: «Отчёт… назначен на 17 ноября 2026» |
| A9 | гл. 9, после «Nobody has charged Jensen, Nvidia, or Alice Huang with any crime.» | 19:15: «She's gone from Megaspeed…» | «Singapore has barred her from entering the country.» | 8 / +3.2 | confirmed (МВД Сингапура) | ФЧ: «Сингапур запретил ей въезд» |

**Если принять всё**: +95 слов, примерно +38 с, ролик выйдет около 16:06 на черновом голосе.

**Что я рекомендую взять в первую очередь:**
- **A1** — даёт визуальную шутку с башней тарелок, у нас уже есть план #44 с мойкой;
- **A2** — точная цифра вместо «billions»;
- **A5** — настоящий контраст «контрабандисты против накладных», у нас уже есть сцена таможни;
- **A8** — подводка к деньгам зрителя.

A9 частично дублирует реплику IMMIGRATION в гл. 9. Брать её, только если реплику IMMIGRATION убираем.

## Нужен факт-чек (в текст не идёт, пока не подтвердим)

| Бит конкурента | Утверждение | Почему не берём сейчас |
|---|---|---|
| 0:53 | родители продали почти всё, чтобы оплатить школу | нет в ФЧ/СТ |
| 1:42 | Huang Hall, $2 млн школе Онейда | нет в ФЧ/СТ |
| 1:52 | «в 15 лет, ночные смены» в Denny's | в ФЧ только «посудомойщик, потом помощник официанта» |
| 2:31 | $200 от каждого основателя, $600 в сумме | в ФЧ прямо: «не используем» |
| 2:47 | девиз «30 days from going out of business» | нет в ФЧ/СТ |
| 2:58 | «продали около миллиона за 4 месяца» | нет в ФЧ/СТ |
| 3:18 | ChatGPT обучен на десятках тысяч чипов Nvidia | нет в ФЧ/СТ |
| 3:46 | «86 из каждых 100 долларов» на ИИ-чипы | нет в ФЧ/СТ |
| 3:48 | табличка Denny's 2023, «$1 → $8 млрд», первая компания на $5 трлн | нет в ФЧ/СТ |
| 4:43 | $17 млрд в год / 13 % выручки | в ФЧ: «не используем» |
| 4:52 | $30 000 за чип | нет в ФЧ/СТ |
| 5:09 | цитата «nanoseconds behind us» | нет в ФЧ/СТ |
| 5:24 | MSS — «ФБР и ЦРУ в одном здании» | общее знание, но в ФЧ/СТ нет; к тому же сравнение (правило 1) |
| 6:50 | Alibaba среди арендаторов | в ФЧ: «похоже, обслуживали клиентов из Китая удалённо», Alibaba не названа |
| 8:12 | залог «всё», кредитор от Alibaba | нет в ФЧ/СТ |
| 8:45 | $2.9 млрд депозитов, «refundable» | нет в ФЧ/СТ |
| 9:47 | снятие маски «an American citizen» | процедура, в ФЧ/СТ нет |
| 10:40 | $4.6 млрд / $4 млрд через Aivres | в ФЧ: **unverified — не используем** |
| 11:13 | лобстеры, арест на $160 млн в дек. 2025 | нет; вместо него A5 (917 серверов) |
| 14:14–14:56 | пустой офис New Matrix | нет в ФЧ/СТ |
| 14:56 | отказ от заказа на $3.2 млрд | в ФЧ только «перестала заказывать» (уже в тексте) |
| 15:23 | арендодатель от Bain Capital отдал мощности | нет в ФЧ/СТ |
| 15:41 | видео ужина в Тайбэе, май 2025 | нет в ФЧ/СТ |
| 16:14 | президент был проинформирован и не действовал; Air Force One на Аляске | нет в ФЧ/СТ |
| 17:02 | акции выросли на 2.78 % после утечки | нет в ФЧ/СТ |
| 17:22 | ФБР предупредило конгрессмена в 2015 | нет в ФЧ/СТ |
| 18:21 | Nvidia — 8 % индекса S&P 500 | нет в ФЧ/СТ |
| 18:39 | DeepSeek, −$589 млрд | нет в ФЧ/СТ |
| 19:12 | Алиса убрана из бумаг компании | в ФЧ: «местонахождение неизвестно», про бумаги нет |
| 19:41 | концовка письма «proud to be an American» | нет в ФЧ/СТ |

## Sources
- `raw/research/2026-11-16-l001-factcheck.md`
- `raw/research/2026-11-16-nvidia-huang-spy-story.md`
- `production/L001/compare_scenes.md`, `production/L001/shot_for_shot.md`
