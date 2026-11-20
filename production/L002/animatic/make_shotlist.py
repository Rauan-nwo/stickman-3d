# -*- coding: utf-8 -*-
"""make_shotlist.py — раскадровка L002 (shotlist.md) из списка планов ниже + script.md.
  python -X utf8 production/L002/animatic/make_shotlist.py
План задаётся началом своего куска текста (первые слова, как в сценарии; '—' — план без голоса), локацией, крупностью,
событием («на «слово» — действие», части через «;») и, если нужно, камерой (иначе — по грамматике L001: наезд → стоп →
рывок на первое ударное слово события; карточки и титры — статично; вип-пан — если в крупности есть «вип-пан → ИМЯ»).
Колонка «текст» собирается из сценария (как shotlist_tool.mjs: до ~50 знаков + « …»), старт и длительность ставит
make_timing.mjs + shotlist_tool.mjs sync по голосу Fish."""
import os, re

D = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(D)
CH = {0: 'The Bell', 1: 'The Office', 2: 'Two Exits', 3: 'Evil', 4: 'The Ghost Investor', 5: 'The Machine in Memphis',
      6: 'The Deal', 7: 'Who Really Wins', 8: 'The Office — the safe'}

S = []  # (ch, start, loc, framing, event, camera|None, silent_dur|None)
def ch(n): S.append(('CH', n))
def p(start, loc, framing, event, cam=None, dur=None): S.append((start, loc, framing, event, cam, dur))

# ───────────────────────── 0. The Bell (холодный хук) ─────────────────────────
ch(0)
p('On Thursday,', 'L01-nasdaq', 'общий сцена биржи', 'с первого кадра: студия биржи в Нью-Йорке, конфетти; Дарио и Даниэла у трибуны с колоколом, вспышки фотографов; на «Thursday» молоток бьёт в колокол и печатается подпись «NEW YORK · NOV 19, 2026»')
p('rang the bell', 'L01-nasdaq', 'вставка колокол', 'на «bell» второй удар — волна звука сдувает конфетти к камере')
p('And some of that money', 'L01-nasdaq', 'средний дождь конфетти', 'из конфетти выпадает один листок — счёт; на «money» он переворачивается: «INVOICE · $1,250,000,000 / MONTH», получатель закрыт полосой')
p('who called this', 'L04-starbase', 'общий силуэт у окна', 'силуэт человека спиной у окна с ракетой на закате, телефон в руке; на «evil» экран телефона вспыхивает красным словом «EVIL»')
p('TRADER: Look at it go.', 'L02-trading', 'средний два трейдера', 'трейдеры под тикер-лентой; на «go» лента прыгает зелёным: «ANT $83.00 → $111.50»')
p('TRADER 2: Who\'s buying?', 'L02-trading', 'крупно трейдер 2 вип-пан → TRADER', 'трейдер 2 оборачивается → вип-пан со смазом: на «Everyone» все мониторы зала разом становятся зелёными')
p('Anthropic, the maker of Claude,', 'T-doc', 'шаблон обложка проспекта', 'обложка «ANTHROPIC, PBC — FORM S-1»; на «Claude» печатается подпись «MAKER OF CLAUDE»')
p('raised eighty-one billion', 'T-number', 'шаблон цифра', 'цифра досчитывает к «$81 BILLION» на «billion»; на «record» на цифру падает штамп «RECORD IPO»')
p('And its own filing says', 'T-doc', 'шаблон строка проспекта', 'маркер ведёт по строке «SpaceX.AI LLC … up to $120.5 billion»; на «hundred» камера ныряет в цифру; на «Musk» строка «PAYEE: SPACEX» загорается')
p('MUSK: Up thirty-four percent.', 'L04-starbase', 'вставка телефон', 'в руке телефон с тикером ANT; на «thirty-four» цифра прыгает «+34%»; подпись «ELON MUSK — SPACEX, xAI»')
p('AIDE: Sir. In February', 'L04-starbase', 'средний помощник у двери', 'помощник с планшетом; на «evil» на планшете — пост с красным словом')
p('MUSK: That was February.', 'L04-starbase', 'крупно Маск ухмыляется', 'Маск не отрывается от телефона; на «February» пожимает плечом')
p('AIDE: And now?', 'L04-starbase', 'общий окно с ракетой вип-пан → MUSK', 'помощник ждёт → вип-пан со смазом к Маску: на «rent» на телефоне падает уведомление «PAYMENT RECEIVED»')
p('Nine months ago,', 'T-xpost', 'шаблон пост X', 'пост печатается сам; дата «FEB 12, 2026»; на «evil» последняя строка «This is misanthropic and evil. Fix it.» загорается красным')
p('Today, they rent his computers.', '3D-colossus', '3D ряд стоек', 'проезд вдоль стоек с зелёными огоньками; на «rent» на ближней стойке переворачивается табличка «LEASED»', 'проезд → стоп → рывок на «rent»')
p('How does that happen?', 'T-card', 'шаблон карточка', 'карточка «From "evil" to "tenant" in nine months.»')
p('—', 'T-title', 'шаблон название ролика', 'засвет в белое → название «How Elon Musk Got Paid by the Company He Called Evil»; на слове «Evil» красная печать', dur=1.8)

# ───────────────────────── 1. The Office (ведущий) ─────────────────────────
ch(1)
p('HOST: Evening.', 'L03-host', 'общий кабинет', 'на «Evening» лампа щёлкает и загорается, за окном дождь; на «page» ведущий придавливает пальцем сползающую распечатку поста «evil»')
p('It\'s worth more than it looks.', 'L03-host', 'вставка распечатка у лампы', 'на «worth» ведущий поднимает лист к лампе — сквозь бумагу светится красное «evil»')
p('HOST: One man calls a company evil.', 'L03-host', 'сверхкрупно слово evil', 'на «evil» красная ручка обводит слово кругом')
p('Three months later,', 'L03-host', 'средний ведущий со связкой ключей', 'на «keys» на стол падает связка ключей с биркой «COLOSSUS»; на «AI» бирка поворачивается — на обороте «GROK»')
p('So what changed?', 'L03-host', 'крупно ведущий у доски', 'на «changed» ведущий прикалывает распечатку «evil» к пробковой доске за спиной')
p('The answer runs through a chatbot', 'T-board', 'шаблон доска три фото', 'на «chatbot» прикалывается фото кубика Grok с ценником «$$$»; нить тянется к центру', 'наезд → стоп → рывок на «chatbot»')
p('a ghost in a prison cell,', 'L14-prison', 'средний ТВ и тень', 'на «ghost» на стене у ТВ проступает тень человека в робе — самого человека не видно')
p('and a factory in Memphis.', 'L15-colossus-ext', 'общий завод ночью', 'на «Memphis» печатается подпись «MEMPHIS, TN»; турбины выдыхают пар')
p('But it starts with a warning.', 'L03-host', 'крупно ведущий у лампы', 'на «warning» ведущий поднимает палец, тень пальца ложится на стену')

