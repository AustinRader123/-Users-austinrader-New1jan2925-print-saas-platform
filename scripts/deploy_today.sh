#!/usr/bin/env bash
set -euo pipefail

# Deploy-to-public guide for Render (backend) + Vercel (frontend)
# - Prints exact steps and env vars
# - Detects Prisma
# - Optional local builds with RUN_LOCAL_BUILD=1

say(){ printf "\n\033[1m%s\033[0m\n" "$*"; }

say "==> 1) Validate repo layout"
if [ ! -d backend ] || [ ! -f backend/package.json ]; then echo "ERROR: missing backend/ or backend/package.json"; exit 1; fi
if [ ! -d frontend ] || [ ! -f frontend/package.json ]; then echo "ERROR: missing frontend/ or frontend/package.json"; exit 1; fi

PRISMA_PRESENT="no"
if [ -f backend/prisma/schema.prisma ]; then PRISMA_PRESENT="yes"; fi
echo "Prisma detected: $PRISMA_PRESENT"

say "==> 2) Render setup (Backend)"
cat <<'EOF'
- Create a NEW Web Service on Render from this GitHub repo.
- Render will auto-detect render.yaml at repo root.
- Ensure Service Settings:
  - Environment: Node
  - Root Directory: backend
  - Build Command:
      npm ci && ( [ -f prisma/schema.prisma ] && npx prisma generate || true ) && ( npm run build || true )
  - Start Command:
      bash -lc '([ -f prisma/schema.prisma ] && npx prisma migrate deploy || true); ( npm start || node dist/index.js )'
  - Health Check Path: /health
  - Auto Deploy: true
- Environment Variables (Render → Environment):
  - NODE_ENV=production
  - DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<db>?schema=public
  - (optional) JWT_SECRET=<your random secret>
  - (optional) CORS_ORIGIN=https://<your-vercel-project>.vercel.app
EOF

say "==> 3) Get backend public URL"
echo "Example: https://print-saas-backend.onrender.com"
echo "Verify:\n  curl -sSf https://<RENDER_URL>/__ping\n  curl -sSf https://<RENDER_URL>/health"

say "==> 4) Vercel setup (Frontend)"
cat <<'EOF'
- Import project from GitHub in Vercel.
- Set Root Directory = frontend
- Build Command: npm install && npm run build
- Output Directory: dist
- Environment Variables (Vercel → Settings → Environment Variables):
  - VITE_API_URL=https://<RENDER_URL>/api
- Routing (SPA): vercel.json rewrites all routes to /index.html
EOF

say "==> 5) CORS"
cat <<'EOF'
- Backend production CORS is controlled by CORS_ORIGIN.
- Set CORS_ORIGIN to your Vercel site URL (comma-separated if multiple):
  CORS_ORIGIN=https://<your-vercel-project>.vercel.app
- Development is permissive (*).
EOF

say "==> 6) Optional local builds (RUN_LOCAL_BUILD=1)"
if [ "${RUN_LOCAL_BUILD:-0}" = "1" ]; then
  echo "Running local builds..."
  (cd backend && npm ci && [ -f prisma/schema.prisma ] && npx prisma generate || true && npm run build)
  (cd frontend && npm ci && npm run build)
else
  echo "Skipping local builds; set RUN_LOCAL_BUILD=1 to run."
fi

say "==> 7) Exact env vars to set"
cat <<EOF
Render (Backend):
  NODE_ENV=production
  DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<db>?schema=public
  JWT_SECRET=<random>
  CORS_ORIGIN=https://<your-vercel-project>.vercel.app

Vercel (Frontend):
  VITE_API_URL=https://<RENDER_URL>/api
EOF

say "==> 8) Verify after deploy"
cat <<'EOF'
Backend:
  curl -sSf https://<RENDER_URL>/__ping
  curl -sSf https://<RENDER_URL>/health | jq
Frontend:
  Open https://<VERCEL_URL> in browser
  Login, browse, and perform a basic flow
EOF

say "==> DONE ✅"
echo "Run: bash scripts/deploy_today.sh"

exit 0

#######################################
# 0) REQUIRED SETTINGS (EDIT THESE)
#######################################
REPO_URL="https://github.com/AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform.git"
BRANCH="chore/nightly-regression-pass"

# Your public domain (leave blank to skip HTTPS + domain proxy)
DOMAIN=""

# Email for TLS (Caddy uses it for ACME; optional but recommended if DOMAIN set)
TLS_EMAIL=""

