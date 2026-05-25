# Hosting legal pages (HTTPS)

Source: run `npm run legal:build` → output in **`docs/legal/public/`**.

Target URLs (example):

- `https://flagfield.example/privacy`
- `https://flagfield.example/terms`

Use the same paths in `environment.prod.local.ts` and store consoles.

---

## Option A — GitHub Pages (free)

1. Create a repo (e.g. `flagfield-legal`) or use `gh-pages` branch.
2. Copy contents of `docs/legal/public/` to the repo root (or `/docs` on `main` with Pages source = docs).
3. Settings → Pages → deploy from branch.
4. Custom domain (optional): add `CNAME` + DNS.
5. For clean URLs without `.html`:
   - Use repo root deploy + rename is not needed if you set env URLs to `.../privacy.html`, **or**
   - Add a small `404.html` redirect script, **or**
   - Use Cloudflare/Netlify `_redirects` (included in `public/`).

**Env with `.html` paths (works everywhere):**

```typescript
privacyPolicyUrl: 'https://username.github.io/flagfield-legal/privacy.html',
termsOfUseUrl: 'https://username.github.io/flagfield-legal/terms.html',
```

**Env with pretty paths (Netlify/Cloudflare):**

```typescript
privacyPolicyUrl: 'https://YOUR_DOMAIN/privacy',
termsOfUseUrl: 'https://YOUR_DOMAIN/terms',
```

---

## Option B — Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Direct Upload.
2. Upload folder `docs/legal/public` (zip or drag).
3. Custom domain → attach zone.
4. `_redirects` in the folder maps `/privacy` and `/terms` to HTML files.

---

## Option C — Netlify

1. [app.netlify.com](https://app.netlify.com) → Add site → Deploy manually.
2. Drag `docs/legal/public`.
3. `_redirects` is applied automatically.

---

## Option D — Any static host (S3, Firebase, VPS)

Upload all files from `docs/legal/public/` preserving structure.

Configure HTTPS (Let’s Encrypt or CDN).

If the host has no redirect rules, use full filenames in env:

- `.../privacy.html`
- `.../terms.html`

---

## Verify before store submit

```bash
curl -I https://YOUR_DOMAIN/privacy
curl -I https://YOUR_DOMAIN/terms
```

Both must return `200` and valid TLS.

After deploy, update `environment.prod.local.ts` and run:

```bash
npm run cap:sync:release
```

Open the app → Settings → tap Privacy and Terms.