# ───────────────────────── 2. Two Exits ─────────────────────────
ch(2)
p('—', 'T-title', 'шаблон титр', 'засвет в белое → титр «2. TWO EXITS»; две двери на титре захлопываются', dur=1.4)
p('In 2014, Musk stood up at MIT', 'L05-mit', 'общий аудитория', 'тёплый день; Маск у кафедры; на «MIT» подпись «MIT · 2014»')
p('"summoning the demon."', 'L05-mit', 'вставка экран слайда', 'на «demon» на слайде проявляется мультяшный чертёнок и подмигивает')
p('STUDENT: So you\'re against AI?', 'L05-mit', 'обратная студент в первом ряду', 'студент тянет руку; на «AI» поднимается с места')
p('MUSK: I\'m against other people', 'L05-mit', 'крупно Маск', 'на «badly» Маск разводит руками и показывает в зал')
p('—', 'T-card', 'шаблон карточка-цитата', 'карточка «"We are summoning the demon." — ELON MUSK, 2014»', dur=1.8)
p('A year later,', 'T-year', 'шаблон календарь', 'на «later» листок «2014» отрывается; на «himself» под ним — «2015»')
p('In 2015 he co-founded a lab', 'L06-openai15', 'общий лофт', 'тёплый день; Маск у доски; на «OpenAI» маркер пишет «OpenAI — nonprofit»')
p('with Sam Altman.', 'L06-openai15', 'крупно Альтман', 'на «Altman» Альтман входит в кадр; подпись «SAM ALTMAN — OPENAI CO-FOUNDER»')
p('A nonprofit, built as a counterweight', 'T-scale', 'шаблон весы', 'на одной чаше огромный шар «GOOGLE», чаша внизу; на «counterweight» на вторую чашу прыгает маленький «OpenAI» — весы качаются')
p('Musk pledged up to a billion dollars.', 'L06-openai15', 'средний рукопожатие над чеком', 'Маск и Альтман жмут руки; на «billion» разворачивается гигантский чек «$1,000,000,000»')
p('ALTMAN: A billion?', 'L06-openai15', 'крупно Альтман вип-пан → MUSK', 'Альтман поднимает бровь → вип-пан со смазом к Маску: на «Eventually» Маск подмигивает')
p('Under oath this year,', 'L06-openai15', 'вставка гигантский чек', 'нули с чека падают по одному со стуком; на «thirty-eight» остаётся «$38,000,000»; подпись «MUSK TESTIMONY, 2026»')
p('Then came a fight over who', 'T-board', 'шаблон доска «2017–2018»', 'на доске «2017–2018», две красные нити; на «charge» прикалывается табличка «CEO?»')
p('OpenAI later published his old emails.', 'T-doc', 'шаблон письма веером', 'распечатки писем веером; на «emails» штамп «PUBLISHED BY OPENAI»')
p('In its version, Musk wanted majority', 'T-board', 'шаблон нить OPENAI\'S VERSION', 'нить «OPENAI\'S VERSION»; на «control» карточка «MAJORITY CONTROL»; на «CEO» карточка «CEO»')
p('then suggested folding the lab', 'L06-openai15', 'вставка доска', 'на «Tesla» маркер рисует стрелку от «OpenAI» к надписи «TESLA»')
p('In his version, he was misled', 'T-board', 'шаблон нить MUSK\'S VERSION', 'нить «MUSK\'S VERSION»; на «misled» карточка «MISLED»')
p('MUSK: Merge with Tesla.', 'L06-openai15', 'средний двое у доски', 'вечер; на «Tesla» Маск хлопает ладонью по доске')
p('ALTMAN: No.', 'L06-openai15', 'крупно Альтман', 'на «No» качает головой, руки на груди')
p('MUSK: Then your odds are zero.', 'L06-openai15', 'средний Маск у доски', 'на «zero» Маск рисует на доске жирный ноль')
p('ALTMAN: Zero?', 'L06-openai15', 'сверхкрупно ноль на доске вип-пан → MUSK', 'ноль на доске → вип-пан со смазом: на втором «Zero» Маск обводит его ещё раз')
p('—', 'T-card', 'шаблон карточка', 'карточка «Odds of success: zero.» — MUSK\'S EXIT, ACCORDING TO OPENAI', dur=1.6)
p('In 2018 he left the board.', 'L06-openai15', 'вставка табличка в коробку', 'на «left» табличка «E. MUSK — CO-CHAIR» падает в картонную коробку')
p('He wasn\'t the last one', 'L06-openai15', 'средний дверь закрывается', 'дверь закрывается за Маском; на «last» в матовом стекле двери проступают другие силуэты')
p('Two years later, one of OpenAI\'s', 'L07-openai20', 'общий офис ночью', 'ночь, 2020; Дарио пакует коробку; на «Amodei» подпись «DARIO AMODEI»')
p('left with his sister Daniela', 'L07-openai20', 'средний Даниэла с коробкой', 'на «Daniela» подпись «DANIELA AMODEI»; на «colleagues» в глубине встают ещё трое с коробками')
p('Why?', 'L07-openai20', 'крупно Дарио', 'на «Why» Дарио поднимает голову от коробки')
p('He has said it plainly.', 'T-card', 'шаблон карточка-цитата', 'карточка «"Why argue with someone when you don\'t have the same vision and you don\'t trust them?" — DARIO AMODEI, BLOOMBERG»')
p('DANIELA: Where do we go?', 'L07-openai20', 'средний Даниэла у двери', 'на «go» Даниэла перехватывает коробку поудобнее')
p('DARIO: Somewhere we can say no.', 'L07-openai20', 'крупно Дарио', 'на «no» Дарио заклеивает коробку скотчем — треск')
p('DANIELA: To what?', 'L07-openai20', 'средний двое уходят вип-пан → DARIO', 'оба с коробками к выходу → вип-пан со смазом: на «out» Дарио щёлкает выключателем, офис гаснет')
p('In 2021, they started their own company.', 'L08-ant21', 'общий пустой офис', 'тёплый день; пустая комната, семь стульев; на «2021» подпись «SAN FRANCISCO · 2021»')
p('Anthropic.', 'L08-ant21', 'вставка вывеска', 'на «Anthropic» на деревянной вывеске проявляется «ANTHROPIC — 2021»')
p('The pitch was simple:', 'L08-ant21', 'средний двое у кофемашины', 'на «careful» Даниэла ставит на стол табличку «CAREFUL»; кофемашина пищит')
p('So now there were two sets', 'T-split', 'шаблон сплит двери', 'слева Маск выходит из OpenAI (2018), справа Амодеи (2020); на «exiles» обе двери хлопают одновременно')
p('Both had left OpenAI.', 'L07-openai20', 'общий пустой офис', 'на «left» гаснет последняя лампа; на «trusting» доска сама стирается')
p('You\'d think that would make them allies.', 'T-split', 'шаблон сплит трещина', 'обе половины рядом; на «allies» трещина между ними начинает срастаться')
p('It didn\'t.', 'T-card', 'шаблон карточка', 'карточка «It didn\'t.» — трещина за ней лопается обратно')
p('DARIO: Have you met him?', 'L08-ant21', 'средний двое за столом вип-пан → DANIELA', 'Дарио спрашивает → вип-пан со смазом к Даниэле на «Once»')
p('DARIO: And?', 'L08-ant21', 'крупно Даниэла', 'на «enough» Даниэла ставит кружку на стол — стук')
p('In March 2023, Musk signed', 'T-doc', 'шаблон открытое письмо', 'письмо «PAUSE GIANT AI EXPERIMENTS — MARCH 2023»; на «letter» ручка выводит «Elon Musk»')
p('asking the whole industry', 'T-number', 'шаблон песочные часы', 'песочные часы «PAUSE»; на «six» встаёт «6 MONTHS», песок замирает')
p('That same month, his own AI company,', 'T-split', 'шаблон сплит письмо / регистрация', 'слева письмо «PAUSE», справа регистрация компании; на «X.AI» штамп «X.AI CORP — MARCH 2023»')
p('—', 'T-card', 'шаблон карточка', 'карточка «Same month.»', dur=1.3)
p('REPORTER: You asked everyone to pause.', 'L11-tvstudio', 'средний репортёр с микрофоном', 'на «pause» репортёр тянет микрофон к Маску')
p('MUSK: Everyone else.', 'L11-tvstudio', 'крупно Маск', 'на «else» Маск улыбается в камеру')
p('On TV he promised a', 'L11-tvstudio', 'общий ток-шоу', 'Маск на диване студии 2023; на «truth-seeking» на экране за ним загорается «TRUTHGPT»')
p('And in November, it arrived.', 'T-year', 'шаблон календарь', 'на «November» листок календаря «NOV 2023»')
p('Fast, cheeky, and named after', 'L10-xai', 'общий офис ночью', 'на «Fast» на столе включается чёрный кубик; на «science» на нём проступают очки и кривая ухмылка; подпись «GROK — NOV 2023 · "a rebellious streak"»')
p('GROK: Hello, humans.', 'L10-xai', 'крупно Grok', 'кубик Grok говорит; на «humans» подмигивает')
p('MUSK: Be funny.', 'L10-xai', 'средний Маск над кубиком', 'на «funny» Маск стучит пальцем по кубику')
p('GROK: Define funny.', 'L10-xai', 'сверхкрупно Grok вип-пан → MUSK', 'Grok щурится → вип-пан со смазом: на «Me» Маск показывает на себя')
p('Musk said the goal was', 'T-card', 'шаблон карточка-цитата', 'карточка «"understand the true nature of the universe" — ELON MUSK»; на «universe» точка в конце превращается в звёздочку')
p('And he gave Grok a home:', 'T-phone', 'шаблон телефон X', 'лента соцсети на экране телефона; на «X» кубик Grok запрыгивает в ленту; на «owned» сверху печатается «OWNER: E. MUSK»')
p('USER: Grok, tell me a joke.', 'L10-xai', 'средний инженер с телефоном', 'инженер ночной смены печатает в телефон; на «joke» отправляет — свист')
p('GROK: Your subscription renewed.', 'T-phone', 'шаблон чат', 'пузырь чата от Grok; на «renewed» всплывает плашка «SUBSCRIPTION RENEWED ✓»')
p('USER: That\'s not a joke.', 'L10-xai', 'крупно инженер вип-пан → GROK', 'инженер хмурится → вип-пан со смазом к кубику Grok, который хихикает на «me»')
p('Its name was Grok.', 'L10-xai', 'вставка кубик на столе', 'на «Grok» на боку кубика печатаются буквы «GROK»')
p('And to make Grok smarter,', '3D-colossus', '3D тёмный цех', 'тёмный пустой цех; на «machine» загорается первый ряд стоек', 'наезд → стоп → рывок на «machine»')
p('He built one in Memphis,', 'L15-colossus-ext', 'общий завод ночью', 'на «Memphis» подпись «MEMPHIS, TN»; на «factory» окна старого завода загораются')
p('A hundred thousand Nvidia chips,', 'T-number', 'шаблон цифра', 'цифра досчитывает к «100,000 CHIPS» на «thousand»')
p('switched on in a hundred and twenty-two days.', '3D-colossus', '3D ряды загораются', 'ряды стоек загораются один за другим; счётчик «DAY 1 … DAY 122» дощёлкивает на «days»', 'проезд → стоп → рывок на «days»')
p('He called it Colossus.', 'L16-colossus-int', 'общий проход', 'на «Colossus» над проходом загорается надпись «COLOSSUS»')
p('WORKER: Where does this one go?', 'L16-colossus-int', 'средний рабочий с сервером', 'рабочий с ящиком сервера озирается; на «go» ставит ящик на пол')
p('FOREMAN: Wherever there\'s room.', 'L16-colossus-int', 'крупно бригадир вип-пан → WORKER', 'бригадир машет рукой → вип-пан со смазом: на «no room» рабочий зажат между стойками')
p('FOREMAN: Make room.', 'L16-colossus-int', 'вставка стойка', 'на «room» бригадир пинком задвигает стойку — искра')
p('Remember that name.', 'T-card', 'шаблон карточка', 'карточка «Built for Grok. Remember that.»')
p('Colossus. Built for Grok.', 'L16-colossus-int', 'сверхкрупно бирка на стойке', 'на «Grok» на стойку клеится бирка «PROPERTY OF GROK»')
p('Meanwhile, Musk sued OpenAI', 'L12-court', 'общий зал суда', 'Маск кладёт толстый иск клерку; на «sued» штамп «MUSK v. ALTMAN»; на «business» на картонной копилке «NONPROFIT» появляется «FOR PROFIT»')
p('In February 2025, his group', 'T-number', 'шаблон цифра', 'цифра досчитывает к «$97.4 BILLION» на «billion»; подпись «OFFER FOR OPENAI\'S NONPROFIT · FEB 2025»')
p("to buy OpenAI's nonprofit outright.", 'L21-altman', 'общий кабинет Альтмана', 'ночь; на «outright» под дверь подсовывают толстый конверт «OFFER»')
p('MUSK: Ninety-seven point four billion.', 'T-split', 'шаблон сплит звонок', 'слева Маск с телефоном у окна с ракетой, справа Альтман у окна с мостом; на «billion» над Маском — ценник')
p('ALTMAN: No thank you.', 'L21-altman', 'крупно Альтман', 'Альтман улыбается и печатает ответ; на «Twitter» на телефоне — «$9.74 BILLION»')
p('The board said no.', 'T-card', 'шаблон карточка-цитата', 'карточка «"OpenAI is not for sale." — OPENAI BOARD»')
p('Unanimously.', 'T-doc', 'шаблон письмо совета', 'на «Unanimously» в ряду подписей проставляются все галочки разом')
p('And this May, a jury', 'L12-court', 'общий зал суда', 'на «threw» молоток бьёт, иск соскальзывает со стола')
p('Not on the merits.', 'L12-court', 'вставка календарь', 'листки календаря облетают; на «long» штамп «TOO LATE»')
p('Musk called it', 'L12-court', 'крупно Маск у выхода', 'на «technicality» Маск закатывает глаза; на «appeal» поднимает папку «APPEAL»')

