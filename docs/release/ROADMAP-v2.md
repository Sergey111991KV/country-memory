# Flagfield v2 — план упрощения, нового Home и Liquid Glass

**Контекст:** отказ Apple (11.06.2026, v1.0 build 6) + запрос упростить продукт.

---

## Почему Apple отклонил (не «сложность кода», а конфигурация)

| Проблема | Причина в проекте | Срочное действие |
|----------|-------------------|------------------|
| IAP не отправлен на review | Подписка `flagfield_premium_monthly` не привязана к версии 1.0 в Connect | Subscriptions → Submit with App → скриншот paywall |
| Tap Subscribe → Premium без StoreKit | **`devMockBilling: true`** в `environment.prod.local.ts` попал в store build | `devMockBilling: false`, `billingDebugEnabled: false` → новый binary |
| Paid Apps Agreement | Возможно не принят | App Store Connect → **Business** → Agreements |

**Вывод:** приложение можно пропустить в review за 1–2 дня без полного редизайна. Редизайн — отдельный релиз **v1.1 / v2.0**.

---

## Цели v2

1. **Проще** — одна главная идея на экран, меньше дублирования прогресса.
2. **Надёжнее** — billing только через StoreKit в production, меньше состояний на Play hub.
3. **Современнее** — Liquid Glass (стекло, blur, глубина) в духе Apple HIG 2025–2026.
4. **Легче** — урезать бандл (ionicons, дубли UI-логики).

---

## Новая информационная архитектура (вкладки)

### Было (v1)

```
Play (hero + daily goal + premium + carousel dock)  ← default
Knowledge (summary stats + collections + countries)
Progress (stats + path + recent)
Settings
```

Проблема: прогресс/рейтинг/цели на **трёх** экранах (Play, Knowledge, Progress).

### Станет (v2)

```
Home     — лента «страна дня»: флаг, факт, capital, CTA «Играть»
Play     — только выбор режима (упрощённый launcher)
Progress — ВСЁ про прогресс: daily goal, streak, record, path, recent, knowledge stats
Knowledge — справочник стран (без summary-блоков статистики)
Settings
```

| Вкладка | Иконка (draft) | Маршрут |
|---------|----------------|---------|
| Home | `sparkles-outline` / `flag-outline` | `/tabs/home` |
| Play | `game-controller-outline` | `/tabs/play` |
| Progress | `stats-chart-outline` | `/tabs/progress` |
| Knowledge | `library-outline` | `/tabs/knowledge` |
| Settings | `settings-outline` | `/tabs/settings` |

**5 вкладок** — если тесно на iPhone, вариант B: объединить Knowledge в Home (карточка → деталь страны) и оставить **4 вкладки**.

**Default tab:** `home` (не `play`).

---

## Фаза 0 — Разблокировать Apple (1–2 дня, без редизайна)

### 0.1 Production billing

```typescript
// environment.prod.local.ts — ПЕРЕД archive
devMockBilling: false,
billingDebugEnabled: false,
```

```typescript
// subscription.service.ts — guard (рекомендуется)
canSimulateBilling(): boolean {
  if (environment.production) {
    return false; // никогда mock в production
  }
  // ... остальное только dev
}
```

### 0.2 App Store Connect

1. **Subscriptions** → `flagfield_premium_monthly`:
   - Status **Ready to Submit**
   - Localization, price, review screenshot (paywall)
   - **Submit for Review** вместе с новым build
2. Новый build **1.0 (7)** с `devMockBilling: false`
3. Sandbox test: tap Subscribe → **системный sheet Apple**, не мгновенный Premium
4. Reply в Resolution Center: исправлено, IAP attached

### 0.3 Критерий готовности

- [ ] Sandbox purchase → sheet → Premium после подтверждения
- [ ] Restore purchases работает
- [ ] Без Premium — paywall, Globe/Map locked

---

## Фаза 1 — Убрать прогресс с Play и Knowledge (3–5 дней)

### 1.1 Play hub — упростить

**Удалить с `play.page.html`:**
- секция `play-daily` (daily goal bar)
- `play-premium-row` / limit card (перенести в Settings или тонкий badge)
- hero с длинным текстом (оставить короткий заголовок или убрать)

**Оставить:**
- `play-mode-dock` (карусель режимов) — ядро Play
- опционально: одна строка «Сегодня: N/5» → ссылка на Progress tab

