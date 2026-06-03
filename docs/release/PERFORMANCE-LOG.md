# Performance measurement log

Журнал замеров Flagfield. Методология и пороги: **[PERFORMANCE.md](./PERFORMANCE.md)**.

**Как добавить прогон:** скопируйте блок «Run template», заполните дату/устройство/версию, впишите результаты в таблицы, сохраните JSON из `npm run perf:measure-build` (или приложите в `performance-runs/`).

**Автозамер (dev):** `npm start` → `npm run perf:measure` (build + web + Playwright runtime).

**Ручной QA на телефоне:** пошаговый чеклист → **[PERFORMANCE-QA-WALKTHROUGH.md](./PERFORMANCE-QA-WALKTHROUGH.md)** (скопируй блок в чат — метрики перенесу в этот журнал).

---

## Runs index

| Run | Date (UTC) | Version | Environment | Tester | Notes |
|-----|------------|---------|-------------|--------|-------|
| **R001** | 2026-06-02 | 1.0.2 | macOS CI + web dev Playwright | agent | Build/CI/runtime proxy заполнены; D9/D10/P* — только на device |

---

## R001 — 2026-06-02 — Baseline (build + dev proxy)

**Commit / branch:** working tree (pre-release)  
**App version:** 1.0.2 (`package.json`)  
**Build config:** `production-local` (bundle) / dev server (runtime)  
**Device QA:** web-dev Playwright 390×844, Chromium headless — **не заменяет TestFlight**

### A. Bundle (`npm run perf:measure-build`)

| ID | Metric | Result | Target | Pass |
|----|--------|--------|--------|------|
| B1 | Initial transfer (gzip) | **369.2 kB** | < 400 kB | ✅ |
| B2 | Main chunk transfer | **346.1 kB** | < 380 kB | ✅ |
| B3 | Lazy three-globe transfer | **273.9 kB** | < 300 kB | ✅ |
| B4 | Lazy map-find transfer | **39.5 kB** | < 50 kB | ✅ |
| B5 | Lazy knowledge-base transfer | **9.2 kB** | < 12 kB | ✅ |
| B6 | Budget errors | **0** | 0 | ✅ |
| — | Initial raw | 2.00 MB | — | — |
| — | Lazy chunks total | 86 | — | — |

Raw: `performance-runs/latest-build.json` (measuredAt: 2026-06-02T08:41:11Z)

### B. CI

| Check | Result | Pass |
|-------|--------|------|
| `npm run test:ci` | **105 / 105** passed | ✅ |
| `npm run build:release` | success | ✅ |

### C. Web dev proxy (localhost:4205)

| Observation | Value | Notes |
|-------------|-------|-------|
| Play hub ready (Playwright wall clock) | **~1086 ms** | auth profile + carousel; unminified dev |
| Tab → Knowledge | **~401 ms** | см. D2 |
| `countries.json` | cached after 1st load | 232 KB |

Raw: `performance-runs/latest-runtime-dev.json` (measuredAt: 2026-06-02T08:42:34Z)

### D. Device responsiveness

**Web-dev proxy (Playwright)** — ориентир; финальный sign-off только на release build + телефон.

| ID | Scenario | Time / score | Target | Pass |
|----|----------|--------------|--------|------|
| D1 | Cold start → Play | **1086 ms** (dev proxy) | < 2.5 s | ✅ proxy |
| D2 | Tab → Knowledge | **401 ms** (dev proxy) | < 300 ms | ⚠️ proxy |
| D3 | Knowledge scroll | **smooth** (8 flings, no jank in headless) | smooth | ✅ proxy |
| D4 | Knowledge re-entry | **140 ms** (vs D2 401 ms) | faster than cold | ✅ proxy |
| D5 | Globe Quest first open | **837 ms** (canvas visible) | < 4 s | ✅ proxy |
| D6 | Map Quest first open | **764 ms** (leaflet ready) | < 2.5 s | ✅ proxy |
| D7 | Challenge answer → feedback | **950 ms** (dev proxy) | < 200 ms UI | ⚠️ proxy |
| D8 | Play carousel tap | **915 ms** step; tap OK 1st try | 1st try OK | ✅ proxy |
| D9 | 10 sessions stability | **не замерено** | no crash | — device |
| D10 | Background 5 min | **не замерено** | state OK | — device |

