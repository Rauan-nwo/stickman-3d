# L001 — монтажный лист звука (cue sheet)

Сгенерирован `node production/L001/sound/cues.mjs` из `animatic/timing.json`, `animatic/words.json`, `animatic/conf.js` и ручной постановки `cues_manual.mjs`. Не править руками.

Всего звуков: **1245**; по типам: caption 8, foley 157, camera 320, transition 231, template 182, event 321, title 26. Подложек (сегментов амбиенса): 215.

## По главам

| гл. | название | время | звуков | в минуту |
|---|---|---|---|---|
| 0 | A Table in Singapore | 0:00.00–0:53.72 | 80 | 89.3 |
| 1 | The Office | 0:53.72–1:23.63 | 54 | 108.3 |
| 2 | The Man With the Key | 1:23.63–4:59.94 | 185 | 51.3 |
| 3 | The Locked Door | 4:59.94–6:44.61 | 89 | 51.0 |
| 4 | The Cover | 6:44.61–8:37.62 | 111 | 58.9 |
| 5 | The Introduction | 8:37.62–10:38.85 | 129 | 63.8 |
| 6 | The Pipeline | 10:38.85–13:07.79 | 141 | 56.8 |
| 7 | The Real Prize | 13:07.79–15:34.38 | 158 | 64.7 |
| 8 | The Memo | 15:34.38–17:12.35 | 84 | 51.4 |
| 9 | The Empty Chair | 17:12.35–20:23.65 | 191 | 59.9 |
| 10 | The Office | 20:23.65–20:34.20 | 23 | 130.9 |

## Подложки, главы 0

| планы | время | подложка | дБ |
|---|---|---|---|
| 1–1 | 0:00.00–0:02.36 | restaurant | 0 |
| 2–2 | 0:02.36–0:05.99 | city | 0 |
| 3–3 | 0:05.99–0:09.03 | restaurant | 0 |
| 4–4 | 0:09.03–0:12.53 | restaurant | -6 |
| 5–6 | 0:12.53–0:20.44 | restaurant | 0 |
| 7–7 | 0:20.44–0:23.54 | restaurant | -6 |
| 8–10 | 0:23.54–0:32.75 | restaurant | 0 |
| 11–11 | 0:32.75–0:37.42 | warehouse | 0 |
| 12–12 | 0:37.42–0:39.97 | street | 0 |
| 13–14 | 0:39.97–0:45.55 | car | 0 |
| 15–17 | 0:45.55–0:50.50 | restaurant | 0 |
| 18–18 | 0:50.50–0:53.72 | car | 0 |

## Звуки, главы 0

