# Flagfield — метрики производительности и отзывчивости

Документ описывает **какие метрики важны**, **как их замерять** и **какие пороги считать нормой** перед TestFlight / App Store / Play Store.

Журнал фактических замеров: **[PERFORMANCE-LOG.md](./PERFORMANCE-LOG.md)**.

---

## 1. Что для нас главное

Flagfield — **мобильное приложение (Capacitor + Angular)**. Приоритет:

1. **Отзывчивость** — tap/swipe не «залипают», UI реагирует сразу.
2. **Время до готовности экрана** — Play, Knowledge, Globe, Map открываются без долгих пауз.
3. **Плавность** — скролл списка стран, карусель режимов, globe/map без фризов.
4. **Стабильность** — нет крашей и OOM после серии сессий.

Core Web Vitals (LCP, INP, CLS) **не являются основным KPI** — приложение работает в WebView. Их можно смотреть только как дополнительный proxy в браузере.

---

## 2. Категории метрик

### A. Размер бандла (автоматически, каждый релиз)

| ID | Метрика | Цель | Критично если |
|----|---------|------|----------------|
| B1 | Initial transfer (gzip) | **< 400 kB** | > 500 kB |
| B2 | Main chunk transfer | **< 380 kB** | > 450 kB |
| B3 | Lazy `three-globe` transfer | **< 300 kB** | > 400 kB |
| B4 | Lazy `map-find` transfer | **< 50 kB** | > 80 kB |
| B5 | Lazy `knowledge-base` transfer | **< 12 kB** | > 20 kB |
| B6 | Angular budget errors | **0** | любой error |

**Команда:** `npm run perf:measure-build`  
**Артефакт:** `docs/release/performance-runs/latest-build.json`

### B. Время операций в приложении (instrumentation)

В коде есть `PerfLogService` — span-логи с порогами:

| Порог | Поведение |
|-------|-----------|
| ≥ **120 ms** | `console.warn` в dev |
| ≥ **200 ms** | запись в app log ring buffer |
| ≥ **500 ms** | уровень `warn` в app log |

**Ключевые span'ы** (смотреть в Xcode / Android Studio с `debugVerbose: true`):

| ID | Scope | Label | Цель |
|----|-------|-------|------|
| R1 | `PlayHub` | `refresh` | < 150 ms |
| R2 | `Home` | `refresh` | < 150 ms |
| R3 | `KnowledgeBase` | `refresh` (cached) | < 80 ms |
| R4 | `KnowledgeBase` | `buildRows` (cold) | < 400 ms |
| R5 | `Progress` | `refresh` | < 200 ms |
| R6 | `Progress` | `computeStats` | < 150 ms |
| R7 | `GlobeQuest` | `boot` | < 3500 ms |
| R8 | `GlobeQuest` | `geoJson` | < 1200 ms |
| R9 | `GlobeQuest` | `initGlobe` | < 2000 ms |
| R10 | `MapQuest` | `boot` | < 2500 ms |
| R11 | `MapQuest` | `geoJson` | < 1200 ms |
| R12 | `MapQuest` | `initMap` | < 800 ms |
| R13 | `Learning` | `persist` | < 100 ms (debounced) |
| R14 | `DailyGoal` | `syncFromLearning` | < 50 ms |

### C. Отзывчивость на устройстве (ручной QA, обязательно перед релизом)

Замерять **на реальном телефоне** (mid-range iPhone + mid-range Android), **release build** (TestFlight / internal APK).

| ID | Сценарий | Как мерить | Цель |
|----|----------|------------|------|
| D1 | **Cold start → Play tab** | секундомер от tap иконки до карусели | **< 2.5 s** |
| D2 | **Tab Play → Knowledge** | tap → список стран интерактивен | **< 300 ms** |
| D3 | **Knowledge scroll** | быстрый fling 250 стран | без белых экранов / фризов |
| D4 | **Knowledge повторный вход** | выйти и вернуться | заметно быстрее cold (кэш) |
| D5 | **Globe Quest первый вход** | tap режима → можно крутить globe | **< 4 s** |
| D6 | **Map Quest первый вход** | tap → карта кликабельна | **< 2.5 s** |
| D7 | **Challenge: раунд → ответ → следующий** | полный цикл | **< 200 ms** на UI feedback |
| D8 | **Play carousel** | tap бокового слайда + swipe | срабатывает с 1-го раза |
| D9 | **10 сессий подряд** | любой режим | без краша, без «туманнения» UI |
| D10 | **Background 5 min → foreground** | вернуться в игру | состояние сохранено |

Субъективная шкала отзывчивости (записывать в лог):

- **5** — мгновенно  
- **4** — комfortно  
- **3** — заметная пауза  
- **2** — раздражает  
- **1** — блокирует использование  

### D. Production health (после TestFlight)

| ID | Метрика | Цель |
|----|---------|------|
| P1 | Crash-free sessions | **> 99.5%** |
| P2 | ANR (Android) | **< 0.5%** |
| P3 | Отзывы «тормозит / лагает» | мониторинг, тренд ↓ |

---

## 3. Как проводить замер

### Автоматически (CI / перед каждым релизом)

```bash
npm run lint
npm run test:ci
npm run perf:measure-build
```

Опционально (dev server должен быть запущен):

```bash
npm start   # в другом терминале
npm run perf:measure-web
```

### На устройстве (release)

1. Собрать TestFlight / internal APK (`npm run cap:sync:release`).
2. В `environment.prod.local.ts` для QA-сборки можно включить `debugVerbose: true`.
3. Подключить телефон к Xcode / Android Studio → Console.
4. Пройти сценарии **D1–D10**, записать время и субъективную оценку.
5. Скопировать slow `[Flagfield Perf]` warn (>120 ms) из консоли.
6. Внести строку в **[PERFORMANCE-LOG.md](./PERFORMANCE-LOG.md)**.

Пошаговый чеклист для телефона (куда тапать, что засекать, блок для копирования в чат): **[PERFORMANCE-QA-WALKTHROUGH.md](./PERFORMANCE-QA-WALKTHROUGH.md)**.

### Шаблон строки для лога

См. таблицу в `PERFORMANCE-LOG.md` — одна строка = один прогон.

---

## 4. Что уже оптимизировано (baseline архитектуры)

- `GeoJsonCacheService` — GeoJSON один раз на сессию
- Knowledge Base — кэш строк + `OnPush` + `trackBy`
- User learning — debounce persist 400 ms + derived caches
- Globe — lazy `three-globe`, render on demand, capped pixel ratio
- Play hub — `OnPush`, throttled carousel updates
- Feature modules — lazy routes (globe, map, challenge, …)

---

## 5. Известные риски / backlog

| Риск | Статус |
|------|--------|
| `knowledge-base.page.scss` > 14 kB budget warning | наблюдать |
| Main chunk ~346 kB gzip — тяжёлый старт WebView | OK, но не расти |
| `three-globe` ~274 kB gzip при первом Globe Quest | ожидаемо, lazy |
| CommonJS (`leaflet`, `three-globe`) — bailout tree-shaking | низкий приоритет |
| Perf logs выключены в production | включать sample при необходимости |

---

## 6. Связанные файлы

| Файл | Назначение |
|------|------------|
| [PERFORMANCE-LOG.md](./PERFORMANCE-LOG.md) | Журнал прогонов |
| `scripts/measure-build-perf.mjs` | Замер бандла |
| `scripts/measure-web-perf.mjs` | Proxy-замер dev-сервера |
| `docs/release/performance-runs/*.json` | Последние machine-readable результаты |
| `src/app/core/services/perf-log.service.ts` | Runtime spans |