# App ports INSIDE the docker network (the ports your services listen on)
# If unsure: frontend often 5173 (Vite) or 3000; backend often 3001/4000/8080.
FRONTEND_INTERNAL_PORT="5173"
BACKEND_INTERNAL_PORT="3001"

# The external ports you want open on the server (usually 80/443 only, via proxy)
# If you skip DOMAIN, we’ll expose the frontend on EXPOSE_FRONTEND_PORT.
EXPOSE_FRONTEND_PORT="5173"
EXPOSE_BACKEND_PORT="3001"

# Where to deploy on the server
DEPLOY_DIR="$HOME/apps/print-saas-platform"

#######################################
# 1) ENV VALUES (EDIT THESE ONCE)
#    Script will write .env files if missing.
#######################################

# Database (used by backend). If your compose already defines DB service,
# this DATABASE_URL should point to that service name.
# Common: postgres://user:pass@db:5432/dbname?schema=public
DATABASE_URL="postgresql://postgres:postgres@db:5432/print_saas?schema=public"

# Example app secrets (adjust to your stack)
APP_ENV="production"
JWT_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
SESSION_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
CORS_ORIGIN=""   # if DOMAIN set, script will auto-fill https://DOMAIN

# Frontend API URL (what the browser uses to reach backend).
# If DOMAIN set, script will auto-fill: https://DOMAIN/api
VITE_API_URL=""  # or NEXT_PUBLIC_API_URL depending on your app

#######################################
# 2) OPTIONAL: CI/E2E confirmation
#######################################
RUN_CI_GOD_SCRIPT="false"  # set "true" if you want it to run scripts/god.sh
GH_REPO_SLUG='AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform'
GH_WORKFLOW="nightly-e2e.yml"
GH_BRANCH="$BRANCH"

#######################################
# Internal helpers
#######################################
log() { echo -e "\n\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\n\033[1;33mWARN:\033[0m $*" >&2; }
die() { echo -e "\n\033[1;31mERROR:\033[0m $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return 0
  fi
  die "Docker Compose not found. Install Docker Desktop (local) or Docker Engine + Compose (server)."
}

#######################################
# 3) PREREQS
#######################################
log "Checking prerequisites"
need_cmd git
need_cmd docker
COMPOSE="$(detect_compose)"

#######################################
# 4) CLONE / UPDATE REPO
#######################################
log "Preparing deploy directory: $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

if [ ! -d ".git" ]; then
  log "Cloning repo"
  git clone "$REPO_URL" .
else
  log "Repo exists; fetching updates"
  git fetch --all --prune
fi

log "Checking out branch: $BRANCH"
git checkout "$BRANCH" || git checkout -b "$BRANCH" "origin/$BRANCH"
git pull --rebase || true

#######################################
# 5) DISCOVER PROJECT SHAPE
#######################################
log "Detecting project layout"
HAS_COMPOSE="false"
if [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ] || [ -f "compose.yml" ] || [ -f "compose.yaml" ]; then
  HAS_COMPOSE="true"
fi

COMPOSE_FILE=""
for f in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
  if [ -f "$f" ]; then COMPOSE_FILE="$f"; break; fi
done

if [ "$HAS_COMPOSE" != "true" ]; then
  die "No docker-compose.yml/compose.yml found in repo root. Create one or move this script to the folder that has it."
fi
log "Using compose file: $COMPOSE_FILE"

# Infer likely service names
SERVICES="$($COMPOSE -f "$COMPOSE_FILE" config --services 2>/dev/null || true)"
if [ -z "$SERVICES" ]; then
  die "Unable to parse compose services. Run: $COMPOSE -f $COMPOSE_FILE config --services"
fi
log "Compose services detected: $(echo "$SERVICES" | tr '\n' ' ')"

pick_service() {
  local patterns=("$@")
  local s
  for p in "${patterns[@]}"; do
    while read -r s; do
      if [[ "$s" == *"$p"* ]]; then
        echo "$s"; return 0
      fi
    done <<< "$SERVICES"
  done
  echo ""
}

BACKEND_SERVICE="$(pick_service backend api server app)"
DB_SERVICE="$(pick_service db postgres database)"
FRONTEND_SERVICE="$(pick_service frontend web client ui)"

