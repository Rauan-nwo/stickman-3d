---
type: strategy
status: in-progress
tags: [seo, keywords, metadata, channel]
created: 2026-11-15
updated: 2026-11-15
sources: [2026-11-15-channel-shorts.tsv, 2026-11-15-channel-top18-meta.tsv]
---

# SEO канала: описание, ключевые слова, правила для роликов

Канал [[channel]], формула — [[channel-formula]]. Частоту запросов не проверяли: подбор по смыслу ниши и
названиям лучших роликов. Проверить по вкладке «Поиск» в аналитике Studio (нужно уточнить у Рауана: выгрузка).

## Что было на 2026-11-15
Последние 8 роликов: теги пустые, описание = повтор названия, категория Entertainment.

## Описание канала (Studio → Настройка канала → Основные сведения)
```
Animated stories about weird history, clever tricks and the hidden engineering behind everyday things.

Why do railroads have gaps? How did an ancient jar detect earthquakes? Why do soldiers break step on bridges? Every short is a true mechanism wrapped in a story — told in about a minute.

New shorts every few days.
```

## Ключевые слова канала (Studio → Настройки → Канал → Ключевые слова)
```
weird history, history explained, how things worked, how things work, engineering explained, physics explained, clever inventions, ancient inventions, forgotten history, history facts, science facts, animated history, animated stories, stickman animation, scams explained, loopholes, why it works, the real reason
```

## Правила для каждого ролика
1. **Описание**: первая фраза — факт и ответ на название с главными словами; вторая — механизм простыми словами;
   третья — что в сюжете придумано (честность перед зрителем); в конце 3 хештега.
2. **Хештеги**: всегда `#history` и один из `#engineering` / `#physics` / `#psychology` / `#science`, третий — по теме.
3. **Теги**: 15–20 штук — тема ролика и синонимы, имена и места из факт-чека, 3–4 общих слова ниши.
4. **Категория**: Education для роликов с механизмом — проверить на 3–5 роликах против Entertainment.
5. Готовые данные загрузки ролика лежат в `production/V<NNN>/upload.md`.

## Sources
- `raw/analytics/2026-11-15-channel-shorts.tsv`
- `raw/analytics/2026-11-15-channel-top18-meta.tsv`
