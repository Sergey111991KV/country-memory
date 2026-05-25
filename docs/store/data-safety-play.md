# Google Play — Data safety questionnaire (Flagfield)

Use as a guide when filling **App content → Data safety** in Play Console. Adjust if Google’s form changes.

**App:** Flagfield (`com.flagfield.learn`)  
**Contact:** supp0rt.serg@yandex.com

---

## Does your app collect or share user data?

**Answer:** No personal data collected directly by the developer for analytics or accounts.

Clarify in notes:

- No login / account system.
- No analytics SDK (Firebase Analytics, etc.) in current build.
- Learning progress stored **on device only** (Preferences).
- Purchases processed by **Google Play** and **RevenueCat** (purchase/subscription status).

---

## Data types (typical answers)

| Data type | Collected? | Shared? | Purpose | Notes |
|-----------|------------|---------|---------|-------|
| Personal info (name, email) | No | No | — | Optional display name stays on device |
| Financial info | No* | No* | — | *Google handles payment |
| Location | No | No | — | App does not request GPS |
| Photos/videos | No | No | — | Country Portrait uses bundled assets |
| App activity (in-app actions) | No** | No | — | **Not sent to developer servers |
| Device or other IDs | No | No | — | No ad ID usage declared |

---

## Third-party services (declare if asked about “data shared” or “third parties”)

Users’ devices may contact:

| Third party | Data potentially seen | Purpose |
|-------------|-------------------------|---------|
| Google Play | Purchase history | Billing |
| RevenueCat | Purchase/subscription state | Unlock Premium |
| flagcdn.com | IP, request metadata | Flag images |
| CARTO / OSM tile servers | IP, request metadata | Map tiles in Map Quest |

No developer-operated backend for gameplay in v1.0.

---

## Security practices

- Data on device: standard OS app sandbox.
- HTTPS for legal pages and store APIs.
- No sale of personal information.

---

## Data deletion

Users can clear data by **clearing app storage** or **uninstalling**. No server account to delete.

---

## Children

Target: general audience / education. No targeted ads. In-app purchases — parental controls via Play.

---

## Privacy policy URL

Must match live URL, e.g. `https://YOUR_DOMAIN/privacy` (same as `environment.prod.local.ts`).
