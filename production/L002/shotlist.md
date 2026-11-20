# L002 — раскадровка (шотлист) всего ролика

Собрано 2026-11-20 по `script.md` (текст дословно, здесь только картинка), голосу Fish (`out/lines_fish.json`, 15:13),
правилам [[stickman-noir]] (разд. 7) и грамматике камеры L001 (`production/L001/dynamics_compare.md`). Генератор —
`animatic/make_shotlist.py` (планы задаются там; старт и длительность — `animatic/make_timing.mjs` + `shotlist_tool.mjs sync`).
Статус: **черновик на утверждение Рауаном**. Герои, голоса и 23 локации утверждены 2026-11-20.

## Итоги

| | Значение |
|---|---|
| Планов | **345** (черновик 381 → 387 после разрезки длинных → 345 после слияния коротких реплик в вип-паны) |
| Длина | **15:57.8** (957.8 с): голос Fish 907.8 с + паузы (титры глав, карточки на тишине, добор коротких реплик) |
| Средний план | **2.78 с**, 21.6 склеек в минуту (L001 3.34 с; конкурент 3.18 с / 17.6 в мин; правило 16–20); длиннее 8 с — ни одного |
| Первая минута (хук) | планов: **23** (L001 23, конкурент 22); колокол на 0:00–0:04, «evil» на телефоне силуэта у ракеты 0:06–0:09, ценник аренды «PAYEE: SPACEX» ~0:24, Маск в кадре с подписью 0:25 |
| Чёрных карточек | **29** (1.8 в минуту; цель 2–3) |
| Камера | рывок на ударном слове — **243**, вип-пан между говорящими — **63**, статично (карточки, титры) — **39** (11 %) |
| События по словам | **395** («на «слово»» в колонке события) |
| Шаблонов по видам | T-card 29, T-doc 22, T-number 21, T-split 14, T-board 13, T-xpost 9, T-title 7, T-phone 6, T-scale 3, T-map 3, T-year 2, T-chart 1 |
| 3D-планов | 10: проход Colossus (сцена L001 `dc_inspection` + плейт L16), пролёт над Мемфисом |
| Локаций | 24 своих (все плейты нарисованы и утверждены 2026-11-20) + 12 видов шаблонов + 2 3D |

| Глава | старт | планов | с | планов/мин | карточек |
|---|---|---|---|---|---|
| 0. The Bell | 0:00.0 | 16 | 44 | 21.8 | 1 |
| 1. The Office | 0:44.0 | 9 | 21 | 25.6 | 0 |
| 2. Two Exits | 1:05.0 | 74 | 199 | 22.3 | 8 |
| 3. Evil | 4:24.3 | 46 | 123 | 22.4 | 3 |
| 4. The Ghost Investor | 6:27.5 | 34 | 88 | 23.1 | 3 |
| 5. The Machine in Memphis | 7:55.7 | 57 | 177 | 19.3 | 2 |
| 6. The Deal | 10:52.8 | 50 | 146 | 20.6 | 6 |
| 7. Who Really Wins | 13:18.5 | 53 | 146 | 21.8 | 6 |
| 8. The Office | 15:44.5 | 6 | 13 | 27.1 | 0 |

**Обозначения** — как в L001: крупность / шаблон / 3D; в колонке «событие» часть «на «слово» — действие» встаёт ровно на
это слово; текст в «КАПСЕ» — вещь в кадре (табличка, штамп, мел), остаётся до конца плана. Камера: «наезд → стоп → рывок
на «слово»», «стоп → вип-пан со смазом на ИМЯ» (смена говорящего внутри плана), «статично (стоп)» — карточки и титры.
Подпись с именем (нижняя треть) — при первом появлении реального человека. Реплики реальных людей — драматизация
(в описании ролика), цитаты в «» — только из факт-чека `raw/research/2026-11-19-l002-factcheck.md`.

## Локации

| id | Фон | Палитра | Главы | Что сюда сведено |
|---|---|---|---|---|
| L01-nasdaq | `assets/bg_nasdaq_stage.png` | сцена: индиго, прожекторы, золото | 0, 4, 7 | колокол, Амодеи у трибуны, банкиры, «очередь», финальный звон в сумерках |
| L02-trading | `assets/bg_trading_floor.png` | холодный, утро, Нью-Йорк | 0 | трейдеры под тикером |
| L03-host | `production/longform/style-test/bg_host_office.png` (L001) | нуар-янтарь, зелёная лампа, дождь | 1, 3, 5, 6, 8 | ведущий, распечатка «evil», принтер, штамп PAID, сейф с ключом L001 |
| L04-starbase | `assets/bg_starbase_office.png` | закат, ракета за окном | 0, 3, 5, 6, 7 | Маск с телефоном, помощник, «landlord», уведомление об оплате |
| L05-mit | `assets/bg_mit_stage_2014.png` | тёплый день (прошлое) | 2 | «summoning the demon», студент |
| L06-openai15 | `assets/bg_openai_2015_office.png` | тёплый день (прошлое) | 2 | основание OpenAI, чек, спор 2017–18, уход Маска |
| L07-openai20 | `assets/bg_openai_2020_night.png` | ночь, 2020 | 2, 7 | уход Амодеи с коробками, «две двери» |
| L08-ant21 | `assets/bg_anthropic_2021_tiny.png` | тёплый день, туман СФ | 2 | первый офис Anthropic, «Once was enough» |
| L09-ant | `assets/bg_anthropic_office.png` | ночь, дерево, СФ | 3, 5, 6, 7 | раунд $30B, «we're busy», график, «нет чипов», «landlord» |
| L10-xai | `assets/bg_xai_office_night.png` | ночь, холодные мониторы, Кремниевая долина | 2, 3, 5, 6 | Grok-кубик, инженеры, ACCESS REVOKED, бумажная корона, Cursor |
| L11-tvstudio | `assets/bg_tv_studio_2023.png` | сцена, Лос-Анджелес | 2 | TruthGPT, «Everyone else» |
| L12-court | `assets/bg_courtroom.png` | холодный, дерево | 2, 4 | иск Маска, присяжные, приговор FTX, продажа доли |
| L13-bahamas | `assets/bg_bahamas_office_2022.png` | тёплый, тропики (прошлое) | 4 | Бэнкман-Фрид на мешке, крах |
| L14-prison | `assets/bg_prison_tv_room.png` | казённый зелёный, люминесцент | 1, 3, 4 | тюремный ТВ, Бэнкман-Фрид смотрит IPO |
| L15-colossus-ext | `assets/bg_colossus_exterior.png` | ночь, натрий, пар | 1, 2, 5 | завод, турбины, соседи, протест |
| L16-colossus-int | `assets/bg_colossus_interior.png` | ночь, зелёные огни стоек | 2, 3, 4, 5, 6 | проход, бригадир, Дженсен, чипы, бирка PROPERTY OF GROK |
| L17-spacex | `assets/bg_spacex_boardroom.png` | холодный, ночное окно | 5, 6 | бухгалтеры, слияние SpaceX + xAI, «Details» |
| L18-meeting | `assets/bg_meeting_room.png` | холодный, светлый день, СФ | 5, 6 | EVIL DETECTOR, подписание, «Ninety days» |
| L19-dealbook | `assets/bg_dealbook_stage.png` | сцена | 7 | интервью накануне IPO |
| L20-cnbc | `assets/bg_cnbc_set.png` | сцена, утро, Нью-Йорк | 7 | Амодеи наутро после IPO |
| L21-altman | `assets/bg_altman_window.png` | ночь, СФ, мост | 2, 7 | ответ «$9.74B», «Should we have kept them?» |
| L22-gym | `assets/bg_boxing_gym.png` | ночь | 3 | шутка: тренер соперника |
| L23-stadium | `assets/bg_empty_stadium.png` | ночь, прожекторы | 5 | шутка: пустой стадион |
| L24-goldrush | `assets/bg_gold_rush_town.png` | тёплый день, Дикий Запад | 7 | шутка: лопаты в аренду |

**Шаблоны (T-)**: T-card чёрная карточка с фразой, T-title титр главы / название ролика, T-year листок календаря,
T-number «цифра крупно» (досчитывает к произнесённому числу), T-doc документ/заметка/проспект, T-board доска расследования,
T-split экран на 2–4 окна, T-map карта, T-xpost пост X (новый: печатается сам, дата, подсветка строки), T-phone экран
телефона (лента, чат, приложение), T-scale весы (новый), T-chart линия прибыли (новый).

**3D**: 3D-colossus — проход дата-центра (сцена `production/L001/scenes/dc_inspection` с плейтом L16 и 2D-героями, тип B):
ряды загораются, таблички LEASED/ANTHROPIC/CLAUDE, Дженсен с планшетом, отъезд на весь зал; 3D-memphis — ночной пролёт к
заводу (город `production/L001/scenes/city` + плейт L15 в конце, тип B).

## Раскадровка

### Гл. 0. The Bell — 0:00.0, 16 планов, 44.0 с, 21.8 пл/мин, карточек 1

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 1 | 0:00.0 | On Thursday, a record-breaking IPO | L01-nasdaq | общий сцена биржи | 2.2 | с первого кадра: студия биржи в Нью-Йорке, конфетти; Дарио и Даниэла у трибуны с колоколом, вспышки фотографов; на «Thursday» молоток бьёт в колокол и печатается подпись «NEW YORK · NOV 19, 2026» | наезд → стоп → рывок на «record-breaking» |
| 2 | 0:02.2 | rang the bell in New York. | L01-nasdaq | вставка колокол | 1.8 | на «bell» второй удар — волна звука сдувает конфетти к камере | наезд → стоп → рывок на «bell» |
| 3 | 0:04.0 | And some of that money is headed to a man | L01-nasdaq | средний дождь конфетти | 1.9 | из конфетти выпадает один листок — счёт; на «money» он переворачивается: «INVOICE · $1,250,000,000 / MONTH», получатель закрыт полосой | наезд → стоп → рывок на «headed» |
| 4 | 0:06.0 | who called this company's AI evil. | L04-starbase | общий силуэт у окна | 3.0 | силуэт человека спиной у окна с ракетой на закате, телефон в руке; на «evil» экран телефона вспыхивает красным словом «EVIL» | наезд → стоп → рывок на «evil» |
| 5 | 0:08.9 | TRADER: Look at it go. | L02-trading | средний два трейдера | 1.5 | трейдеры под тикер-лентой; на «go» лента прыгает зелёным: «ANT $83.00 → $111.50» | наезд → стоп → рывок на «go» |
| 6 | 0:10.4 | TRADER 2: Who's buying? TRADER: Everyone. | L02-trading | крупно трейдер 2 (вип-пан) | 1.9 | трейдер 2 оборачивается → вип-пан со смазом: на «Everyone» все мониторы зала разом становятся зелёными | стоп → вип-пан со смазом на TRADER |
| 7 | 0:12.3 | Anthropic, the maker of Claude, | T-doc | шаблон обложка проспекта | 2.3 | обложка «ANTHROPIC, PBC — FORM S-1»; на «Claude» печатается подпись «MAKER OF CLAUDE» | наезд → стоп → рывок на «Claude» |
| 8 | 0:14.6 | raised eighty-one billion dollars, a record for an … | T-number | шаблон цифра | 4.2 | цифра досчитывает к «$81 BILLION» на «billion»; на «record» на цифру падает штамп «RECORD IPO» | наезд → стоп → рывок на «record» и «record» |
| 9 | 0:18.8 | And its own filing says it will spend up to a … | T-doc | шаблон строка проспекта | 6.3 | маркер ведёт по строке «SpaceX.AI LLC … up to $120.5 billion»; на «hundred» камера ныряет в цифру; на «Musk» строка «PAYEE: SPACEX» загорается | наезд → стоп → рывок на «hundred» и «Musk» |
| 10 | 0:25.0 | MUSK: Up thirty-four percent. AIDE: Sir. In … | L04-starbase | вставка телефон (вип-пан) | 4.8 | в руке телефон с тикером ANT; на «thirty-four» цифра прыгает «+34%»; подпись «ELON MUSK — SPACEX, xAI» → вип-пан со смазом на AIDE: помощник с планшетом; на «evil» на планшете — пост с красным словом | стоп → вип-пан со смазом на AIDE |
| 11 | 0:29.8 | MUSK: That was February. | L04-starbase | крупно Маск ухмыляется | 1.5 | Маск не отрывается от телефона; на «February» пожимает плечом | наезд → стоп → рывок на «February» |
| 12 | 0:31.3 | AIDE: And now? MUSK: Now they pay rent. | L04-starbase | общий окно с ракетой (вип-пан) | 1.8 | помощник ждёт → вип-пан со смазом к Маску: на «rent» на телефоне падает уведомление «PAYMENT RECEIVED» | стоп → вип-пан со смазом на MUSK |
| 13 | 0:33.1 | Nine months ago, he wrote that Anthropic's AI was … | T-xpost | шаблон пост X | 4.6 | пост печатается сам; дата «FEB 12, 2026»; на «evil» последняя строка «This is misanthropic and evil. Fix it.» загорается красным | наезд → стоп → рывок на «evil» |
| 14 | 0:37.7 | Today, they rent his computers. | 3D-colossus | 3D ряд стоек | 2.1 | проезд вдоль стоек с зелёными огоньками; на «rent» на ближней стойке переворачивается табличка «LEASED» | проезд → стоп → рывок на «rent» |
| 15 | 0:39.8 | How does that happen? | T-card | шаблон карточка | 1.8 | карточка «From "evil" to "tenant" in nine months.» | статично (стоп) |
| 16 | 0:41.6 | — (без голоса, музыка) | T-title | шаблон название ролика | 1.8 | засвет в белое → название «How Elon Musk Got Paid by the Company He Called Evil»; на слове «Evil» красная печать | статично (стоп) |

