# L001 — монтажный лист звука (cue sheet)

Сгенерирован `node production/L001/sound/cues.mjs` из `animatic/timing.json`, `animatic/words.json`, `animatic/conf.js` и ручной постановки `cues_manual.mjs`. Не править руками.

Всего звуков: **1175**; по типам: caption 8, foley 155, camera 320, transition 232, template 182, event 252, title 26. Подложек (сегментов амбиенса): 216.

## По главам

| гл. | название | время | звуков | в минуту |
|---|---|---|---|---|
| 0 | A Table in Singapore | 0:00.00–0:44.53 | 81 | 109.1 |
| 1 | The Office | 0:44.53–1:10.45 | 53 | 122.7 |
| 2 | The Man With the Key | 1:10.45–4:20.30 | 176 | 55.6 |
| 3 | The Locked Door | 4:20.30–5:49.74 | 84 | 56.4 |
| 4 | The Cover | 5:49.74–7:27.63 | 105 | 64.4 |
| 5 | The Introduction | 7:27.63–9:13.01 | 124 | 70.6 |
| 6 | The Pipeline | 9:13.01–11:20.98 | 129 | 60.5 |
| 7 | The Real Prize | 11:20.98–13:25.89 | 146 | 70.1 |
| 8 | The Memo | 13:25.89–14:51.76 | 76 | 53.1 |
| 9 | The Empty Chair | 14:51.76–17:36.16 | 175 | 63.9 |
| 10 | The Office | 17:36.16–17:51.27 | 26 | 103.2 |

## Подложки, главы 0

| планы | время | подложка | дБ |
|---|---|---|---|
| 1–1 | 0:00.00–0:01.80 | restaurant | 0 |
| 2–2 | 0:01.80–0:04.74 | city | 0 |
| 3–3 | 0:04.74–0:06.76 | restaurant | 0 |
| 4–4 | 0:06.76–0:10.07 | restaurant | -6 |
| 5–6 | 0:10.07–0:15.12 | restaurant | 0 |
| 7–7 | 0:15.12–0:17.45 | restaurant | -6 |
| 8–10 | 0:17.45–0:24.05 | restaurant | 0 |
| 11–11 | 0:24.05–0:28.11 | warehouse | 0 |
| 12–12 | 0:28.11–0:30.72 | street | 0 |
| 13–14 | 0:30.72–0:36.53 | car | 0 |
| 15–17 | 0:36.53–0:41.19 | restaurant | 0 |
| 18–18 | 0:41.19–0:44.53 | car | 0 |

## Звуки, главы 0

