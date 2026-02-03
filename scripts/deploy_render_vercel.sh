#!/usr/bin/env bash
set -euo pipefail

echo "==> Render + Vercel Deploy Helper"

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

# Basic checks
if [ ! -d "$ROOT_DIR/backend" ] || [ ! -d "$ROOT_DIR/frontend" ]; then
  echo "ERROR: Expected backend/ and frontend/ at repo root: $ROOT_DIR" >&2
  exit 1
fi

PRISMA_SCHEMA="$(ls "$ROOT_DIR"/backend/prisma/schema.prisma 2>/dev/null || true)"
if [ -n "$PRISMA_SCHEMA" ]; then
  echo "Prisma detected: $PRISMA_SCHEMA"
else
  echo "Prisma not detected (optional)"
fi

cat <<'OUT'

==> Render (Backend) Settings
- Type: Web Service
- Root Directory: backend
- Build Command:
    npm ci && ( [ -f prisma/schema.prisma ] && npx prisma generate || true ) && ( npm run build || true )
- Start Command:
    bash -lc '([ -f prisma/schema.prisma ] && npx prisma migrate deploy || true); ( npm start || node dist/index.js )'
- Health Check Path: /health
- Auto Deploy: true
- Environment Variables:
    NODE_ENV=production
    PORT=(auto-managed by Render)
    DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<db>?schema=public
    CORS_ORIGIN=https://<your-vercel-project>.vercel.app
    JWT_SECRET=<random-secret>

==> Vercel (Frontend) Settings
- Root Directory: frontend
- Build Command: npm install && npm run build
- Output Directory: dist
- Environment Variables:
    VITE_API_URL=https://<RENDER_URL>/api
- Routing: vercel.json with rewrite { "source": "/(.*)", "destination": "/index.html" }

==> Env Templates
Backend (.env.example):
  NODE_ENV=production
  PORT=3001
  DATABASE_URL=postgresql://postgres:password@localhost:5432/deco_network
  CORS_ORIGIN=https://your-vercel-app.vercel.app
  JWT_SECRET=your-secret-key-change-in-production

Frontend (.env.example):
  VITE_API_URL=http://localhost:3000/api

==> Verification
After Render deploy:
  curl -sSf https://<RENDER_URL>/health | jq

After Vercel deploy:
  Open https://<VERCEL_URL>
  In browser console:
    fetch('https://<RENDER_URL>/health').then(r=>r.json()).then(console.log)
If CORS error: Update CORS_ORIGIN on Render to include EXACT Vercel domain.

==> Done
OUT

exit 0