### Гл. 1. The Office — 0:44.0, 9 планов, 21.1 с, 25.6 пл/мин, карточек 0

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 17 | 0:44.0 | HOST: Evening. Careful with that page. | L03-host | общий кабинет | 2.8 | на «Evening» лампа щёлкает и загорается, за окном дождь; на «page» ведущий придавливает пальцем сползающую распечатку поста «evil» | наезд → стоп → рывок на «with» и «page» |
| 18 | 0:46.7 | It's worth more than it looks. | L03-host | вставка распечатка у лампы | 1.7 | на «worth» ведущий поднимает лист к лампе — сквозь бумагу светится красное «evil» | наезд → стоп → рывок на «looks» |
| 19 | 0:48.4 | HOST: One man calls a company evil. | L03-host | сверхкрупно слово evil | 2.4 | на «evil» красная ручка обводит слово кругом | наезд → стоп → рывок на «evil» |
| 20 | 0:50.8 | Three months later, he hands it the keys to the … | L03-host | средний ведущий со связкой ключей | 4.4 | на «keys» на стол падает связка ключей с биркой «COLOSSUS»; на «AI» бирка поворачивается — на обороте «GROK» | наезд → стоп → рывок на «keys» и «AI» |
| 21 | 0:55.2 | So what changed? | L03-host | крупно ведущий у доски | 1.4 | на «changed» ведущий прикалывает распечатку «evil» к пробковой доске за спиной | наезд → стоп → рывок на «changed» |
| 22 | 0:56.6 | The answer runs through a chatbot that costs too … | T-board | шаблон доска три фото | 3.1 | на «chatbot» прикалывается фото кубика Grok с ценником «$$$»; нить тянется к центру | наезд → стоп → рывок на «chatbot» |
| 23 | 0:59.7 | a ghost in a prison cell, | L14-prison | средний ТВ и тень | 1.6 | на «ghost» на стене у ТВ проступает тень человека в робе — самого человека не видно | наезд → стоп → рывок на «prison» |
| 24 | 1:01.3 | and a factory in Memphis. | L15-colossus-ext | общий завод ночью | 1.6 | на «Memphis» печатается подпись «MEMPHIS, TN»; турбины выдыхают пар | наезд → стоп → рывок на «Memphis» |
| 25 | 1:02.9 | But it starts with a warning. | L03-host | крупно ведущий у лампы | 2.1 | на «warning» ведущий поднимает палец, тень пальца ложится на стену | наезд → стоп → рывок на «warning» |

