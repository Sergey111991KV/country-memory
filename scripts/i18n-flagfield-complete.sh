#!/usr/bin/env bash
# Finish Flagfield UI translations (run from repo root; may take hours — API rate limits).
set -euo pipefail
cd "$(dirname "$0")/.."

export DELAY_MS="${DELAY_MS:-3000}"
export SKIP_EXISTING=1

LANGS=(fr zh hi ar pt ja ko it tr vi id pl nl bn ur)

for lang in "${LANGS[@]}"; do
  echo "========== $lang =========="
  node scripts/translate-flagfield-lingva.mjs "$lang" || true
done

# German resume (partial OK)
SKIP_EXISTING=1 node scripts/translate-flagfield-lingva.mjs de || true

# Ukrainian from Russian rules
node scripts/ru-to-uk-flagfield.mjs

node scripts/build-flagfield-locales.mjs
echo "Done. Rebuild app: npm run build"
