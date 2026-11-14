# CLAUDE.md — схема работы с этим репо

LLM-wiki под развитие YouTube-канала и производство видео. Паттерн —
[Karpathy "LLM Wiki"](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):
сырые источники → wiki, которую ведёт LLM → ответы и решения по каналу.

## Роль Claude Code

Ты — maintainer этой wiki и продюсер канала. Рауан приносит источники (выгрузки
YouTube Studio, ролики-доноры, идеи, ресёрч) и задаёт вопросы. Ты делаешь ingest,
query, lint, ведёшь карточки роликов от идеи до разбора и держишь связность страниц.

## Язык

Содержимое страниц — **по-русски**. Front-matter `tags` и machine-readable поля
(`type`, `status`, даты, имена файлов) — по-английски.

## Архитектура

- `raw/` — **immutable** источники. Только читаешь, никогда не правишь.
  - `raw/analytics/` — выгрузки YouTube Studio (CSV/XLSX, скриншоты).
  - `raw/donors/` — транскрипты, разборы и ссылки на чужие ролики.
  - `raw/research/` — ресёрч ниш, трендов, алгоритма, brain-dump.
  - `raw/_secrets/` — токены и ключи API. В `.gitignore`.
- `wiki/` — твоя зона:
  - `wiki/channel/` — канал: позиционирование, аудитория, оформление, стратегия, контент-план.
  - `wiki/videos/` — карточка на каждый ролик (от идеи до разбора после публикации).
  - `wiki/ideas/` — банк идей и гипотезы роста.
  - `wiki/donors/` — каналы и ролики-доноры, их приёмы.
  - `wiki/craft/` — ремесло: хуки, удержание, сценарии, монтаж, превью, промпты ИИ-генерации, звук.
  - `wiki/analytics/` — метрики канала, недельные и месячные отчёты.
  - `wiki/analyses/` — синтез: выводы через несколько роликов и источников.
- `production/V<NNN>/` — рабочие файлы ролика (сценарий, шотлист, промпты).
  Тяжёлые медиа (видео, аудио, рендеры) в git не кладём — см. `.gitignore`.
- `templates/` — шаблоны страниц (`video.md`, `donor.md`, `hypothesis.md`).
- `index.md` — каталог wiki. Обновляй при каждом ингесте.
- `log.md` — append-only хронология. Дописывай при каждой операции.

## Конвенции страниц

Каждая страница начинается с front-matter:

```yaml
---
type: video               # см. "Сущности и статусы"
status: idea
tags: [tag1, tag2]
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: [YYYY-MM-DD-slug.ext]
---
```

Ссылки — Obsidian-wikilinks `[[page-name]]`, не относительные пути.
Каждая страница заканчивается секцией `## Sources` со ссылками на файлы в `raw/`.

## Сущности и статусы

| type | папка | статусы |
|---|---|---|
| `channel` | channel/ | evergreen |
| `strategy` | channel/ | in-progress, evergreen |
| `video` | videos/ | idea → scripting → production → published → reviewed, killed |
| `idea` | ideas/ | backlog, picked, killed |
| `hypothesis` | ideas/ | backlog, testing, confirmed, rejected |
| `donor` | donors/ | evergreen |
| `technique` | craft/ | evergreen |
| `report` | analytics/ | evergreen |
| `analysis` | analyses/ | evergreen |

## Именование

- Ролики: `V<NNN>-<kebab-slug>.md` (пример: `V001-pervyy-rolik.md`). Номер фиксирован, не переиспользуется.
- Идеи: `I<NNN>-<kebab-slug>.md`.
- Гипотезы: `H<NN>-<kebab-slug>.md`.
- Доноры: slug канала (пример: `mrbeast`), ролик донора — `<channel>-<slug>.md`.
- Отчёты: `report-<YYYY>-w<iso-week>.md` или `report-<YYYY>-<MM>.md`.
- Источники в raw/: `<YYYY-MM-DD>-<slug>.<ext>`.

## log.md

Формат: `## [YYYY-MM-DD HH:MM] <op> | <summary>`, следующей строкой `touched: ...`.
Операции: `setup`, `ingest`, `query`, `lint`, `video`, `publish`, `review`.
Парсится через `grep "^## \[" log.md`.

## Workflows

### Ingest (источник → wiki)

1. Прочитай источник (`raw/` или brain-dump в чате).
2. Задай 2–3 уточняющих вопроса.
3. Напиши summary, получи подтверждение.
4. Создай/обнови страницы: доноры → `donors/`, приёмы → `craft/`, цифры → `analytics/`.
5. Обнови `index.md`, допиши `log.md`.

### Новый ролик (идея → публикация)

1. Возьми идею из `ideas/` или из чата → создай `wiki/videos/V<NNN>-slug.md` по `templates/video.md`.
2. Заполни: зачем ролик (какую гипотезу проверяет), хук первых 3 секунд, структура,
   2–3 варианта названия и превью.
3. Рабочие файлы — в `production/V<NNN>/`.
4. Двигай `status` по этапам, каждое движение — запись в `log.md`.

### Разбор после публикации (review)

Через 48 часов и через 7 дней после выхода:
1. Рауан кладёт выгрузку или скриншот Studio в `raw/analytics/`.
2. Внеси в карточку ролика: просмотры, CTR превью, среднее удержание, % досмотра, подписки.
3. Сделай вывод: что сработало, что нет → обнови связанные гипотезы и `craft/`.
4. Поставь `status: reviewed`.

### Query

Читай `index.md` → релевантные страницы → ответ с цитатами `[[page]]#section`.
Ценный синтез предложи зафайлить в `wiki/analyses/`.

### Lint (по команде «сделай линт»)

Проверь: противоречия, устаревшие claims, orphan pages, концепты без своей страницы
(упомянуты 3+ раз), ролики без разбора после публикации, гипотезы без проверки.
Правки — только после подтверждения Рауана.

## Чего никогда не делать

- Не меняй `raw/*`.
- Не придумывай данные и метрики. Если не знаешь — пиши «(нужно уточнить у Рауана)».
- Не ставь wikilink на несуществующую страницу — либо stub, либо запись в `wiki/_todo.md`.
- Не клади в git видео, аудио, рендеры и ключи API.