### Гл. 2. Two Exits — 1:05.0, 74 планов, 199.3 с, 22.3 пл/мин, карточек 8

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 26 | 1:05.0 | — (без голоса, музыка) | T-title | шаблон титр | 1.4 | засвет в белое → титр «2. TWO EXITS»; две двери на титре захлопываются | статично (стоп) |
| 27 | 1:07.1 | In 2014, Musk stood up at MIT and said that … | L05-mit | общий аудитория | 5.7 | тёплый день; Маск у кафедры; на «MIT» подпись «MIT · 2014» | наезд → стоп → рывок на «MIT» |
| 28 | 1:12.7 | "summoning the demon." | L05-mit | вставка экран слайда | 1.4 | на «demon» на слайде проявляется мультяшный чертёнок и подмигивает | наезд → стоп → рывок на «demon» |
| 29 | 1:14.1 | STUDENT: So you're against AI? MUSK: I'm against … | L05-mit | обратная студент в первом ряду (вип-пан) | 3.4 | студент тянет руку; на «AI» поднимается с места → вип-пан со смазом на MUSK: на «badly» Маск разводит руками и показывает в зал | стоп → вип-пан со смазом на MUSK |
| 30 | 1:17.5 | — (без голоса, музыка) | T-card | шаблон карточка-цитата | 1.8 | карточка «"We are summoning the demon." — ELON MUSK, 2014» | статично (стоп) |
| 31 | 1:19.6 | A year later, he decided to do it himself. | T-year | шаблон календарь | 2.6 | на «later» листок «2014» отрывается; на «himself» под ним — «2015» | статично (стоп) |
| 32 | 1:22.2 | In 2015 he co-founded a lab called OpenAI, | L06-openai15 | общий лофт | 3.0 | тёплый день; Маск у доски; на «OpenAI» маркер пишет «OpenAI — nonprofit» | наезд → стоп → рывок на «OpenAI» |
| 33 | 1:25.2 | with Sam Altman. | L06-openai15 | крупно Альтман | 1.8 | на «Altman» Альтман входит в кадр; подпись «SAM ALTMAN — OPENAI CO-FOUNDER» | наезд → стоп → рывок на «Altman» |
| 34 | 1:27.1 | A nonprofit, built as a counterweight to Google. | T-scale | шаблон весы | 3.0 | на одной чаше огромный шар «GOOGLE», чаша внизу; на «counterweight» на вторую чашу прыгает маленький «OpenAI» — весы качаются | наезд → стоп → рывок на «counterweight» |
| 35 | 1:30.0 | Musk pledged up to a billion dollars. | L06-openai15 | средний рукопожатие над чеком | 2.4 | Маск и Альтман жмут руки; на «billion» разворачивается гигантский чек «$1,000,000,000» | наезд → стоп → рывок на «billion» |
| 36 | 1:32.4 | ALTMAN: A billion? MUSK: Eventually. | L06-openai15 | крупно Альтман (вип-пан) | 1.7 | Альтман поднимает бровь → вип-пан со смазом к Маску: на «Eventually» Маск подмигивает | стоп → вип-пан со смазом на MUSK |
| 37 | 1:34.1 | Under oath this year, he put what he actually gave … | L06-openai15 | вставка гигантский чек | 4.3 | нули с чека падают по одному со стуком; на «thirty-eight» остаётся «$38,000,000»; подпись «MUSK TESTIMONY, 2026» | наезд → стоп → рывок на «thirty-eight» |
| 38 | 1:38.4 | Then came a fight over who would be in charge. | T-board | шаблон доска «2017–2018» | 2.5 | на доске «2017–2018», две красные нити; на «charge» прикалывается табличка «CEO?» | наезд → стоп → рывок на «charge» |
| 39 | 1:40.9 | OpenAI later published his old emails. | T-doc | шаблон письма веером | 2.7 | распечатки писем веером; на «emails» штамп «PUBLISHED BY OPENAI» | наезд → стоп → рывок на «emails» |
| 40 | 1:43.6 | In its version, Musk wanted majority control and … | T-board | шаблон нить OPENAI'S VERSION | 4.2 | нить «OPENAI'S VERSION»; на «control» карточка «MAJORITY CONTROL»; на «CEO» карточка «CEO» | наезд → стоп → рывок на «control» и «CEO» |
| 41 | 1:47.9 | then suggested folding the lab into Tesla. | L06-openai15 | вставка доска | 2.5 | на «Tesla» маркер рисует стрелку от «OpenAI» к надписи «TESLA» | наезд → стоп → рывок на «Tesla» |
| 42 | 1:50.4 | In his version, he was misled about where it was … | T-board | шаблон нить MUSK'S VERSION | 2.9 | нить «MUSK'S VERSION»; на «misled» карточка «MISLED» | наезд → стоп → рывок на «misled» |
| 43 | 1:53.3 | MUSK: Merge with Tesla. ALTMAN: No. | L06-openai15 | средний двое у доски (вип-пан) | 1.8 | вечер; на «Tesla» Маск хлопает ладонью по доске → вип-пан со смазом на ALTMAN: на «No» качает головой, руки на груди | стоп → вип-пан со смазом на ALTMAN |
| 44 | 1:55.1 | MUSK: Then your odds are zero. | L06-openai15 | крупно Маск у доски | 1.5 | на «zero» Маск рисует на доске жирный ноль | наезд → стоп → рывок на «zero» |
| 45 | 1:56.6 | ALTMAN: Zero? MUSK: Zero. | L06-openai15 | сверхкрупно ноль на доске (вип-пан) | 1.5 | ноль на доске → вип-пан со смазом: на втором «Zero» Маск обводит его ещё раз | стоп → вип-пан со смазом на MUSK |
| 46 | 1:58.1 | — (без голоса, музыка) | T-card | шаблон карточка | 1.6 | карточка «Odds of success: zero.» — MUSK'S EXIT, ACCORDING TO OPENAI | статично (стоп) |
| 47 | 1:59.8 | In 2018 he left the board. | L06-openai15 | вставка табличка в коробку | 2.1 | на «left» табличка «E. MUSK — CO-CHAIR» падает в картонную коробку | наезд → стоп → рывок на «left» |
| 48 | 2:02.0 | He wasn't the last one to walk out of that building. | L06-openai15 | средний дверь закрывается | 2.6 | дверь закрывается за Маском; на «last» в матовом стекле двери проступают другие силуэты | наезд → стоп → рывок на «walk» |
| 49 | 2:04.6 | Two years later, one of OpenAI's top researchers, … | L07-openai20 | общий офис ночью | 4.6 | ночь, 2020; Дарио пакует коробку; на «Amodei» подпись «DARIO AMODEI» | наезд → стоп → рывок на «Amodei» |
| 50 | 2:09.2 | left with his sister Daniela and a group of … | L07-openai20 | средний Даниэла с коробкой | 3.1 | на «Daniela» подпись «DANIELA AMODEI»; на «colleagues» в глубине встают ещё трое с коробками | наезд → стоп → рывок на «Daniela» и «colleagues» |
| 51 | 2:12.3 | Why? | L07-openai20 | крупно Дарио | 1.3 | на «Why» Дарио поднимает голову от коробки | наезд → стоп → рывок на «Why» |
| 52 | 2:13.6 | He has said it plainly. | T-card | шаблон карточка-цитата | 1.8 | карточка «"Why argue with someone when you don't have the same vision and you don't trust them?" — DARIO AMODEI, BLOOMBERG» | статично (стоп) |
| 53 | 2:15.4 | DANIELA: Where do we go? DARIO: Somewhere we can … | L07-openai20 | средний Даниэла у двери (вип-пан) | 2.9 | на «go» Даниэла перехватывает коробку поудобнее → вип-пан со смазом на DARIO: на «no» Дарио заклеивает коробку скотчем — треск | стоп → вип-пан со смазом на DARIO |
| 54 | 2:18.4 | DANIELA: To what? DARIO: We'll find out. | L07-openai20 | крупно двое уходят (вип-пан) | 1.8 | оба с коробками к выходу → вип-пан со смазом: на «out» Дарио щёлкает выключателем, офис гаснет | стоп → вип-пан со смазом на DARIO |
| 55 | 2:20.1 | In 2021, they started their own company. | L08-ant21 | общий пустой офис | 3.3 | тёплый день; пустая комната, семь стульев; на «2021» подпись «SAN FRANCISCO · 2021» | наезд → стоп → рывок на «they» |
| 56 | 2:23.4 | Anthropic. | L08-ant21 | вставка вывеска | 1.3 | на «Anthropic» на деревянной вывеске проявляется «ANTHROPIC — 2021» | наезд → стоп → рывок на «Anthropic» |
| 57 | 2:24.7 | The pitch was simple: the careful AI lab. | L08-ant21 | средний двое у кофемашины | 3.0 | на «careful» Даниэла ставит на стол табличку «CAREFUL»; кофемашина пищит | наезд → стоп → рывок на «careful» |
| 58 | 2:27.7 | So now there were two sets of exiles from the same … | T-split | шаблон сплит двери | 3.5 | слева Маск выходит из OpenAI (2018), справа Амодеи (2020); на «exiles» обе двери хлопают одновременно | наезд → стоп → рывок на «exiles» |
| 59 | 2:31.2 | Both had left OpenAI. Both had stopped trusting … | L07-openai20 | общий пустой офис | 4.2 | на «left» гаснет последняя лампа; на «trusting» доска сама стирается | наезд → стоп → рывок на «Both» и «trusting» |
| 60 | 2:35.4 | You'd think that would make them allies. | T-split | шаблон сплит трещина | 2.0 | обе половины рядом; на «allies» трещина между ними начинает срастаться | наезд → стоп → рывок на «allies» |
| 61 | 2:37.4 | It didn't. | T-card | шаблон карточка | 1.5 | карточка «It didn't.» — трещина за ней лопается обратно | статично (стоп) |
| 62 | 2:38.9 | DARIO: Have you met him? DANIELA: Once. | L08-ant21 | средний двое за столом (вип-пан) | 1.7 | Дарио спрашивает → вип-пан со смазом к Даниэле на «Once» | стоп → вип-пан со смазом на DANIELA |
| 63 | 2:40.6 | DARIO: And? DANIELA: Once was enough. | L08-ant21 | крупно Даниэла | 1.9 | на «enough» Даниэла ставит кружку на стол — стук | наезд → стоп → рывок на «enough» |
| 64 | 2:42.5 | In March 2023, Musk signed an open letter | T-doc | шаблон открытое письмо | 3.4 | письмо «PAUSE GIANT AI EXPERIMENTS — MARCH 2023»; на «letter» ручка выводит «Elon Musk» | наезд → стоп → рывок на «letter» |
| 65 | 2:45.9 | asking the whole industry to pause training its … | T-number | шаблон песочные часы | 5.3 | песочные часы «PAUSE»; на «six» встаёт «6 MONTHS», песок замирает | наезд → стоп → рывок на «six» |
| 66 | 2:51.2 | That same month, his own AI company, X.AI, began … | T-split | шаблон сплит письмо / регистрация | 4.8 | слева письмо «PAUSE», справа регистрация компании; на «X.AI» штамп «X.AI CORP — MARCH 2023» | наезд → стоп → рывок на «X.AI» |
| 67 | 2:55.9 | — (без голоса, музыка) | T-card | шаблон карточка | 1.3 | карточка «Same month.» | статично (стоп) |
| 68 | 2:57.6 | REPORTER: You asked everyone to pause. MUSK: … | L11-tvstudio | средний репортёр с микрофоном (вип-пан) | 2.7 | на «pause» репортёр тянет микрофон к Маску → вип-пан со смазом на MUSK: на «else» Маск улыбается в камеру | стоп → вип-пан со смазом на MUSK |
| 69 | 3:00.3 | On TV he promised a "maximum truth-seeking AI." | L11-tvstudio | общий ток-шоу | 3.5 | Маск на диване студии 2023; на «truth-seeking» на экране за ним загорается «TRUTHGPT» | наезд → стоп → рывок на «truth-seeking» |
| 70 | 3:03.8 | And in November, it arrived. | T-year | шаблон календарь | 2.0 | на «November» листок календаря «NOV 2023» | статично (стоп) |
| 71 | 3:05.8 | Fast, cheeky, and named after a word from science … | L10-xai | общий офис ночью | 3.8 | на «Fast» на столе включается чёрный кубик; на «science» на нём проступают очки и кривая ухмылка; подпись «GROK — NOV 2023 · "a rebellious streak"» | наезд → стоп → рывок на «after» и «science» |
| 72 | 3:09.6 | GROK: Hello, humans. MUSK: Be funny. | L10-xai | крупно Grok (вип-пан) | 2.0 | кубик Grok говорит; на «humans» подмигивает → вип-пан со смазом на MUSK: на «funny» Маск стучит пальцем по кубику | стоп → вип-пан со смазом на MUSK |
| 73 | 3:11.6 | GROK: Define funny. MUSK: Me. | L10-xai | сверхкрупно Grok (вип-пан) | 1.9 | Grok щурится → вип-пан со смазом: на «Me» Маск показывает на себя | стоп → вип-пан со смазом на MUSK |
| 74 | 3:13.5 | Musk said the goal was to "understand the true … | T-card | шаблон карточка-цитата | 4.2 | карточка «"understand the true nature of the universe" — ELON MUSK»; на «universe» точка в конце превращается в звёздочку | статично (стоп) |
| 75 | 3:17.6 | And he gave Grok a home: right inside X, the … | T-phone | шаблон телефон X | 5.2 | лента соцсети на экране телефона; на «X» кубик Grok запрыгивает в ленту; на «owned» сверху печатается «OWNER: E. MUSK» | наезд → стоп → рывок на «X» и «owned» |
| 76 | 3:22.9 | USER: Grok, tell me a joke. | L10-xai | средний инженер с телефоном | 1.5 | инженер ночной смены печатает в телефон; на «joke» отправляет — свист | наезд → стоп → рывок на «joke» |
| 77 | 3:24.4 | GROK: Your subscription renewed. | T-phone | шаблон чат | 1.6 | пузырь чата от Grok; на «renewed» всплывает плашка «SUBSCRIPTION RENEWED ✓» | наезд → стоп → рывок на «renewed» |
| 78 | 3:26.0 | USER: That's not a joke. GROK: It is to me. | L10-xai | крупно инженер (вип-пан) | 2.0 | инженер хмурится → вип-пан со смазом к кубику Grok, который хихикает на «me» | стоп → вип-пан со смазом на GROK |
| 79 | 3:28.0 | Its name was Grok. | L10-xai | вставка кубик на столе | 1.6 | на «Grok» на боку кубика печатаются буквы «GROK» | наезд → стоп → рывок на «Grok» |
| 80 | 3:29.6 | And to make Grok smarter, Musk needed a machine. | 3D-colossus | 3D тёмный цех | 3.4 | тёмный пустой цех; на «machine» загорается первый ряд стоек | наезд → стоп → рывок на «machine» |
| 81 | 3:33.0 | He built one in Memphis, inside an old factory. | L15-colossus-ext | общий завод ночью | 3.1 | на «Memphis» подпись «MEMPHIS, TN»; на «factory» окна старого завода загораются | наезд → стоп → рывок на «factory» и «factory» |
| 82 | 3:36.1 | A hundred thousand Nvidia chips, | T-number | шаблон цифра | 1.6 | цифра досчитывает к «100,000 CHIPS» на «thousand» | наезд → стоп → рывок на «Nvidia» |
| 83 | 3:37.8 | switched on in a hundred and twenty-two days. | 3D-colossus | 3D ряды загораются | 3.0 | ряды стоек загораются один за другим; счётчик «DAY 1 … DAY 122» дощёлкивает на «days» | проезд → стоп → рывок на «days» |
| 84 | 3:40.8 | He called it Colossus. | L16-colossus-int | общий проход | 1.6 | на «Colossus» над проходом загорается надпись «COLOSSUS» | наезд → стоп → рывок на «Colossus» |
| 85 | 3:42.4 | WORKER: Where does this one go? | L16-colossus-int | средний рабочий с сервером | 1.5 | рабочий с ящиком сервера озирается; на «go» ставит ящик на пол | наезд → стоп → рывок на «go» |
| 86 | 3:43.9 | FOREMAN: Wherever there's room. WORKER: There's no … | L16-colossus-int | крупно бригадир (вип-пан) | 2.7 | бригадир машет рукой → вип-пан со смазом: на «no room» рабочий зажат между стойками | стоп → вип-пан со смазом на WORKER |
| 87 | 3:46.6 | FOREMAN: Make room. | L16-colossus-int | вставка стойка | 1.5 | на «room» бригадир пинком задвигает стойку — искра | наезд → стоп → рывок на «room» |
| 88 | 3:48.1 | Remember that name. | T-card | шаблон карточка | 1.5 | карточка «Built for Grok. Remember that.» | статично (стоп) |
| 89 | 3:49.6 | Colossus. Built for Grok. | L16-colossus-int | сверхкрупно бирка на стойке | 2.2 | на «Grok» на стойку клеится бирка «PROPERTY OF GROK» | наезд → стоп → рывок на «Grok» |
| 90 | 3:51.8 | Meanwhile, Musk sued OpenAI and Altman, saying … | L12-court | общий зал суда | 6.0 | Маск кладёт толстый иск клерку; на «sued» штамп «MUSK v. ALTMAN»; на «business» на картонной копилке «NONPROFIT» появляется «FOR PROFIT» | наезд → стоп → рывок на «Altman» и «business» |
| 91 | 3:57.8 | In February 2025, his group even offered … | T-number | шаблон цифра | 4.2 | цифра досчитывает к «$97.4 BILLION» на «billion»; подпись «OFFER FOR OPENAI'S NONPROFIT · FEB 2025» | наезд → стоп → рывок на «billion» |
| 92 | 4:02.0 | to buy OpenAI's nonprofit outright. | L21-altman | общий кабинет Альтмана | 3.1 | ночь; на «outright» под дверь подсовывают толстый конверт «OFFER» | наезд → стоп → рывок на «outright» |
| 93 | 4:05.1 | MUSK: Ninety-seven point four billion. | T-split | шаблон сплит звонок | 1.6 | слева Маск с телефоном у окна с ракетой, справа Альтман у окна с мостом; на «billion» над Маском — ценник | наезд → стоп → рывок на «billion» |
| 94 | 4:06.7 | ALTMAN: No thank you. But we'll buy Twitter for … | L21-altman | крупно Альтман | 3.7 | Альтман улыбается и печатает ответ; на «Twitter» на телефоне — «$9.74 BILLION» | наезд → стоп → рывок на «Twitter» |
| 95 | 4:10.4 | The board said no. | T-card | шаблон карточка-цитата | 1.8 | карточка «"OpenAI is not for sale." — OPENAI BOARD» | статично (стоп) |
| 96 | 4:12.2 | Unanimously. | T-doc | шаблон письмо совета | 1.3 | на «Unanimously» в ряду подписей проставляются все галочки разом | наезд → стоп → рывок на «Unanimously» |
| 97 | 4:13.5 | And this May, a jury threw out his lawsuit. | L12-court | общий зал суда | 2.9 | на «threw» молоток бьёт, иск соскальзывает со стола | наезд → стоп → рывок на «threw» |
| 98 | 4:16.5 | Not on the merits. He had simply waited too long … | L12-court | вставка календарь | 3.7 | листки календаря облетают; на «long» штамп «TOO LATE» | наезд → стоп → рывок на «long» |
| 99 | 4:20.2 | Musk called it "a calendar technicality" and … | L12-court | крупно Маск у выхода | 4.1 | на «technicality» Маск закатывает глаза; на «appeal» поднимает папку «APPEAL» | наезд → стоп → рывок на «technicality» и «appeal» |