# ───────────────────────── 3. Evil ─────────────────────────
ch(3)
p('—', 'T-title', 'шаблон титр', 'засвет в белое → титр «3. EVIL»; буквы краснеют', dur=1.4)
p('Now jump to January 2026.', 'L10-xai', 'общий офис ночью', 'на «January» подпись «xAI · JANUARY 2026»')
p('Musk\'s engineers are building Grok', 'L10-xai', 'средний инженеры печатают', 'на «fast» кубик Grok на столе подрастает рывком')
p('And according to reporter Kylie Robison,', 'T-doc', 'шаблон заметка', 'заметка с подписью «KYLIE ROBISON — REPORTER»; на «unexpected» подчёркивается строка')
p('Claude. Anthropic\'s AI.', 'L10-xai', 'вставка монитор', 'на «Claude» на мониторе — окно чата «CLAUDE (via CURSOR)»')
p('ENGINEER: Claude, write me a function.', 'L10-xai', 'крупно инженер', 'на «function» по экрану льётся код')
p('ENGINEER 2: Not so loud.', 'L10-xai', 'средний сосед', 'на «loud» сосед наклоняется, палец к губам')
p('ENGINEER: Why?', 'L10-xai', 'крупно инженер 2 вип-пан → ENGINEER', 'инженер шепчет → вип-пан со смазом: на «theirs» инженер 2 тычет в окно чата')
p('Then the screens went grey.', 'L10-xai', 'общий ряды мониторов', 'на «grey» мониторы гаснут один за другим от дальнего к ближнему')
p('Anthropic had cut them off.', 'L10-xai', 'вставка монитор', 'на «off» на экран падает штамп «ACCESS REVOKED»')
p('ENGINEER: Hello?', 'L10-xai', 'крупно инженер', 'на «Hello» стучит по монитору; на «gone» экран остаётся серым')
p('ENGINEER: All of it?', 'L10-xai', 'средний оба у серых экранов', 'на втором «All» кубик Grok на столе сжимается')
p('The Information later reported', 'T-doc', 'шаблон заголовок', 'заголовок «xAI trained its coding models on Claude\'s outputs for months» — THE INFORMATION (REPORTED); на «months» маркер подчёркивает')
p('Anthropic never said publicly', 'L09-ant', 'вставка кабель', 'на «plug» рука выдёргивает кабель из розетки — искра')
p('Musk\'s public reaction?', 'L04-starbase', 'средний Маск с телефоном', 'на «reaction» Маск открывает телефон, большие пальцы над экраном')
p('Being cut off, he wrote,', 'T-xpost', 'шаблон пост X', 'пост «JAN 15, 2026» печатается; на «motivator» слово подсвечивается; на «karma» — второе')
p('—', 'T-card', 'шаблон карточка', 'карточка «Cut off.»', dur=1.2)
p('If the reports are right,', 'L22-gym', 'общий ринг', 'боксёр бьёт по лапам тренера; на «boxing» гонг')
p('with your opponent\'s coach.', 'L22-gym', 'крупно тренер', 'на «coach» видна надпись на футболке тренера «RIVAL»')
p('Sooner or later,', 'L22-gym', 'средний на ринге', 'на «notices» тренер опускает лапы')
p('COACH: Who are you training for?', 'L22-gym', 'крупно тренер', 'на «for» тренер щурится')
p('BOXER: Nobody.', 'L22-gym', 'средний боксёр', 'на «Nobody» боксёр отводит глаза')
p('COACH: Then why is your shirt', 'L22-gym', 'вставка спина боксёра', 'на «backwards» видна бирка футболки наружу; тренер уходит с ринга, лапы падают на пол')
p('So why would a company pick a fight', 'T-split', 'шаблон сплит лицом к лицу', 'слева Маск, справа Амодеи; на «richest» над Маском падает табличка «RICHEST MAN ON EARTH»')
p('And what would he do about it?', 'L04-starbase', 'крупно Маск', 'на «it» Маск кладёт телефон экраном вниз')
p('About a month later,', 'L09-ant', 'общий офис', 'на «announced» из бутылки вылетает пробка; подпись «FEB 12, 2026»')
p('raised thirty billion dollars more.', 'L09-ant', 'вставка доска', 'на «thirty» на доске печатается «SERIES G — $30 BILLION»')
p('DANIELA: Thirty billion.', 'L09-ant', 'средний Даниэла с бокалом', 'на «billion» Даниэла поднимает бокал')
p('DARIO: Don\'t read the comments.', 'L09-ant', 'крупно Дарио', 'на «comments» Дарио прячет телефон в карман')
p('DANIELA: Too late.', 'L09-ant', 'вставка телефон Даниэлы', 'на «late» на телефоне начинает печататься ответ Маска')
p('Musk had written one.', 'T-xpost', 'шаблон пост X', 'ответ Маска собирается слово за словом; на «one» мигает курсор')
p('Their AI, he said,', 'L03-host', 'вставка принтер ведущего', 'в кабинете ведущего принтер печатает этот пост; на «hates» лист ползёт наружу')
p('And then the line', 'T-xpost', 'шаблон пост X последняя строка', 'на «year» камера едет к последней строке поста')
p('"This is misanthropic', 'T-card', 'шаблон карточка-цитата', 'карточка «"This is misanthropic and evil."»; на «evil» слово краснеет')
p('Fix it."', 'L03-host', 'вставка лист из принтера', 'на «Fix» лист падает в лоток — последняя строка красная')
p('A fair criticism of an AI\'s bias?', 'T-board', 'шаблон доска три версии', 'на «bias» прикалывается «BIAS?», на «revenge» — «REVENGE?», на «both» — «BOTH?»')
p('Fights over AI bias are real,', 'T-split', 'шаблон сплит четыре лаборатории', 'четыре офиса без названий; на «every» на каждый падает штамп «BIAS COMPLAINT»')
p('Musk himself pointed to the bias.', 'L04-starbase', 'средний Маск у окна', 'на «bias» Маск тычет пальцем в экран телефона')
p('Either way, he wasn\'t done.', 'L04-starbase', 'крупно Маск', 'на «done» снова берёт телефон')
p('Two weeks later:', 'T-xpost', 'шаблон пост X', 'пост «FEB 27, 2026»; на «Civilization» строка «Anthropic hates Western Civilization.» загорается')
p('DARIO: Do we answer him?', 'L09-ant', 'средний Дарио с телефоном', 'на «him» Дарио показывает телефон Даниэле')
p('DANIELA: No.', 'L09-ant', 'крупно Даниэла', 'на «No» Даниэла не поднимает глаз от ноутбука')
p('DARIO: Why not?', 'L09-ant', 'средний двое вип-пан → DANIELA', 'Дарио → вип-пан со смазом: на «busy» за стеклом звонят все телефоны')
p('They were busy.', 'L09-ant', 'вставка стопка контрактов', 'на «busy» на стол шлёпается стопка контрактов «CLAUDE»')
p('Businesses kept signing up for Claude,', 'L09-ant', 'общий график на стене', 'на «climbing» линия графика уходит за верх доски, метки «$9B · $14B · $30B A YEAR»')
p('Grok\'s did not.', 'L10-xai', 'вставка кубик с плоским графиком', 'рядом с Grok плоский график; на «not» кубик вздыхает')
p('Which raises a question', 'L16-colossus-int', 'общий проход гудит', 'пустой проход; на «question» счётчик электричества на стене крутится быстрее')
p('Who was going to pay for', 'T-card', 'шаблон карточка', 'карточка «Who pays for Colossus?»')
p('Hold that thought.', 'T-board', 'шаблон доска', 'на «thought» на доску прикалывается «WHO PAYS?»')
p('Because first, meet the man', 'L14-prison', 'общий комната с ТВ', 'на «richest» на экране ТВ проступает знак «$»; тень у ТВ поворачивается')

