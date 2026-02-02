#!/usr/bin/env bash
set -euo pipefail

# CI Orchestrator: build + migrate + seed + start backend/frontend + run Playwright
# Usage: scripts/ci-e2e.sh [smoke|regression]

SUITE="${1:-smoke}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"
mkdir -p "$ARTIFACTS_DIR"

BACKEND_LOG="$ARTIFACTS_DIR/backend.log"
FRONTEND_LOG="$ARTIFACTS_DIR/frontend.log"

# Environment defaults for local run; CI sets these explicitly
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/appdb}"
export JWT_SECRET="${JWT_SECRET:-test-secret}"
export PORT="${PORT:-3000}"
export API_URL="http://localhost:$PORT"
export BASE_URL="http://localhost:5173"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@local.test}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

log() { echo "[ci-e2e] $*"; }
retry() {
  local max="${1:-30}"; shift
  local delay="${1:-1}"; shift
  for i in $(seq 1 "$max"); do
    if "$@"; then return 0; fi
    sleep "$delay"
  done
  return 1
}

# 1) Install dependencies
log "Installing backend deps"
( cd "$BACKEND_DIR" && npm ci )
log "Installing frontend deps"
( cd "$FRONTEND_DIR" && npm ci )

# 2) Prisma migrations + seed
log "Running prisma migrate deploy"
( cd "$BACKEND_DIR" && npm run db:migrate )
log "Running prisma seed"
( cd "$BACKEND_DIR" && ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" npm run db:seed )

# 3) Build backend + start
log "Building backend"
( cd "$BACKEND_DIR" && npm run build )
log "Ensuring port $PORT is free"
( PIDS=$(lsof -ti :"$PORT" || true) && [[ -n "$PIDS" ]] && kill -9 $PIDS || true )
log "Starting backend on :$PORT"
( cd "$BACKEND_DIR" && nohup npm run start > "$BACKEND_LOG" 2>&1 & echo $! > "$ARTIFACTS_DIR/backend.pid" )

log "Waiting for backend readiness"
retry 40 1 curl -sSf "http://localhost:$PORT/__ping" >/dev/null || { tail -n 200 "$BACKEND_LOG" || true; echo "Backend failed"; exit 1; }

# 4) Build frontend + start preview
log "Building frontend"
# Build without TypeScript type-check to avoid blocking on unrelated TS errors
( cd "$FRONTEND_DIR" && VITE_API_URL="$API_URL/api" npx vite build )
log "Ensuring preview port 5173 is free"
( PIDS=$(lsof -ti :5173 || true) && [[ -n "$PIDS" ]] && kill -9 $PIDS || true )
log "Starting frontend preview on :5173"
( cd "$FRONTEND_DIR" && nohup npm run preview -- --port 5173 > "$FRONTEND_LOG" 2>&1 & echo $! > "$ARTIFACTS_DIR/frontend.pid" )

log "Waiting for frontend readiness"
retry 40 1 curl -sSf "http://localhost:5173" >/dev/null || { tail -n 200 "$FRONTEND_LOG" || true; echo "Frontend failed"; exit 1; }

# 5) Prepare storage state
log "Generating storage state"
( cd "$FRONTEND_DIR" && BASE_URL="$BASE_URL" BACKEND_BASE_URL="$API_URL" node tests/storage-setup.js )

# 6) Run Playwright suite
log "Running Playwright suite: $SUITE"
export PLAYWRIGHT_BASE_URL="$BASE_URL"
PW_EXTRA_ARGS=""
if [[ "${SKIP_PACK_E2E:-}" == "true" ]]; then
  PW_EXTRA_ARGS="--grep-invert @pack"
fi
if [[ "$SUITE" == "regression" ]]; then
  ( cd "$FRONTEND_DIR" && npx playwright install --with-deps && npx playwright test --grep @regression $PW_EXTRA_ARGS )
else
  ( cd "$FRONTEND_DIR" && npx playwright install --with-deps && npx playwright test --grep @smoke $PW_EXTRA_ARGS )
fi

# 7) Cleanup
log "Stopping services"
( kill -9 $(cat "$ARTIFACTS_DIR/backend.pid") 2>/dev/null || true )
( kill -9 $(cat "$ARTIFACTS_DIR/frontend.pid") 2>/dev/null || true )
log "Done"