| id | план | кадр | время | звук | точка | что в кадре | правило |
|---|---|---|---|---|---|---|---|
| c0001 | 1 | 1 | 0:00.02 | type.run (-2) | span 0.38 с | подпись «SINGAPORE» печатается | caption |
| c0002 | 1 | 23 | 0:00.75 | glint (-6) | onset | блик объектива агента за дальним столиком | foley |
| c0003 | 1 | 31 | 0:01.02 | snap | apex | рывок на «Singapore» | camera |
| c0004 | 2 | 55 | 0:01.84 | whoosh.air | apex | склейка #1→#2: в 3D | transition |
| c0005 | 2 | 56 | 0:01.85 | air.move (-4) | span 2.65 с | подъём камеры над городом | foley |
| c0006 | 2 | 78 | 0:02.60 | riser.tower | span 1.30 с | зелёная башня NVIDIA растёт выше всех | foley |
| c0007 | 2 | 117 | 0:03.90 | hit.reveal | onset | «#1» загорается на шпиле (снято с картинки) | foley |
| c0008 | 2 | 117 | 0:03.90 | glint (-4) | onset | свечение «#1» | foley |
| c0009 | 3 | 143 | 0:04.78 | whoosh.cut | apex | склейка #2→#3: смена места | transition |
| c0010 | 3 | 146 | 0:04.86 | chair.scrape (-4) | span 0.80 с | Алиса садится (стул) | foley |
| c0011 | 3 | 192 | 0:06.38 | af.beep (-2) | onset | рамка фокуса захватывает Алису | foley |
| c0012 | 3 | 196 | 0:06.52 | shutter | onset | щелчок затвора, кадр застывает снимком | foley |
| c0013 | 4 | 203 | 0:06.76 | hit.soft | onset | склейка #3→#4: в шаблон T-doc | transition |
| c0014 | 4 | 203 | 0:06.76 | paper.slide | span 0.70 с | документ въезжает на стол | template |
| c0015 | 4 | 216 | 0:07.20 | photo.drop | onset | снимок Алисы ложится на папку | foley |
| c0016 | 4 | 220 | 0:07.32 | clip.snap (-4) | onset | скрепка прижимает снимок | foley |
| c0017 | 4 | 231 | 0:07.68 | hit.event (+2) | onset | толчок документа на «believes» | foley |
| c0018 | 4 | 258 | 0:08.58 | stamp | onset | штамп документа «ASSESSMENT» | template |
| c0019 | 4 | 262 | 0:08.75 | marker.hl (-2) | span 0.38 с | маркер по строке 3 | template |
| c0020 | 4 | 272 | 0:09.06 | snap.soft | apex | рывок на «spy» | camera |
| c0021 | 5 | 303 | 0:10.11 | whoosh.cut (-3) | apex | склейка #4→#5: из вставки обратно в сцену | transition |
| c0022 | 5 | 325 | 0:10.82 | ui.slide (-3) | onset | подпись «Jensen Huang — CEO, Nvidia» | caption |
| c0023 | 5 | 352 | 0:11.73 | cloth.rustle (-6) | onset | рука к лацкану кожанки | foley |
| c0024 | 5 | 361 | 0:12.03 | snap | apex | рывок на «jacket» | camera |
| c0025 | 5 | 370 | 0:12.33 | glint (-8) | onset | блик на кожанке | foley |
| c0026 | 6 | 422 | 0:14.07 | snap | apex | рывок на «Alice» | camera |
| c0027 | 6 | 424 | 0:14.15 | ui.slide (-3) | onset | подпись «Alice Huang — Megaspeed» | caption |
| c0028 | 6 | 428 | 0:14.27 | glint (-8) | onset | блик объектива агента за дальним столиком | foley |
| c0029 | 6 | 437 | 0:14.57 | glasses.tick (-6) | onset | Алиса поправляет очки | foley |
| c0030 | 7 | 454 | 0:15.12 | hit.card | onset | склейка #6→#7: чёрная карточка | transition |
| c0031 | 7 | 460 | 0:15.32 | marker.write | span 1.20 с | карточка пишется маркером: «Same last name, no relation.» | template |
| c0032 | 7 | 503 | 0:16.77 | marker.line | span 0.35 с | подчёркивание «relation» | template |
| c0033 | 8 | 525 | 0:17.49 | whoosh.cut (-3) | apex | склейка #7→#8: из вставки обратно в сцену | transition |
| c0034 | 8 | 546 | 0:18.21 | crate.set | onset | первый ящик ставят у её стула | foley |
| c0035 | 8 | 550 | 0:18.34 | paper.slide (-5) | span 0.60 с | папка с заказом едет к Дженсену | foley |
| c0036 | 8 | 558 | 0:18.59 | crate.set (-1) | onset | второй ящик | foley |
| c0037 | 8 | 564 | 0:18.79 | snap (-6) | apex | рывок на «customers» | camera |
| c0038 | 8 | 564 | 0:18.79 | tag.pop | onset | бирка «VIP CUSTOMER» | foley |
| c0039 | 9 | 611 | 0:20.35 | glass.lift (-8) | onset | Дженсен поднимает бокал | foley |
| c0040 | 9 | 642 | 0:21.40 | whoosh.whip | apex | вип-пан JENSEN → ALICE | camera |
| c0041 | 9 | 663 | 0:22.11 | glass.clink | onset | бокалы встречаются — «дзынь», искра | foley |
| c0042 | 10 | 683 | 0:22.76 | cloth.slide (-4) | span 0.97 с | рука в перчатке просовывает чип из-под скатерти | foley |
| c0043 | 10 | 712 | 0:23.73 | snap (-6) | apex | рывок на «chips» | camera |
| c0044 | 10 | 712 | 0:23.73 | chip.pulse | onset | чип вспыхивает зелёным сквозь ткань | foley |
| c0045 | 11 | 722 | 0:24.08 | whoosh.air | apex | склейка #10→#11: в 3D | transition |
| c0046 | 11 | 724 | 0:24.15 | air.move (-3) | span 3.35 с | движение камеры: боковой проезд | camera |
| c0047 | 11 | 732 | 0:24.40 | motor.hum (-8) | span 2.84 с | электропогрузчик едет к камере | foley |
| c0048 | 11 | 785 | 0:26.18 | whoosh.cut | apex | склейка внутри 3D-сцены: коробка крупно (сцена идёт в своём темпе, 63-й кадр) | foley |
| c0049 | 11 | 819 | 0:27.31 | stamp | onset | штамп «EXPORT CONTROLLED» | event |
| c0050 | 11 | 833 | 0:27.76 | stamp | onset | штамп «NOT FOR CHINA» | event |
| c0051 | 12 | 844 | 0:28.14 | whoosh.cut | apex | склейка #11→#12: смена места | transition |
| c0052 | 12 | 846 | 0:28.21 | air.move (-3) | span 2.12 с | движение камеры: проезд вправо + удары ×2 | camera |
| c0053 | 12 | 854 | 0:28.46 | thunder.far (-6) | onset | проезд к машине под дождём (далёкий гром) | foley |
| c0054 | 13 | 922 | 0:30.72 | tape.reels (-4) | span 3.54 с | крутятся бобины магнитофона | foley |
| c0055 | 13 | 925 | 0:30.82 | whoosh.whip | apex | склейка #12→#13: вип-переход | transition |
| c0056 | 13 | 931 | 0:31.02 | tape.clack (-6) | span 2.64 с | кассеты с бирками JAN…DEC встают в ряд | foley |
| c0057 | 13 | 937 | 0:31.22 | headphone (-6) | onset | агент прижимает наушник | foley |
| c0058 | 13 | 979 | 0:32.64 | snap | apex | рывок на «calls» | camera |
| c0059 | 14 | 1028 | 0:34.26 | tape.reels (-8) | span 2.28 с | бобины (за кадром) | foley |
| c0060 | 14 | 1056 | 0:35.22 | headphone (-4) | onset | прижимает наушник | foley |
| c0061 | 14 | 1065 | 0:35.52 | snap | apex | рывок на «American» | camera |
| c0062 | 15 | 1097 | 0:36.57 | whoosh.cut | apex | склейка #14→#15: смена места | transition |
| c0063 | 15 | 1102 | 0:36.73 | servo (-8) | span 1.10 с | рамка фокуса скользит с Алисы | foley |
| c0064 | 15 | 1119 | 0:37.29 | body.pass (-4) | apex | официант проходит перед объективом | foley |
| c0065 | 15 | 1138 | 0:37.93 | af.beep (-2) | onset | рамка нашла Дженсена | foley |
| c0066 | 16 | 1141 | 0:38.03 | flash.pop | onset | склейка #15→#16: вспышка | transition |
| c0067 | 16 | 1146 | 0:38.21 | photo.drop (-3) | onset | снимок 1 падает на столик агента | foley |
| c0068 | 16 | 1149 | 0:38.29 | stamp | onset | штамп «THE JACKET» | event |
| c0069 | 16 | 1157 | 0:38.55 | photo.drop (-3) | onset | снимок 2 падает на столик агента | foley |
| c0070 | 16 | 1163 | 0:38.75 | snap (-6) | apex | рывок на «jacket» | camera |
| c0071 | 16 | 1163 | 0:38.75 | shutter | onset | щелчок затвора | event |
| c0072 | 16 | 1163 | 0:38.75 | flash.pop (-6) | onset | вспышка | event |
| c0073 | 16 | 1166 | 0:38.87 | photo.drop | onset | снимок 3 падает на столик агента | foley |
| c0074 | 17 | 1198 | 0:39.95 | chair.creak (-5) | onset | Дженсен откидывается на спинку | foley |
| c0075 | 17 | 1211 | 0:40.37 | snap | apex | рывок на «idea» | camera |
| c0076 | 18 | 1236 | 0:41.19 | tape.reels (-8) | span 3.34 с | бобины | foley |
| c0077 | 18 | 1237 | 0:41.22 | whoosh.cut | apex | склейка #17→#18: смена места | transition |
| c0078 | 18 | 1239 | 0:41.30 | tablet.ping (-4) | onset | на планшет приходит снимок | foley |
| c0079 | 18 | 1267 | 0:42.23 | headphone (-4) | onset | агент 2 опускает наушники | foley |
| c0080 | 18 | 1270 | 0:42.34 | whoosh.whip | apex | вип-пан AGENT 2 → AGENT | camera |
| c0081 | 18 | 1302 | 0:43.39 | folder.close | onset | агент закрывает папку «SUBJECT: ALICE HUANG» | foley |