# ───────────────────────── 4. The Ghost Investor ─────────────────────────
ch(4)
p('—', 'T-title', 'шаблон титр', 'засвет в белое → титр «4. THE GHOST INVESTOR»; буквы полупрозрачные, как призрак', dur=1.4)
p('Go back to April 2022.', 'L13-bahamas', 'общий офис', 'тёплый день, море за окном; на «2022» подпись «BAHAMAS · APRIL 2022»')
p('A young crypto billionaire named', 'L13-bahamas', 'средний Бэнкман-Фрид на мешке', 'шорты, футболка, шесть мониторов; на «Bankman-Fried» подпись «SAM BANKMAN-FRIED — FOUNDER, FTX»')
p('leads a funding round', 'L13-bahamas', 'вставка монитор', 'на «lab» курсор нажимает «INVEST» в окне «AI LAB — FUNDING ROUND»')
p('He puts in about five hundred million dollars.', 'T-number', 'шаблон цифра', 'цифра досчитывает к «$500 MILLION» на «million»')
p('SBF: AI safety. Good cause.', 'L13-bahamas', 'крупно Бэнкман-Фрид', 'на «cause» показывает большой палец')
p('ASSISTANT: And if it never pays off?', 'L13-bahamas', 'средний ассистент с папкой', 'на «off» ассистент прижимает папку')
p('SBF: Everything pays off.', 'L13-bahamas', 'крупно Бэнкман-Фрид вип-пан → ASSISTANT', 'Бэнкман-Фрид → вип-пан со смазом к ассистенту на «Everything?»')
p('SBF: Eventually.', 'L13-bahamas', 'общий к мониторам', 'на «Eventually» отворачивается к мониторам — все графики зелёные')
p('—', 'T-card', 'шаблон карточка', 'карточка «$500 million. In.»', dur=1.3)
p('FTX was a crypto exchange,', 'T-map', 'шаблон карта', 'булавка на Багамах, башня биржи «FTX»; на «millions» к башне стекаются точки-люди')
p('Seven months later, it collapsed.', 'L13-bahamas', 'общий мониторы краснеют', 'на «collapsed» мониторы один за другим краснеют и гаснут; подпись «NOV 2022»')
p('Billions of dollars belonging', 'T-map', 'шаблон карта башня', 'на «gone» башня на карте рассыпается в пыль, точки-деньги исчезают')
p('CUSTOMER: Can I withdraw?', 'T-phone', 'шаблон приложение биржи', 'на «withdraw» палец жмёт «WITHDRAW» — крутится колесо загрузки')
p('CLERK: Please hold.', 'T-split', 'шаблон сплит клиент / оператор', 'слева клиент с телефоном, справа оператор в гарнитуре; на «hold» играет музыка ожидания — нотки')
p('CUSTOMER: For how long?', 'T-phone', 'шаблон приложение биржи', 'на «long» колесо всё крутится')
p('CLERK: Please hold.', 'T-split', 'шаблон сплит оператор', 'на «hold» оператор снимает гарнитуру и уходит')
p('He was convicted of fraud and', 'L12-court', 'общий зал суда', 'на «convicted» молоток бьёт')
p('sentenced to twenty-five years in prison.', 'T-number', 'шаблон цифра', 'на «twenty-five» цифра встаёт «25 YEARS»')
p('To pay customers back,', 'T-doc', 'шаблон решение суда', 'постановление суда о банкротстве; на «sold» на полях — опись имущества')
p('Including that slice of Anthropic.', 'L12-court', 'вставка конверт', 'на «Anthropic» на стол ложится конверт «ANTHROPIC SHARES»')
p('In 2024, it went for about', 'T-doc', 'шаблон опись', 'на «2024» штамп «SOLD — 2024»; на «billion» сумма «~$1.3 BILLION»')
p('BUYER: One point three?', 'L12-court', 'средний покупатель', 'покупатель в костюме листает папку; на «three» поднимает глаза')
p('LAWYER: Take it or leave it.', 'L12-court', 'крупно юрист', 'на «leave» юрист пододвигает конверт')
p('BUYER: Will he mind?', 'L12-court', 'общий оба вип-пан → LAWYER', 'покупатель → вип-пан со смазом: на «prison» юрист кивает на пустую скамью подсудимых')
p('Not a bad return on five hundred million.', 'T-scale', 'шаблон весы', 'на одной чаше «$500M», на другой на «return» падает «$1.3B»')
p('So what are those same shares worth today?', 'L01-nasdaq', 'общий конфетти', 'на «today» над табло загорается «ANT»')
p('By our math from the filing:', 'T-number', 'шаблон цифра', '«$1.3 BILLION» крутится; на «thirty-seven» — «~$37 BILLION», на «fifty» — «~$50 BILLION»; подпись «BY OUR MATH, FROM THE FILING»')
p('—', 'T-card', 'шаблон карточка', 'карточка «Sold too early.»', dur=1.3)
p('INMATE: Hey.', 'L14-prison', 'общий комната с ТВ', 'на ТВ трансляция биржи; на «that» заключённый показывает на экран')
p('SBF: For a while.', 'L14-prison', 'крупно Бэнкман-Фрид в робе', 'подпись «SAM BANKMAN-FRIED — SERVING 25 YEARS»; на «while» он не отводит глаз от ТВ')
p('INMATE: What happened?', 'L14-prison', 'средний сокамерник', 'на «happened» сокамерник поворачивается к нему')
p('SBF: Everything else.', 'L14-prison', 'вставка экран ТВ', 'цифра на ТВ снова прыгает вверх, в стекле экрана — отражение Бэнкман-Фрида')
p('An appeals court upheld', 'T-doc', 'шаблон решение', 'на «upheld» штамп «AFFIRMED — JUNE 2026»')
p('He has asked for a presidential pardon.', 'L14-prison', 'средний Бэнкман-Фрид пишет', 'на «pardon» он дописывает письмо «REQUEST FOR PARDON»')
p('And on Thursday, he could only watch.', 'L14-prison', 'сверхкрупно лицо в свете ТВ', 'на «watch» цифра на экране за кадром прыгает — свет на лице становится зеленее')
p('But he isn\'t the one', 'T-card', 'шаблон карточка', 'карточка «One of its earliest big checks came from a man now serving 25 years.»')
p('Let\'s go back to the machine.', 'L16-colossus-int', 'вставка стойка', 'на «machine» стойка загорается зелёным рядом огоньков')

