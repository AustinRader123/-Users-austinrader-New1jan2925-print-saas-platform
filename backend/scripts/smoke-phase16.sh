#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3100}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"

cd "$ROOT/backend"

export NODE_ENV="${NODE_ENV:-production}"
export BACKEND_PORT
export PORT="${PORT:-$BACKEND_PORT}"
export CORS_ORIGINS="${CORS_ORIGINS:-${BASE_URL},http://localhost:3000,http://127.0.0.1:3000}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required for smoke:phase16 (production-like)." >&2
  exit 1
fi

npm run stop >/dev/null 2>&1 || true
npm run clean >/dev/null 2>&1 || true

npm run db:deploy
npm run db:seed
npm run build

npm run start:prod > "$ROOT/artifacts/logs/backend-smoke-phase16.log" 2>&1 &
PID=$!
trap 'kill $PID >/dev/null 2>&1 || true' EXIT

for _ in {1..60}; do
  if curl -fsS "$BASE_URL/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "$BASE_URL/health" >/dev/null
curl -fsS "$BASE_URL/ready" >/dev/null
curl -fsS "$BASE_URL/api/public/products?storeSlug=default" >/dev/null

echo "smoke:phase16 PASS"
