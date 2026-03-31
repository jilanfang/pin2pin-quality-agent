#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:3001}"

if ! curl -fsS "$BASE_URL/api/health" >/dev/null; then
  echo "Browser smoke requires a running app at $BASE_URL" >&2
  echo "Start it first with npm start, or point SMOKE_BASE_URL at a live preview." >&2
  exit 1
fi

node ./scripts/browser-smoke.mjs
