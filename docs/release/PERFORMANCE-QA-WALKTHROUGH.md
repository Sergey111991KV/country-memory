# Flagfield — пошаговый QA производительности

Пройди сценарии **на телефоне** (TestFlight / internal APK, release build).  
Скопируй **блок в конце** в чат — я сам перенесу всё в [PERFORMANCE-LOG.md](./PERFORMANCE-LOG.md).

Метрики B1–B6 и CI я заполню автоматически — тебе нужен только **device QA**.

---

## Перед началом (один раз)

### 1. Сборка

- iOS: TestFlight **или** Xcode → Run на устройстве с `npm run cap:sync:release`
- Android: internal APK с release web assets

### 2. Включи логи PerfLog (опционально, но полезно)

В `src/environments/environment.prod.local.ts` для QA-сборки:

```ts
debugVerbose: true,
```

Пересобери и установи на телефон. В консоли появятся строки вида:

```text
[Flagfield Perf][PlayHub] refresh { ms: 55.7 }
```

### 3. Подключи консоль

| Платформа | Как |
|-----------|-----|
| **iPhone** | Mac → Xcode → Window → Devices and Simulators → Open Console, или Safari → Develop → [твоё устройство] |
| **Android** | Android Studio → Logcat, фильтр `chromium` или `Flagfield` |

### 4. Подготовь секундомер

Приложение «Секундомер» на телефоне — для D1, D5, D6, D7.

### 5. Аккаунт

- Залогинься (любое имя ≥ 2 символов)
- Для **Globe / Map** (D5, D6) нужен **Premium** — активная подписка или dev mock в Support

---

## Этап 1 — Cold start (D1)

**Цель:** время от tap иконки до готовой карусели Play.

1. **Полностью закрой** приложение (смахни из переключателя задач).
2. Подожди **5 секунд**.
3. Запусти секундомер **одновременно** с tap по иконке Flagfield.
4. **Стоп** — когда видна нижняя карусель Play (категории: Recognition / Course / Explore / …) и можно тапнуть карточку.

Запиши: `D1_MS = ___` (миллисекунды или секунды, как удобно)

---

## Этап 2 — Вкладки Play ↔ Knowledge (D2, D4)

### D2 — первый вход в Knowledge

1. Ты на вкладке **Play** (земля внизу).
2. Запусти секундомер → tap **Knowledge** (библиотека).
3. **Стоп** — когда список стран прокручивается и поиск реагирует.

Запиши: `D2_MS = ___`

### D4 — повторный вход

1. Tap **Play** → дождись карусели.
2. Снова tap **Knowledge**.
3. Засеки время до интерактивного списка (можно на глаз: «мгновенно / ~0.5 с / ~1 с»).

Запиши: `D4_MS = ___` (или `D4_FEEL = быстрее D2 / так же / медленнее`)

---

## Этап 3 — Knowledge scroll (D3)

1. Вкладка **Knowledge**.
2. Быстро **пролистай вниз** 20–30 секунд (fling), потом вверх.
3. Оцени: были белые пустые блоки? фризы? всё плавно?

Запиши одно из:

- `D3 = smooth`
- `D3 = minor_stutter`
- `D3 = bad_freezes`

---

## Этап 4 — Progress (для PerfLog R5–R6)

1. Tap **Progress** (график внизу).
2. Дождись цифр статистики.
3. Если в консоли есть `[Flagfield Perf][Progress]` — скопируй строки (этап 10).

---

## Этап 5 — Challenge (D7)

1. **Play** → в карусели выбери категорию **Recognition** (первая карточка / свайп к «Recognition»).
2. Tap центральную карточку → откроется список режимов → выбери **«Flag → country»** / «Флаг → страна».
3. Дождись вопроса с флагом и 4 вариантами ответа.
4. Засеки: tap по **любому ответу** → **стоп** когда появилась обратная связь (зелёный/красный) или следующий вопрос.

Запиши: `D7_MS = ___`

---

## Этап 6 — Play carousel (D8)

1. Вернись на **Play** (кнопка «назад» или вкладка Play).
2. Tap **стрелку справа** (›) у карусели — категория должна смениться.
3. Свайпни карусель пальцем влево/вправо.

Запиши:

- `D8_TAP = ok_first_try` / `needed_retry`
- `D8_SWIPE = ok` / `sticky`

---

## Этап 7 — Globe Quest (D5) — нужен Premium

