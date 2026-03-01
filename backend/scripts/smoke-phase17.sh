#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3100}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

cd "$ROOT/backend"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required for smoke:phase17" >&2
  exit 1
fi

npm run stop >/dev/null 2>&1 || true
npm run clean >/dev/null 2>&1 || true
npm run db:deploy
npm run db:seed
npm run build

NODE_ENV=production PORT="$BACKEND_PORT" BACKEND_PORT="$BACKEND_PORT" npm run start:prod > "$ROOT/artifacts/logs/backend-smoke-phase17.log" 2>&1 &
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

if [[ -n "$AUTH_TOKEN" ]]; then
  curl -fsS -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/api/auth/me" >/dev/null
else
  echo "[phase17] AUTH_TOKEN not set; skipping auth endpoint check"
fi

echo "[phase17] PASS"
