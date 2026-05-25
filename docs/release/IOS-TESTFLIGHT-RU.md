# Flagfield — загрузка билда в TestFlight (iOS)

Версия для теста: **1.0.1 (3)** · Bundle ID: `com.flagfield.learn`

## Перед сборкой

1. В `src/environments/environment.prod.local.ts` (или через `npm run env:init` + правки):
   - `privacyPolicyUrl`: `https://addeo.github.io/flagfield-privacy/en`
   - `termsOfUseUrl`: `https://addeo.github.io/flagfield-terms`
   - `supportEmail`: `supp0rt.serg@yandex.com`
   - ключи RevenueCat, если нужны покупки в тесте

2. Иконка в проекте уже генерируется из `resources/logo.svg`:
   ```bash
   npm run assets:generate
   ```

## Иконка в App Store Connect (отдельно от билда!)

Иконка в шапке Connect **не** подтягивается автоматически из Xcode. Загрузи вручную:

1. **Apps → Flagfield Maps → App Information** (слева General).
2. Поле **App Icon** → загрузить **`resources/icon-1024.png`** (1024×1024, без прозрачности).
3. **Save**.

Иконка на телефоне после установки TestFlight берётся из билда (`AppIcon` в Xcode).

## Сборка и загрузка

### Терминал

```bash
cd /path/to/countries
npm run build:ios:archive
```

IPA: `ios/build/export/App.ipa`

### Xcode

```bash
npm run cap:sync:release
npm run cap:open:ios
```

1. Схема **App**, устройство **Any iOS Device (arm64)**.
2. **Product → Archive**.
3. **Window → Organizer** → архив → **Distribute App**.
4. **App Store Connect** → **Upload** (не Ad Hoc).
5. Дождись **Uploaded** без ошибок.

## После загрузки

1. **Activity** — статус *Processing* (15–60 мин).
2. **TestFlight → Builds** — билд **1.0.1 (2)** → *Ready to Test*.
3. **Export Compliance** — если жёлтый значок: обычно «No» для стандартного HTTPS.
4. **INTERNAL TESTING → My** — включить билд для группы.
5. **Distribution → iOS App 1.0 → Build** — выбрать билд 1.0.1 (2).

## Если билд не появляется

- Проверь почту Apple (Invalid Binary / ITMS).
- **Agreements, Tax, and Banking** — всё Active.
- Нельзя повторно загрузить тот же **Build** `2` — увеличь `CURRENT_PROJECT_VERSION` в Xcode.
- Bundle ID в Xcode = `com.flagfield.learn`.

## Ссылки в Connect (как в приложении)

| Поле | URL |
|------|-----|
| Privacy Policy | https://addeo.github.io/flagfield-privacy/en |
| Terms | https://addeo.github.io/flagfield-terms |
| Support URL | mailto:supp0rt.serg@yandex.com |

TestFlight → **Additional → Test Information** — Support Email: `supp0rt.serg@yandex.com`