1. **Play** → карусель → категория **Explore** («Исследование»).
2. Tap **Explore** → в списке режимов выбери **«Квест глобуса»** / Globe Quest.
3. Секундомер: tap по режиму → **стоп** когда globe крутится пальцем (не серый экран загрузки).

Запиши: `D5_MS = ___`

Если открылся paywall — запиши `D5 = paywall_blocked`.

---

## Этап 8 — Map Quest (D6) — нужен Premium

1. Назад на Play → **Explore** → **«К quest карты»** / Map Quest.
2. Секундомер: tap → **стоп** когда карта кликабельна (можно тапнуть страну).

Запиши: `D6_MS = ___` (или `D6 = paywall_blocked`)

---

## Этап 9 — Learning persist (PerfLog R13)

1. **Knowledge** → найди любую страну → отметь **«Знаю»** / learned (галочка или toggle).
2. Подожди **1 секунду** (debounce persist).
3. В консоли ищи `[Flagfield Perf][Learning] persist`.

---

## Этап 10 — Стабильность (D9, D10)

### D9 — 10 сессий

Сыграй **10 коротких сессий** подряд (любой режим: challenge, globe, map — чередуй).

Запиши:

- `D9_CRASH = no` / `yes`
- `D9_UI_FOG = no` / `yes` (туман, залипания, артефакты)

### D10 — фон 5 минут

1. Открой **Challenge** или **Globe**, начни раунд (не обязательно заканчивать).
2. Сверни приложение (**Home**), подожди **5 минут** (можно 3–5).
3. Вернись в Flagfield.

Запиши:

- `D10_STATE = ok` / `lost_progress` / `crash` / `black_screen`

---

## Этап 11 — Субъективные оценки (1–5)

Шкала: **5** мгновенно · **4** комфортно · **3** заметная пауза · **2** раздражает · **1** блокирует

| Область | Оценка |
|---------|--------|
| Play hub | |
| Knowledge | |
| Globe | |
| Map | |
| Challenge | |
| Overall | |

---

## Этап 12 — Скопируй логи из консоли

В консоли выдели и скопируй **все** строки с `[Flagfield Perf]` за этот прогон.  
Вставь их в блок ниже в секцию `PERF_LOG_LINES`.

Можно также скопировать **warn** (>120 ms) — они важнее.

---

## Этап 13 — Production (если уже в TestFlight / Play)

Только если есть аналитика крашей:

- `P1_CRASH_FREE = ___%` (или `N/A`)
- `P2_ANR = ___%` (Android, или `N/A`)
- `P3_LAG_REVIEWS = none` / `few` / `many`

---

# ↓↓↓ СКОПИРУЙ ЭТОТ БЛОК В ЧАТ ↓↓↓

```text
=== FLAGFIELD PERF RUN ===
RUN_ID: R002
DATE: YYYY-MM-DD
TESTER: Sergey
APP_VERSION: 1.0.2
BUILD: TestFlight / internal APK / Xcode device
DEVICE: iPhone ___ iOS ___  OR  Pixel ___ Android ___
PREMIUM: yes / no / mock

--- TIMINGS (device) ---
D1_MS:
D2_MS:
D3: smooth / minor_stutter / bad_freezes
D4_MS: (or D4_FEEL: faster_than_D2 / same / slower)
D5_MS: (or paywall_blocked)
D6_MS: (or paywall_blocked)
D7_MS:
D8_TAP: ok_first_try / needed_retry
D8_SWIPE: ok / sticky
D9_CRASH: no / yes
D9_UI_FOG: no / yes
D10_STATE: ok / lost_progress / crash / black_screen

--- SUBJECTIVE 1-5 ---
PLAY:
KNOWLEDGE:
GLOBE:
MAP:
CHALLENGE:
OVERALL:

--- PRODUCTION (optional) ---
P1_CRASH_FREE:
P2_ANR:
P3_LAG_REVIEWS:

--- PERF LOG (paste console lines) ---
PERF_LOG_LINES:
(paste all [Flagfield Perf] lines here)

--- NOTES ---
(anything odd: heat, battery, first install, etc.)
=== END ===
```

---

## Что я сделаю после твоей вставки

1. Перенесу D1–D10, R1–R14, субъективные оценки и P* в **PERFORMANCE-LOG.md** (новый прогон R00X).
2. Сопоставлю `PERF_LOG_LINES` с таблицей R1–R14 и отмечу pass/fail по порогам из [PERFORMANCE.md](./PERFORMANCE.md).
3. B1–B6 и CI допишу сам (`npm run perf:measure-build`, `npm run test:ci`).

**Время на проход:** ~15–20 минут на одном устройстве.