# ───────────────────────── 5. The Machine in Memphis ─────────────────────────
ch(5)
p('—', 'T-title', 'шаблон титр', 'засвет в белое → титр «5. THE MACHINE IN MEMPHIS»', dur=1.4)
p('Follow the money to Memphis.', '3D-memphis', '3D пролёт к заводу', 'ночной пролёт над Мемфисом к зданию Colossus; на «Memphis» подпись «MEMPHIS, TN»', 'пролёт → стоп → рывок на «Memphis»')
p('Colossus was built to train Grok.', 'L15-colossus-ext', 'общий завод', 'на «Grok» на стене завода появляется силуэт кубика Grok')
p('And to power it fast,', 'L15-colossus-ext', 'средний ряд турбин', 'на «turbines» турбины выдыхают жар, воздух дрожит')
p('An environmental group counted', 'T-number', 'шаблон цифра', 'цифра досчитывает к «35+ TURBINES» на «thirty-five»; на «permits» штамп «NO PERMIT»; подпись «COUNT BY AN ENVIRONMENTAL GROUP»')
p('NEIGHBOR: What\'s that hum?', 'L15-colossus-ext', 'средний соседи у забора', 'двое у сетки-забора; на «hum» сетка дрожит')
p('NEIGHBOR 2: The future, apparently.', 'L15-colossus-ext', 'крупно сосед 2', 'на «apparently» пожимает плечами')
p('NEIGHBOR: Can it be quieter?', 'L15-colossus-ext', 'средний сосед закрывает уши', 'на «quieter» затыкает уши')
p('NEIGHBOR 2: Not according to the future.', 'L15-colossus-ext', 'вставка турбина', 'на «future» турбина ревёт громче, из трубы — клуб пара')
p('The NAACP went to court', 'L15-colossus-ext', 'общий протест у забора', 'плакаты у забора; юрист передаёт иск; на «court» подпись «NAACP v. xAI — SOUTHAVEN, APRIL 2026»')
p('just across the state line in Mississippi.', 'T-map', 'шаблон карта штатов', 'граница Теннесси и Миссисипи; на «Mississippi» булавка «SOUTHAVEN»')
p('That case is still going.', 'T-doc', 'шаблон иск', 'на «going» штамп «PENDING»')
p('Inside: Nvidia chips', '3D-colossus', '3D проход стоек', 'бесконечный проход стоек; на «thousands» ряды вдали загораются', 'проезд → стоп → рывок на «thousands»')
p('Yes, that Nvidia.', 'L16-colossus-int', 'вставка чип', 'на «Nvidia» крупно — чип с зелёной полосой в слоте')
p('Its co-founder Jensen Huang', '3D-colossus', '3D Дженсен в проходе', 'Дженсен в кожанке идёт по проходу с планшетом; на «Huang» подпись «JENSEN HUANG — NVIDIA CO-FOUNDER»; на «stepped» снимает бейдж «CEO»', 'проезд → стоп → рывок на «Huang»')
p('That\'s another story.', 'L03-host', 'вставка сейф с ключом', 'на «time» в приоткрытом сейфе ведущего блестит латунный ключ из прошлой серии')
p('JENSEN: Nice chips.', 'L16-colossus-int', 'крупно Дженсен', 'на «chips» стучит костяшкой по стойке')
p('GUARD: Yours, sir?', 'L16-colossus-int', 'средний охранник с фонарём', 'на «sir» охранник светит фонарём на бейдж')
p('JENSEN: Not anymore.', 'L16-colossus-int', 'крупно Дженсен улыбается', 'на «anymore» прячет бейдж в карман кожанки')
p('Here\'s the thing about AI', 'T-board', 'шаблон окно чат-бота', 'на доске окно чат-бота; на «miss» прикалывается «$»')
p('Building a chatbot is expensive once.', 'T-split', 'шаблон сплит построить / держать', 'слева «BUILD», справа «RUN»; на «once» слева штамп «$ ONCE»; на «forever» справа счётчик начинает крутиться без остановки')
p('Every question you type', 'T-board', 'шаблон вопрос → стойка → счётчик', 'вопрос печатается в окне; на «chips» загорается стойка; на «electricity» крутится счётчик')
p('The more people use it,', 'T-number', 'шаблон счёт', 'на «bill» счёт за электричество вытягивается в длинную ленту')
p('CHIP: Another question.', 'L16-colossus-int', 'сверхкрупно два чипа в стойке вип-пан → CHIP 2', 'у двух чипов в слоте глаза; чип 1 → вип-пан со смазом к чипу 2 на «bill»')
p('CHIP: Another question.', 'T-number', 'шаблон счётчик', 'счётчик электричества крутится всё быстрее; на «idea» из него вылетает пружинка')
p('Now picture it like this.', 'L23-stadium', 'общий пустой стадион', 'на «picture» прожекторы включаются по одному')
p('You build the biggest stadium', 'L23-stadium', 'средний поле', 'на «biggest» на табло ценник «$$$$»; на «team» на поле выбегает команда в футболках «GROK»')
p('And your team can\'t sell enough tickets.', 'L23-stadium', 'вставка касса', 'пустая касса «TICKETS»; на «tickets» по проходу катится перекати-поле')
p('COACH: Full house tonight?', 'L23-stadium', 'крупно тренер', 'на «tonight» тренер оглядывает трибуны')
p('USHER: Just the mascot.', 'L23-stadium', 'средний трибуна', 'на «mascot» на пустой трибуне машет единственный маскот — кубик Grok в костюме')
p('COACH: Whose mascot?', 'L23-stadium', 'общий вип-пан → USHER', 'тренер → вип-пан со смазом к капельдинеру: на «Ours» маскот падает с кресла')
p('By the end of 2025,', 'T-number', 'шаблон цифра', 'цифра досчитывает к «~$32 BILLION RAISED» на «thirty-two»')
p('That same year, Musk\'s AI business,', 'T-doc', 'шаблон отчёт', 'строка «OPERATING LOSS 2025»; на «six» встаёт красное «−$6.4 BILLION»; подпись «MUSK\'S AI BUSINESS INCL. X»')
p('ACCOUNTANT: Revenue?', 'L17-spacex', 'средний двое бухгалтеров', 'на «Revenue» бухгалтер ведёт пальцем по пустой графе')
p('ACCOUNTANT 2: Coming.', 'L17-spacex', 'крупно бухгалтер 2', 'на «Coming» смотрит на часы')
p('ACCOUNTANT: Costs?', 'L17-spacex', 'средний стол со счетами', 'на «here» на стол падает толстая стопка счетов')
p('So how much was Grok actually bringing in?', 'L10-xai', 'крупно Grok', 'на «in» рядом с кубиком переворачивается пустая копилка')
p('Analysts quoted by Fortune', 'T-number', 'шаблон цифра', 'на «billion» под кубиком Grok «< $1 BILLION / YEAR»; подпись «ANALYSTS VIA FORTUNE, MAY 2026»')
p('Anthropic, by then,', 'T-scale', 'шаблон весы', 'слева «GROK: < $1B», справа на «forty» падает «CLAUDE: $40B+ A YEAR (RUN-RATE)» — правая чаша обрушивается вниз')
p('GROK: Is that bad?', 'L10-xai', 'сверхкрупно Grok', 'кубик встревожен; на «bad» очки съезжают')
p('MUSK: It\'s early.', 'L10-xai', 'средний Маск у стола', 'на «early» Маск машет рукой')
p('GROK: How early?', 'L10-xai', 'крупно Grok вип-пан → MUSK', 'Grok → вип-пан со смазом: на «asking» Маск накрывает кубик кружкой')
p('It didn\'t help that Grok', 'L10-xai', 'общий Grok в бумажной короне', 'Grok за столом в бумажной короне; на «headlines» в него летят бумажные самолётики-заголовки')
p('In July 2025, it praised Hitler', 'T-doc', 'шаблон заголовок', 'заголовок «"MECHAHITLER"» — JULY 2025; на «MechaHitler» штамп «DELETED»')
p('In January 2026, after people', 'T-phone', 'шаблон экран с подделкой', 'размытая картинка на экране телефона; на «fake» на неё падает штамп «FAKE»')
p('Indonesia and Malaysia blocked it.', 'L10-xai', 'вставка самолётики на столе', 'на «Indonesia» на стол падает самолётик «BLOCKED IN INDONESIA», на «Malaysia» — «BLOCKED IN MALAYSIA»')
p('GROK: I can explain.', 'L10-xai', 'крупно Grok', 'на «explain» корона съезжает набок')
p('MUSK: Please don\'t.', 'L10-xai', 'средний Маск снимает корону', 'на «don\'t» Маск снимает с кубика корону')
p('—', 'T-card', 'шаблон карточка', 'карточка «Not the headlines you want.»', dur=1.4)
p('In February, Musk folded xAI', 'L17-spacex', 'общий переговорная', 'на столе документ «SPACEX + xAI»; на «SpaceX» штамп «MERGED — FEB 2, 2026»')
p('Bloomberg reported that the AI side', 'T-number', 'шаблон цифра', 'цифра досчитывает к «~$250 BILLION» на «fifty»; подпись «VALUATION, AS REPORTED BY BLOOMBERG»')
p('BOARD MEMBER: Rockets and chatbots?', 'L17-spacex', 'средний член совета', 'на «chatbots» член совета поднимает бровь')
p('MUSK: Same thing.', 'L17-spacex', 'крупно Маск', 'на «burn» модель ракеты на полке выпускает струйку дыма')
p('And this month, Musk admitted', 'L04-starbase', 'средний Маск печатает', 'на «remarkable» Маск замирает над телефоном')
p('He was cutting usage limits', 'T-phone', 'шаблон приложение Grok', 'на «limits» полоска лимита в приложении укорачивается вдвое')
p('in his words,', 'T-xpost', 'шаблон пост X', 'пост «NOV 1, 2026»; на «unsustainably» слова «unsustainably high relative to revenue» подсвечиваются')

p('—', 'T-card', 'шаблон карточка', 'карточка «"Unsustainably high."»', dur=1.3)
p('So there it was.', '3D-colossus', '3D отъезд от стойки', 'камера отъезжает от одной горящей стойки на весь зал; на «machine» зал виден целиком', 'отъезд → стоп → рывок на «machine»')
p('Built for Grok.', 'L16-colossus-int', 'вставка бирка', 'на «Grok» бирка «PROPERTY OF GROK» качается')
p('And by Musk\'s own account,', 'L10-xai', 'крупно кубик под счетами', 'на «bills» на кубик Grok сыплются счета')
p('Meanwhile, in San Francisco,', 'L09-ant', 'общий офис', 'на «Francisco» подпись «SAN FRANCISCO»; на «opposite» на доске пишется «NEED: COMPUTE»')
p('DARIO: We have customers.', 'L09-ant', 'средний Дарио со свитком', 'на «customers» Дарио разворачивает длинный свиток заказов до пола')
p('DANIELA: We don\'t have chips.', 'L09-ant', 'крупно Даниэла', 'на «chips» переворачивает пустую коробку')
p('DARIO: Who has chips?', 'L09-ant', 'средний двое вип-пан → DANIELA', 'Дарио → вип-пан со смазом: на «like» Даниэла поворачивает ноутбук — на экране завод в Мемфисе')
p('One side had a machine', 'T-split', 'шаблон сплит машина / клиенты', 'слева «MACHINE · NOT ENOUGH CUSTOMERS», справа «CUSTOMERS · NOT ENOUGH MACHINE»; на «business» и «machine» — по штампу')
p('What do you think happens next?', 'L18-meeting', 'общий пустая переговорная', 'на «next» дверь переговорной открывается')

