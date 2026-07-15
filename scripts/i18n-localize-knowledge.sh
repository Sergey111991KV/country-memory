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
export MT_SKIP_LINGVA=1
unset MT_MYMEMORY_ONLY MT_GOOGLE_ONLY MT_LINGVA_ONLY
export DELAY_MS="${DELAY_MS:-2000}"
export SAVE_EVERY="${SAVE_EVERY:-15}"
export RATE_LIMIT_WAIT_MS="${RATE_LIMIT_WAIT_MS:-60000}"

# resume vi and remaining langs (single node process — survives better than bash loop)
node scripts/localize-country-knowledge.mjs vi id pl nl bn ur || true

echo "Knowledge localization done."
