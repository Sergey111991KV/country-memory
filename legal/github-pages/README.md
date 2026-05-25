# Legal pages for GitHub Pages

Static **Privacy Policy** and **Terms of Use** for **Pairloom** (memory card game), app identifier `game.memory.cards` (see `capacitor.config.ts`). The text reflects the current codebase: local-only gameplay storage (Capacitor Preferences / `localStorage`), optional custom photos on device, **Apple** / **Google** billing, **RevenueCat**, no third-party analytics SDK in dependencies.

Contact in the HTML files: **Sergey Kosilov** (indie developer), **supp0rt.serg@yandex.com**, governing law **Russian Federation**; no separate website listed.

## Before you publish

1. Re-read the text and adjust if your practices differ (analytics, crash reporting, age rating, or if you register as ИП/ООО).
2. This is **not legal advice**; consider a lawyer for store / subscription compliance and 152-ФЗ where applicable.

## Deploy on GitHub Pages

1. Create a **new public repository** (e.g. `memory-cards-legal`) or use an existing one.
2. Copy the contents of this folder to the repo root (or into `/docs` if you prefer that Pages source).
3. In the repo: **Settings → Pages → Build and deployment → Source**:  
   - *Deploy from a branch*: branch `main`, folder `/ (root)` **or** `/docs`.
4. After the first deploy, your URLs will look like:
   - `https://<user>.github.io/<repo>/privacy.html`
   - `https://<user>.github.io/<repo>/terms.html`  
   (or without `<repo>` if you use a **user/org site** repo named `<username>.github.io`.)
5. Optional: **Settings → Pages → Custom domain** and add DNS records for e.g. `legal.yourdomain.com`.
6. Put the **HTTPS** URLs into `privacyPolicyUrl` and `termsOfUseUrl` in your app `environment` and in App Store Connect / Google Play where required.

## Files

| File | Use |
|------|-----|
| `index.html` | Landing with links to all documents |
| `privacy.html` | English privacy policy |
| `terms.html` | English terms (includes subscriptions) |
| `privacy-ru.html` | Russian privacy policy |
| `terms-ru.html` | Russian terms |
