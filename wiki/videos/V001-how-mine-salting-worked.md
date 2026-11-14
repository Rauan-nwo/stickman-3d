---
type: video
status: published
tags: [reference, shorts, western, storytime, 2d-in-3d]
created: 2026-11-14
updated: 2026-11-14
published: (нужно уточнить у Рауана)
url: (нужно уточнить у Рауана)
sources: [2026-11-14-how-mine-salting-worked-transcript.json]
---

# V001 — How Mine Salting Worked

Эталонный ролик канала. По нему снят стиль [[style-bible]], и с ним сравниваются все копии
(см. [[reproduction-pipeline]]).

## Зачем этот ролик
Эталон формата: исторический «как это работало» + бытовой анекдот с твистом в конце.
Гипотеза, которую проверял: (нужно уточнить у Рауана).

## Паспорт файла (измерено ffprobe)
| Параметр | Значение |
|---|---|
| Формат | 720×1280, 9:16 (YouTube Shorts) |
| FPS | 30 |
| Длительность | 61.15 с |
| Видео | H.264, ~2.0 Мбит/с |
| Аудио | AAC 44.1 кГц стерео, 128 кбит/с |
| Громкость | −14.0 LUFS integrated, LRA 2.7 LU, пик −1.7 dBFS |

## Сценарий (транскрипт, whisper small)
231 слово за 61 с = **~228 слов/мин** — очень быстрая подача, пауз между фразами 0.1–0.3 с.

> He loaded the shotgun with gold and fired it into the walls of the mine. His buddy just watches
> the gold vanish into the rock. *"So we're shooting gold into a gold mine?"* You see, it's called
> salting. He's dug this mine for 10 years and found nothing but rock. And tomorrow, a rich guy is
> coming to buy it. So he spent his last hundred bucks on gold dust instead. Next morning, the rich
> guy rolls up in a white suit and bangs his head on the first beam. But he's brought an expert, and
> the expert isn't stupid. He smashes a chunk of wall, swirls it in a pan, and gold flakes spin to
> the bottom. But under his magnifying glass, every flake is flat. Somebody shot this gold into the
> wall, but the rich guy just laughs. *"Why would anyone shoot gold into a wall? That's insane."*
> And his buddy nods. *"Completely insane."* So the rich guy pays up, and while those two bolt with
> the money, he stays behind and pulls a stick of dynamite out of his suit. He's never mined a day
> in his life. So he just lights it, tosses it down the tunnel like a firecracker, and runs. And
> when the dust clears, there's a vein of real gold as thick as your arm. 10 feet past where the
> last guy gave up.

### Драматургия
| Блок | Время | Функция |
|---|---|---|
| Хук-действие | 0–3.5 с | Странное действие без объяснения: стреляет золотом в стену |
| Вопрос зрителя вслух | 3.7–8.9 | Напарник озвучивает вопрос зрителя («стреляем золотом в золотую шахту?») |
| Термин + контекст | 9.1–18.6 | «Это называется salting» → 10 лет пусто → завтра богач → последние $100 |
| Конфликт | 18.9–33.3 | Богач + эксперт; эксперт разоблачает (плоские чешуйки) |
| Разворот-шутка | 33.6–42.7 | Богач смеётся над идеей «кто стреляет золотом в стену» — повтор хука |
| Твист | 43.1–54.7 | Мошенники сбегают; богач-дилетант взрывает динамит |
| Панчлайн | 54.7–60.9 | Настоящая жила в 10 футах от места, где сдался прошлый — ирония, финальная надпись «10 FT» |

## Монтаж и динамика (измерено)
- Жёсткие склейки (ffmpeg scene > 0.25): 20 шотов, средний **3.06 с**, медиана **2.15 с**.
- С чувствительным порогом (0.07): 25 склеек. `breakdown.py` (huashu) по межкадровой разнице: **53 смены
  картинки, в среднем каждые 1.15 с**. Ритм не привязан к биту музыки (BPM-сетка не сходится).
  Визуально по контактным листам:
  длинные «шоты» 5–7 с внутри содержат смену крупности и движения камеры (мультишот одной генерации).
- Хук 0–3.5 с: **6 планов** — общий в луче света → средний → ECU заряжания самородка → подмигивание
  → выстрел → трекинг за летящим самородком мимо напарника в стену.