if [ -z "$BACKEND_SERVICE" ]; then warn "Could not auto-detect backend service name (backend/api/server). Migrations may be skipped."; fi
if [ -z "$DB_SERVICE" ]; then warn "Could not auto-detect DB service name (db/postgres). If your DB is external, that's fine."; fi
if [ -z "$FRONTEND_SERVICE" ]; then warn "Could not auto-detect frontend service name (frontend/web/client)."; fi

log "Detected services:
- BACKEND_SERVICE=${BACKEND_SERVICE:-<none>}
- FRONTEND_SERVICE=${FRONTEND_SERVICE:-<none>}
- DB_SERVICE=${DB_SERVICE:-<none>}"

#######################################
# 6) WRITE ENV FILES (IDEMPOTENT)
#######################################
log "Preparing environment files"

# Auto-fill CORS + API URL if DOMAIN is set
if [ -n "$DOMAIN" ]; then
  if [ -z "$CORS_ORIGIN" ]; then CORS_ORIGIN="https://$DOMAIN"; fi
  if [ -z "$VITE_API_URL" ]; then VITE_API_URL="https://$DOMAIN/api"; fi
fi

# Root .env (common)
if [ ! -f ".env" ]; then
  cat > .env <<EOF
APP_ENV=$APP_ENV
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
CORS_ORIGIN=$CORS_ORIGIN
VITE_API_URL=$VITE_API_URL
EOF
  log "Created .env"
else
  log ".env exists; leaving as-is"
fi

# Backend .env (if backend folder exists)
if [ -d "backend" ] && [ ! -f "backend/.env" ]; then
  cat > backend/.env <<EOF
APP_ENV=$APP_ENV
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
CORS_ORIGIN=$CORS_ORIGIN
EOF
  log "Created backend/.env"
fi

# Frontend .env (if frontend folder exists)
if [ -d "frontend" ] && [ ! -f "frontend/.env" ]; then
  cat > frontend/.env <<EOF
VITE_API_URL=$VITE_API_URL
EOF
  log "Created frontend/.env"
fi

#######################################
# 7) OPTIONAL: ADD CADDY REVERSE PROXY (HTTPS) WITHOUT TOUCHING YOUR MAIN COMPOSE
#######################################
# If DOMAIN is set, we generate an override compose + Caddyfile that:
# - serves frontend at https://DOMAIN
# - proxies /api/* to backend
# - auto TLS via ACME
#
# This avoids guessing Nginx configs, and avoids editing your existing compose.
################################################################################
CADDY_OVERRIDE="docker-compose.caddy.override.yml"
CADDYFILE="Caddyfile"

