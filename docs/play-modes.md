# Play modes matrix

Hub shows 32 entries; most reuse the same screens with different pools or rules.

| Mechanic | Screen | Pool / rule |
|----------|--------|-------------|
| Flag / capital / type challenge | `flag-challenge` | free, learned, continent, course |
| Flag → map | `map-find` | session pool |
| Knowledge quiz | `knowledge-quiz` | learned countries + facts |
| Facts quiz | `facts-quiz` | learned fact marks |
| Facts drill | `facts-drill` | profile fields + optional flag mix |
| Globe find | `globe-find` | tier (premium) |
| Map find | `map-find` | tier (premium) |
| Map mark filters | `map-mark/:filterId` | tier + filter |
| Pass & play (turns) | `pass-play` → `flag-challenge` | free pool, each player answers in turn |
| Pass & play (speed) | `pass-play` → `flag-challenge` | buzzer: player name buttons only, confirm correct |
| Learning path | `learning-path` → level launcher | per level topics |

Debug logs (dev only): `[Flagfield Play][Scope]` via `playDebug()` in `src/app/core/utils/play-debug.ts`.