# ───────────────────────── 6. The Deal ─────────────────────────
ch(6)
p('—', 'T-title', 'шаблон титр', 'засвет в белое → титр «6. THE DEAL»; ручка ставит подпись под титром', dur=1.4)
p('May 2026.', 'L18-meeting', 'общий переговорная', 'на «May» подпись «MAY 2026»')
p('Musk goes to meet Anthropic\'s team himself.', 'L18-meeting', 'средний шеренга сотрудников', 'Маск идёт вдоль шеренги; на «himself» поднимает большую лупу «EVIL DETECTOR»')
p('Afterwards, he posts that', 'T-xpost', 'шаблон пост X', 'на «competent» подсветка «highly competent»; на «detector» — «no one set off my evil detector»')
p('MUSK: You. Evil?', 'L18-meeting', 'крупно Маск с лупой', 'на «Evil» лупа увеличивает глаз Маска')
p('STAFFER: No, sir.', 'L18-meeting', 'средний сотрудник', 'на «sir» сотрудник вытягивается')
p('MUSK: You?', 'L18-meeting', 'вставка стрелка детектора', 'на «You» стрелка на ручке лупы дрожит')
p('STAFFER 2: Also no.', 'L18-meeting', 'крупно сотрудник 2', 'на «no» сотрудница моргает')
p('MUSK: Good enough.', 'L18-meeting', 'общий шеренга', 'на «enough» Маск убирает лупу, стрелка встаёт на «OK»')
p('—', 'T-card', 'шаблон карточка-цитата', 'карточка «"No one set off my evil detector." — MUSK, MAY 2026»', dur=1.6)
p('On May 3, they signed.', 'T-doc', 'шаблон договор', 'договор «CLOUD SERVICES AGREEMENT — MAY 3, 2026»; на «signed» ручка расписывается')
p('Anthropic got all of Colossus 1.', '3D-colossus', '3D проход', 'на «all» таблички на всех стойках разом переворачиваются: «ANTHROPIC»', 'проезд → стоп → рывок на «all»')
p('About a billion and a quarter', 'T-number', 'шаблон цифра', 'цифра досчитывает к «$1.25 BILLION / MONTH» на «quarter»')
p('LAWYER: Sign here.', 'L18-meeting', 'средний юрист с договором', 'на «here» юрист раскладывает договор на столе')
p('DARIO: And here?', 'L18-meeting', 'крупно Дарио с ручкой', 'на «here» Дарио показывает ручкой на второй лист')
p('LAWYER: And here. And here.', 'L18-meeting', 'вставка закладки', 'на каждое «here» на договоре вырастает закладка «SIGN HERE»')
p('MUSK: And here.', 'L18-meeting', 'крупно Маск расписывается', 'на «here» размашистая подпись')
p('—', 'T-card', 'шаблон карточка', 'карточка «May 3. Signed.»', dur=1.3)
p('The machine built for Grok', 'L03-host', 'вставка распечатка evil', 'на «Claude» на слово «evil» с толчком камеры падает красный штамп «PAID»')
p('—', 'T-card', 'шаблон карточка', 'карточка «Built for Grok. Rented to Claude.»', dur=1.6)
p('For Musk, it turned his biggest cost', 'T-split', 'шаблон сплит две стороны', 'слева счёт «COST»; на «rent» он переворачивается в чек «RENT»')
p('For Anthropic, it was the fastest way', 'L09-ant', 'средний Дарио у окна', 'на «chips» во двор въезжает грузовик с ящиками; на «single» на чертеже нового дата-центра — крест')
p('Both sides got what they needed.', 'T-split', 'шаблон сплит обе стороны кивают', 'на «needed» обе половины кивают; на «sorry» табличка «SORRY» падает в корзину')
p('ACCOUNTANT: They pay monthly?', 'L17-spacex', 'средний бухгалтер', 'на «monthly» бухгалтер поднимает календарь')
p('MUSK: On time.', 'L17-spacex', 'крупно Маск', 'на «time» щёлкает пальцами')
p('ACCOUNTANT: And we pay for the electricity?', 'L17-spacex', 'вставка счёт за свет', 'на «electricity» на стол ложится счёт «ELECTRICITY — MEMPHIS»')
p('MUSK: Details.', 'L17-spacex', 'крупно Маск отмахивается', 'на «Details» смахивает счёт со стола')
p('DARIO: Why short?', 'L18-meeting', 'средний Дарио над договором', 'на «short» палец на строке «TERM»')
p('MUSK: In case I need it back.', 'L18-meeting', 'крупно Маск', 'на «back» Маск постукивает по столу')
p('DARIO: And if you do?', 'L18-meeting', 'общий вип-пан → MUSK', 'Дарио → вип-пан со смазом: на «Ninety» на договор шлёпается стикер «90 DAYS»')
p('—', 'T-card', 'шаблон карточка', 'карточка «Ninety days.»', dur=1.2)
p('Musk kept a door open.', 'L16-colossus-int', 'общий ворота зала', 'на «open» ворота зала приоткрываются — полоса света')
p('The short lease, Reuters reported,', 'T-doc', 'шаблон заметка', 'заметка «REUTERS»; на «idea» подчёркивается «SPACEX\'S IDEA»')
p('If computing power got', 'T-xpost', 'шаблон пост X', 'пост «MAY 2026»; на «back» подсвечивается «we might need it back»')
p('And Fortune reported he reserved', 'T-doc', 'шаблон заметка', 'строка «RIGHT TO RECLAIM IF ITS AI HARMS HUMANITY» — FORTUNE (REPORTED); на «humanity» маркер')
p('Then in July, the man who', 'L04-starbase', 'средний Маск печатает', 'на «July» подпись «JULY 2026»; на «wrote» Маск жмёт «отправить»')
p('"I was clearly wrong', 'T-xpost', 'шаблон пост X', 'пост «JUL 9, 2026»; на «wrong» подсвечивается «I was clearly wrong about Anthropic»')
p('How often does Elon Musk say that?', 'T-card', 'шаблон карточка-цитата', 'карточка «"I was clearly wrong."»')
p('AIDE: Sir, you were wrong?', 'L04-starbase', 'средний помощник', 'на «wrong» помощник роняет планшет')
p('MUSK: Clearly.', 'L04-starbase', 'крупно Маск', 'на «Clearly» Маск кивает, не глядя')
p('AIDE: Should I post it?', 'L04-starbase', 'общий вип-пан → MUSK', 'помощник → вип-пан со смазом: на «did» телефон Маска показывает пост с сердечками')
p('And here\'s the strangest twist.', 'L10-xai', 'средний пустой стол', 'на «twist» на пустом столе раскрывается ноутбук')
p('Remember the coding tool', 'L10-xai', 'вставка ноутбук', 'на «coding» на экране значок редактора кода (без логотипа)')
p('It was called Cursor.', 'L10-xai', 'сверхкрупно крышка ноутбука', 'на «Cursor» на крышке печатается «CURSOR»')
p('In August, SpaceX bought Cursor.', 'T-doc', 'шаблон сделка', 'на «bought» на ноутбук падает штамп «ACQUIRED — AUG 14, 2026»')
p('ENGINEER: So we own the door now.', 'L10-xai', 'средний инженер', 'на «door» инженер гордо стучит по ноутбуку')
p('ENGINEER 2: They still changed the locks.', 'L10-xai', 'крупно инженер 2', 'на «locks» на экране снова «ACCESS REVOKED»')
p('The deal kept growing.', 'L16-colossus-int', 'общий проход', 'на «growing» вдали загораются новые ряды стоек')
p('By the time Anthropic filed', 'T-doc', 'шаблон обложка проспекта', 'на «public» обложка «FORM S-1» листается к разделу «COMPUTE»')
p('up to a hundred and twenty', 'T-number', 'шаблон цифра', 'на «hundred» цифра встаёт «UP TO $120.5 BILLION»; на «2029» — «THROUGH 2029»')
p('That\'s about three billion a month,', 'T-doc', 'шаблон строка проспекта', 'на «three» строка «≈ $3.1 BILLION A MONTH — ONCE ALL CAPACITY ARRIVES»')
p('And for the first time,', 'T-chart', 'шаблон график прибыли', 'линия прибыли ИИ-бизнеса SpaceX; на «profit» она переходит из красной зоны в зелёную')
p('Last quarter, its revenue grew', 'T-number', 'шаблон цифра', 'на «tenfold» «REVENUE ×10»; на «thirty-one» «+$431 MILLION — FIRST PROFIT»')
p('SpaceX credited new cloud deals.', 'L17-spacex', 'общий переговорная', 'на «cloud» на экране совета слайд «CLOUD DEALS»')
p('Its computing customers include', 'T-board', 'шаблон доска клиенты', 'на «Anthropic» прикалывается табличка «ANTHROPIC», на «Google» — «GOOGLE»')
p('And one customer it didn\'t name', 'T-number', 'шаблон доля', 'круг выручки; на «third» треть закрашивается под силуэтом с «?» — «CUSTOMER B (UNNAMED) ≈ 1/3 OF REVENUE»')
p('GROK: Did I do that?', 'L10-xai', 'крупно Grok', 'на «that» Grok с надеждой поднимает очки')
p('MUSK: No.', 'L10-xai', 'средний Маск', 'на «No» Маск даже не поворачивается')
p('GROK: Who did?', 'L10-xai', 'сверхкрупно Grok вип-пан → MUSK', 'Grok → вип-пан со смазом: на «tenants» Маск показывает на окно, за которым светится Colossus')
p('—', 'T-card', 'шаблон карточка', 'карточка «Grok didn\'t pay for Colossus. The tenants did.»', dur=1.8)

