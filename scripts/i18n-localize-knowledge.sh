#!/usr/bin/env bash
# Resume country-knowledge translations (Google + MyMemory). Long-running.
set -euo pipefail
cd "$(dirname "$0")/.."

LOCK_FILE=".content-translate.lock"
if [[ -f "$LOCK_FILE" ]]; then
  old_pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "Already running (pid $old_pid)."
    exit 1
  fi
fi
echo "$$" >"$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

export SKIP_EXISTING=1
export DELAY_MS="${DELAY_MS:-2000}"
export SAVE_EVERY="${SAVE_EVERY:-15}"
export RATE_LIMIT_WAIT_MS="${RATE_LIMIT_WAIT_MS:-90000}"

LANGS=(es de fr uk zh hi ar pt ja ko it tr vi id pl nl bn ur)
for lang in "${LANGS[@]}"; do
  echo "========== $lang =========="
  node scripts/localize-country-knowledge.mjs "$lang" || true
done

echo "Knowledge localization done."