- Каждое существительное из текста **показано в кадре в момент произнесения** (shotgun, gold,
  newspaper «MILLIONAIRE DUE TO MORROW», $100 → блюдце с золотом, белый автомобиль, бочка-пан,
  лупа, динамит, жила). Это главный принцип монтажа: картинка = буквальная иллюстрация слова.

### Шотлист (жёсткие склейки + текст)
| # | Таймкод | Длит. | Текст | Кадр |
|---|---|---|---|---|
| 01 | 0.00–2.00 | 2.00 | He loaded the shotgun with gold and fired | Шахтёр в луче света → ECU ружья, самородок в стволе → подмигивание |
| 02 | 2.00–7.90 | 5.90 | …into the walls of the mine. His buddy just watches… | Выстрел, трекинг самородка, удар в стену с пылью; напарник на ящике |
| 03 | 7.90–9.23 | 1.33 | a gold mine? You see, | Напарник крупнее, рот «O», возмущение |
| 04 | 9.23–10.73 | 1.50 | it's called salting. | Шахтёр на рельсах, низкий ракурс, уверенный |
| 05 | 10.73–16.13 | 5.40 | dug this mine for 10 years… rich guy… | Экстерьер шахты, вагонетка «NELLIE» → городок, газета «MILLIONAIRE DUE TO MORROW» |
| 06 | 16.13–21.50 | 5.37 | last hundred bucks on gold dust… rolls up | Лавка, банкнота 100 → блюдце золота; белый автомобиль пылит по дороге |
| 07 | 21.50–24.57 | 3.07 | bangs his head… brought an expert | Вывеска «SURE THING MINE», богач бьётся о балку, все у входа |
| 08 | 24.57–27.50 | 2.93 | expert isn't stupid. smashes a chunk | Эксперт в котелке и очках, кирка, откол стены |
| 09 | 27.50–28.90 | 1.40 | swirls it in a pan | Бочка с водой, промывка |
| 10 | 28.90–31.03 | 2.13 | flakes spin to the bottom | Макро: лоток, золото оседает |
| 11 | 31.03–34.00 | 2.97 | magnifying glass, every flake is flat | Лупа → POV сквозь лупу, плоские чешуйки |
| 12 | 34.00–35.70 | 1.70 | Somebody shot this gold | Макро стены с золотом, эксперт объясняет |
| 13 | 35.70–43.20 | 7.50 | rich guy laughs… That's insane… Completely insane. | Богач хохочет, двое мошенников потеют, кивают |
| 14 | 43.20–45.37 | 2.17 | pays up, those two bolt | Пачки денег на ящике |
| 15 | 45.37–46.27 | 0.90 | with the money | Убегают из шахты с деньгами (динамичный ракурс) |
| 16 | 46.27–51.23 | 4.96 | pulls a stick of dynamite… never mined a day | Богач достаёт динамит из пиджака, наезд до крупного |
| 17 | 51.23–53.20 | 1.97 | lights it, tosses it | Фитиль искрит, бросок по тоннелю |
| 18 | 53.20–53.80 | 0.60 | a firecracker | Динамит на земле, искры |
| 19 | 53.80–54.77 | 0.97 | and runs | Убегает, взрыв |
| 20 | 54.77–61.15 | 6.38 | when the dust clears… 10 feet past… | Пыль рассеивается → жила золота, богач рядом, рулетка на полу, надпись «10 FT ↑» |

## Производство
Файлы: `production/V001/` (пока нет). Инструменты: (нужно уточнить у Рауана). Рабочая гипотеза
по визуалу — в [[style-bible]] и [[reproduction-pipeline]].

## Метрики
| | 48 ч | 7 дней |
|---|---|---|
| Просмотры | (нужно уточнить у Рауана) | |
| CTR превью | | |
| Среднее удержание | | |
| % досмотра | | |
| Подписки | | |

## Вывод
Ролик — эталон формата. Ключевые приёмы вынесены в [[style-bible]].

## Sources
- `raw/research/2026-11-14-how-mine-salting-worked-transcript.json` — транскрипт whisper со словными таймкодами
- Видео: `C:\Users\velar\Downloads\How Mine Salting Worked.mp4` (в git не кладём)
