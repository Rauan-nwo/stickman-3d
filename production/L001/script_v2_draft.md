# L001 — черновик правок текста v2 (на утверждение Рауаном)

Статус: **A1–A9 приняты Рауаном 2026-11-17 и внесены в script.md** (A3 и A5 вплетены в соседние фразы). B1–B28 тоже приняты Рауаном 2026-11-17 и внесены (B13–B14 вплетены рядом с A5, B18–B19 — отдельный абзац после меморандума, B27–B28 — в абзац «Nobody has charged…»; B28 сверен с заголовком CNN 12.11.2026). `script.md` не меняется, пока Рауан не утвердит эти строки. Утверждённые строки переносятся в
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

Статусы всех 30 пунктов после проверки 17.11 лежат в `raw/research/2026-11-17-l001-factcheck-2.md` (дальше — ФЧ2), раздел 1.

## Добавления после факт-чека (B-строки)

Источник фактов — ФЧ2. В скобках указан номер пункта в его таблице. Темп тот же: 2.5 слова в секунду. Reported
подаётся со ссылкой на источник прямо в строке. Номера строк — по текущему `script.md`.

| # | Куда (после строки `script.md`) | Бит конкурента | Новая строка (EN) | Слов / +с | Факт | Источник |
|---|---|---|---|---|---|---|
| B1 | гл. 1, после «HOST: Inside, the most wanted chips on Earth.» | 4:52: $30 000 за чип | «HOST: Thirty grand apiece, by the maker's own count.» | 8 / +3.2 | confirmed (Хуанг, CNBC 2024: $30–40 тыс.) | ФЧ2 п. 11 |
| B2 | гл. 2, после «…picked a boarding school in rural Kentucky.» | 0:53: родители продали всё | «To pay for it, according to biographer Tae Kim, his parents sold nearly everything they owned.» | 16 / +6.4 | reported (книга «The Nvidia Way») | ФЧ2 п. 1 |
| B3 | гл. 2, после «…now he runs a company.» | 1:42: Huang Hall | «Years later he gave the school two million dollars, and its new girls' dorm is called Huang Hall.» | 18 / +7.2 | confirmed | ФЧ2 п. 2 |
| B4 | гл. 2, вместо «As a teenager he washed dishes at Denny's.» | 1:52: в 15 лет, ночные смены | «At fifteen he took the night shift at Denny's, washing dishes.» | +3 / +1.2 | confirmed (блог Nvidia, Fortune) | ФЧ2 п. 3 |
| B5 | гл. 2, после «WAITRESS: Coffee's on the menu.» | 3:48: табличка 2023 | «Thirty years later, Denny's hung a plaque over that booth, calling it the booth that launched a trillion-dollar company.» | 19 / +7.6 | confirmed (блог Nvidia) | ФЧ2 п. 9 |
| B6 | гл. 2, после «JENSEN: Then we save on lunch.» | 2:47: «30 days…» | «He's said ever since that Nvidia is always thirty days from going out of business.» | 15 / +6.0 | confirmed (его слова) | ФЧ2 п. 5 |
| B7 | гл. 2, после «…every AI lab on Earth wanted Nvidia chips.» | 3:18: ChatGPT | «ChatGPT itself was trained on a Microsoft supercomputer built from tens of thousands of Nvidia chips.» | 16 / +6.4 | confirmed (Bloomberg, Microsoft) | ФЧ2 п. 7 |
| B8 | гл. 2, вместо «Nvidia became the most valuable company in the world,» | 3:48: первая на $5 трлн | «In October 2025, Nvidia became the first company ever worth five trillion dollars,» | +5 / +2.0 | confirmed | ФЧ2 п. 9 |
| B9 | гл. 3, после «China had been one of Nvidia's biggest markets.» | 4:43: $17 млрд | «Nvidia's own filings showed seventeen billion dollars of sales in China in one year.» | 14 / +5.6 | confirmed (10-K за 2025 ф. г.) | ФЧ2 п. 10 |
| B10 | гл. 3, после «Let American chips compete everywhere.» | 5:09: «nanoseconds» | «JENSEN: They're nanoseconds behind us.» | 4 / +1.6 | confirmed (его слова) | ФЧ2 п. 12 |
| B11 | гл. 4, после «…rent the computing power over the internet.» | 6:50: Alibaba | «According to the Financial Times, its biggest customer from the start was the Chinese giant Alibaba.» | 16 / +6.4 | reported (FT) | ФЧ2 п. 14 |
| B12 | гл. 5, после «BANKER 2: Did they sell a hit game?» | 8:12: залог, кредитор | «The Financial Times later reported that its Malaysian arm had borrowed from an Alibaba subsidiary, pledging the whole business as collateral.» | 21 / +8.4 | reported (FT) | ФЧ2 п. 15 |
| B13 | гл. 6, перед «That's what made it so hard to catch.» (перед A5) | 11:13: лобстеры | «In 2023, Hong Kong customs found seventy graphics cards packed among live lobsters.» | 13 / +5.2 | reported | ФЧ2 п. 19 |
| B14 | гл. 6, сразу после A5 | 11:13: $160 млн | «Another ring, broken up in December 2025, had moved at least a hundred and sixty million dollars of Nvidia chips.» | 20 / +8.0 | confirmed (Минюст США) | ФЧ2 п. 19 |
| B15 | гл. 7, после «JENSEN: Does anyone have a calendar?» | 14:14: пустой офис New Matrix | «Later, when the New York Times checked one of the Chinese firms cleared to handle that chip, its Beijing address was an empty building.» | 24 / +9.6 | reported (NYT) | ФЧ2 п. 20 |
| B16 | гл. 7, после «…American companies were locked out of it.» | 15:41: видео ужина | «Footage aired later by a Taiwanese channel shows the two Huangs leaving a group dinner in Taipei that same month, in the same car.» | 24 / +9.6 | reported (Reuters, CNN, NYT) | ФЧ2 п. 23 |
| B17 | гл. 7, после «JUSTICE: We'll take it from here.» | 15:23: Bain | «In early 2026, Bloomberg reported, Megaspeed's Malaysian landlord, a data-center firm backed by Bain Capital, gave its space to another tenant.» | 21 / +8.4 | reported (Bloomberg) | ФЧ2 п. 22 |
| B18 | гл. 8, после абзаца «In the spring of 2026, a highly classified memo…» | 9:47: раскрытие имени | «According to CNN, the intercepts first referred only to "a U.S. person." Officials asked for the name to be unmasked. It was Jensen Huang.» | 24 / +9.6 | reported (CNN, анонимно) | ФЧ2 п. 17 |
| B19 | гл. 8, после B18 | 5:24: что такое МГБ | «The Ministry of State Security is China's main spy service, working both abroad and at home.» | 16 / +6.4 | confirmed | ФЧ2 п. 13 |
| B20 | гл. 8, после «The memo went around before the president's trip to Beijing in May.» (после A6) | 16:14: президент знал | «CNN reported that Rubio briefed the president himself aboard Air Force One. The president has said he hadn't heard about it.» | 21 / +8.4 | reported (CNN, NYT) | ФЧ2 п. 24 |
| B21 | гл. 9, после «AGENT: No. Your new friend is.» | 17:22: ФБР и конгрессмен | «It has happened before. In 2015, the FBI gave exactly that briefing to a California congressman about a suspected Chinese spy in his circle.» | 24 / +9.6 | confirmed (Axios) | ФЧ2 п. 26 |
| B22 | гл. 9, после «Nobody told the man at the table.» | 16:14: Аляска | «That May, he even boarded Air Force One in Alaska, for the last leg of the president's trip to China.» | 20 / +8.0 | confirmed | ФЧ2 п. 24 |
| B23 | гл. 9, после «JENSEN: I was unfaithful to my wife.» | 19:41: концовка письма | «JENSEN: I am proud and grateful to be an American.» | 9 / +3.6 | confirmed (текст письма) | ФЧ2 п. 30 |
| B24 | гл. 9, после «SPOKESMAN: None at all.» | — (новый факт, отыгрыш B5) | «In San Jose, the Denny's where Nvidia began took down its plaque that day. A day later, Denny's said it would put it back.» | 24 / +9.6 | confirmed (NBC Bay Area, SFist) | ФЧ2 п. 9 |
| B25 | гл. 9, после «That day, Nvidia's stock fell as much as…» (перед A8) | 18:39: DeepSeek | «It wasn't even its worst day. When China's DeepSeek released a cheap AI model in January 2025, Nvidia lost nearly six hundred billion dollars in a single day.» | 28 / +11.2 | confirmed | ФЧ2 п. 28 |
| B26 | гл. 9, после «ANALYST 2: Of your retirement fund.» | 18:21: доля в S&P 500 | «Nvidia is one of the largest companies in the S&P 500, the index behind millions of retirement savings.» | 18 / +7.2 | confirmed (без числа) | ФЧ2 п. 27 |
| B27 | гл. 9, после «Nobody has charged Jensen, Nvidia, or Alice Huang with any crime.» (перед A9) | 19:12: её уход | «Megaspeed now says she left the company in August 2025.» | 10 / +4.0 | confirmed (заявление Megaspeed) | ФЧ2 п. 29 |
| B28 | гл. 9, после B27 | — (баланс по правилу 3) | «CNN later reported that US intelligence isn't sure she spied at all, though sources call her a risk.» | 18 / +7.2 | reported (CNN, анонимно) | ФЧ2, раздел 2, п. 3 |

