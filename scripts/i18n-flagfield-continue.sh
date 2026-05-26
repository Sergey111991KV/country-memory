#!/usr/bin/env bash
# Resume / finish Flagfield translations (MyMemory — stable; Lingva often 403/500).
set -euo pipefail
cd "$(dirname "$0")/.."

LOCK_FILE=".flagfield-translate.lock"
if [[ -f "$LOCK_FILE" ]]; then
  old_pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "Another flagfield translation is already running (pid $old_pid)."
    exit 1
  fi
fi
echo "$$" >"$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

export SKIP_EXISTING=1
export DELAY_MS="${DELAY_MS:-1000}"

# Remaining locales without flagfield JSON
LANGS=(ja ko it tr vi id pl nl bn ur)

for lang in "${LANGS[@]}"; do
  echo "========== $lang =========="
  node scripts/translate-flagfield-mymemory.mjs "$lang" || true
  node scripts/build-flagfield-locales.mjs
done

echo "Fixing placeholder glitches in es, de, fr…"
node scripts/fix-flagfield-placeholders.mjs es de fr || true
node scripts/build-flagfield-locales.mjs

echo "All done."
