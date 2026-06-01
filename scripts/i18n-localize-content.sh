#!/usr/bin/env bash
# Translate learning-path + country-knowledge (MyMemory). Hours for full knowledge.
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
export DELAY_MS="${DELAY_MS:-1200}"
export SAVE_EVERY="${SAVE_EVERY:-25}"

echo "=== learning-path (all langs) ==="
node scripts/localize-learning-path.mjs || true

echo "=== country-knowledge (all langs) ==="
node scripts/localize-country-knowledge.mjs || true

echo "Content localization done."