**Файлы:**
- `src/app/play/play.page.{html,scss,ts}` — вырезать daily/premium UI
- `play.page.ts` — убрать `DailyGoalService`, `SessionAccessService` из refresh если не нужны на hub

### 1.2 Knowledge — убрать summary stats

**Удалить блоки:**
- `knowledge-summary-*` (engaged, marks known, partial)
- дубли streak/record если есть

**Оставить:** collections, search, country list, mark learned.

**Файлы:**
- `knowledge-base.page.{html,ts}`

### 1.3 Progress — единый центр метрик

**Перенести / объединить:**
| Блок | Откуда | Куда |
|------|--------|------|
| Daily goal bar | Play | Progress (верх) |
| Free games left | Play | Progress или Settings |
| Streak / record | Knowledge summary | Progress (уже частично есть) |
| Knowledge marks stats | Knowledge | Progress section |
| Learning path dots | Progress | Progress (оставить) |
| Recent sessions | Progress | Progress (оставить) |

**Новая структура Progress:**
1. Daily goal (крупная карточка)
2. Activity (correct today, streak, record)
3. Knowledge overview (facts known, by category)
4. Learning path
5. Recent games

**Файлы:**
- `progress.page.{html,scss,ts}`
- i18n keys: `progress.*` расширить

### 1.4 Навигация

- `tabs-routing.module.ts`: `redirectTo: 'home'`
- `app-routing.module.ts`: `home` → `tabs/home`
- Новый lazy module `home/` (или реанимировать существующий `home.page`)

---

## Фаза 2 — Новый Home (лента стран) (5–7 дней)

### 2.1 Концепт экрана

Вертикальный feed с **ротацией контента** каждые N секунд (или swipe):

```
┌─────────────────────────┐
│  [glass card]           │
│     🇧🇷  Brazil          │
│     Capital: Brasília     │
│     Fact: …               │
│  [ Play this country ]  │
└─────────────────────────┘
│  следующая карточка…    │
```

**Типы карточек (rotation):**
- `flag_highlight` — большой флаг + название
- `fact` — один факт из `country-knowledge.json`
- `capital_quiz_teaser` — «Знаешь столицу?»
- `region_spotlight` — континент / коллекция

### 2.2 Сервис `HomeFeedService`

```typescript
// src/app/core/services/home-feed.service.ts
interface HomeFeedCard {
  id: string;
  kind: 'flag' | 'fact' | 'capital' | 'collection';
  iso: string;
  titleKey?: string;
  body: string;
  imageUrl?: string;
  cta: { labelKey: string; route: string[] };
}
```

- Источник: `country-knowledge.json`, `countries.json`, `PlayPoolService`
- Ротация: `setInterval` 8–12 s + pause on interaction
- Кэш: 20 карточек в памяти, shuffle без повторов подряд
- `OnPush` + `trackBy`

### 2.3 Компоненты

| Компонент | Назначение |
|-----------|------------|
| `home.page` | shell, ion-content |
| `home-feed-card` | одна glass-карточка |
| `home-feed-rotator` | анимация смены (CSS / `@angular/animations`) |

### 2.4 CTA с Home

- «Играть» → `/tabs/play/challenge/flag_pick_country` с pool из одной страны или random free pool
- Tap на карточку → Knowledge detail или modal country sheet

---

## Фаза 3 — Liquid Glass design system (7–10 дней)

### 3.1 Ограничение платформы

Flagfield = **Ionic + WebView**, не нативный SwiftUI. «Liquid Glass» = **CSS approximation**:
- `backdrop-filter: blur()` + полупрозрачные слои
- тонкие border `rgba(255,255,255,0.2)`
- мягкие тени, depth через z-index
- `@supports (backdrop-filter: blur(1px))` fallback для старых WebView

### 3.2 Токены (`src/theme/glass.scss`)

```scss
:root {
  --glass-bg: rgba(255, 255, 255, 0.12);
  --glass-bg-elevated: rgba(255, 255, 255, 0.18);
  --glass-border: rgba(255, 255, 255, 0.25);
  --glass-blur: 24px;
  --glass-radius: 20px;
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg: rgba(30, 40, 60, 0.45);
    --glass-border: rgba(255, 255, 255, 0.12);
  }
}

.glass-surface {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow);
}
```

