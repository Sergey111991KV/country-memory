# App Store Connect — App Privacy (Flagfield)

Guide for **App Privacy** nutrition labels and privacy questionnaire.

**Bundle ID:** `com.flagfield.learn`

---

## Tracking

**Do you or your third-party partners use data for tracking?**  
→ **No** (no ATT / no cross-app tracking SDK in current build)

---

## Data collection summary

| Category | Collected | Linked to user | Used for tracking |
|----------|-----------|----------------|-------------------|
| Contact info | No | — | — |
| Health & fitness | No | — | — |
| Financial info | No (Apple handles payment) | — | — |
| Location | No | — | — |
| Sensitive info | No | — | — |
| Contacts | No | — | — |
| User content | No | — | — |
| Browsing history | No | — | — |
| Search history | No | — | — |
| Identifiers | No | — | — |
| Purchases | Yes* | No** | No |

\* Purchase **history** is processed by Apple; Flagfield receives entitlement status via RevenueCat, not a custom user database.  
\*\* No account — not linked to identity in your systems.

If Apple asks only about **your** collection: answer **No** for most categories; purchases are handled under **Apple’s** payment flow.

---

## Third-party content

Disclose in review notes if needed:

- Flag images loaded from **FlagCDN** (network).
- Map tiles from **CARTO** / OpenStreetMap contributors.
- **RevenueCat** for subscription status.

---

## Privacy Policy URL

`https://YOUR_DOMAIN/privacy` — must match `privacyPolicyUrl` in release build.

---

## Age rating

4+ with **In-App Purchases**.

---

## Optional review notes (paste in App Review Information)

```
Flagfield is an offline-first geography learning app. No user account.
Progress is stored locally. Premium uses StoreKit + RevenueCat entitlement "premium".
Free tier: 10 completed game sessions. Privacy Policy and Terms URLs are configured in the app Settings.
```
