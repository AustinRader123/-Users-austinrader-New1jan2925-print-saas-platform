#!/usr/bin/env bash
###############################################################################
# Render + Vercel "GO LIVE" verifier + deploy checklist
# What it does:
#  1) Verifies Render backend health + /api health (if exists)
#  2) Verifies CORS headers from Render (preflight + GET)
#  3) Builds frontend with VITE_API_URL pointed to Render
#  4) Ensures Vercel SPA rewrites exist (vercel.json check)
#  5) Prints EXACT Render/Vercel environment values to set
#  6) (Optional) Starts local preview to validate end-to-end before pushing
#
# Usage:
#   RENDER_URL="https://xxxx.onrender.com" \
#   VERCEL_URL="https://your-app.vercel.app" \
#   bash scripts/go_live_render_vercel.sh
#
# Or run inline (no file): copy/paste everything into terminal.
###############################################################################

set -euo pipefail

RENDER_URL="${RENDER_URL:-}"
VERCEL_URL="${VERCEL_URL:-}"
FRONTEND_DIR="${FRONTEND_DIR:-frontend}"
BACKEND_HEALTH_PATH="${BACKEND_HEALTH_PATH:-/health}"
API_PREFIX="${API_PREFIX:-/api}"

if [[ -z "$RENDER_URL" ]]; then
  echo "ERROR: RENDER_URL is required. Example: RENDER_URL=https://xxxx.onrender.com"
  exit 1
fi

# Normalize: remove trailing slash
RENDER_URL="${RENDER_URL%/}"
VERCEL_URL="${VERCEL_URL%/}"

say() { printf "\n\033[1m%s\033[0m\n" "$*"; }
ok() { printf "✅ %s\n" "$*"; }
warn() { printf "⚠️  %s\n" "$*"; }
fail() { printf "❌ %s\n" "$*"; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

need curl
need node
need npm

say "1) Backend health check (Render)"
echo "GET ${RENDER_URL}${BACKEND_HEALTH_PATH}"
HTTP_CODE="$(curl -s -o /tmp/health.out -w "%{http_code}" "${RENDER_URL}${BACKEND_HEALTH_PATH}" || true)"
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "Render health OK (200)"
  head -c 400 /tmp/health.out || true
  echo
else
  warn "Render health returned HTTP $HTTP_CODE"
  echo "Body (first 400 chars):"
  head -c 400 /tmp/health.out || true
  echo
  warn "If this is expected (different path), set BACKEND_HEALTH_PATH=/yourpath and re-run."
fi

say "2) Optional API check"
echo "GET ${RENDER_URL}${API_PREFIX}${BACKEND_HEALTH_PATH}"
HTTP_CODE_API="$(curl -s -o /tmp/apihealth.out -w "%{http_code}" "${RENDER_URL}${API_PREFIX}${BACKEND_HEALTH_PATH}" || true)"
if [[ "$HTTP_CODE_API" == "200" ]]; then
  ok "Render API health OK (200)"
  head -c 400 /tmp/apihealth.out || true
  echo
else
  warn "API health returned HTTP $HTTP_CODE_API (this is OK if you don't expose /api/health)"
fi

say "3) CORS verification (preflight + GET)"
if [[ -z "$VERCEL_URL" ]]; then
  warn "VERCEL_URL not set. CORS checks will use a placeholder origin."
  ORIGIN="https://example.vercel.app"
else
  ORIGIN="$VERCEL_URL"
fi

echo "Preflight OPTIONS to ${RENDER_URL}${API_PREFIX}${BACKEND_HEALTH_PATH} with Origin: $ORIGIN"
CORS_HEADERS="$(curl -s -D - -o /dev/null -X OPTIONS \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  "${RENDER_URL}${API_PREFIX}${BACKEND_HEALTH_PATH}" || true)"

echo "$CORS_HEADERS" | sed -n '1,20p'
if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin"; then
  ok "CORS preflight returned Access-Control-Allow-Origin"
else
  warn "No Access-Control-Allow-Origin seen in preflight response."
  warn "If your backend only enables CORS on /api routes, ensure you're hitting a valid /api endpoint."
fi

echo "GET with Origin header to ${RENDER_URL}${API_PREFIX}${BACKEND_HEALTH_PATH}"
GET_HEADERS="$(curl -s -D - -o /dev/null \
  -H "Origin: ${ORIGIN}" \
  "${RENDER_URL}${API_PREFIX}${BACKEND_HEALTH_PATH}" || true)"

echo "$GET_HEADERS" | sed -n '1,20p'
if echo "$GET_HEADERS" | grep -qi "access-control-allow-origin"; then
  ok "CORS GET returned Access-Control-Allow-Origin"
else
  warn "No Access-Control-Allow-Origin seen on GET response."
fi

say "4) Frontend wiring check (VITE_API_URL) + local build"
if [[ ! -d "$FRONTEND_DIR" ]]; then
  fail "Frontend dir not found: $FRONTEND_DIR (set FRONTEND_DIR if different)"
fi

pushd "$FRONTEND_DIR" >/dev/null

# Detect package manager
PKG_MGR="npm"
if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then PKG_MGR="pnpm"; fi
if [[ -f yarn.lock ]] && command -v yarn >/dev/null 2>&1; then PKG_MGR="yarn"; fi
ok "Using package manager: $PKG_MGR"

say "Installing deps (if needed) and building with VITE_API_URL=${RENDER_URL}"
export VITE_API_URL="${RENDER_URL}"
case "$PKG_MGR" in
  npm)  npm install && npm run build ;;
  pnpm) pnpm install && pnpm build ;;
  yarn) yarn install && yarn build ;;
 esac