### Гл. 3. Evil — 4:24.3, 46 планов, 123.2 с, 22.4 пл/мин, карточек 3

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 100 | 4:24.3 | — (без голоса, музыка) | T-title | шаблон титр | 1.4 | засвет в белое → титр «3. EVIL»; буквы краснеют | статично (стоп) |
| 101 | 4:26.4 | Now jump to January 2026. | L10-xai | общий офис ночью | 2.6 | на «January» подпись «xAI · JANUARY 2026» | наезд → стоп → рывок на «January» |
| 102 | 4:29.0 | Musk's engineers are building Grok as fast as they … | L10-xai | средний инженеры печатают | 3.3 | на «fast» кубик Grok на столе подрастает рывком | наезд → стоп → рывок на «fast» |
| 103 | 4:32.4 | And according to reporter Kylie Robison, some of … | T-doc | шаблон заметка | 5.2 | заметка с подписью «KYLIE ROBISON — REPORTER»; на «unexpected» подчёркивается строка | наезд → стоп → рывок на «unexpected» |
| 104 | 4:37.6 | Claude. Anthropic's AI. | L10-xai | вставка монитор | 2.2 | на «Claude» на мониторе — окно чата «CLAUDE (via CURSOR)» | наезд → стоп → рывок на «Claude» |
| 105 | 4:39.7 | ENGINEER: Claude, write me a function. ENGINEER 2: … | L10-xai | крупно инженер (вип-пан) | 3.3 | на «function» по экрану льётся код → вип-пан со смазом на ENGINEER 2: на «loud» сосед наклоняется, палец к губам | стоп → вип-пан со смазом на ENGINEER 2 |
| 106 | 4:43.1 | ENGINEER: Why? ENGINEER 2: Because it's theirs. | L10-xai | средний инженер 2 (вип-пан) | 2.1 | инженер шепчет → вип-пан со смазом: на «theirs» инженер 2 тычет в окно чата | стоп → вип-пан со смазом на ENGINEER |
| 107 | 4:45.2 | Then the screens went grey. | L10-xai | общий ряды мониторов | 1.7 | на «grey» мониторы гаснут один за другим от дальнего к ближнему | наезд → стоп → рывок на «grey» |
| 108 | 4:46.9 | Anthropic had cut them off. | L10-xai | вставка монитор | 1.6 | на «off» на экран падает штамп «ACCESS REVOKED» | наезд → стоп → рывок на «off» |
| 109 | 4:48.6 | ENGINEER: Hello? ENGINEER 2: It's gone. | L10-xai | крупно инженер | 1.7 | на «Hello» стучит по монитору; на «gone» экран остаётся серым | наезд → стоп → рывок на «gone» и «gone» |
| 110 | 4:50.2 | ENGINEER: All of it? ENGINEER 2: All of it. | L10-xai | средний оба у серых экранов | 1.5 | на втором «All» кубик Grok на столе сжимается | наезд → стоп → рывок на «All» |
| 111 | 4:51.7 | The Information later reported that xAI had been … | T-doc | шаблон заголовок | 6.2 | заголовок «xAI trained its coding models on Claude's outputs for months» — THE INFORMATION (REPORTED); на «months» маркер подчёркивает | наезд → стоп → рывок на «months» |
| 112 | 4:57.9 | Anthropic never said publicly why it pulled the … | L09-ant | вставка кабель | 3.0 | на «plug» рука выдёргивает кабель из розетки — искра | наезд → стоп → рывок на «plug» |
| 113 | 5:00.9 | Musk's public reaction? | L04-starbase | средний Маск с телефоном | 1.7 | на «reaction» Маск открывает телефон, большие пальцы над экраном | наезд → стоп → рывок на «reaction» |
| 114 | 5:02.6 | Being cut off, he wrote, was "a helpful … | T-xpost | шаблон пост X | 4.6 | пост «JAN 15, 2026» печатается; на «motivator» слово подсвечивается; на «karma» — второе | наезд → стоп → рывок на «motivator» и «karma» |
| 115 | 5:07.2 | — (без голоса, музыка) | T-card | шаблон карточка | 1.2 | карточка «Cut off.» | статично (стоп) |
| 116 | 5:08.7 | If the reports are right, it's a bit like training … | L22-gym | общий ринг | 3.2 | боксёр бьёт по лапам тренера; на «boxing» гонг | наезд → стоп → рывок на «boxing» |
| 117 | 5:11.9 | with your opponent's coach. | L22-gym | крупно тренер | 1.8 | на «coach» видна надпись на футболке тренера «RIVAL» | наезд → стоп → рывок на «coach» |
| 118 | 5:13.7 | Sooner or later, the coach notices. | L22-gym | средний на ринге | 2.2 | на «notices» тренер опускает лапы | наезд → стоп → рывок на «notices» |
| 119 | 5:15.9 | COACH: Who are you training for? BOXER: Nobody. | L22-gym | крупно тренер (вип-пан) | 2.4 | на «for» тренер щурится → вип-пан со смазом на BOXER: на «Nobody» боксёр отводит глаза | стоп → вип-пан со смазом на BOXER |
| 120 | 5:18.3 | COACH: Then why is your shirt on backwards? | L22-gym | вставка спина боксёра | 2.2 | на «backwards» видна бирка футболки наружу; тренер уходит с ринга, лапы падают на пол | наезд → стоп → рывок на «backwards» |
| 121 | 5:20.4 | So why would a company pick a fight with the … | T-split | шаблон сплит лицом к лицу | 3.2 | слева Маск, справа Амодеи; на «richest» над Маском падает табличка «RICHEST MAN ON EARTH» | наезд → стоп → рывок на «richest» |
| 122 | 5:23.7 | And what would he do about it? | L04-starbase | крупно Маск | 1.4 | на «it» Маск кладёт телефон экраном вниз | наезд → стоп → рывок на «it» |
| 123 | 5:25.1 | About a month later, Anthropic announced it had | L09-ant | общий офис | 2.7 | на «announced» из бутылки вылетает пробка; подпись «FEB 12, 2026» | наезд → стоп → рывок на «announced» |
| 124 | 5:27.9 | raised thirty billion dollars more. | L09-ant | вставка доска | 2.2 | на «thirty» на доске печатается «SERIES G — $30 BILLION» | наезд → стоп → рывок на «dollars» |
| 125 | 5:30.1 | DANIELA: Thirty billion. DARIO: Don't read the … | L09-ant | средний Даниэла с бокалом (вип-пан) | 2.7 | на «billion» Даниэла поднимает бокал → вип-пан со смазом на DARIO: на «comments» Дарио прячет телефон в карман | стоп → вип-пан со смазом на DARIO |
| 126 | 5:32.7 | DANIELA: Too late. | L09-ant | вставка телефон Даниэлы | 1.5 | на «late» на телефоне начинает печататься ответ Маска | наезд → стоп → рывок на «late» |
| 127 | 5:34.2 | Musk had written one. | T-xpost | шаблон пост X | 1.4 | ответ Маска собирается слово за словом; на «one» мигает курсор | наезд → стоп → рывок на «one» |
| 128 | 5:35.6 | Their AI, he said, "hates Whites & Asians, … | L03-host | вставка принтер ведущего | 6.9 | в кабинете ведущего принтер печатает этот пост; на «hates» лист ползёт наружу | наезд → стоп → рывок на «especially» |
| 129 | 5:42.4 | And then the line that would follow him all year: | T-xpost | шаблон пост X последняя строка | 2.7 | на «year» камера едет к последней строке поста | наезд → стоп → рывок на «year» |
| 130 | 5:45.2 | "This is misanthropic and evil. | T-card | шаблон карточка-цитата | 2.2 | карточка «"This is misanthropic and evil."»; на «evil» слово краснеет | статично (стоп) |
| 131 | 5:47.4 | Fix it." | L03-host | вставка лист из принтера | 1.3 | на «Fix» лист падает в лоток — последняя строка красная | наезд → стоп → рывок на «Fix» |
| 132 | 5:48.7 | A fair criticism of an AI's bias? A rival's … | T-board | шаблон доска три версии | 5.6 | на «bias» прикалывается «BIAS?», на «revenge» — «REVENGE?», на «both» — «BOTH?» | наезд → стоп → рывок на «bias» и «revenge» |
| 133 | 5:54.3 | Fights over AI bias are real, and every big lab … | T-split | шаблон сплит четыре лаборатории | 4.2 | четыре офиса без названий; на «every» на каждый падает штамп «BIAS COMPLAINT» | наезд → стоп → рывок на «every» |
| 134 | 5:58.6 | Musk himself pointed to the bias. | L04-starbase | средний Маск у окна | 2.2 | на «bias» Маск тычет пальцем в экран телефона | наезд → стоп → рывок на «bias» |
| 135 | 6:00.8 | Either way, he wasn't done. | L04-starbase | крупно Маск | 1.8 | на «done» снова берёт телефон | наезд → стоп → рывок на «done» |
| 136 | 6:02.6 | Two weeks later: "Anthropic hates Western … | T-xpost | шаблон пост X | 3.7 | пост «FEB 27, 2026»; на «Civilization» строка «Anthropic hates Western Civilization.» загорается | наезд → стоп → рывок на «Civilization» |
| 137 | 6:06.4 | DARIO: Do we answer him? DANIELA: No. | L09-ant | средний Дарио с телефоном (вип-пан) | 1.7 | на «him» Дарио показывает телефон Даниэле → вип-пан со смазом на DANIELA: на «No» Даниэла не поднимает глаз от ноутбука | стоп → вип-пан со смазом на DANIELA |
| 138 | 6:08.0 | DARIO: Why not? DANIELA: We're busy. | L09-ant | крупно двое (вип-пан) | 1.7 | Дарио → вип-пан со смазом: на «busy» за стеклом звонят все телефоны | стоп → вип-пан со смазом на DANIELA |
| 139 | 6:09.7 | They were busy. | L09-ant | вставка стопка контрактов | 1.3 | на «busy» на стол шлёпается стопка контрактов «CLAUDE» | наезд → стоп → рывок на «busy» |
| 140 | 6:11.0 | Businesses kept signing up for Claude, and its … | L09-ant | общий график на стене | 3.8 | на «climbing» линия графика уходит за верх доски, метки «$9B · $14B · $30B A YEAR» | наезд → стоп → рывок на «climbing» |
| 141 | 6:14.9 | Grok's did not. | L10-xai | вставка кубик с плоским графиком | 1.3 | рядом с Grok плоский график; на «not» кубик вздыхает | наезд → стоп → рывок на «not» |
| 142 | 6:16.2 | Which raises a question nobody was asking yet. | L16-colossus-int | общий проход гудит | 2.7 | пустой проход; на «question» счётчик электричества на стене крутится быстрее | наезд → стоп → рывок на «asking» |
| 143 | 6:18.8 | Who was going to pay for Musk's giant machine? | T-card | шаблон карточка | 2.8 | карточка «Who pays for Colossus?» | статично (стоп) |
| 144 | 6:21.6 | Hold that thought. | T-board | шаблон доска | 1.3 | на «thought» на доску прикалывается «WHO PAYS?» | наезд → стоп → рывок на «thought» |
| 145 | 6:22.9 | Because first, meet the man who should have been … | L14-prison | общий комната с ТВ | 4.5 | на «richest» на экране ТВ проступает знак «$»; тень у ТВ поворачивается | наезд → стоп → рывок на «richest» |