# ───────────────────────── 7. Who Really Wins ─────────────────────────
ch(7)
p('—', 'T-title', 'шаблон титр', 'засвет в белое → титр «7. WHO REALLY WINS»', dur=1.4)
p('So, back to Thursday.', 'L01-nasdaq', 'общий конфетти', 'конфетти ещё падают; на «Thursday» подпись «NOV 19»')
p('Who actually won?', 'L01-nasdaq', 'вставка тикер', 'на «won» тикер сползает с пика')
p('The Amodeis, for one.', 'T-board', 'шаблон доска четыре фото', 'на «Amodeis» прикалывается фото Дарио и Даниэлы')
p('At the opening trade,', 'T-number', 'шаблон цифра', 'на «twenty-six» под фото «~$26B EACH AT THE OPEN»')
p('DANIELA: Is that real?', 'L01-nasdaq', 'средний Даниэла смотрит на табло', 'на «real» Даниэла щурится на табло')
p('DARIO: Until it moves.', 'L01-nasdaq', 'крупно Дарио', 'на «moves» Дарио поправляет очки')
p('DANIELA: It\'s moving.', 'L01-nasdaq', 'вставка табло', 'на «moving» цифры на табло перещёлкиваются')
p('DARIO: Then don\'t look.', 'L01-nasdaq', 'средний двое', 'на «look» Дарио закрывает ей глаза ладонью')
p('Amazon and Google own almost', 'T-board', 'шаблон доска банки', 'на «Amazon» и «Google» прикалываются таблички без логотипов; на «thirty» ценник «~30%»')
p('But their shares come with no votes.', 'T-doc', 'шаблон акции', 'на «votes» на сертификаты акций падает штамп «NO VOTE»')
p('The founders keep control.', 'L09-ant', 'вставка ключ в руке', 'на «control» Даниэла сжимает ключ с биркой «CONTROL»')
p('AMAZON BANKER: We paid billions.', 'L01-nasdaq', 'средний банкиры', 'двое банкиров в галстуках; на «billions» один трясёт чековой книжкой')
p('GOOGLE BANKER: And we get a seat?', 'L01-nasdaq', 'крупно банкир 2', 'на «seat» банкир показывает на стул у трибуны')
p('LAWYER: In the audience.', 'L01-nasdaq', 'общий зал', 'на «audience» юрист показывает на задние ряды')
p('And Musk?', 'T-board', 'шаблон доска', 'на «Musk» прикалывается фото Маска')
p('His money from Anthropic', 'T-doc', 'шаблон квитанция', 'на «rent» под фото — квитанция «RENT RECEIPT»')
p('He\'s the landlord.', 'L04-starbase', 'крупно Маск со связкой ключей', 'на «landlord» Маск подбрасывает связку ключей с биркой «COLOSSUS»')
p('DANIELA: Who\'s he?', 'L09-ant', 'средний Даниэла с договором', 'на «he» Даниэла показывает на подпись в договоре аренды')
p('DARIO: The landlord.', 'L09-ant', 'крупно Дарио', 'на «landlord» Дарио вздыхает')
p('DANIELA: The one who called us evil?', 'L09-ant', 'вставка распечатка evil', 'на «evil» в руке у Даниэлы распечатка поста')
p('DARIO: He\'s a very good landlord.', 'L09-ant', 'общий двое', 'на «landlord» Дарио кладёт в конверт «RENT» чек')
p('—', 'T-card', 'шаблон карточка', 'карточка «Landlord.»', dur=1.2)
p('The AI he called misanthropic', '3D-colossus', '3D проход', 'на «runs» на стойках загораются таблички «CLAUDE»; на «rent» у входа щёлкает счётчик', 'проезд → стоп → рывок на «runs»')
p('—', 'T-card', 'шаблон карточка', 'карточка «He houses the AI he called evil.»', dur=1.6)
p('The night before the IPO,', 'L19-dealbook', 'общий сцена', 'Маск в кресле напротив интервьюера; на «stage» подпись «DEALBOOK SUMMIT · NOV 18»')
p('Before renting them anything,', 'L19-dealbook', 'крупно Маск', 'на «people» Маск разводит руками')
p('No one set off his evil detector.', 'L19-dealbook', 'вставка лупа на столике', 'на «detector» на столике лупа «EVIL DETECTOR», стрелка на «OK»')
p('And he expects them to want', 'T-number', 'шаблон цифра', 'на «ten» «+10 GIGAWATTS?»; на «confirmed» штамп «NOT CONFIRMED BY ANTHROPIC»')
p('INTERVIEWER: And if they turn evil?', 'L19-dealbook', 'средний интервьюер', 'интервьюер без имени; на «evil» наклоняется вперёд')
p('MUSK: Then I take my computers back.', 'L19-dealbook', 'крупно Маск', 'на «back» Маск делает жест «забираю»')
p('INTERVIEWER: Just like that?', 'L19-dealbook', 'общий вип-пан → MUSK', 'интервьюер → вип-пан со смазом: на «six» на экране за ними «3–6 MONTHS»')
p('INTERVIEWER: And if they don\'t turn evil?', 'L19-dealbook', 'средний интервьюер', 'на «evil» интервьюер прищуривается')
p('MUSK: Then they pay rent.', 'L19-dealbook', 'крупно Маск улыбается', 'на «rent» Маск улыбается, зал смеётся')
p('The next morning,', 'L20-cnbc', 'общий утренняя студия', 'Дарио и Даниэла на стульях; на «SpaceX» подпись «BUSINESS TV · NOV 19»')
p('Dario said they were', 'L20-cnbc', 'крупно Дарио', 'на «enjoying» Дарио кивает')
p('And then: "you can\'t be sure', 'T-card', 'шаблон карточка-цитата', 'карточка «"You can\'t be sure what you\'re going to do in the future." — DARIO AMODEI»')
p('And the man they all walked away from?', 'L21-altman', 'общий Альтман у окна', 'ночь; Альтман один у окна, в руке телефон с тикером; на «away» отражение в стекле')
p('Sam Altman said he doesn\'t know', 'L21-altman', 'крупно Альтман', 'на «Altman» подпись «SAM ALTMAN — CEO, OPENAI»; на «safe» хмурится')
p('and called "the race dynamic', 'T-card', 'шаблон карточка-цитата', 'карточка «"the race dynamic in the fog of war" — "a bad thing"» — SAM ALTMAN')
p('OpenAI, he says, will go public', 'L21-altman', 'вставка телефон', 'на «point» в календаре телефона пустая дата «SOMEDAY»')
p('ALTMAN: Should we have kept them?', 'L21-altman', 'средний Альтман и ассистент', 'на «them» Альтман кивает на телефон')
p('ASSISTANT: Which ones?', 'L21-altman', 'крупно ассистент', 'на «ones» ассистент пожимает плечами')
p('ALTMAN: Either.', 'L21-altman', 'средний Альтман отворачивается', 'на «Either» Альтман снова смотрит в окно')
p('So that\'s the trade.', 'T-split', 'шаблон сплит TWO EXITS', 'надпись «TWO EXITS»; слева Маск со связкой ключей-стоек, справа Амодеи со светящимся окном Claude; на «trade» они меняются ключом и чеком')
p('Two exits from the same lab.', 'L07-openai20', 'общий офис OpenAI ночью', 'на «exits» две двери захлопываются одна за другой')
p('One side built the AI everyone wants.', 'T-split', 'шаблон сплит', 'на «wants» правая половина загорается')
p('The other built the machine nobody', '3D-colossus', '3D пустой проход', 'на «fill» у дальних стоек гаснет свет — ряды пусты', 'проезд → стоп → рывок на «fill»')
p('They didn\'t make peace.', 'T-card', 'шаблон карточка', 'карточка «They didn\'t make peace. They made a lease.»')
p('And here\'s the part most headlines missed.', 'T-doc', 'шаблон проспект', 'на «missed» маркер находит строку в конце проспекта')
p('Anthropic has promised to spend', 'T-number', 'шаблон цифра', 'на «hundred» цифра «~$900.9 BILLION — COMPUTE COMMITMENTS»')
p('To Google. To Amazon.', 'T-board', 'шаблон стрелки', 'от цифры вылетают стрелки: на «Google» — «GOOGLE», на «Amazon» — «AMAZON», на «Microsoft» — «MICROSOFT», на «Musk» — «SPACEX»')
p('AMAZON BANKER: They owe us how much?', 'L01-nasdaq', 'средний банкир Amazon', 'на «much» банкир достаёт калькулятор')
p('GOOGLE BANKER: Less than they owe us.', 'L01-nasdaq', 'крупно банкир Google', 'на «us» банкир ухмыляется')
p('MUSK: Gentlemen. Get in line.', 'L01-nasdaq', 'средний очередь', 'Маск протискивается в кадр с края; на «line» банкиры послушно встают в очередь')
p('In a gold rush,', 'L24-goldrush', 'общий городок', 'старатели копают у реки; на «headlines» мимо пролетает газета «GOLD!»')
p('The people renting out the shovels', 'L24-goldrush', 'средний лавка лопат', 'человек в цилиндре сдаёт лопаты; на «money» пересыпает монеты в мешок')
p('—', 'T-card', 'шаблон карточка', 'карточка «In a gold rush, rent out the shovels.»', dur=1.6)
p('And a lease can end.', 'L01-nasdaq', 'общий сцена в сумерках', 'зал пустеет; на «end» колокол звенит ещё раз, тише')
p('Ninety days\' notice,', 'T-number', 'шаблон обратный отсчёт', 'на «Ninety» «90 DAYS\' NOTICE» и отсчёт; на «year» «AFTER EARLY 2027»')
p('So here\'s the last question.', 'L04-starbase', 'средний Маск с телефоном', 'на «question» телефон Маска загорается уведомлением «PAYMENT RECEIVED»')
p('What happens to one of the most', 'L09-ant', 'общий офис ночью', 'на «landlord» по стене офиса проходит длинная тень с окна; на «mind» одна лампа гаснет')

