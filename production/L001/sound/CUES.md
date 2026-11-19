# L001 — монтажный лист звука (cue sheet)

Сгенерирован `node production/L001/sound/cues.mjs` из `animatic/timing.json`, `animatic/words.json`, `animatic/conf.js` и ручной постановки `cues_manual.mjs`. Не править руками.

Всего звуков: **1570**; по типам: caption 8, foley 353, camera 320, transition 361, template 182, event 320, title 26. Подложек (сегментов амбиенса): 216.

## По главам

| гл. | название | время | звуков | в минуту |
|---|---|---|---|---|
| 0 | A Table in Singapore | 0:00.00–0:44.53 | 91 | 122.6 |
| 1 | The Office | 0:44.53–1:10.45 | 63 | 145.8 |
| 2 | The Man With the Key | 1:10.45–4:20.30 | 244 | 77.1 |
| 3 | The Locked Door | 4:20.30–5:49.74 | 113 | 75.8 |
| 4 | The Cover | 5:49.74–7:27.63 | 143 | 87.6 |
| 5 | The Introduction | 7:27.63–9:13.01 | 163 | 92.8 |
| 6 | The Pipeline | 9:13.01–11:20.98 | 191 | 89.6 |
| 7 | The Real Prize | 11:20.98–13:25.89 | 186 | 89.3 |
| 8 | The Memo | 13:25.89–14:51.76 | 112 | 78.3 |
| 9 | The Empty Chair | 14:51.76–17:36.16 | 229 | 83.6 |
| 10 | The Office | 17:36.16–17:51.27 | 35 | 138.9 |

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
| c0003 | 1 | 27 | 0:00.90 | glass.clink (-10) | onset | ресторан: бокалы за кадром | foley |
| c0004 | 1 | 31 | 0:01.02 | snap | apex | рывок на «Singapore» | camera |
| c0005 | 2 | 55 | 0:01.84 | whoosh.air | apex | склейка #1→#2: в 3D | transition |
| c0006 | 2 | 56 | 0:01.85 | air.move (-4) | span 2.65 с | подъём камеры над городом | foley |
| c0007 | 2 | 78 | 0:02.60 | riser.tower | span 1.30 с | зелёная башня NVIDIA растёт выше всех | foley |
| c0008 | 2 | 117 | 0:03.90 | hit.reveal | onset | «#1» загорается на шпиле (снято с картинки) | foley |
| c0009 | 2 | 117 | 0:03.90 | glint (-4) | onset | свечение «#1» | foley |
| c0010 | 3 | 143 | 0:04.78 | whoosh.cut | apex | склейка #2→#3: смена места | transition |
| c0011 | 3 | 146 | 0:04.86 | chair.scrape (-4) | span 0.80 с | Алиса садится (стул) | foley |
| c0012 | 3 | 192 | 0:06.38 | af.beep (-2) | onset | рамка фокуса захватывает Алису | foley |
| c0013 | 3 | 196 | 0:06.52 | shutter | onset | щелчок затвора, кадр застывает снимком | foley |
| c0014 | 4 | 203 | 0:06.76 | hit.soft | onset | склейка #3→#4: в шаблон T-doc | transition |
| c0015 | 4 | 203 | 0:06.76 | paper.slide | span 0.70 с | документ въезжает на стол | template |
| c0016 | 4 | 216 | 0:07.20 | photo.drop | onset | снимок Алисы ложится на папку | foley |
| c0017 | 4 | 220 | 0:07.32 | clip.snap (-4) | onset | скрепка прижимает снимок | foley |
| c0018 | 4 | 231 | 0:07.68 | hit.event (+2) | onset | толчок документа на «believes» | foley |
| c0019 | 4 | 258 | 0:08.58 | stamp | onset | штамп документа «ASSESSMENT» | template |
| c0020 | 4 | 262 | 0:08.75 | marker.hl (-2) | span 0.38 с | маркер по строке 3 | template |
| c0021 | 4 | 272 | 0:09.06 | snap.soft | apex | рывок на «spy» | camera |
| c0022 | 4 | 282 | 0:09.41 | tag.pop | onset | бирка/плашка «SUBJECT: ALICE HUANG» | event |
| c0023 | 5 | 303 | 0:10.11 | whoosh.cut (-3) | apex | склейка #4→#5: из вставки обратно в сцену | transition |
| c0024 | 5 | 319 | 0:10.63 | laugh.jensen | onset | Дженсен смеётся | foley |
| c0025 | 5 | 325 | 0:10.82 | ui.slide (-3) | onset | подпись «Jensen Huang — CEO, Nvidia» | caption |
| c0026 | 5 | 352 | 0:11.73 | cloth.rustle (-6) | onset | рука к лацкану кожанки | foley |
| c0027 | 5 | 361 | 0:12.03 | snap | apex | рывок на «jacket» | camera |
| c0028 | 5 | 370 | 0:12.33 | glint (-8) | onset | блик на кожанке | foley |
| c0029 | 5 | 390 | 0:13.00 | tag.pop | onset | бирка/плашка «JENSEN HUANG — CEO, NVIDIA» | event |
| c0030 | 6 | 416 | 0:13.86 | whoosh.cut (-8) | apex | склейка #5→#6: склейка внутри сцены (--cut-all) | transition |
| c0031 | 6 | 422 | 0:14.07 | snap | apex | рывок на «Alice» | camera |
| c0032 | 6 | 424 | 0:14.15 | ui.slide (-3) | onset | подпись «Alice Huang — Megaspeed» | caption |
| c0033 | 6 | 428 | 0:14.27 | glint (-8) | onset | блик объектива агента за дальним столиком | foley |
| c0034 | 6 | 437 | 0:14.57 | glasses.tick (-6) | onset | Алиса поправляет очки | foley |
| c0035 | 7 | 454 | 0:15.12 | hit.card | onset | склейка #6→#7: чёрная карточка | transition |
| c0036 | 7 | 460 | 0:15.32 | marker.write | span 1.20 с | карточка пишется маркером: «Same last name, no relation.» | template |
| c0037 | 7 | 503 | 0:16.77 | marker.line | span 0.35 с | подчёркивание «relation» | template |
| c0038 | 8 | 525 | 0:17.49 | whoosh.cut (-3) | apex | склейка #7→#8: из вставки обратно в сцену | transition |
| c0039 | 8 | 546 | 0:18.21 | box.set | onset | первый ящик ставят у её стула (box.set: хвост записи crate.set со скрипом + гитара + зал давали AST «Hoot/Owl» 0.15, 19.11) | foley |
| c0040 | 8 | 550 | 0:18.34 | paper.slide (-5) | span 0.60 с | папка с заказом едет к Дженсену | foley |
| c0041 | 8 | 558 | 0:18.59 | crate.set (-1) | onset | второй ящик | foley |
| c0042 | 8 | 564 | 0:18.79 | snap (-6) | apex | рывок на «customers» | camera |
| c0043 | 8 | 564 | 0:18.79 | paper.place (-4) | onset | бирка «VIP CUSTOMER» (бумага: tag.pop и tag.slap в сумме с ящиками и нотой гитары давали AST «Owl» 0.10–0.16, проверка 19.11) | foley |
| c0044 | 9 | 607 | 0:20.24 | whoosh.cut (-8) | apex | склейка #8→#9: склейка внутри сцены (--cut-all) | transition |
| c0045 | 9 | 611 | 0:20.35 | glass.lift (-8) | onset | Дженсен поднимает бокал | foley |
| c0046 | 9 | 642 | 0:21.40 | whoosh.whip | apex | вип-пан JENSEN → ALICE | camera |
| c0047 | 9 | 663 | 0:22.11 | glass.clink | onset | бокалы встречаются — «дзынь», искра | foley |
| c0048 | 10 | 682 | 0:22.74 | whoosh.cut (-8) | apex | склейка #9→#10: склейка внутри сцены (--cut-all) | transition |
| c0049 | 10 | 683 | 0:22.76 | cloth.slide (-4) | span 0.97 с | рука в перчатке просовывает чип из-под скатерти | foley |
| c0050 | 10 | 712 | 0:23.73 | snap (-6) | apex | рывок на «chips» | camera |
| c0051 | 10 | 712 | 0:23.73 | chip.pulse | onset | чип вспыхивает зелёным сквозь ткань | foley |
| c0052 | 11 | 722 | 0:24.08 | whoosh.air | apex | склейка #10→#11: в 3D | transition |
| c0053 | 11 | 724 | 0:24.15 | air.move (-3) | span 3.35 с | движение камеры: боковой проезд | camera |
| c0054 | 11 | 732 | 0:24.40 | motor.hum (-8) | span 2.84 с | электропогрузчик едет к камере | foley |
| c0055 | 11 | 785 | 0:26.18 | whoosh.cut | apex | склейка внутри 3D-сцены: коробка крупно (сцена идёт в своём темпе, 63-й кадр) | foley |
| c0056 | 11 | 819 | 0:27.31 | stamp | onset | штамп «EXPORT CONTROLLED» | event |
| c0057 | 11 | 833 | 0:27.76 | stamp | onset | штамп «NOT FOR CHINA» | event |
| c0058 | 12 | 844 | 0:28.14 | whoosh.cut | apex | склейка #11→#12: смена места | transition |
| c0059 | 12 | 846 | 0:28.21 | air.move (-3) | span 2.12 с | движение камеры: проезд вправо + удары ×2 | camera |
| c0060 | 12 | 854 | 0:28.46 | thunder.far (-6) | onset | проезд к машине под дождём (далёкий гром) | foley |
| c0061 | 13 | 922 | 0:30.72 | tape.reels (-4) | span 3.54 с | крутятся бобины магнитофона | foley |
| c0062 | 13 | 925 | 0:30.82 | whoosh.whip | apex | склейка #12→#13: вип-переход | transition |
| c0063 | 13 | 931 | 0:31.02 | tape.clack (-6) | span 2.64 с | кассеты с бирками JAN…DEC встают в ряд | foley |
| c0064 | 13 | 937 | 0:31.22 | headphone (-6) | onset | агент прижимает наушник | foley |
| c0065 | 13 | 979 | 0:32.64 | snap | apex | рывок на «calls» | camera |
| c0066 | 14 | 1028 | 0:34.26 | tape.reels (-8) | span 2.28 с | бобины (за кадром) | foley |
| c0067 | 14 | 1029 | 0:34.29 | whoosh.cut (-8) | apex | склейка #13→#14: склейка внутри сцены (--cut-all) | transition |
| c0068 | 14 | 1056 | 0:35.22 | headphone (-4) | onset | прижимает наушник | foley |
| c0069 | 14 | 1065 | 0:35.52 | snap | apex | рывок на «American» | camera |
| c0070 | 15 | 1097 | 0:36.57 | whoosh.cut | apex | склейка #14→#15: смена места | transition |
| c0071 | 15 | 1102 | 0:36.73 | servo (-8) | span 1.10 с | рамка фокуса скользит с Алисы | foley |
| c0072 | 15 | 1119 | 0:37.29 | body.pass (-4) | apex | официант проходит перед объективом | foley |
| c0073 | 15 | 1138 | 0:37.93 | af.beep (-2) | onset | рамка нашла Дженсена | foley |
| c0074 | 16 | 1141 | 0:38.03 | flash.pop | onset | склейка #15→#16: вспышка | transition |
| c0075 | 16 | 1146 | 0:38.21 | photo.drop (-3) | onset | снимок 1 падает на столик агента | foley |
| c0076 | 16 | 1149 | 0:38.29 | stamp | onset | штамп «THE JACKET» | event |
| c0077 | 16 | 1157 | 0:38.55 | photo.drop (-3) | onset | снимок 2 падает на столик агента | foley |
| c0078 | 16 | 1163 | 0:38.75 | snap (-6) | apex | рывок на «jacket» | camera |
| c0079 | 16 | 1163 | 0:38.75 | shutter | onset | щелчок затвора | event |
| c0080 | 16 | 1163 | 0:38.75 | flash.pop (-6) | onset | вспышка | event |
| c0081 | 16 | 1166 | 0:38.87 | photo.drop | onset | снимок 3 падает на столик агента | foley |
| c0082 | 17 | 1190 | 0:39.68 | whoosh.cut (-8) | apex | склейка #16→#17: склейка внутри сцены (--cut-all) | transition |
| c0083 | 17 | 1196 | 0:39.88 | laugh.jensen | onset | Дженсен смеётся, откидывается | foley |
| c0084 | 17 | 1198 | 0:39.95 | chair.creak (-5) | onset | Дженсен откидывается на спинку | foley |
| c0085 | 17 | 1211 | 0:40.37 | snap | apex | рывок на «idea» | camera |
| c0086 | 18 | 1236 | 0:41.19 | tape.reels (-8) | span 3.34 с | бобины | foley |
| c0087 | 18 | 1237 | 0:41.22 | whoosh.cut | apex | склейка #17→#18: смена места | transition |
| c0088 | 18 | 1239 | 0:41.30 | tablet.ping (-4) | onset | на планшет приходит снимок | foley |
| c0089 | 18 | 1267 | 0:42.23 | headphone (-4) | onset | агент 2 опускает наушники | foley |
| c0090 | 18 | 1270 | 0:42.34 | whoosh.whip | apex | вип-пан AGENT 2 → AGENT | camera |
| c0091 | 18 | 1302 | 0:43.39 | folder.close | onset | агент закрывает папку «SUBJECT: ALICE HUANG» | foley |
