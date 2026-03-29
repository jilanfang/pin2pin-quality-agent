#!/usr/bin/env bash
set -euo pipefail

PORT_CANDIDATES=(3001 3002 3003 3004 3005 3006 3007 3008 3009)
PORT=""

for candidate in "${PORT_CANDIDATES[@]}"; do
  if ! lsof -nP -iTCP:"$candidate" -sTCP:LISTEN >/dev/null 2>&1; then
    PORT="$candidate"
    break
  fi
done

if [ -z "$PORT" ]; then
  echo "No free port found in ai-quality range 3001-3009." >&2
  exit 1
fi

STAMP=$(date +%s)
STORE_PATH="${AI_QUALITY_STORE_PATH:-/tmp/ai-quality-browser-smoke-$STAMP.json}"
SERVER_LOG="/tmp/ai-quality-local-prod-smoke-$STAMP.log"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

echo "Using port: $PORT"
echo "Using store: $STORE_PATH"

npm run build

env \
  DATABASE_URL= \
  NEXT_PUBLIC_SUPABASE_URL= \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= \
  AI_QUALITY_STORE_PATH="$STORE_PATH" \
  npx next start --hostname 127.0.0.1 --port "$PORT" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  echo "Smoke server failed to become healthy." >&2
  tail -n 80 "$SERVER_LOG" >&2 || true
  exit 1
fi

SMOKE_BASE_URL="http://127.0.0.1:$PORT" npm run smoke:browser

echo "Smoke passed on http://127.0.0.1:$PORT"