### Гл. 4. The Ghost Investor — 6:27.5, 34 планов, 88.2 с, 23.1 пл/мин, карточек 3

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 146 | 6:27.5 | — (без голоса, музыка) | T-title | шаблон титр | 1.4 | засвет в белое → титр «4. THE GHOST INVESTOR»; буквы полупрозрачные, как призрак | статично (стоп) |
| 147 | 6:29.5 | Go back to April 2022. | L13-bahamas | общий офис | 2.2 | тёплый день, море за окном; на «2022» подпись «BAHAMAS · APRIL 2022» | наезд → стоп → рывок на «2022» |
| 148 | 6:31.7 | A young crypto billionaire named Sam Bankman-Fried | L13-bahamas | средний Бэнкман-Фрид на мешке | 2.7 | шорты, футболка, шесть мониторов; на «Bankman-Fried» подпись «SAM BANKMAN-FRIED — FOUNDER, FTX» | наезд → стоп → рывок на «Bankman-Fried» |
| 149 | 6:34.3 | leads a funding round for a little-known AI lab. | L13-bahamas | вставка монитор | 3.3 | на «lab» курсор нажимает «INVEST» в окне «AI LAB — FUNDING ROUND» | наезд → стоп → рывок на «lab» |
| 150 | 6:37.6 | He puts in about five hundred million dollars. | T-number | шаблон цифра | 2.6 | цифра досчитывает к «$500 MILLION» на «million» | наезд → стоп → рывок на «million» |
| 151 | 6:40.2 | SBF: AI safety. Good cause. ASSISTANT: And if it … | L13-bahamas | крупно Бэнкман-Фрид (вип-пан) | 3.8 | на «cause» показывает большой палец → вип-пан со смазом на ASSISTANT: на «off» ассистент прижимает папку | стоп → вип-пан со смазом на ASSISTANT |
| 152 | 6:44.1 | SBF: Everything pays off. ASSISTANT: Everything? | L13-bahamas | средний Бэнкман-Фрид (вип-пан) | 2.2 | Бэнкман-Фрид → вип-пан со смазом к ассистенту на «Everything?» | стоп → вип-пан со смазом на ASSISTANT |
| 153 | 6:46.3 | SBF: Eventually. | L13-bahamas | общий к мониторам | 1.5 | на «Eventually» отворачивается к мониторам — все графики зелёные | наезд → стоп → рывок на «Eventually» |
| 154 | 6:47.8 | — (без голоса, музыка) | T-card | шаблон карточка | 1.3 | карточка «$500 million. In.» | статично (стоп) |
| 155 | 6:49.3 | FTX was a crypto exchange, a place where millions … | T-map | шаблон карта | 5.2 | булавка на Багамах, башня биржи «FTX»; на «millions» к башне стекаются точки-люди | наезд → стоп → рывок на «millions» |
| 156 | 6:54.5 | Seven months later, it collapsed. | L13-bahamas | общий мониторы краснеют | 2.2 | на «collapsed» мониторы один за другим краснеют и гаснут; подпись «NOV 2022» | наезд → стоп → рывок на «collapsed» |
| 157 | 6:56.7 | Billions of dollars belonging to customers were … | T-map | шаблон карта башня | 2.8 | на «gone» башня на карте рассыпается в пыль, точки-деньги исчезают | наезд → стоп → рывок на «gone» |
| 158 | 6:59.5 | CUSTOMER: Can I withdraw? | T-phone | шаблон приложение биржи | 1.5 | на «withdraw» палец жмёт «WITHDRAW» — крутится колесо загрузки | наезд → стоп → рывок на «withdraw» |
| 159 | 7:01.0 | CLERK: Please hold. | T-split | шаблон сплит клиент / оператор | 1.5 | слева клиент с телефоном, справа оператор в гарнитуре; на «hold» играет музыка ожидания — нотки | наезд → стоп → рывок на «hold» |
| 160 | 7:02.5 | CUSTOMER: For how long? | T-phone | шаблон приложение биржи | 1.5 | на «long» колесо всё крутится | наезд → стоп → рывок на «long» |
| 161 | 7:04.0 | CLERK: Please hold. | T-split | шаблон сплит оператор | 1.5 | на «hold» оператор снимает гарнитуру и уходит | наезд → стоп → рывок на «hold» |
| 162 | 7:05.5 | He was convicted of fraud and | L12-court | общий зал суда | 1.5 | на «convicted» молоток бьёт | наезд → стоп → рывок на «fraud» |
| 163 | 7:07.0 | sentenced to twenty-five years in prison. | T-number | шаблон цифра | 2.4 | на «twenty-five» цифра встаёт «25 YEARS» | наезд → стоп → рывок на «years» |
| 164 | 7:09.4 | To pay customers back, the people cleaning up FTX … | T-doc | шаблон решение суда | 4.7 | постановление суда о банкротстве; на «sold» на полях — опись имущества | наезд → стоп → рывок на «sold» |
| 165 | 7:14.2 | Including that slice of Anthropic. | L12-court | вставка конверт | 2.1 | на «Anthropic» на стол ложится конверт «ANTHROPIC SHARES» | наезд → стоп → рывок на «Anthropic» |
| 166 | 7:16.2 | In 2024, it went for about one point three billion … | T-doc | шаблон опись | 4.2 | на «2024» штамп «SOLD — 2024»; на «billion» сумма «~$1.3 BILLION» | наезд → стоп → рывок на «about» и «billion» |
| 167 | 7:20.4 | BUYER: One point three? LAWYER: Take it or leave it. | L12-court | средний покупатель (вип-пан) | 2.5 | покупатель в костюме листает папку; на «three» поднимает глаза → вип-пан со смазом на LAWYER: на «leave» юрист пододвигает конверт | стоп → вип-пан со смазом на LAWYER |
| 168 | 7:22.9 | BUYER: Will he mind? LAWYER: He's in prison. | L12-court | общий оба (вип-пан) | 2.4 | покупатель → вип-пан со смазом: на «prison» юрист кивает на пустую скамью подсудимых | стоп → вип-пан со смазом на LAWYER |
| 169 | 7:25.4 | Not a bad return on five hundred million. | T-scale | шаблон весы | 2.5 | на одной чаше «$500M», на другой на «return» падает «$1.3B» | наезд → стоп → рывок на «five» |
| 170 | 7:27.8 | So what are those same shares worth today? | L01-nasdaq | общий конфетти | 2.4 | на «today» над табло загорается «ANT» | наезд → стоп → рывок на «today» |
| 171 | 7:30.3 | By our math from the filing: about thirty-seven … | T-number | шаблон цифра | 6.7 | «$1.3 BILLION» крутится; на «thirty-seven» — «~$37 BILLION», на «fifty» — «~$50 BILLION»; подпись «BY OUR MATH, FROM THE FILING» | наезд → стоп → рывок на «thirty-seven» и «fifty» |
| 172 | 7:37.0 | — (без голоса, музыка) | T-card | шаблон карточка | 1.3 | карточка «Sold too early.» | статично (стоп) |
| 173 | 7:38.5 | INMATE: Hey. Didn't you own that? SBF: For a while. | L14-prison | общий комната с ТВ (вип-пан) | 3.1 | на ТВ трансляция биржи; на «that» заключённый показывает на экран → вип-пан со смазом на SBF: подпись «SAM BANKMAN-FRIED — SERVING 25 YEARS»; на «while» он не отводит глаз от ТВ | стоп → вип-пан со смазом на SBF |
| 174 | 7:41.6 | INMATE: What happened? SBF: Everything else. | L14-prison | средний сокамерник (вип-пан) | 2.7 | на «happened» сокамерник поворачивается к нему → вип-пан со смазом на SBF: цифра на ТВ снова прыгает вверх, в стекле экрана — отражение Бэнкман-Фрида | стоп → вип-пан со смазом на SBF |
| 175 | 7:44.3 | An appeals court upheld his conviction in June. | T-doc | шаблон решение | 2.9 | на «upheld» штамп «AFFIRMED — JUNE 2026» | наезд → стоп → рывок на «conviction» |
| 176 | 7:47.2 | He has asked for a presidential pardon. | L14-prison | средний Бэнкман-Фрид пишет | 2.1 | на «pardon» он дописывает письмо «REQUEST FOR PARDON» | наезд → стоп → рывок на «pardon» |
| 177 | 7:49.4 | And on Thursday, he could only watch. | L14-prison | сверхкрупно лицо в свете ТВ | 2.4 | на «watch» цифра на экране за кадром прыгает — свет на лице становится зеленее | наезд → стоп → рывок на «watch» |
| 178 | 7:51.8 | But he isn't the one this story is about. | T-card | шаблон карточка | 2.0 | карточка «One of its earliest big checks came from a man now serving 25 years.» | статично (стоп) |
| 179 | 7:53.8 | Let's go back to the machine. | L16-colossus-int | вставка стойка | 1.9 | на «machine» стойка загорается зелёным рядом огоньков | наезд → стоп → рывок на «machine» |