# ───────────────────────── 8. The Office — the safe ─────────────────────────
ch(8)
p('HOST: Evil, in February.', 'L03-host', 'средний ведущий с распечаткой', 'на «Evil» ведущий поднимает распечатку к лампе')
p('Paid, by May.', 'L03-host', 'вставка штамп PAID', 'на «Paid» блик лампы на красном штампе')
p('HOST: And the receipt goes', 'L03-host', 'общий ведущий идёт к сейфу', 'на «go» ведущий поворачивается к сейфу')
p('HOST: Some words get deleted.', 'L03-host', 'вставка сейф открывается', 'на «deleted» дверца сейфа открывается — внутри латунный ключ из прошлой серии')
p('These ones got invoiced.', 'L03-host', 'крупно лист рядом с ключом', 'на «invoiced» ведущий кладёт лист рядом с ключом')
p('—', 'L03-host', 'общий сейф закрывается', 'дверца закрывается, ручка поворачивается; лампа гаснет', 'статично (стоп)', dur=2.0)

# ───────────────────────── сборка ─────────────────────────
def norm(w): return re.sub(r'[^a-z0-9]', '', w.lower().replace('’', '').replace("'", ''))
md = open(os.path.join(L, 'script.md'), encoding='utf-8').read()
body = md[md.index('<!-- SCRIPT START -->'):md.index('<!-- SCRIPT END -->')]
toks = []; c = None
for raw in body.splitlines():
    s = raw.strip(); h = re.match(r'^## (\d+)\.', s)
    if h: c = int(h.group(1)); continue
    if not s or s.startswith('[SCENE') or s.startswith('<!--') or s.startswith('#'): continue
    toks += [(w, c) for w in s.split()]
def head(chunk):
    if len(chunk) <= 52: return chunk
    o = ''
    for x in chunk.split(' '):
        if len((o + ' ' + x).strip()) > 50: break
        o = (o + ' ' + x).strip()
    return o + ' …'
# позиции начала каждого плана
shots = []; cur = None; pos = 0; errs = []
for it in S:
    if it[0] == 'CH': cur = it[1]; continue
    start, loc, fr, ev, cam, dur = it
    if start == '—': shots.append(dict(ch=cur, pos=None, loc=loc, fr=fr, ev=ev, cam=cam, dur=dur)); continue
    k = [norm(w) for w in start.split() if norm(w)]
    i = pos
    while i < len(toks) and [norm(t[0]) for t in toks[i:i + len(k)]] != k: i += 1
    if i >= len(toks): errs.append(f'не найдено: {start!r} (глава {cur})'); continue
    if i - pos > 0 and shots and shots[-1]['pos'] is None and not any(s['pos'] is not None for s in shots[-1:]): pass
    if toks[i][1] != cur: errs.append(f'{start!r}: глава в сценарии {toks[i][1]}, в списке {cur}')
    shots.append(dict(ch=cur, pos=i, loc=loc, fr=fr, ev=ev, cam=cam, dur=dur)); pos = i + 1
# проверка, что ничего не пропущено: первый план с текстом стоит на 0, разрывов нет (каждый кусок — до начала следующего)
voiced = [s for s in shots if s['pos'] is not None]
if voiced[0]['pos'] != 0: errs.append('первый план не с начала сценария')
for a, b in zip(voiced, voiced[1:]): a['end'] = b['pos']
voiced[-1]['end'] = len(toks)
if errs: print('\n'.join(errs)); raise SystemExit(1)

# ---- короткие реплики двух героев на одном плейте — один план с вип-паном (грамматика L001; меньше добивки тишиной)
SPK = re.compile(r'^([A-Z][A-Z0-9 ]{1,20}):')
def chunk(s): return ' '.join(t[0] for t in toks[s['pos']:s['end']]) if s['pos'] is not None else ''
def spk(s): m = SPK.match(chunk(s)); return m.group(1) if m else None
merged = []; i = 0
while i < len(shots):
    a = shots[i]; b = shots[i + 1] if i + 1 < len(shots) else None
    ok = (b and a['pos'] is not None and b['pos'] is not None and a['ch'] == b['ch'] and a['loc'] == b['loc'] and not a['loc'].startswith(('T-', '3D'))
          and spk(a) and spk(b) and spk(a) != spk(b) and 'вип-пан' not in a['fr'] and 'вип-пан' not in b['fr']
          and len(chunk(a).split()) <= 9 and len(chunk(b).split()) <= 9 and not a['cam'] and not b['cam'])
    if ok:
        merged.append(dict(a, fr=a['fr'] + ' вип-пан → ' + spk(b), ev=a['ev'] + ' → вип-пан со смазом на ' + spk(b) + ': ' + b['ev'], end=b['end'])); i += 2
    else: merged.append(a); i += 1
print('слито пар:', len(shots) - len(merged)); shots = merged

# ---- не две одинаковые крупности подряд (после слияния): второй план берёт соседнюю крупность
def key(s): return s['loc'] if s['loc'].startswith(('T-', '3D')) else s['fr'].split()[0]
for k in range(1, len(shots)):
    if not shots[k]['loc'].startswith(('T-', '3D')) and key(shots[k]) == key(shots[k - 1]):
        nxt = key(shots[k + 1]) if k + 1 < len(shots) else None
        for alt in ({'средний': ['крупно', 'общий'], 'крупно': ['средний', 'сверхкрупно'], 'общий': ['средний', 'крупно']}.get(key(shots[k]), ['средний'])):
            if alt != key(shots[k - 1]) and alt != nxt:
                shots[k] = dict(shots[k], fr=alt + shots[k]['fr'][len(key(shots[k])):]); break

def camera(s):
    if s['cam']: return s['cam']
    if s['loc'] in ('T-card', 'T-title', 'T-year'): return 'статично (стоп)'
    m = re.search(r'вип-пан → (\S+(?: \d)?)', s['fr'])
    if m: return f'стоп → вип-пан со смазом на {m.group(1)}'
    w = re.findall(r'на (?:втором |каждое )?«([^»]+)»', s['ev'])
    if not w: return 'медленный наезд'
    return f'наезд → стоп → рывок на «{w[0]}»' + (f' и «{w[1]}»' if len(w) > 1 and w[1] != w[0] else '')
rows = {}; n = 0
for s in shots:
    n += 1
    text = '— (без голоса, музыка)' if s['pos'] is None else head(' '.join(t[0] for t in toks[s['pos']:s['end']]))
    fr = re.sub(r' вип-пан → \S+(?: \d)?', ' (вип-пан)', s['fr'])
    rows.setdefault(s['ch'], []).append(f"| {n} | 0:00.0 | {text} | {s['loc']} | {fr} | {s['dur'] or 0:.1f} | {s['ev']} | {camera(s)} |")

LOCS = """| id | Фон | Палитра | Главы | Что сюда сведено |
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
заводу (город `production/L001/scenes/city` + плейт L15 в конце, тип B)."""

out = ['# L002 — раскадровка (шотлист) всего ролика', '',
       'Собрано 2026-11-20 по `script.md` (текст дословно, здесь только картинка), голосу Fish (`out/lines_fish.json`, 15:13),',
       'правилам [[stickman-noir]] (разд. 7) и грамматике камеры L001 (`production/L001/dynamics_compare.md`). Генератор —',
       '`animatic/make_shotlist.py` (планы задаются там; старт и длительность — `animatic/make_timing.mjs` + `shotlist_tool.mjs sync`).',
       'Статус: **черновик на утверждение Рауаном**. Герои, голоса и 23 локации утверждены 2026-11-20.', '',
       '## Итоги', '', '(заполняет `shotlist_tool.mjs sync`)', '',
       '**Обозначения** — как в L001: крупность / шаблон / 3D; в колонке «событие» часть «на «слово» — действие» встаёт ровно на',
       'это слово; текст в «КАПСЕ» — вещь в кадре (табличка, штамп, мел), остаётся до конца плана. Камера: «наезд → стоп → рывок',
       'на «слово»», «стоп → вип-пан со смазом на ИМЯ» (смена говорящего внутри плана), «статично (стоп)» — карточки и титры.',
       'Подпись с именем (нижняя треть) — при первом появлении реального человека. Реплики реальных людей — драматизация',
       '(в описании ролика), цитаты в «» — только из факт-чека `raw/research/2026-11-19-l002-factcheck.md`.', '',
       '## Локации', '', LOCS, '', '## Раскадровка', '']
for c in sorted(rows):
    out += [f'### Гл. {c}. {CH[c]} — 0:00.0, 0 планов, 0.0 с, 0.0 пл/мин, карточек 0', '',
            '| # | старт | текст (начало…) | локация | план | с | событие в кадре | камера |',
            '|---|---|---|---|---|---|---|---|'] + rows[c] + ['']
out += ['## Проверка', '', '(заполняет `shotlist_tool.mjs sync`)', '']
open(os.path.join(L, 'shotlist.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print(n, 'планов;', sum(1 for s in shots if s['pos'] is None), 'без голоса')