| id | план | кадр | время | звук | точка | что в кадре | правило |
|---|---|---|---|---|---|---|---|
| c0001 | 1 | 1 | 0:00.02 | type.run (-2) | span 0.38 с | подпись «SINGAPORE» печатается | caption |
| c0002 | 1 | 23 | 0:00.75 | glint (-6) | onset | блик объектива агента за дальним столиком | foley |
| c0003 | 1 | 42 | 0:01.41 | snap | apex | рывок на «Singapore» | camera |
| c0004 | 2 | 72 | 0:02.39 | whoosh.air | apex | склейка #1→#2: в 3D | transition |
| c0005 | 2 | 72 | 0:02.41 | air.move (-4) | span 3.27 с | подъём камеры над городом | foley |
| c0006 | 2 | 100 | 0:03.34 | riser.tower | span 1.61 с | зелёная башня NVIDIA растёт выше всех | foley |
| c0007 | 2 | 149 | 0:04.95 | hit.reveal | onset | «#1» загорается на шпиле (снято с картинки) | foley |
| c0008 | 2 | 149 | 0:04.95 | glint (-4) | onset | свечение «#1» | foley |
| c0009 | 3 | 181 | 0:06.03 | whoosh.cut | apex | склейка #2→#3: смена места | transition |
| c0010 | 3 | 183 | 0:06.11 | chair.scrape (-4) | span 0.80 с | Алиса садится (стул) | foley |
| c0011 | 3 | 242 | 0:08.05 | af.beep (-2) | onset | рамка фокуса захватывает Алису | foley |
| c0012 | 3 | 246 | 0:08.19 | shutter | onset | щелчок затвора, кадр застывает снимком | foley |
| c0013 | 4 | 271 | 0:09.03 | hit.soft | onset | склейка #3→#4: в шаблон T-doc | transition |
| c0014 | 4 | 271 | 0:09.03 | paper.slide | span 0.70 с | документ въезжает на стол | template |
| c0015 | 4 | 284 | 0:09.47 | photo.drop | onset | снимок Алисы ложится на папку | foley |
| c0016 | 4 | 288 | 0:09.59 | clip.snap (-4) | onset | скрепка прижимает снимок | foley |
| c0017 | 4 | 289 | 0:09.63 | hit.event (+2) | onset | толчок документа на «believes» | foley |
| c0018 | 4 | 329 | 0:10.95 | stamp | onset | штамп документа «ASSESSMENT» | template |
| c0019 | 4 | 334 | 0:11.13 | marker.hl (-2) | span 0.38 с | маркер по строке 3 | template |
| c0020 | 4 | 340 | 0:11.33 | snap.soft | apex | рывок на «spy» | camera |
| c0021 | 5 | 377 | 0:12.56 | whoosh.cut (-3) | apex | склейка #4→#5: из вставки обратно в сцену | transition |
| c0022 | 5 | 411 | 0:13.70 | ui.slide (-3) | onset | подпись «Jensen Huang — CEO, Nvidia» | caption |
| c0023 | 5 | 460 | 0:15.34 | cloth.rustle (-6) | onset | рука к лацкану кожанки | foley |
| c0024 | 5 | 469 | 0:15.64 | snap | apex | рывок на «jacket» | camera |
| c0025 | 5 | 478 | 0:15.94 | glint (-8) | onset | блик на кожанке | foley |
| c0026 | 6 | 564 | 0:18.81 | glint (-8) | onset | блик объектива агента за дальним столиком | foley |
| c0027 | 6 | 567 | 0:18.88 | ui.slide (-3) | onset | подпись «Alice Huang — Megaspeed» | caption |
| c0028 | 6 | 570 | 0:18.99 | snap | apex | рывок на «Alice» | camera |
| c0029 | 6 | 575 | 0:19.16 | glasses.tick (-6) | onset | Алиса поправляет очки | foley |
| c0030 | 7 | 613 | 0:20.44 | hit.card | onset | склейка #6→#7: чёрная карточка | transition |
| c0031 | 7 | 619 | 0:20.64 | marker.write | span 1.66 с | карточка пишется маркером: «Same last name, no relation.» | template |
| c0032 | 7 | 677 | 0:22.55 | marker.line | span 0.35 с | подчёркивание «relation» | template |
| c0033 | 8 | 707 | 0:23.58 | whoosh.cut (-3) | apex | склейка #7→#8: из вставки обратно в сцену | transition |
| c0034 | 8 | 741 | 0:24.69 | crate.set | onset | первый ящик ставят у её стула | foley |
| c0035 | 8 | 755 | 0:25.17 | paper.slide (-5) | span 0.60 с | папка с заказом едет к Дженсену | foley |
| c0036 | 8 | 758 | 0:25.28 | crate.set (-1) | onset | второй ящик | foley |
| c0037 | 8 | 769 | 0:25.62 | snap (-6) | apex | рывок на «customers» | camera |
| c0038 | 8 | 769 | 0:25.62 | tag.pop | onset | бирка «VIP CUSTOMER» | foley |
| c0039 | 9 | 836 | 0:27.87 | glass.lift (-8) | onset | Дженсен поднимает бокал | foley |
| c0040 | 9 | 894 | 0:29.79 | whoosh.whip | apex | вип-пан JENSEN → ALICE | camera |
| c0041 | 9 | 917 | 0:30.58 | glass.clink | onset | бокалы встречаются — «дзынь», искра | foley |
| c0042 | 10 | 938 | 0:31.25 | cloth.slide (-4) | span 1.13 с | рука в перчатке просовывает чип из-под скатерти | foley |
| c0043 | 10 | 971 | 0:32.38 | snap (-6) | apex | рывок на «chips» | camera |
| c0044 | 10 | 971 | 0:32.38 | chip.pulse | onset | чип вспыхивает зелёным сквозь ткань | foley |
| c0045 | 11 | 984 | 0:32.79 | whoosh.air | apex | склейка #10→#11: в 3D | transition |
| c0046 | 11 | 986 | 0:32.85 | air.move (-3) | span 3.87 с | движение камеры: боковой проезд | camera |
| c0047 | 11 | 993 | 0:33.10 | motor.hum (-8) | span 3.27 с | электропогрузчик едет к камере | foley |
| c0048 | 11 | 1047 | 0:34.89 | whoosh.cut | apex | склейка внутри 3D-сцены: коробка крупно (сцена идёт в своём темпе, 63-й кадр) | foley |
| c0049 | 11 | 1095 | 0:36.50 | stamp | onset | штамп «EXPORT CONTROLLED» | event |
| c0050 | 11 | 1108 | 0:36.95 | stamp | onset | штамп «NOT FOR CHINA» | event |
| c0051 | 12 | 1124 | 0:37.46 | whoosh.cut | apex | склейка #11→#12: смена места | transition |
| c0052 | 12 | 1126 | 0:37.52 | air.move (-3) | span 2.06 с | движение камеры: проезд вправо | camera |
| c0053 | 12 | 1133 | 0:37.77 | thunder.far (-6) | onset | проезд к машине под дождём (далёкий гром) | foley |
| c0054 | 13 | 1199 | 0:39.97 | tape.reels (-4) | span 3.97 с | крутятся бобины магнитофона | foley |
| c0055 | 13 | 1202 | 0:40.07 | whoosh.whip | apex | склейка #12→#13: вип-переход | transition |
| c0056 | 13 | 1208 | 0:40.27 | tape.clack (-6) | span 3.01 с | кассеты с бирками JAN…DEC встают в ряд | foley |
| c0057 | 13 | 1214 | 0:40.47 | headphone (-6) | onset | агент прижимает наушник | foley |
| c0058 | 13 | 1264 | 0:42.13 | snap | apex | рывок на «calls» | camera |
| c0059 | 14 | 1318 | 0:43.94 | tape.reels (-8) | span 1.61 с | бобины (за кадром) | foley |
| c0060 | 14 | 1333 | 0:44.42 | headphone (-4) | onset | прижимает наушник | foley |
| c0061 | 14 | 1342 | 0:44.72 | snap | apex | рывок на «American» | camera |
| c0062 | 15 | 1367 | 0:45.58 | whoosh.cut | apex | склейка #14→#15: смена места | transition |
| c0063 | 15 | 1372 | 0:45.75 | servo (-8) | span 1.10 с | рамка фокуса скользит с Алисы | foley |
| c0064 | 15 | 1389 | 0:46.31 | body.pass (-4) | apex | официант проходит перед объективом | foley |
| c0065 | 15 | 1408 | 0:46.95 | af.beep (-2) | onset | рамка нашла Дженсена | foley |
| c0066 | 16 | 1411 | 0:47.05 | flash.pop | onset | склейка #15→#16: вспышка | transition |
| c0067 | 16 | 1417 | 0:47.23 | photo.drop (-3) | onset | снимок 1 падает на столик агента | foley |
| c0068 | 16 | 1424 | 0:47.47 | photo.drop (-3) | onset | снимок 2 падает на столик агента | foley |
| c0069 | 16 | 1430 | 0:47.67 | snap (-6) | apex | рывок на «jacket» | camera |
| c0070 | 16 | 1430 | 0:47.67 | shutter | onset | щелчок затвора | event |
| c0071 | 16 | 1430 | 0:47.67 | flash.pop (-6) | onset | вспышка | event |
| c0072 | 16 | 1434 | 0:47.79 | photo.drop | onset | снимок 3 падает на столик агента | foley |
| c0073 | 17 | 1465 | 0:48.85 | chair.creak (-5) | onset | Дженсен откидывается на спинку | foley |
| c0074 | 17 | 1484 | 0:49.48 | snap | apex | рывок на «idea» | camera |
| c0075 | 18 | 1515 | 0:50.50 | tape.reels (-8) | span 3.22 с | бобины | foley |
| c0076 | 18 | 1516 | 0:50.53 | whoosh.cut | apex | склейка #17→#18: смена места | transition |
| c0077 | 18 | 1519 | 0:50.62 | tablet.ping (-4) | onset | на планшет приходит снимок | foley |
| c0078 | 18 | 1546 | 0:51.55 | headphone (-4) | onset | агент 2 опускает наушники | foley |
| c0079 | 18 | 1555 | 0:51.84 | whoosh.whip | apex | вип-пан AGENT 2 → AGENT | camera |
| c0080 | 18 | 1582 | 0:52.73 | folder.close | onset | агент закрывает папку «SUBJECT: ALICE HUANG» | foley |