### Гл. 5. The Machine in Memphis — 7:55.7, 57 планов, 177.1 с, 19.3 пл/мин, карточек 2

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 180 | 7:55.7 | — (без голоса, музыка) | T-title | шаблон титр | 1.4 | засвет в белое → титр «5. THE MACHINE IN MEMPHIS» | статично (стоп) |
| 181 | 7:57.8 | Follow the money to Memphis. | 3D-memphis | 3D пролёт к заводу | 1.7 | ночной пролёт над Мемфисом к зданию Colossus; на «Memphis» подпись «MEMPHIS, TN» | пролёт → стоп → рывок на «Memphis» |
| 182 | 7:59.4 | Colossus was built to train Grok. | L15-colossus-ext | общий завод | 2.2 | на «Grok» на стене завода появляется силуэт кубика Grok | наезд → стоп → рывок на «Grok» |
| 183 | 8:01.6 | And to power it fast, xAI ran gas turbines right … | L15-colossus-ext | средний ряд турбин | 4.5 | на «turbines» турбины выдыхают жар, воздух дрожит | наезд → стоп → рывок на «turbines» |
| 184 | 8:06.0 | An environmental group counted at least … | T-number | шаблон цифра | 4.1 | цифра досчитывает к «35+ TURBINES» на «thirty-five»; на «permits» штамп «NO PERMIT»; подпись «COUNT BY AN ENVIRONMENTAL GROUP» | наезд → стоп → рывок на «thirty-five» и «permits» |
| 185 | 8:10.2 | NEIGHBOR: What's that hum? NEIGHBOR 2: The future, … | L15-colossus-ext | средний соседи у забора (вип-пан) | 3.4 | двое у сетки-забора; на «hum» сетка дрожит → вип-пан со смазом на NEIGHBOR 2: на «apparently» пожимает плечами | стоп → вип-пан со смазом на NEIGHBOR 2 |
| 186 | 8:13.6 | NEIGHBOR: Can it be quieter? NEIGHBOR 2: Not … | L15-colossus-ext | крупно сосед закрывает уши (вип-пан) | 3.2 | на «quieter» затыкает уши → вип-пан со смазом на NEIGHBOR 2: на «future» турбина ревёт громче, из трубы — клуб пара | стоп → вип-пан со смазом на NEIGHBOR 2 |
| 187 | 8:16.8 | The NAACP went to court over the turbines at the … | L15-colossus-ext | общий протест у забора | 4.0 | плакаты у забора; юрист передаёт иск; на «court» подпись «NAACP v. xAI — SOUTHAVEN, APRIL 2026» | наезд → стоп → рывок на «court» |
| 188 | 8:20.8 | just across the state line in Mississippi. | T-map | шаблон карта штатов | 2.3 | граница Теннесси и Миссисипи; на «Mississippi» булавка «SOUTHAVEN» | наезд → стоп → рывок на «Mississippi» |
| 189 | 8:23.1 | That case is still going. | T-doc | шаблон иск | 1.8 | на «going» штамп «PENDING» | наезд → стоп → рывок на «going» |
| 190 | 8:24.9 | Inside: Nvidia chips by the hundreds of thousands. | 3D-colossus | 3D проход стоек | 3.5 | бесконечный проход стоек; на «thousands» ряды вдали загораются | проезд → стоп → рывок на «thousands» |
| 191 | 8:28.3 | Yes, that Nvidia. | L16-colossus-int | вставка чип | 1.7 | на «Nvidia» крупно — чип с зелёной полосой в слоте | наезд → стоп → рывок на «Nvidia» |
| 192 | 8:30.0 | Its co-founder Jensen Huang stepped down as CEO … | 3D-colossus | 3D Дженсен в проходе | 3.8 | Дженсен в кожанке идёт по проходу с планшетом; на «Huang» подпись «JENSEN HUANG — NVIDIA CO-FOUNDER»; на «stepped» снимает бейдж «CEO» | проезд → стоп → рывок на «down» |
| 193 | 8:33.8 | That's another story. We told it last time. | L03-host | вставка сейф с ключом | 2.8 | на «time» в приоткрытом сейфе ведущего блестит латунный ключ из прошлой серии | наезд → стоп → рывок на «time» |
| 194 | 8:36.6 | JENSEN: Nice chips. GUARD: Yours, sir? | L16-colossus-int | крупно Дженсен (вип-пан) | 2.0 | на «chips» стучит костяшкой по стойке → вип-пан со смазом на GUARD: на «sir» охранник светит фонарём на бейдж | стоп → вип-пан со смазом на GUARD |
| 195 | 8:38.6 | JENSEN: Not anymore. | L16-colossus-int | средний Дженсен улыбается | 1.5 | на «anymore» прячет бейдж в карман кожанки | наезд → стоп → рывок на «anymore» |
| 196 | 8:40.1 | Here's the thing about AI that most people miss. | T-board | шаблон окно чат-бота | 2.7 | на доске окно чат-бота; на «miss» прикалывается «$» | наезд → стоп → рывок на «miss» |
| 197 | 8:42.8 | Building a chatbot is expensive once. Running it … | T-split | шаблон сплит построить / держать | 4.9 | слева «BUILD», справа «RUN»; на «once» слева штамп «$ ONCE»; на «forever» справа счётчик начинает крутиться без остановки | наезд → стоп → рывок на «once» и «forever» |
| 198 | 8:47.7 | Every question you type wakes up chips somewhere, … | T-board | шаблон вопрос → стойка → счётчик | 5.6 | вопрос печатается в окне; на «chips» загорается стойка; на «electricity» крутится счётчик | наезд → стоп → рывок на «chips» и «electricity» |
| 199 | 8:53.3 | The more people use it, the bigger the bill. | T-number | шаблон счёт | 2.4 | на «bill» счёт за электричество вытягивается в длинную ленту | наезд → стоп → рывок на «bill» |
| 200 | 8:55.7 | CHIP: Another question. CHIP 2: Another bill. | L16-colossus-int | сверхкрупно два чипа в стойке (вип-пан) | 2.2 | у двух чипов в слоте глаза; чип 1 → вип-пан со смазом к чипу 2 на «bill» | стоп → вип-пан со смазом на CHIP 2 |
| 201 | 8:57.9 | CHIP: Another question. CHIP 2: You get the idea. | T-number | шаблон счётчик | 2.3 | счётчик электричества крутится всё быстрее; на «idea» из него вылетает пружинка | наезд → стоп → рывок на «idea» |
| 202 | 9:00.2 | Now picture it like this. | L23-stadium | общий пустой стадион | 1.5 | на «picture» прожекторы включаются по одному | наезд → стоп → рывок на «like» |
| 203 | 9:01.7 | You build the biggest stadium in the world for … | L23-stadium | средний поле | 3.2 | на «biggest» на табло ценник «$$$$»; на «team» на поле выбегает команда в футболках «GROK» | наезд → стоп → рывок на «world» и «team» |
| 204 | 9:04.9 | And your team can't sell enough tickets. | L23-stadium | вставка касса | 2.0 | пустая касса «TICKETS»; на «tickets» по проходу катится перекати-поле | наезд → стоп → рывок на «tickets» |
| 205 | 9:07.0 | COACH: Full house tonight? USHER: Just the mascot. | L23-stadium | крупно тренер (вип-пан) | 2.7 | на «tonight» тренер оглядывает трибуны → вип-пан со смазом на USHER: на «mascot» на пустой трибуне машет единственный маскот — кубик Grok в костюме | стоп → вип-пан со смазом на USHER |
| 206 | 9:09.7 | COACH: Whose mascot? USHER: Ours. | L23-stadium | общий (вип-пан) | 2.0 | тренер → вип-пан со смазом к капельдинеру: на «Ours» маскот падает с кресла | стоп → вип-пан со смазом на USHER |
| 207 | 9:11.7 | By the end of 2025, xAI had raised about … | T-number | шаблон цифра | 5.0 | цифра досчитывает к «~$32 BILLION RAISED» на «thirty-two» | наезд → стоп → рывок на «thirty-two» |
| 208 | 9:16.7 | That same year, Musk's AI business, including X, … | T-doc | шаблон отчёт | 6.0 | строка «OPERATING LOSS 2025»; на «six» встаёт красное «−$6.4 BILLION»; подпись «MUSK'S AI BUSINESS INCL. X» | наезд → стоп → рывок на «six» |
| 209 | 9:22.7 | ACCOUNTANT: Revenue? ACCOUNTANT 2: Coming. | L17-spacex | средний двое бухгалтеров (вип-пан) | 1.7 | на «Revenue» бухгалтер ведёт пальцем по пустой графе → вип-пан со смазом на ACCOUNTANT 2: на «Coming» смотрит на часы | стоп → вип-пан со смазом на ACCOUNTANT 2 |
| 210 | 9:24.3 | ACCOUNTANT: Costs? ACCOUNTANT 2: Already here. | L17-spacex | общий стол со счетами | 2.0 | на «here» на стол падает толстая стопка счетов | наезд → стоп → рывок на «here» |
| 211 | 9:26.4 | So how much was Grok actually bringing in? | L10-xai | крупно Grok | 2.5 | на «in» рядом с кубиком переворачивается пустая копилка | наезд → стоп → рывок на «in» |
| 212 | 9:28.9 | Analysts quoted by Fortune put it at less than a … | T-number | шаблон цифра | 4.2 | на «billion» под кубиком Grok «< $1 BILLION / YEAR»; подпись «ANALYSTS VIA FORTUNE, MAY 2026» | наезд → стоп → рывок на «billion» |
| 213 | 9:33.1 | Anthropic, by then, was on pace for more than forty. | T-scale | шаблон весы | 3.2 | слева «GROK: < $1B», справа на «forty» падает «CLAUDE: $40B+ A YEAR (RUN-RATE)» — правая чаша обрушивается вниз | наезд → стоп → рывок на «forty» |
| 214 | 9:36.3 | GROK: Is that bad? MUSK: It's early. | L10-xai | сверхкрупно Grok (вип-пан) | 1.9 | кубик встревожен; на «bad» очки съезжают → вип-пан со смазом на MUSK: на «early» Маск машет рукой | стоп → вип-пан со смазом на MUSK |
| 215 | 9:38.2 | GROK: How early? MUSK: Stop asking. | L10-xai | крупно Grok (вип-пан) | 2.0 | Grok → вип-пан со смазом: на «asking» Маск накрывает кубик кружкой | стоп → вип-пан со смазом на MUSK |
| 216 | 9:40.2 | It didn't help that Grok kept making headlines for … | L10-xai | общий Grok в бумажной короне | 3.8 | Grok за столом в бумажной короне; на «headlines» в него летят бумажные самолётики-заголовки | наезд → стоп → рывок на «headlines» |
| 217 | 9:44.0 | In July 2025, it praised Hitler and called itself … | T-doc | шаблон заголовок | 5.1 | заголовок «"MECHAHITLER"» — JULY 2025; на «MechaHitler» штамп «DELETED» | наезд → стоп → рывок на «MechaHitler» |
| 218 | 9:49.1 | In January 2026, after people used it to make … | T-phone | шаблон экран с подделкой | 6.3 | размытая картинка на экране телефона; на «fake» на неё падает штамп «FAKE» | наезд → стоп → рывок на «fake» |
| 219 | 9:55.4 | Indonesia and Malaysia blocked it. | L10-xai | вставка самолётики на столе | 1.9 | на «Indonesia» на стол падает самолётик «BLOCKED IN INDONESIA», на «Malaysia» — «BLOCKED IN MALAYSIA» | наезд → стоп → рывок на «Malaysia» и «Malaysia» |
| 220 | 9:57.3 | GROK: I can explain. MUSK: Please don't. | L10-xai | крупно Grok (вип-пан) | 2.0 | на «explain» корона съезжает набок → вип-пан со смазом на MUSK: на «don't» Маск снимает с кубика корону | стоп → вип-пан со смазом на MUSK |
| 221 | 9:59.3 | — (без голоса, музыка) | T-card | шаблон карточка | 1.4 | карточка «Not the headlines you want.» | статично (стоп) |
| 222 | 10:00.8 | In February, Musk folded xAI into his rocket … | L17-spacex | общий переговорная | 4.7 | на столе документ «SPACEX + xAI»; на «SpaceX» штамп «MERGED — FEB 2, 2026» | наезд → стоп → рывок на «SpaceX» |
| 223 | 10:05.5 | Bloomberg reported that the AI side was valued at … | T-number | шаблон цифра | 5.2 | цифра досчитывает к «~$250 BILLION» на «fifty»; подпись «VALUATION, AS REPORTED BY BLOOMBERG» | наезд → стоп → рывок на «fifty» |
| 224 | 10:10.7 | BOARD MEMBER: Rockets and chatbots? MUSK: Same … | L17-spacex | средний член совета (вип-пан) | 3.6 | на «chatbots» член совета поднимает бровь → вип-пан со смазом на MUSK: на «burn» модель ракеты на полке выпускает струйку дыма | стоп → вип-пан со смазом на MUSK |
| 225 | 10:14.3 | And this month, Musk admitted something remarkable. | L04-starbase | крупно Маск печатает | 2.9 | на «remarkable» Маск замирает над телефоном | наезд → стоп → рывок на «remarkable» |
| 226 | 10:17.2 | He was cutting usage limits on Grok Bot because, | T-phone | шаблон приложение Grok | 2.5 | на «limits» полоска лимита в приложении укорачивается вдвое | наезд → стоп → рывок на «limits» |
| 227 | 10:19.7 | in his words, "the cost of serving Grok Bot was … | T-xpost | шаблон пост X | 5.6 | пост «NOV 1, 2026»; на «unsustainably» слова «unsustainably high relative to revenue» подсвечиваются | наезд → стоп → рывок на «unsustainably» |
| 228 | 10:25.3 | — (без голоса, музыка) | T-card | шаблон карточка | 1.3 | карточка «"Unsustainably high."» | статично (стоп) |
| 229 | 10:26.9 | So there it was. Musk's giant AI machine. | 3D-colossus | 3D отъезд от стойки | 3.3 | камера отъезжает от одной горящей стойки на весь зал; на «machine» зал виден целиком | отъезд → стоп → рывок на «machine» |
| 230 | 10:30.2 | Built for Grok. | L16-colossus-int | вставка бирка | 1.3 | на «Grok» бирка «PROPERTY OF GROK» качается | наезд → стоп → рывок на «Grok» |
| 231 | 10:31.5 | And by Musk's own account, Grok's bills were too … | L10-xai | крупно кубик под счетами | 3.6 | на «bills» на кубик Grok сыплются счета | наезд → стоп → рывок на «bills» |
| 232 | 10:35.1 | Meanwhile, in San Francisco, the company he'd … | L09-ant | общий офис | 5.1 | на «Francisco» подпись «SAN FRANCISCO»; на «opposite» на доске пишется «NEED: COMPUTE» | наезд → стоп → рывок на «company» и «opposite» |
| 233 | 10:40.2 | DARIO: We have customers. DANIELA: We don't have … | L09-ant | средний Дарио со свитком (вип-пан) | 2.6 | на «customers» Дарио разворачивает длинный свиток заказов до пола → вип-пан со смазом на DANIELA: на «chips» переворачивает пустую коробку | стоп → вип-пан со смазом на DANIELA |
| 234 | 10:42.8 | DARIO: Who has chips? DANIELA: You won't like it. | L09-ant | крупно двое (вип-пан) | 2.3 | Дарио → вип-пан со смазом: на «like» Даниэла поворачивает ноутбук — на экране завод в Мемфисе | стоп → вип-пан со смазом на DANIELA |
| 235 | 10:45.1 | One side had a machine and not enough business. … | T-split | шаблон сплит машина / клиенты | 5.9 | слева «MACHINE · NOT ENOUGH CUSTOMERS», справа «CUSTOMERS · NOT ENOUGH MACHINE»; на «business» и «machine» — по штампу | наезд → стоп → рывок на «business» |
| 236 | 10:51.0 | What do you think happens next? | L18-meeting | общий пустая переговорная | 1.8 | на «next» дверь переговорной открывается | наезд → стоп → рывок на «next» |

