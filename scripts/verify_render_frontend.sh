#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   RENDER_URL=https://<your-render-service>.onrender.com scripts/verify_render_frontend.sh
#   or
#   scripts/verify_render_frontend.sh https://<your-render-service>.onrender.com

RENDER_URL="${RENDER_URL:-${1:-}}"
if [[ -z "${RENDER_URL}" ]]; then
  echo "Usage: RENDER_URL=https://<render-url> $0"
  echo "   or: $0 https://<render-url>"
  exit 1
fi

echo "############################################"
echo "# STEP 7 — Verify Render backend is reachable"
echo "############################################"
echo "Testing backend health..."
if curl -sSf "${RENDER_URL}/health" >/dev/null; then
  echo "✅ Render backend healthy: ${RENDER_URL}/health"
else
  echo "❌ Backend not reachable: ${RENDER_URL}/health"
  exit 2
fi

echo
echo "############################################"
echo "# STEP 8 — Ensure backend CORS is set for Vercel"
echo "############################################"
echo "Make sure Render env has:"
echo "CORS_ORIGIN=https://YOUR_VERCEL_DOMAIN"

echo
echo "############################################"
echo "# STEP 9 — Run frontend locally against production backend"
echo "############################################"
# Run Vite dev and point API URL to Render backend root (client appends /api)
pushd frontend >/dev/null
export VITE_API_URL="${RENDER_URL}"
echo "Using API URL: ${VITE_API_URL}"
# Start dev server in background so the script can continue
npm run dev & DEV_PID=$!
# Give Vite a moment to start
sleep 5
# Vite may auto-select a free port if 5173 is busy
echo "Open: http://localhost:5173 (or auto-selected port shown by Vite)"
echo "App should call: ${VITE_API_URL}/api/*"
popd >/dev/null

echo
echo "############################################"
echo "# STEP 10 — Browser-level check"
echo "############################################"
echo "In browser DevTools:"
echo "1. Network tab → refresh page"
echo "2. Confirm API calls go to ${RENDER_URL}/api"
echo "3. No CORS errors"
echo "4. Health endpoint: ${RENDER_URL}/health returns 200"

echo
echo "############################################"
echo "# STEP 11 — Production readiness confirmation"
echo "############################################"
echo "If all above pass:"
echo "🎉 SITE IS PRODUCTION READY"
echo "Render = backend API"
echo "Vercel = frontend SPA"
echo "Health, CORS, env wiring all confirmed"
