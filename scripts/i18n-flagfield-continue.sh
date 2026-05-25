#!/usr/bin/env bash
# Resume / finish Flagfield translations (Lingva + MyMemory fallback).
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
export DELAY_MS="${DELAY_MS:-900}"

LANGS=(hi ar pt ja ko it tr vi id pl nl bn ur)

for lang in "${LANGS[@]}"; do
  echo "========== $lang =========="
  node scripts/translate-flagfield-lingva.mjs "$lang" || true
  node scripts/build-flagfield-locales.mjs
done

echo "All done."
