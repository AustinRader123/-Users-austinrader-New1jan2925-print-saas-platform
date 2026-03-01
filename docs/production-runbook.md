# Production Runbook

## Deployment Path
- Primary path in this repo is Docker Compose using `docker-compose.production.yml`.
- Reverse proxy is Nginx using `deploy/nginx.production.conf`.
- Backend + frontend now expose release identity via `GET /api/version` and `X-App-Version`.

## Required metadata/env
- `APP_VERSION` (example: `v0.18.0`)
- `GIT_SHA` (short git SHA, example: `abcdef1`)
- `BUILD_TIME` (ISO timestamp, example: `2026-03-01T12:34:56Z`)
- `APP_ENV=production`

## Local Preflight (must pass before deploy)
```bash
set -euo pipefail
cd /path/to/repo

git fetch origin --tags
git checkout main
git pull --ff-only

# confirm release tag exists and points to expected commit
git rev-parse v0.18.0
git show --no-patch --oneline v0.18.0

DOCTOR_ALLOW_LOCALHOST_DB=1 npm run release:check
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
```

## Server Preflight
```bash
set -euo pipefail
cd /srv/print-saas

docker info >/dev/null
ss -ltnp | grep -E ':80|:443|:3100|:8080' || true

# check DB connectivity from deploy environment
docker compose -f docker-compose.production.yml --env-file .env.production run --rm backend \
   sh -lc 'node -e "const {Client}=require(\"pg\");const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>{console.log(\"db ok\");return c.end()}).catch(e=>{console.error(e.message);process.exit(1);});"'
```

## Go Live (Docker Compose)
```bash
set -euo pipefail
cd /srv/print-saas

git fetch origin --tags
git checkout v0.18.0

export APP_VERSION=v0.18.0
export GIT_SHA="$(git rev-parse --short=7 HEAD)"
export BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# optional: persist metadata in env file used by compose
grep -q '^APP_VERSION=' .env.production && sed -i.bak "s/^APP_VERSION=.*/APP_VERSION=${APP_VERSION}/" .env.production || echo "APP_VERSION=${APP_VERSION}" >> .env.production
grep -q '^GIT_SHA=' .env.production && sed -i.bak "s/^GIT_SHA=.*/GIT_SHA=${GIT_SHA}/" .env.production || echo "GIT_SHA=${GIT_SHA}" >> .env.production
grep -q '^BUILD_TIME=' .env.production && sed -i.bak "s/^BUILD_TIME=.*/BUILD_TIME=${BUILD_TIME}/" .env.production || echo "BUILD_TIME=${BUILD_TIME}" >> .env.production

docker compose -f docker-compose.production.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.production.yml --env-file .env.production up -d

docker compose -f docker-compose.production.yml --env-file .env.production exec -T backend npm run db:deploy
docker compose -f docker-compose.production.yml --env-file .env.production exec -T backend npm run db:seed

# reload edge nginx only if separately managed outside compose
sudo nginx -t && sudo systemctl reload nginx || true
```

## Non-Docker fallback (systemd/pm2)
```bash
set -euo pipefail
cd /srv/print-saas
git fetch origin --tags
git checkout v0.18.0

export APP_VERSION=v0.18.0
export GIT_SHA="$(git rev-parse --short=7 HEAD)"
export BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export APP_ENV=production

cd backend && npm ci && npm run build && npm run db:deploy && cd ..
cd frontend && npm ci && npm run build && cd ..

pm2 restart backend || sudo systemctl restart skuflow-backend
pm2 restart frontend || sudo systemctl restart skuflow-frontend
sudo nginx -t && sudo systemctl reload nginx
```

## Post-deploy verification (proof of live changes)
```bash
set -euo pipefail
DOMAIN="https://YOURDOMAIN.COM"

curl -fsS "$DOMAIN/health"
curl -fsS "$DOMAIN/ready"
curl -fsS "$DOMAIN/api/version"
curl -I "$DOMAIN/api/version" | grep -i '^x-app-version:'

# app-level smoke for version endpoint shape and expected version
BASE_URL="$DOMAIN" EXPECTED_VERSION="v0.18.0" npm run smoke:version
```

Manual UI checks:
- Open homepage and verify footer line shows `Version: v0.18.0 (COMMIT_SHA)`.
- Confirm `Environment: production` and ISO build time are visible.
- Run happy path: product → cart → checkout → order created.

## Cache/CDN hardening
- Frontend Nginx now serves:
   - HTML/app shell routes with `Cache-Control: no-store, must-revalidate`
   - `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`
- If behind CDN (Cloudflare/Vercel/other), either:
   - rely on fingerprinted assets (preferred), and/or
   - purge HTML cache after deploy.
- No service worker is currently registered in the frontend app.

## Rollback (tag-based)
```bash
set -euo pipefail
cd /srv/print-saas

git fetch origin --tags
git checkout v0.17.0

export APP_VERSION=v0.17.0
export GIT_SHA="$(git rev-parse --short=7 HEAD)"
export BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

docker compose -f docker-compose.production.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.production.yml --env-file .env.production up -d

curl -fsS https://YOURDOMAIN.COM/api/version
```

Rollback DB policy:
- Prefer forward-fix migration strategy over destructive rollback.
- Restore DB snapshot only if data-level corruption requires it.