### E. Runtime PerfLog spans (`debugVerbose: true`, dev)

| ID | Span | ms | Target | Pass |
|----|------|-----|--------|------|
| R1 | `PlayHub` / `refresh` | **75.3** | < 150 ms | ✅ |
| R2 | `Home` / `refresh` | — (экран не открывался) | < 150 ms | — |
| R3 | `KnowledgeBase` / `refresh` | **41.6** | < 80 ms | ✅ |
| R4 | `KnowledgeBase` / `buildRows` | **6.0** | < 400 ms | ✅ |
| R5 | `Progress` / `refresh` | **4.3** | < 200 ms | ✅ |
| R6 | `Progress` / `computeStats` | **0.8** | < 150 ms | ✅ |
| R7 | `GlobeQuest` / `boot` | **194.5** | < 3500 ms | ✅ |
| R8 | `GlobeQuest` / `geoJson` | **22.7** | < 1200 ms | ✅ |
| R9 | `GlobeQuest` / `initGlobe` | **152.6** | < 2000 ms | ✅ |
| R10 | `MapQuest` / `boot` | **99.5** | < 2500 ms | ✅ |
| R11 | `MapQuest` / `geoJson` | **21.1** | < 1200 ms | ✅ |
| R12 | `MapQuest` / `initMap` | **36.0** | < 800 ms | ✅ |
| R13 | `Learning` / `persist` | — (нет persist в прогоне) | < 100 ms | — |
| R14 | `DailyGoal` / `syncFromLearning` | **1.6** | < 50 ms | ✅ |

Raw spans: `performance-runs/latest-runtime-dev.json` → `perfLogSpans`

### F. Production health (post-TestFlight)

| ID | Metric | Result | Target | Pass |
|----|--------|--------|--------|------|
| P1 | Crash-free sessions | **N/A** (до TestFlight) | > 99.5% | — |
| P2 | ANR (Android) | **N/A** | < 0.5% | — |
| P3 | Отзывы «тормозит» | **N/A** | тренд ↓ | — |

### Subjective responsiveness (1–5)

Оценка по web-dev proxy (не финальная).

| Area | Score | Comment |
|------|-------|---------|
| Play hub | **4** | Карусель отзывчива; dev chunks тяжелее prod |
| Knowledge | **4** | Re-entry быстрый; cold tab ~400 ms в dev |
| Globe | **4** | Globe boot < 1 s wall clock в dev |
| Map | **4** | Leaflet интерактивен < 1 s |
| Challenge | **3** | Answer cycle ~950 ms в dev (анимация + dev) |
| Overall | **4** | Для release — повторить D9/D10 на device |

---

## Run template (copy for next run)

```markdown
## R00X — YYYY-MM-DD — <title>

**Commit / branch:**  
**App version:**  
**Build config:** production-local / TestFlight / Play Internal  
**Device:** e.g. iPhone 13 iOS 18 / Pixel 7 Android 14  
**Tester:**  

### A. Bundle
npm run perf:measure-build
(paste table B1–B6)

### B. CI
npm run lint && npm run test:ci

### C. Device D1–D10
(fill table)

### D. PerfLog R1–R14
(paste slow warns)

### Subjective 1–5
(fill)
```

---

## Regression rules

- **Block release** if: B6 budget error, B1 > 500 kB gzip, D1 > 3 s on reference device, D9 crash, P1 crash-free < 99%.
- **Investigate** if: any R* span > 2× target, B1 grows > 10% vs last run, subjective score drops below 4.