USE_CADDY="false"
if [ -n "$DOMAIN" ]; then
  USE_CADDY="true"
  log "DOMAIN provided -> enabling HTTPS reverse proxy via Caddy"

  [ -n "$TLS_EMAIL" ] || warn "TLS_EMAIL not set. Caddy will still work, but set TLS_EMAIL for best results."

  # Caddyfile
  cat > "$CADDYFILE" <<EOF
{$DOMAIN} {
  encode gzip zstd

  # Frontend
  reverse_proxy ${FRONTEND_SERVICE:-frontend}:${FRONTEND_INTERNAL_PORT}

  # Backend API (adjust /api if your backend path differs)
  handle_path /api/* {
    reverse_proxy ${BACKEND_SERVICE:-backend}:${BACKEND_INTERNAL_PORT}
  }
}
EOF

  # Override compose: adds caddy container on 80/443
  cat > "$CADDY_OVERRIDE" <<EOF
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - ACME_AGREE=true
      - EMAIL=${TLS_EMAIL}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - ${FRONTEND_SERVICE:-frontend}
      - ${BACKEND_SERVICE:-backend}

volumes:
  caddy_data:
  caddy_config:
EOF
fi

#######################################
# 8) START STACK (DB FIRST), RUN MIGRATIONS, THEN FULL START
#######################################
log "Starting services via Docker Compose"
if [ "$USE_CADDY" = "true" ]; then
  $COMPOSE -f "$COMPOSE_FILE" -f "$CADDY_OVERRIDE" up -d --build
else
  $COMPOSE -f "$COMPOSE_FILE" up -d --build
fi

log "Waiting briefly for containers to initialize"
sleep 5

#######################################
# 9) RUN PRISMA MIGRATIONS IF DETECTED
#######################################
# We try several common cases:
# - prisma/schema.prisma in repo root
# - backend/prisma/schema.prisma
# And we attempt to run via backend service:
#   npx prisma migrate deploy
#   npx prisma db seed (optional, only if package.json has prisma.seed or seed script)
################################################################################
HAS_PRISMA="false"
if [ -f "prisma/schema.prisma" ] || [ -f "backend/prisma/schema.prisma" ]; then
  HAS_PRISMA="true"
fi

if [ "$HAS_PRISMA" = "true" ] && [ -n "$BACKEND_SERVICE" ]; then
  log "Prisma detected -> running migrations inside backend service: $BACKEND_SERVICE"

  # Migrate deploy
  set +e
  $COMPOSE -f "$COMPOSE_FILE" ${USE_CADDY:+-f "$CADDY_OVERRIDE"} exec -T "$BACKEND_SERVICE" sh -lc \
    'if command -v npx >/dev/null 2>&1; then npx prisma migrate deploy; else echo "npx missing"; exit 12; fi'
  MIG_STATUS=$?
  set -e
  if [ $MIG_STATUS -ne 0 ]; then
    warn "Prisma migrate deploy failed (exit $MIG_STATUS). Check backend logs. Continuing so you can inspect."
  fi

  # Optional seed
  set +e
  $COMPOSE -f "$COMPOSE_FILE" ${USE_CADDY:+-f "$CADDY_OVERRIDE"} exec -T "$BACKEND_SERVICE" sh -lc \
    'if [ -f package.json ] && (cat package.json | grep -q "\"seed\"" || cat package.json | grep -q "prisma.*seed"); then echo "Seeding..."; npx prisma db seed; else echo "No seed config detected; skipping seed."; fi'
  SEED_STATUS=$?
  set -e
  if [ $SEED_STATUS -ne 0 ]; then
    warn "Prisma seed failed (exit $SEED_STATUS). Often safe to ignore; check logs if needed."
  fi
else
  log "Prisma not detected or backend service not identified -> skipping migrations"
fi

#######################################
# 10) HEALTH / LOG HINTS
#######################################
log "Printing container status"
$COMPOSE -f "$COMPOSE_FILE" ${USE_CADDY:+-f "$CADDY_OVERRIDE"} ps

log "Printing recent logs (last ~60 lines per service)"
$COMPOSE -f "$COMPOSE_FILE" ${USE_CADDY:+-f "$CADDY_OVERRIDE"} logs --tail=60 || true

#######################################
# 11) DNS + URL OUTPUT
#######################################
if [ -n "$DOMAIN" ]; then
  log "PUBLIC SITE (after DNS points to this server): https://$DOMAIN"
  echo ""
  echo "DNS REQUIRED:"
  echo "  Create an A record for $DOMAIN -> your server public IP"
  echo "  (If you use www, also add: www.$DOMAIN -> same IP)"
  echo ""
  echo "Once DNS is set, Caddy will automatically provision HTTPS."
else
  # Without domain, expose direct ports (your compose must publish them).
  log "NO DOMAIN: using direct port access."
  echo "Try:"
  echo "  Frontend: http://<SERVER_IP>:${EXPOSE_FRONTEND_PORT}"
  echo "  Backend:  http://<SERVER_IP>:${EXPOSE_BACKEND_PORT}"
fi

#######################################
# 12) OPTIONAL: RUN CI GOD SCRIPT (E2E)
#######################################
if [ "$RUN_CI_GOD_SCRIPT" = "true" ]; then
  log "RUN_CI_GOD_SCRIPT=true -> attempting to run scripts/god.sh"
  if [ -f "scripts/god.sh" ]; then
    chmod +x scripts/*.sh 2>/dev/null || true

    # Requires gh + auth
    if command -v gh >/dev/null 2>&1; then
      if gh auth status >/dev/null 2>&1; then
        DISPATCH=1 \
        REPO="$GH_REPO_SLUG" \
        BRANCH="$GH_BRANCH" \
        WORKFLOW="$GH_WORKFLOW" \
        AUTO_OPEN_REPORT=true \
        bash scripts/god.sh || warn "god.sh failed; check output above."
      else
        warn "gh not authenticated. Run: gh auth login (then re-run this script)."
      fi
    else
      warn "gh CLI not installed; skipping CI god script."
    fi
  else
    warn "scripts/god.sh not found; skipping CI god script."
  fi
else
  log "CI/E2E step skipped (RUN_CI_GOD_SCRIPT=false)."
  echo "If you want it, set RUN_CI_GOD_SCRIPT=\"true\" near the top and re-run."
fi

log "DONE ✅ Re-run this script anytime to redeploy safely."
