# Flagfield — публикация (сделайте сами)

Всё в репозитории подготовлено. Остаётся заменить плейсхолдеры, залить legal на HTTPS и отправить в магазины.

## 0. Быстрый старт

```bash
# 1) Legal-страницы из markdown
npm run legal:build

# 2) Локальный конфиг (если ещё нет)
npm run env:init
# Отредактируйте src/environments/environment.prod.local.ts

# 3) Релизная сборка + native
npm run cap:sync:release
```

## 1. Домен и legal (обязательно)

### Собрать HTML

```bash
npm run legal:build
```

Папка **`docs/legal/public/`** — готовый статический сайт:

| Файл | Назначение |
|------|------------|
| `privacy.html` | Политика конфиденциальности |
| `terms.html` | Условия использования |
| `index.html` | Оглавление |
| `_redirects` | Для Netlify/Cloudflare: `/privacy` → `privacy.html` |

### Залить на HTTPS

Выберите один вариант (подробности в [HOSTING-LEGAL.md](HOSTING-LEGAL.md)):

- **GitHub Pages** — репозиторий `username.github.io` или `docs/` branch
- **Cloudflare Pages** — drag-and-drop папки `public/`
- **Netlify** — папка `docs/legal/public`
- **Любой хостинг** — FTP/S3, главное HTTPS

### Рекомендуемые URL

Замените `https://YOUR_DOMAIN` на ваш домен **без** слэша в конце:

| Назначение | URL |
|------------|-----|
| Privacy | `https://YOUR_DOMAIN/privacy` |
| Terms | `https://YOUR_DOMAIN/terms` |
| Сайт (опционально) | `https://YOUR_DOMAIN` |

Проверка в браузере: оба URL открываются, сертификат валидный.

### Прописать в приложении

`src/environments/environment.prod.local.ts`:

```typescript
const PUBLIC_SITE = 'https://YOUR_DOMAIN'; // ваш домен

privacyPolicyUrl: `${PUBLIC_SITE}/privacy`,
termsOfUseUrl: `${PUBLIC_SITE}/terms`,
developerWebsiteUrl: PUBLIC_SITE,
```

Сборка: `npm run build:release` или `npm run cap:sync:release`.

В приложении: **Settings → Privacy / Terms** должны стать активными (не серые).

Те же URL — в **App Store Connect** и **Play Console**.

---

## 2. RevenueCat и покупки

Пошагово: [REVENUECAT.md](REVENUECAT.md).

Кратко:

1. App Store Connect + Play Console: приложение `com.flagfield.learn`
2. Продукты: подписка (monthly) + опционально lifetime
3. RevenueCat: проект, entitlement **`premium`**, offering, iOS/Android **public** keys
4. Вставить ключи в `environment.prod.local.ts`
5. `devMockBilling: false` для релиза

---

## 3. Иконки и нативные проекты

```bash
npm run assets:generate   # после смены resources/logo.svg
npm run cap:sync:release
npm run cap:open:ios      # или cap:open:android
```

- **iOS:** Archive → App Store Connect  
- **Android:** Signed AAB → Play Console  

---

## 4. Тексты для магазинов

| Файл | Куда |
|------|------|
| [../store/app-store-listing.md](../store/app-store-listing.md) | App Store Connect |
| [../store/play-store-listing.md](../store/play-store-listing.md) | Google Play |
| [../store/data-safety-play.md](../store/data-safety-play.md) | Play → Data safety |
| [../store/app-store-privacy.md](../store/app-store-privacy.md) | App Privacy |

Замените во всех файлах `YOUR_DOMAIN` на ваш домен (поиск по репозиторию).

---

## 5. Скриншоты

Минимум 6 экранов (см. листинги):

1. Home  
2. Play hub (3 режима)  
3. Globe Quest  
4. Map Quest  
5. Flag Quiz  
6. Progress или Country Portrait (long-press на флаге)

Запуск: `npm start` → http://localhost:4205  
Симулятор iOS / эмулятор Android для нативных скриншотов.

---

## 6. Чеклист перед отправкой

- [ ] Legal на HTTPS, URL совпадают с env и магазинами  
- [ ] `environment.prod.local.ts` — RevenueCat keys, `devMockBilling: false`  
- [ ] `npm run build:release` без ошибок  
- [ ] `npm run test:ci`  
- [ ] Privacy/Terms в приложении открываются  
- [ ] Paywall показывает цены (sandbox)  
- [ ] 10 бесплатных сессий → paywall  
- [ ] Версия `1.0.0` в package.json / env / магазинах  
- [ ] Data safety / App Privacy заполнены по гайдам  

---

## 7. Country Portrait (опционально)

AI-ролики: `src/assets/country-scenes/README.md`  
Файлы: `xx.mp4`, `xx-poster.jpg`, при необходимости `manifest.json`.

---

## 8. Контакты

**Email:** supp0rt.serg@yandex.com  
**Bundle ID:** `com.flagfield.learn`  
**Entitlement:** `premium`