**Если принять все B:** +469 слов, примерно +3:08. **Если принять все A и B:** +564 слова, примерно +3:46. Ролик выйдет
около **19:14** на черновом голосе.

**Правки к уже написанному `script.md`** (ФЧ2, раздел 2; на утверждение):
- гл. 9: «as much as thirteen percent» → **fourteen** (CNBC: «as much as 14%»; CNN: 14.35%). Реплика аналитика — тоже
  «About fourteen percent».
- гл. 2: «and now he runs a company» после отставки неверно. Нужна формулировка в прошедшем времени.
- гл. 7: к «stopped placing orders» можно добавить «Nvidia says it cut the company off that June.» (+9 слов / +3.6 с,
  в итог выше не входит).

**Что я рекомендую взять в первую очередь:**
- **B5 + B24** — табличка в Denny's: повешена в 2023-м, снята в день отставки. Готовая рифма начала и конца, сцена
  Denny's у нас уже есть;
- **B6** — «thirty days» перекликается с нашей ONE MONTH;
- **B18** — раскрытие имени: самый сильный драматический поворот меморандума;
- **B21 + B22** — контраст: конгрессмена в 2015-м предупредили, а Хуанга нет, хотя он летел в одном самолёте с
  президентом;
- **B23** — вторая реплика из письма, это его собственные слова;
- **B28** — обязательный баланс по правилу 3, если берём B18 и B20.

**Не путать:** лобстеры (2023, Гонконг, старые видеокарты) и дело на $160 млн (дек. 2025, США) — два разных случая. У
конкурента они слиты в одну историю. «+2.78 % после утечки» не подтвердилось: это отскок 6 ноября после −9 %.

## Sources
- `raw/research/2026-11-16-l001-factcheck.md`
- `raw/research/2026-11-16-nvidia-huang-spy-story.md`
- `raw/research/2026-11-17-l001-factcheck-2.md`
- `production/L001/compare_scenes.md`, `production/L001/shot_for_shot.md`