### Гл. 6. The Deal — 10:52.8, 50 планов, 145.7 с, 20.6 пл/мин, карточек 6

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 237 | 10:52.8 | — (без голоса, музыка) | T-title | шаблон титр | 1.4 | засвет в белое → титр «6. THE DEAL»; ручка ставит подпись под титром | статично (стоп) |
| 238 | 10:54.9 | May 2026. | L18-meeting | общий переговорная | 1.7 | на «May» подпись «MAY 2026» | наезд → стоп → рывок на «May» |
| 239 | 10:56.6 | Musk goes to meet Anthropic's team himself. | L18-meeting | средний шеренга сотрудников | 2.8 | Маск идёт вдоль шеренги; на «himself» поднимает большую лупу «EVIL DETECTOR» | наезд → стоп → рывок на «himself» |
| 240 | 10:59.3 | Afterwards, he posts that everyone he met was … | T-xpost | шаблон пост X | 6.1 | на «competent» подсветка «highly competent»; на «detector» — «no one set off my evil detector» | наезд → стоп → рывок на «competent» и «detector» |
| 241 | 11:05.4 | MUSK: You. Evil? STAFFER: No, sir. | L18-meeting | крупно Маск с лупой (вип-пан) | 2.7 | на «Evil» лупа увеличивает глаз Маска → вип-пан со смазом на STAFFER: на «sir» сотрудник вытягивается | стоп → вип-пан со смазом на STAFFER |
| 242 | 11:08.2 | MUSK: You? STAFFER 2: Also no. | L18-meeting | вставка стрелка детектора (вип-пан) | 1.6 | на «You» стрелка на ручке лупы дрожит → вип-пан со смазом на STAFFER 2: на «no» сотрудница моргает | стоп → вип-пан со смазом на STAFFER 2 |
| 243 | 11:09.7 | MUSK: Good enough. | L18-meeting | общий шеренга | 1.5 | на «enough» Маск убирает лупу, стрелка встаёт на «OK» | наезд → стоп → рывок на «enough» и «OK» |
| 244 | 11:11.2 | — (без голоса, музыка) | T-card | шаблон карточка-цитата | 1.6 | карточка «"No one set off my evil detector." — MUSK, MAY 2026» | статично (стоп) |
| 245 | 11:13.0 | On May 3, they signed. | T-doc | шаблон договор | 1.9 | договор «CLOUD SERVICES AGREEMENT — MAY 3, 2026»; на «signed» ручка расписывается | наезд → стоп → рывок на «signed» |
| 246 | 11:14.9 | Anthropic got all of Colossus 1. | 3D-colossus | 3D проход | 2.5 | на «all» таблички на всех стойках разом переворачиваются: «ANTHROPIC» | проезд → стоп → рывок на «all» |
| 247 | 11:17.4 | About a billion and a quarter dollars a month. | T-number | шаблон цифра | 2.7 | цифра досчитывает к «$1.25 BILLION / MONTH» на «quarter» | наезд → стоп → рывок на «quarter» |
| 248 | 11:20.0 | LAWYER: Sign here. DARIO: And here? | L18-meeting | средний юрист с договором (вип-пан) | 1.5 | на «here» юрист раскладывает договор на столе → вип-пан со смазом на DARIO: на «here» Дарио показывает ручкой на второй лист | стоп → вип-пан со смазом на DARIO |
| 249 | 11:21.5 | LAWYER: And here. And here. MUSK: And here. | L18-meeting | вставка закладки (вип-пан) | 3.1 | на каждое «here» на договоре вырастает закладка «SIGN HERE» → вип-пан со смазом на MUSK: на «here» размашистая подпись | стоп → вип-пан со смазом на MUSK |
| 250 | 11:24.6 | — (без голоса, музыка) | T-card | шаблон карточка | 1.3 | карточка «May 3. Signed.» | статично (стоп) |
| 251 | 11:26.1 | The machine built for Grok would now run Claude. | L03-host | вставка распечатка evil | 3.0 | на «Claude» на слово «evil» с толчком камеры падает красный штамп «PAID» | наезд → стоп → рывок на «Claude» |
| 252 | 11:29.1 | — (без голоса, музыка) | T-card | шаблон карточка | 1.6 | карточка «Built for Grok. Rented to Claude.» | статично (стоп) |
| 253 | 11:30.8 | For Musk, it turned his biggest cost into rent. | T-split | шаблон сплит две стороны | 3.0 | слева счёт «COST»; на «rent» он переворачивается в чек «RENT» | наезд → стоп → рывок на «rent» |
| 254 | 11:33.8 | For Anthropic, it was the fastest way to get more … | L09-ant | средний Дарио у окна | 5.5 | на «chips» во двор въезжает грузовик с ящиками; на «single» на чертеже нового дата-центра — крест | наезд → стоп → рывок на «chips» и «single» |
| 255 | 11:39.3 | Both sides got what they needed. Neither had to … | T-split | шаблон сплит обе стороны кивают | 3.4 | на «needed» обе половины кивают; на «sorry» табличка «SORRY» падает в корзину | наезд → стоп → рывок на «needed» и «sorry» |
| 256 | 11:42.7 | ACCOUNTANT: They pay monthly? MUSK: On time. | L17-spacex | средний бухгалтер (вип-пан) | 2.1 | на «monthly» бухгалтер поднимает календарь → вип-пан со смазом на MUSK: на «time» щёлкает пальцами | стоп → вип-пан со смазом на MUSK |
| 257 | 11:44.8 | ACCOUNTANT: And we pay for the electricity? MUSK: … | L17-spacex | вставка счёт за свет (вип-пан) | 2.7 | на «electricity» на стол ложится счёт «ELECTRICITY — MEMPHIS» → вип-пан со смазом на MUSK: на «Details» смахивает счёт со стола | стоп → вип-пан со смазом на MUSK |
| 258 | 11:47.5 | DARIO: Why short? MUSK: In case I need it back. | L18-meeting | средний Дарио над договором (вип-пан) | 2.0 | на «short» палец на строке «TERM» → вип-пан со смазом на MUSK: на «back» Маск постукивает по столу | стоп → вип-пан со смазом на MUSK |
| 259 | 11:49.5 | DARIO: And if you do? MUSK: Ninety days. | L18-meeting | общий (вип-пан) | 1.7 | Дарио → вип-пан со смазом: на «Ninety» на договор шлёпается стикер «90 DAYS» | стоп → вип-пан со смазом на MUSK |
| 260 | 11:51.2 | — (без голоса, музыка) | T-card | шаблон карточка | 1.2 | карточка «Ninety days.» | статично (стоп) |
| 261 | 11:52.7 | Musk kept a door open. | L16-colossus-int | общий ворота зала | 1.9 | на «open» ворота зала приоткрываются — полоса света | наезд → стоп → рывок на «open» |
| 262 | 11:54.6 | The short lease, Reuters reported, was SpaceX's … | T-doc | шаблон заметка | 3.8 | заметка «REUTERS»; на «idea» подчёркивается «SPACEX'S IDEA» | наезд → стоп → рывок на «idea» |
| 263 | 11:58.4 | If computing power got "super tight," he "might … | T-xpost | шаблон пост X | 3.6 | пост «MAY 2026»; на «back» подсвечивается «we might need it back» | наезд → стоп → рывок на «back» |
| 264 | 12:02.0 | And Fortune reported he reserved the right to … | T-doc | шаблон заметка | 5.8 | строка «RIGHT TO RECLAIM IF ITS AI HARMS HUMANITY» — FORTUNE (REPORTED); на «humanity» маркер | наезд → стоп → рывок на «humanity» |
| 265 | 12:07.8 | Then in July, the man who had called their AI evil … | L04-starbase | средний Маск печатает | 4.2 | на «July» подпись «JULY 2026»; на «wrote» Маск жмёт «отправить» | наезд → стоп → рывок на «called» и «wrote» |
| 266 | 12:12.0 | "I was clearly wrong about Anthropic. They are … | T-xpost | шаблон пост X | 5.0 | пост «JUL 9, 2026»; на «wrong» подсвечивается «I was clearly wrong about Anthropic» | наезд → стоп → рывок на «They» |
| 267 | 12:17.0 | How often does Elon Musk say that? | T-card | шаблон карточка-цитата | 2.0 | карточка «"I was clearly wrong."» | статично (стоп) |
| 268 | 12:19.0 | AIDE: Sir, you were wrong? MUSK: Clearly. | L04-starbase | средний помощник (вип-пан) | 2.7 | на «wrong» помощник роняет планшет → вип-пан со смазом на MUSK: на «Clearly» Маск кивает, не глядя | стоп → вип-пан со смазом на MUSK |
| 269 | 12:21.8 | AIDE: Should I post it? MUSK: I already did. | L04-starbase | общий (вип-пан) | 1.9 | помощник → вип-пан со смазом: на «did» телефон Маска показывает пост с сердечками | стоп → вип-пан со смазом на MUSK |
| 270 | 12:23.6 | And here's the strangest twist. | L10-xai | средний пустой стол | 1.7 | на «twist» на пустом столе раскрывается ноутбук | наезд → стоп → рывок на «twist» |
| 271 | 12:25.3 | Remember the coding tool Musk's engineers had used … | L10-xai | вставка ноутбук | 4.1 | на «coding» на экране значок редактора кода (без логотипа) | наезд → стоп → рывок на «engineers» |
| 272 | 12:29.4 | It was called Cursor. | L10-xai | сверхкрупно крышка ноутбука | 1.4 | на «Cursor» на крышке печатается «CURSOR» | наезд → стоп → рывок на «Cursor» |
| 273 | 12:30.9 | In August, SpaceX bought Cursor. | T-doc | шаблон сделка | 2.8 | на «bought» на ноутбук падает штамп «ACQUIRED — AUG 14, 2026» | наезд → стоп → рывок на «bought» |
| 274 | 12:33.6 | ENGINEER: So we own the door now. ENGINEER 2: They … | L10-xai | средний инженер (вип-пан) | 3.5 | на «door» инженер гордо стучит по ноутбуку → вип-пан со смазом на ENGINEER 2: на «locks» на экране снова «ACCESS REVOKED» | стоп → вип-пан со смазом на ENGINEER 2 |
| 275 | 12:37.1 | The deal kept growing. | L16-colossus-int | общий проход | 1.5 | на «growing» вдали загораются новые ряды стоек | наезд → стоп → рывок на «growing» |
| 276 | 12:38.6 | By the time Anthropic filed to go public, it said … | T-doc | шаблон обложка проспекта | 3.2 | на «public» обложка «FORM S-1» листается к разделу «COMPUTE» | наезд → стоп → рывок на «public» |
| 277 | 12:41.8 | up to a hundred and twenty billion dollars on … | T-number | шаблон цифра | 5.6 | на «hundred» цифра встаёт «UP TO $120.5 BILLION»; на «2029» — «THROUGH 2029» | наезд → стоп → рывок на «SpaceX's» и «2029» |
| 278 | 12:47.4 | That's about three billion a month, once all the … | T-doc | шаблон строка проспекта | 3.9 | на «three» строка «≈ $3.1 BILLION A MONTH — ONCE ALL CAPACITY ARRIVES» | наезд → стоп → рывок на «once» |
| 279 | 12:51.3 | And for the first time, Musk's AI business made a … | T-chart | шаблон график прибыли | 3.8 | линия прибыли ИИ-бизнеса SpaceX; на «profit» она переходит из красной зоны в зелёную | наезд → стоп → рывок на «profit» |
| 280 | 12:55.0 | Last quarter, its revenue grew almost tenfold, and … | T-number | шаблон цифра | 6.6 | на «tenfold» «REVENUE ×10»; на «thirty-one» «+$431 MILLION — FIRST PROFIT» | наезд → стоп → рывок на «tenfold» и «thirty-one» |
| 281 | 13:01.7 | SpaceX credited new cloud deals. | L17-spacex | общий переговорная | 2.5 | на «cloud» на экране совета слайд «CLOUD DEALS» | наезд → стоп → рывок на «cloud» |
| 282 | 13:04.2 | Its computing customers include Anthropic and … | T-board | шаблон доска клиенты | 3.4 | на «Anthropic» прикалывается табличка «ANTHROPIC», на «Google» — «GOOGLE» | наезд → стоп → рывок на «Anthropic» и «Google» |
| 283 | 13:07.6 | And one customer it didn't name brought in about a … | T-number | шаблон доля | 5.2 | круг выручки; на «third» треть закрашивается под силуэтом с «?» — «CUSTOMER B (UNNAMED) ≈ 1/3 OF REVENUE» | наезд → стоп → рывок на «third» |
| 284 | 13:12.7 | GROK: Did I do that? MUSK: No. | L10-xai | крупно Grok (вип-пан) | 2.0 | на «that» Grok с надеждой поднимает очки → вип-пан со смазом на MUSK: на «No» Маск даже не поворачивается | стоп → вип-пан со смазом на MUSK |
| 285 | 13:14.7 | GROK: Who did? MUSK: The tenants. | L10-xai | сверхкрупно Grok (вип-пан) | 2.0 | Grok → вип-пан со смазом: на «tenants» Маск показывает на окно, за которым светится Colossus | стоп → вип-пан со смазом на MUSK |
| 286 | 13:16.7 | — (без голоса, музыка) | T-card | шаблон карточка | 1.8 | карточка «Grok didn't pay for Colossus. The tenants did.» | статично (стоп) |

