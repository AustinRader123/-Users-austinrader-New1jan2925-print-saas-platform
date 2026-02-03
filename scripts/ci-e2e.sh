#!/usr/bin/env bash
set -euo pipefail

# CI E2E orchestrator
# - Builds and starts backend & frontend preview
# - Selects Playwright tags (with skip-pack fallback)
# - Runs tests and captures logs + HTML report

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

SUITE="${SUITE:-regression}"
SKIP_PACK_E2E="${SKIP_PACK_E2E:-false}"
DATABASE_URL_DEFAULT="postgresql://app:password@localhost:5432/app"
DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"

# Base URL precedence: PLAYWRIGHT_BASE_URL > E2E_BASE_URL > http://127.0.0.1:5173
DEFAULT_BASE_URL="http://127.0.0.1:5173"
BASE_URL="${PLAYWRIGHT_BASE_URL:-}"
if [ -z "$BASE_URL" ]; then BASE_URL="${E2E_BASE_URL:-}"; fi
if [ -z "$BASE_URL" ]; then BASE_URL="$DEFAULT_BASE_URL"; fi

echo "[ci-e2e] SUITE=$SUITE SKIP_PACK_E2E=$SKIP_PACK_E2E"
echo "[ci-e2e] PLAYWRIGHT_BASE_URL resolved to $BASE_URL"
echo "[ci-e2e] DATABASE_URL=$DATABASE_URL"

BACKEND_LOG="$ROOT_DIR/backend.log"
FRONTEND_LOG="$ROOT_DIR/frontend.log"
rm -f "$BACKEND_LOG" "$FRONTEND_LOG"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 127; }; }
need node; need npm;

echo "[ci-e2e] Installing deps..."
npm --prefix backend ci || npm --prefix backend install
npm --prefix frontend ci || npm --prefix frontend install
npx --yes playwright install --with-deps

echo "[ci-e2e] Building backend..."
npm --prefix backend run build || true

echo "[ci-e2e] Applying migrations and seed (if available)..."
(cd backend && DATABASE_URL="$DATABASE_URL" npx --yes prisma migrate deploy) || true
if (cd backend && npx --yes prisma db seed --help >/dev/null 2>&1); then
  (cd backend && DATABASE_URL="$DATABASE_URL" npx --yes prisma db seed) || true
fi

echo "[ci-e2e] Starting backend..."
(cd backend && DATABASE_URL="$DATABASE_URL" node dist/index.js) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "[ci-e2e] Backend PID=$BACKEND_PID"

cleanup() {
  set +e
  if kill -0 "$BACKEND_PID" 2>/dev/null; then kill "$BACKEND_PID" || true; fi
  if kill -0 "$FRONTEND_PID" 2>/dev/null; then kill "$FRONTEND_PID" || true; fi
}
trap cleanup EXIT

echo "[ci-e2e] Building frontend..."
npm --prefix frontend run build || true

echo "[ci-e2e] Starting frontend preview on 5173..."
(cd frontend && npm run preview -- --port 5173) > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "[ci-e2e] Frontend PID=$FRONTEND_PID"

echo "[ci-e2e] Waiting for frontend preview to be ready..."
TRIES=60
until curl -fsS -m 2 "$BASE_URL" >/dev/null 2>&1; do
  TRIES=$((TRIES-1))
  if [ "$TRIES" -le 0 ]; then
    echo "[ci-e2e] Frontend not reachable at $BASE_URL" >&2
    echo "[ci-e2e] Frontend log tail:" >&2
    tail -n 200 "$FRONTEND_LOG" >&2 || true
    exit 2
  fi
  sleep 1
done

echo "[ci-e2e] Frontend is reachable at $BASE_URL"

TAG_ARGS=()
if [ "$SUITE" = "smoke" ]; then
  TAG_ARGS+=(--grep "@smoke")
elif [ "$SUITE" = "regression" ]; then
  TAG_ARGS+=(--grep "@regression")
  if [ "${SKIP_PACK_E2E}" = "true" ]; then
    TAG_ARGS+=(--grep-invert "@pack")
  else
    TAG_ARGS+=(--grep "@pack")
  fi
else
  TAG_ARGS+=(--grep "@smoke")
fi

echo "[ci-e2e] Initial TAG_ARGS: ${TAG_ARGS[*]}"

# Dry-run list to ensure we have matching tests; fallback to @smoke if none.
echo "[ci-e2e] Checking matched tests via --list..."
MATCH_COUNT=0
if LIST_OUT=$(cd frontend && npx --yes playwright test --list "${TAG_ARGS[@]}" 2>/dev/null); then
  MATCH_COUNT=$(echo "$LIST_OUT" | grep -E "^\s*\d+ tests?" -o | head -n1 | awk '{print $1}' || echo 0)
fi
if [ -z "$MATCH_COUNT" ] || [ "$MATCH_COUNT" = "" ]; then MATCH_COUNT=0; fi
echo "[ci-e2e] Matched tests (approx): $MATCH_COUNT"
if [ "$MATCH_COUNT" -eq 0 ]; then
  echo "[ci-e2e] No tests matched. Falling back to @smoke."
  TAG_ARGS=(--grep "@smoke")
fi

PW_CMD=(npx --yes playwright test "${TAG_ARGS[@]}" --reporter=list,html --output tests-output)
echo "[ci-e2e] Running: ${PW_CMD[*]}"

set +e
(cd frontend && PLAYWRIGHT_BASE_URL="$BASE_URL" VITE_API_URL="${VITE_API_URL:-http://localhost:3000/api}" "${PW_CMD[@]}")
PW_EXIT=$?
set -e

echo "[ci-e2e] Playwright exit code: $PW_EXIT"
echo "[ci-e2e] Frontend log tail:"; tail -n 200 "$FRONTEND_LOG" || true
echo "[ci-e2e] Backend log tail:"; tail -n 200 "$BACKEND_LOG" || true

exit "$PW_EXIT"
# End of script