### 3.3 Где применить (порядок)

1. **Tab bar** — translucent blur (Ionic `--background` + glass)
2. **Home feed cards** — главный визуальный якорь
3. **Play mode dock** — стеклянные карточки режимов
4. **Paywall** — один hero glass panel
5. **Settings lists** — grouped glass sections
6. **Challenge / Globe** — минимально (performance: blur дорогой на canvas)

### 3.4 Типографика и цвет

- Убрать/смягчить «Bangers» display на основных экранах → **SF Pro-like stack**: `-apple-system, system-ui`
- Primary: спокойный синий/бирюза (уже есть `--ion-color-primary`)
- Меньше градиентов, больше воздуха (spacing 16/24/32)

### 3.5 Ionic config

```scss
// global.scss
ion-tab-bar {
  --background: transparent;
  backdrop-filter: blur(20px);
}
ion-content {
  --background: var(--app-mesh-bg); // subtle mesh gradient
}
```

### 3.6 Accessibility

- Glass: контраст текста **WCAG AA** (не белый 60% на светлом blur)
- `prefers-reduced-transparency` → solid fallback
- `prefers-reduced-motion` → без parallax на Home rotator

---

## Фаза 4 — Надёжность и «похудение» (параллельно, 5 дней)

### 4.1 Billing

- `canSimulateBilling()` → **false** если `production`
- Удалить test hint с paywall в production builds
- Единый `BillingFacade` — один вход для purchase/restore/status

### 4.2 Бандл

| Действие | Экономия |
|----------|----------|
| ionicons: только используемые SVG в `angular.json` | ~4–5 MB |
| GeoJSON simplify (optional CDN для v2.1) | ~1–2 MB |
| Удалить неиспользуемые video backgrounds | ~1 MB |

### 4.3 Упрощение Play

- Рассмотреть замену сложного `play-mode-dock` wheel на **простой grid 2×2** категорий (меньше багов swipe на iPad — Apple тестировала на iPad!)
- iPad layout: двухколоночный Play hub

### 4.4 Тесты

- E2E: paywall → sandbox purchase mock
- Unit: `canSimulateBilling` never true in prod
- Manual matrix: iPhone + **iPad** (review device class)

---

## Фаза 5 — Релизы

| Версия | Содержание | Срок |
|--------|------------|------|
| **1.0.1** | Только fix billing + IAP submit | 2–3 дня |
| **1.1** | Фаза 1 (progress consolidation) + glass tab bar | 2 недели |
| **2.0** | Home feed + full glass + упрощённый Play | 4–6 недель |

---

## Структура файлов (новое / меняется)

```
src/app/
  home/                    # NEW primary tab
    home.page.*
    components/
      home-feed-card/
      home-feed-rotator/
  play/                    # SLIM — dock only
  progress/                # EXPAND — all metrics
  knowledge-base/          # SLIM — no stats header
  theme/
    glass.scss             # NEW design tokens
    mesh-background.scss
src/app/core/services/
  home-feed.service.ts     # NEW
```

---

## Риски

| Риск | Митигация |
|------|-----------|
| Blur тормозит на старых Android | fallback solid cards |
| 5 tabs перегружают bar | вариант 4 tabs без отдельного Knowledge |
| Большой рефакторинг ломает review | сначала 1.0.1 hotfix, редизайн отдельно |
| Home feed «пустой» без сети | флаги из cache + offline facts из JSON |

---

## Чеклист «с чего начать завтра»

1. [ ] `devMockBilling: false` + guard в `subscription.service.ts`
2. [ ] Archive build 7, IAP submit with app
3. [ ] Sandbox purchase test on iPad
4. [ ] Создать ветку `feature/v2-home-glass`
5. [ ] Фаза 1: вырезать daily goal с Play (PR #1)
6. [ ] `theme/glass.scss` + tab bar (PR #2)
7. [ ] `HomeFeedService` + home tab (PR #3)

---

## Ответ Apple (шаблон Resolution Center)

```
We fixed the subscription flow in build 7:
- Removed internal test billing bypass in production builds.
- Subscribe Monthly now opens the standard App Store purchase sheet.
- The flagfield_premium_monthly subscription is submitted for review with this build.

We tested on iPad (sandbox): purchase sheet appears and premium activates only after confirmation.
```