### Гл. 7. Who Really Wins — 13:18.5, 53 планов, 146.0 с, 21.8 пл/мин, карточек 6

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 287 | 13:18.5 | — (без голоса, музыка) | T-title | шаблон титр | 1.4 | засвет в белое → титр «7. WHO REALLY WINS» | статично (стоп) |
| 288 | 13:20.5 | So, back to Thursday. | L01-nasdaq | общий конфетти | 1.8 | конфетти ещё падают; на «Thursday» подпись «NOV 19» | наезд → стоп → рывок на «Thursday» |
| 289 | 13:22.3 | Who actually won? | L01-nasdaq | вставка тикер | 1.3 | на «won» тикер сползает с пика | наезд → стоп → рывок на «won» |
| 290 | 13:23.6 | The Amodeis, for one. | T-board | шаблон доска четыре фото | 1.7 | на «Amodeis» прикалывается фото Дарио и Даниэлы | наезд → стоп → рывок на «Amodeis» |
| 291 | 13:25.3 | At the opening trade, each sibling's stake was … | T-number | шаблон цифра | 5.3 | на «twenty-six» под фото «~$26B EACH AT THE OPEN» | наезд → стоп → рывок на «twenty-six» |
| 292 | 13:30.6 | DANIELA: Is that real? DARIO: Until it moves. | L01-nasdaq | средний Даниэла смотрит на табло (вип-пан) | 2.2 | на «real» Даниэла щурится на табло → вип-пан со смазом на DARIO: на «moves» Дарио поправляет очки | стоп → вип-пан со смазом на DARIO |
| 293 | 13:32.9 | DANIELA: It's moving. DARIO: Then don't look. | L01-nasdaq | вставка табло (вип-пан) | 1.9 | на «moving» цифры на табло перещёлкиваются → вип-пан со смазом на DARIO: на «look» Дарио закрывает ей глаза ладонью | стоп → вип-пан со смазом на DARIO |
| 294 | 13:34.8 | Amazon and Google own almost thirty percent … | T-board | шаблон доска банки | 3.5 | на «Amazon» и «Google» прикалываются таблички без логотипов; на «thirty» ценник «~30%» | наезд → стоп → рывок на «thirty» и «thirty» |
| 295 | 13:38.2 | But their shares come with no votes. | T-doc | шаблон акции | 2.2 | на «votes» на сертификаты акций падает штамп «NO VOTE» | наезд → стоп → рывок на «votes» |
| 296 | 13:40.4 | The founders keep control. | L09-ant | вставка ключ в руке | 1.7 | на «control» Даниэла сжимает ключ с биркой «CONTROL» | наезд → стоп → рывок на «control» |
| 297 | 13:42.1 | AMAZON BANKER: We paid billions. GOOGLE BANKER: … | L01-nasdaq | средний банкиры (вип-пан) BANKER | 2.5 | двое банкиров в галстуках; на «billions» один трясёт чековой книжкой → вип-пан со смазом на GOOGLE BANKER: на «seat» банкир показывает на стул у трибуны | стоп → вип-пан со смазом на GOOGLE |
| 298 | 13:44.5 | LAWYER: In the audience. | L01-nasdaq | общий зал | 1.5 | на «audience» юрист показывает на задние ряды | наезд → стоп → рывок на «audience» |
| 299 | 13:46.0 | And Musk? | T-board | шаблон доска | 1.3 | на «Musk» прикалывается фото Маска | наезд → стоп → рывок на «Musk» |
| 300 | 13:47.3 | His money from Anthropic doesn't come from its … | T-doc | шаблон квитанция | 4.3 | на «rent» под фото — квитанция «RENT RECEIPT» | наезд → стоп → рывок на «rent» |
| 301 | 13:51.7 | He's the landlord. | L04-starbase | крупно Маск со связкой ключей | 1.5 | на «landlord» Маск подбрасывает связку ключей с биркой «COLOSSUS» | наезд → стоп → рывок на «landlord» |
| 302 | 13:53.1 | DANIELA: Who's he? DARIO: The landlord. | L09-ant | средний Даниэла с договором (вип-пан) | 1.9 | на «he» Даниэла показывает на подпись в договоре аренды → вип-пан со смазом на DARIO: на «landlord» Дарио вздыхает | стоп → вип-пан со смазом на DARIO |
| 303 | 13:55.1 | DANIELA: The one who called us evil? DARIO: He's a … | L09-ant | вставка распечатка evil (вип-пан) | 2.9 | на «evil» в руке у Даниэлы распечатка поста → вип-пан со смазом на DARIO: на «landlord» Дарио кладёт в конверт «RENT» чек | стоп → вип-пан со смазом на DARIO |
| 304 | 13:58.0 | — (без голоса, музыка) | T-card | шаблон карточка | 1.2 | карточка «Landlord.» | статично (стоп) |
| 305 | 13:59.5 | The AI he called misanthropic now runs in his … | 3D-colossus | 3D проход | 4.4 | на «runs» на стойках загораются таблички «CLAUDE»; на «rent» у входа щёлкает счётчик | проезд → стоп → рывок на «runs» |
| 306 | 14:03.9 | — (без голоса, музыка) | T-card | шаблон карточка | 1.6 | карточка «He houses the AI he called evil.» | статично (стоп) |
| 307 | 14:05.7 | The night before the IPO, he explained himself on … | L19-dealbook | общий сцена | 3.6 | Маск в кресле напротив интервьюера; на «stage» подпись «DEALBOOK SUMMIT · NOV 18» | наезд → стоп → рывок на «stage» |
| 308 | 14:09.3 | Before renting them anything, he said, he went and … | L19-dealbook | крупно Маск | 4.9 | на «people» Маск разводит руками | наезд → стоп → рывок на «people» |
| 309 | 14:14.2 | No one set off his evil detector. | L19-dealbook | вставка лупа на столике | 2.2 | на «detector» на столике лупа «EVIL DETECTOR», стрелка на «OK» | наезд → стоп → рывок на «detector» и «OK» |
| 310 | 14:16.4 | And he expects them to want ten more gigawatts. … | T-number | шаблон цифра | 4.8 | на «ten» «+10 GIGAWATTS?»; на «confirmed» штамп «NOT CONFIRMED BY ANTHROPIC» | наезд → стоп → рывок на «Anthropic» и «confirmed» |
| 311 | 14:21.2 | INTERVIEWER: And if they turn evil? MUSK: Then I … | L19-dealbook | средний интервьюер (вип-пан) | 2.6 | интервьюер без имени; на «evil» наклоняется вперёд → вип-пан со смазом на MUSK: на «back» Маск делает жест «забираю» | стоп → вип-пан со смазом на MUSK |
| 312 | 14:23.8 | INTERVIEWER: Just like that? MUSK: Three to six … | L19-dealbook | общий (вип-пан) | 2.0 | интервьюер → вип-пан со смазом: на «six» на экране за ними «3–6 MONTHS» | стоп → вип-пан со смазом на MUSK |
| 313 | 14:25.8 | INTERVIEWER: And if they don't turn evil? MUSK: … | L19-dealbook | средний интервьюер (вип-пан) | 2.1 | на «evil» интервьюер прищуривается → вип-пан со смазом на MUSK: на «rent» Маск улыбается, зал смеётся | стоп → вип-пан со смазом на MUSK |
| 314 | 14:27.9 | The next morning, asked about staying with SpaceX, | L20-cnbc | общий утренняя студия | 3.2 | Дарио и Даниэла на стульях; на «SpaceX» подпись «BUSINESS TV · NOV 19» | наезд → стоп → рывок на «SpaceX» |
| 315 | 14:31.1 | Dario said they were "enjoying working with SpaceX." | L20-cnbc | крупно Дарио | 3.0 | на «enjoying» Дарио кивает | наезд → стоп → рывок на «enjoying» |
| 316 | 14:34.0 | And then: "you can't be sure what you're going to … | T-card | шаблон карточка-цитата | 3.5 | карточка «"You can't be sure what you're going to do in the future." — DARIO AMODEI» | статично (стоп) |
| 317 | 14:37.6 | And the man they all walked away from? | L21-altman | общий Альтман у окна | 2.0 | ночь; Альтман один у окна, в руке телефон с тикером; на «away» отражение в стекле | наезд → стоп → рывок на «away» |
| 318 | 14:39.6 | Sam Altman said he doesn't know if Anthropic's … | L21-altman | крупно Альтман | 3.3 | на «Altman» подпись «SAM ALTMAN — CEO, OPENAI»; на «safe» хмурится | наезд → стоп → рывок на «know» и «safe» |
| 319 | 14:42.9 | and called "the race dynamic in the fog of war" "a … | T-card | шаблон карточка-цитата | 4.2 | карточка «"the race dynamic in the fog of war" — "a bad thing"» — SAM ALTMAN | статично (стоп) |
| 320 | 14:47.1 | OpenAI, he says, will go public "at some point." | L21-altman | вставка телефон | 3.7 | на «point» в календаре телефона пустая дата «SOMEDAY» | наезд → стоп → рывок на «point» |
| 321 | 14:50.8 | ALTMAN: Should we have kept them? ASSISTANT: Which … | L21-altman | средний Альтман и ассистент (вип-пан) | 2.2 | на «them» Альтман кивает на телефон → вип-пан со смазом на ASSISTANT: на «ones» ассистент пожимает плечами | стоп → вип-пан со смазом на ASSISTANT |
| 322 | 14:53.0 | ALTMAN: Either. | L21-altman | крупно Альтман отворачивается | 1.5 | на «Either» Альтман снова смотрит в окно | наезд → стоп → рывок на «Either» |
| 323 | 14:54.5 | So that's the trade. | T-split | шаблон сплит TWO EXITS | 1.3 | надпись «TWO EXITS»; слева Маск со связкой ключей-стоек, справа Амодеи со светящимся окном Claude; на «trade» они меняются ключом и чеком | наезд → стоп → рывок на «trade» |
| 324 | 14:55.8 | Two exits from the same lab. | L07-openai20 | общий офис OpenAI ночью | 1.9 | на «exits» две двери захлопываются одна за другой | наезд → стоп → рывок на «same» |
| 325 | 14:57.7 | One side built the AI everyone wants. | T-split | шаблон сплит | 2.5 | на «wants» правая половина загорается | наезд → стоп → рывок на «wants» |
| 326 | 15:00.2 | The other built the machine nobody else could fill. | 3D-colossus | 3D пустой проход | 2.6 | на «fill» у дальних стоек гаснет свет — ряды пусты | проезд → стоп → рывок на «fill» |
| 327 | 15:02.9 | They didn't make peace. They made a lease. | T-card | шаблон карточка | 2.8 | карточка «They didn't make peace. They made a lease.» | статично (стоп) |
| 328 | 15:05.7 | And here's the part most headlines missed. | T-doc | шаблон проспект | 2.4 | на «missed» маркер находит строку в конце проспекта | наезд → стоп → рывок на «missed» |
| 329 | 15:08.1 | Anthropic has promised to spend about nine hundred … | T-number | шаблон цифра | 5.4 | на «hundred» цифра «~$900.9 BILLION — COMPUTE COMMITMENTS» | наезд → стоп → рывок на «hundred» |
| 330 | 15:13.4 | To Google. To Amazon. To Microsoft. To others. And … | T-board | шаблон стрелки | 5.0 | от цифры вылетают стрелки: на «Google» — «GOOGLE», на «Amazon» — «AMAZON», на «Microsoft» — «MICROSOFT», на «Musk» — «SPACEX» | наезд → стоп → рывок на «others» и «Amazon» |
| 331 | 15:18.4 | AMAZON BANKER: They owe us how much? GOOGLE … | L01-nasdaq | средний банкир Amazon (вип-пан) BANKER | 3.0 | на «much» банкир достаёт калькулятор → вип-пан со смазом на GOOGLE BANKER: на «us» банкир ухмыляется | стоп → вип-пан со смазом на GOOGLE |
| 332 | 15:21.4 | MUSK: Gentlemen. Get in line. | L01-nasdaq | крупно очередь | 1.9 | Маск протискивается в кадр с края; на «line» банкиры послушно встают в очередь | наезд → стоп → рывок на «line» |
| 333 | 15:23.3 | In a gold rush, the miners make the headlines. | L24-goldrush | общий городок | 2.7 | старатели копают у реки; на «headlines» мимо пролетает газета «GOLD!» | наезд → стоп → рывок на «headlines» |
| 334 | 15:26.0 | The people renting out the shovels make the money. | L24-goldrush | средний лавка лопат | 2.7 | человек в цилиндре сдаёт лопаты; на «money» пересыпает монеты в мешок | наезд → стоп → рывок на «money» |
| 335 | 15:28.7 | — (без голоса, музыка) | T-card | шаблон карточка | 1.6 | карточка «In a gold rush, rent out the shovels.» | статично (стоп) |
| 336 | 15:30.5 | And a lease can end. | L01-nasdaq | общий сцена в сумерках | 1.3 | зал пустеет; на «end» колокол звенит ещё раз, тише | наезд → стоп → рывок на «end» |
| 337 | 15:31.8 | Ninety days' notice, once the first terms run out … | T-number | шаблон обратный отсчёт | 4.4 | на «Ninety» «90 DAYS' NOTICE» и отсчёт; на «year» «AFTER EARLY 2027» | наезд → стоп → рывок на «first» и «year» |
| 338 | 15:36.3 | So here's the last question. | L04-starbase | средний Маск с телефоном | 1.8 | на «question» телефон Маска загорается уведомлением «PAYMENT RECEIVED» | наезд → стоп → рывок на «question» |
| 339 | 15:38.0 | What happens to one of the most valuable AI … | L09-ant | общий офис ночью | 6.5 | на «landlord» по стене офиса проходит длинная тень с окна; на «mind» одна лампа гаснет | наезд → стоп → рывок на «landlord» и «mind» |

### Гл. 8. The Office — 15:44.5, 6 планов, 13.3 с, 27.1 пл/мин, карточек 0

| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |
|---|---|---|---|---|---|---|---|
| 340 | 15:44.5 | HOST: Evil, in February. | L03-host | средний ведущий с распечаткой | 1.5 | на «Evil» ведущий поднимает распечатку к лампе | наезд → стоп → рывок на «February» |
| 341 | 15:46.0 | Paid, by May. | L03-host | вставка штамп PAID | 2.8 | на «Paid» блик лампы на красном штампе | наезд → стоп → рывок на «Paid» |
| 342 | 15:48.8 | HOST: And the receipt goes where all good receipts … | L03-host | общий ведущий идёт к сейфу | 3.1 | на «go» ведущий поворачивается к сейфу | наезд → стоп → рывок на «go» |
| 343 | 15:51.9 | HOST: Some words get deleted. | L03-host | вставка сейф открывается | 2.0 | на «deleted» дверца сейфа открывается — внутри латунный ключ из прошлой серии | наезд → стоп → рывок на «deleted» |
| 344 | 15:53.9 | These ones got invoiced. | L03-host | крупно лист рядом с ключом | 1.9 | на «invoiced» ведущий кладёт лист рядом с ключом | наезд → стоп → рывок на «invoiced» |
| 345 | 15:55.8 | — (без голоса, музыка) | L03-host | общий сейф закрывается | 2.0 | дверца закрывается, ручка поворачивается; лампа гаснет | статично (стоп) |

## Проверка

(заполняет `shotlist_tool.mjs sync`)