ok "Frontend build completed."

say "5) Vercel SPA rewrite check"
if [[ -f vercel.json ]]; then
  ok "Found frontend/vercel.json"
  echo "vercel.json (first 120 lines):"
  sed -n '1,120p' vercel.json
else
  warn "No vercel.json found in ${FRONTEND_DIR}."
  warn "If you're using a SPA (React Router), you likely need a rewrite to /index.html."
fi

say "6) Exactly what to set in Render + Vercel"
cat <<EOF

--- Render (Backend) ENV ---
PORT                 (Render sets this automatically; do NOT hardcode)
DATABASE_URL         (your prod DB connection string)
CORS_ORIGIN          ${VERCEL_URL:-https://YOUR_VERCEL_DOMAIN}
NODE_ENV             production

Start command on Render:
  node dist/index.js

Health check:
  ${RENDER_URL}${BACKEND_HEALTH_PATH}

--- Vercel (Frontend) ENV ---
VITE_API_URL         ${RENDER_URL}

Notes:
- Frontend calls: \${VITE_API_URL}${API_PREFIX}/*
- Backend health is usually: ${RENDER_URL}${BACKEND_HEALTH_PATH}
- Make sure backend routes are mounted under ${API_PREFIX} if your frontend assumes that.

EOF

say "7) Optional: local preview (sanity test) — Ctrl+C to stop"
read -r -p "Start local dev server now? (y/N): " ANS || true
ANS="${ANS:-N}"
if [[ "$ANS" =~ ^[Yy]$ ]]; then
  ok "Starting dev server with VITE_API_URL=${RENDER_URL}"
  case "$PKG_MGR" in
    npm)  npm run dev ;;
    pnpm) pnpm dev ;;
    yarn) yarn dev ;;
  esac
else
  ok "Skipped local dev server."
fi

popd >/dev/null

say "DONE ✅"
echo "If health + CORS are good and Vercel has VITE_API_URL set to ${RENDER_URL}, you are ready to deploy."

###############################################################################
# If you want this as a reusable script file, create it like this:
#   mkdir -p scripts
#   nano scripts/go_live_render_vercel.sh   (paste contents)
#   chmod +x scripts/go_live_render_vercel.sh
###############################################################################
