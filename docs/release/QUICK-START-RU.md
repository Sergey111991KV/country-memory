# Flagfield — шпаргалка перед публикацией

## 1. Legal (5 мин + хостинг)

```bash
npm run legal:build
```

Залить папку **`docs/legal/public/`** на HTTPS (GitHub Pages / Cloudflare / Netlify — см. [HOSTING-LEGAL.md](HOSTING-LEGAL.md)).

Запомнить домен: `https://ВАШ-ДОМЕН`

## 2. Конфиг приложения

```bash
npm run env:init   # если файла ещё нет
```

В **`src/environments/environment.prod.local.ts`**:

- `PUBLIC_SITE = 'https://ВАШ-ДОМЕН'`
- Ключи RevenueCat `appl_...` / `goog_...`
- `devMockBilling: false`

## 3. Сборка

```bash
npm run cap:sync:release
npm run build:ios:archive   # xcarchive + IPA в ios/build/export/
# или вручную: npm run cap:open:ios → Product → Archive
```

Проверить в приложении: **Настройки → Privacy / Terms** открываются.

## 4. Магазины

| Что | Файл |
|-----|------|
| App Store текст | [../store/app-store-listing.md](../store/app-store-listing.md) |
| Google Play текст | [../store/play-store-listing.md](../store/play-store-listing.md) |
| RevenueCat | [REVENUECAT.md](REVENUECAT.md) |
| Play Data safety | [../store/data-safety-play.md](../store/data-safety-play.md) |
| App Privacy | [../store/app-store-privacy.md](../store/app-store-privacy.md) |
| Скриншоты | [SCREENSHOTS.md](SCREENSHOTS.md) |

Везде заменить `YOUR_DOMAIN` на ваш домен.

## 5. Полный чеклист

[ПUBLISH.md](PUBLISH.md)

**Bundle ID:** `com.flagfield.learn` · **Email:** supp0rt.serg@yandex.com
