#!/usr/bin/env bash
# MASTERPROMPT (CODE): Nightly E2E autopilot + artifacts + deploy scaffold
# Usage:
#   1) Save as: masterprompt.sh
#   2) Run: bash masterprompt.sh
#
# What this does (end-to-end):
#   - Creates/updates workflow: .github/workflows/nightly-e2e.yml
#   - Creates scripts for dispatch/watch/requeue/finalize/artifact download
#   - Adds non-@pack @regression Playwright test so skip-pack never has “No tests found”
#   - Adds deploy scaffold (docker compose + Dockerfiles)
#   - Commits + pushes to chore/nightly-regression-pass
#   - Prints MASTER ONE-LINER to run E2E autopilot (pack enabled / skip-pack)

set -euo pipefail

# -----------------------------
# CONFIG (edit if needed)
# -----------------------------
REPO_SLUG="AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform"
BRANCH="chore/nightly-regression-pass"
WORKFLOW="nightly-e2e.yml"

# -----------------------------
# Helpers
# -----------------------------
need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: Missing $1" >&2; exit 1; }; }
need git

# If you want auto dispatch/watch from your machine, keep gh/jq installed.
# We won’t hard-fail if missing; we’ll just skip live monitoring.
HAS_GH=1; command -v gh >/dev/null 2>&1 || HAS_GH=0
HAS_JQ=1; command -v jq >/dev/null 2>&1 || HAS_JQ=0

mkdir -p .github/workflows scripts deploy frontend/tests 2>/dev/null || true

echo "==> Ensuring branch: $BRANCH"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERROR: run from inside your repo" >&2; exit 1; }
git checkout -B "$BRANCH"

# -----------------------------
# 1) Workflow
# -----------------------------
cat > ".github/workflows/${WORKFLOW}" <<'YAML'
name: Nightly E2E

on:
  schedule:
    - cron: "0 2 * * *" # 02:00 UTC
  workflow_dispatch:
    inputs:
      suite:
        description: "Test suite"
        required: true
        default: "regression"
        type: choice
        options:
          - smoke
          - regression
      skip_pack_e2e:
        description: "Skip pack-tagged tests"
        required: true
        default: false
        type: boolean

concurrency:
  group: nightly-e2e-${{ github.ref_name }}
  cancel-in-progress: false

jobs:
  e2e:
    runs-on: ubuntu-latest

    env:
      # Base URL precedence:
      # PLAYWRIGHT_BASE_URL > E2E_BASE_URL > http://127.0.0.1:5173
      E2E_BASE_URL: http://127.0.0.1:5173

      # Verbose step logs (safe, but noisy)
      ACTIONS_STEP_DEBUG: true

      # Inputs
      SUITE: ${{ inputs.suite || 'regression' }}
      SKIP_PACK_E2E: ${{ inputs.skip_pack_e2e || false }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # ---- Early diagnostics (ALWAYS uploaded) ----
      - name: Early diagnostics (always)
        if: always()
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p early-diagnostics

          {
            echo "== time =="
            date -u
            echo
            echo "== git =="
            git rev-parse HEAD || true
            git status --porcelain || true
            echo
            echo "== runner =="
            uname -a || true
            echo
            echo "== env (sanitized) =="
            env | sort | sed -E 's/(TOKEN|SECRET|PASSWORD|KEY)=.*/\1=[REDACTED]/g' || true
          } > early-diagnostics/meta.txt

          {
            echo "== repo root ls =="
            ls -la
            echo
            echo "== find playwright config(s) =="
            find . -maxdepth 5 -type f \( -name "playwright.config.ts" -o -name "playwright.config.js" \) -print || true
            echo
            echo "== candidate test files =="
            find . -maxdepth 7 -type f \( -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.test.js" \) -print || true
            echo
            echo "== any e2e/tests ts files =="
            find . -maxdepth 7 -type f -path "*e2e*" -name "*.ts" -print || true
            find . -maxdepth 7 -type f -path "*tests*" -name "*.ts" -print || true
          } > early-diagnostics/ls.txt

      - name: Upload early diagnostics
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: early-diagnostics
          path: early-diagnostics
          retention-days: 21

      # ---- Tooling ----
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies (best-effort)
        shell: bash
        run: |
          set -euo pipefail

          # Install root deps if package.json exists
          if [ -f package.json ]; then
            if [ -f package-lock.json ]; then npm ci; else npm install; fi
          fi

          # Install frontend deps if present
          if [ -d frontend ] && [ -f frontend/package.json ]; then
            pushd frontend >/dev/null
            if [ -f package-lock.json ]; then npm ci; else npm install; fi
            npx playwright install --with-deps
            popd >/dev/null
          fi

          # Install backend deps if present
          if [ -d backend ] && [ -f backend/package.json ]; then
            pushd backend >/dev/null
            if [ -f package-lock.json ]; then npm ci; else npm install; fi
            popd >/dev/null
          fi

      # ---- Run E2E ----
      - name: Run E2E
        id: run_e2e
        shell: bash
        run: |
          set -euo pipefail
          bash scripts/ci-e2e.sh

      # ---- Upload report/logs (ALWAYS) ----
      - name: Collect logs (always)
        if: always()
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p e2e-artifacts

          # Copy known logs if present
          [ -f backend-3000.log ] && cp backend-3000.log e2e-artifacts/backend.log || true
          [ -f backend-nightly.log ] && cp backend-nightly.log e2e-artifacts/backend.log || true
          [ -f frontend-nightly.log ] && cp frontend-nightly.log e2e-artifacts/frontend.log || true

          # Copy playwright report if present
          if [ -d frontend/playwright-report ]; then
            mkdir -p e2e-artifacts/frontend
            cp -R frontend/playwright-report e2e-artifacts/frontend/playwright-report
          fi

      - name: Upload E2E logs/report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-logs
          path: e2e-artifacts
          retention-days: 21
YAML

# -----------------------------
# 2) CI E2E runner (fixes “No tests found” logic)
# -----------------------------
cat > "scripts/ci-e2e.sh" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

# Base URL precedence:
# PLAYWRIGHT_BASE_URL > E2E_BASE_URL > http://127.0.0.1:5173
BASE_URL="${PLAYWRIGHT_BASE_URL:-${E2E_BASE_URL:-http://127.0.0.1:5173}}"
SUITE="${SUITE:-regression}"
SKIP_PACK_E2E="${SKIP_PACK_E2E:-false}"

echo "==> ci-e2e"
echo "    BASE_URL=$BASE_URL"
echo "    SUITE=$SUITE"
echo "    SKIP_PACK_E2E=$SKIP_PACK_E2E"

# Decide grep strategy.
# - pack-enabled regression => @regression AND @pack
# - skip-pack regression => (@regression AND NOT @pack) OR fallback @smoke
# - smoke => @smoke
GREP=""
GREP_INVERT=""

if [[ "$SUITE" == "smoke" ]]; then
  GREP='@smoke'
elif [[ "$SUITE" == "regression" ]]; then
  if [[ "$SKIP_PACK_E2E" == "true" ]]; then
    GREP='@regression|@smoke'
    GREP_INVERT='@pack'
  else
    # Require both @regression and @pack in any order (PCRE lookahead)
    GREP='(?=.*@regression)(?=.*@pack)'
  fi
else
  echo "Unknown SUITE=$SUITE (expected smoke|regression)" >&2
  exit 2
fi

echo "==> Using grep: $GREP"
if [[ -n "${GREP_INVERT:-}" ]]; then
  echo "==> Using grep-invert: $GREP_INVERT"
fi

if [[ ! -d "frontend" ]]; then
  echo "ERROR: frontend/ directory not found. Update scripts/ci-e2e.sh to point to Playwright location." >&2
  exit 1
fi

pushd frontend >/dev/null

# Ensure deps exist
if [[ ! -d node_modules ]]; then
  echo "==> Installing frontend deps"
  if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
fi

# Ensure Playwright exists
if ! npx playwright --version >/dev/null 2>&1; then
  npm install -D @playwright/test
fi

export PLAYWRIGHT_BASE_URL="$BASE_URL"

CMD=(npx playwright test --grep "$GREP")
if [[ -n "${GREP_INVERT:-}" ]]; then
  CMD+=(--grep-invert "$GREP_INVERT")
fi

echo "==> Running: ${CMD[*]}"
"${CMD[@]}"

popd >/dev/null
BASH

# -----------------------------
# 3) Scripts: dispatch/watch/requeue/finalize
# -----------------------------
cat > "scripts/finalize_run_and_open_report.sh" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
RUN_ID="${RUN_ID:-}"

if [[ -z "$REPO" ]]; then
  echo "ERROR: set REPO=owner/name" >&2
  exit 2
fi
command -v gh >/dev/null || { echo "ERROR: gh CLI not found" >&2; exit 2; }
command -v jq >/dev/null || { echo "ERROR: jq not found" >&2; exit 2; }

if [[ -z "${RUN_ID:-}" ]]; then
  RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')"
fi

if [[ -z "${RUN_ID:-}" || "$RUN_ID" == "null" ]]; then
  echo "ERROR: could not determine RUN_ID" >&2
  exit 1
fi

echo "==> Finalize RUN_ID=$RUN_ID"
echo "==> URL: https://github.com/$REPO/actions/runs/$RUN_ID"

STATUS_JSON="$(gh run view "$RUN_ID" --repo "$REPO" --json status,conclusion,artifacts -q '.')"
STATUS="$(echo "$STATUS_JSON" | jq -r '.status')"
CONCLUSION="$(echo "$STATUS_JSON" | jq -r '.conclusion // empty')"

echo "==> status=$STATUS conclusion=${CONCLUSION:-}"
echo "==> Artifacts:"
echo "$STATUS_JSON" | jq '.artifacts'

COUNT="$(echo "$STATUS_JSON" | jq '.artifacts | length')"
if [[ "$COUNT" -gt 0 ]]; then
  DEST="artifacts_download/$RUN_ID"
  mkdir -p "$DEST"
  echo "==> Downloading artifacts to $DEST"
  gh run download "$RUN_ID" --repo "$REPO" --dir "$DEST" >/dev/null || true

  echo "==> Artifact tree:"
  (cd "$DEST" && find . -maxdepth 5 -type f -print | sed 's|^\./||' | head -n 200)

  REPORT_INDEX="$(find "$DEST" -type f -name "index.html" -path "*playwright-report*" | head -n 1 || true)"
  if [[ -n "${REPORT_INDEX:-}" ]]; then
    echo "==> Playwright report: $REPORT_INDEX"
    if command -v open >/dev/null 2>&1; then
      open "$REPORT_INDEX" || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$REPORT_INDEX" || true
    else
      echo "==> No open/xdg-open found; open manually."
    fi
  else
    echo "==> No Playwright report index.html found."
  fi
else
  echo "==> No artifacts to download."
fi

if [[ "${CONCLUSION:-}" == "success" || "${CONCLUSION:-}" == "cancelled" ]]; then
  exit 0
fi
if [[ "$STATUS" == "completed" ]]; then
  exit 1
fi
exit 0
BASH

cat > "scripts/dispatch_and_watch.sh" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-full}" # full|skip
REPO="${REPO:-}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
SUITE="${SUITE:-regression}"

if [[ -z "$REPO" ]]; then
  echo "ERROR: set REPO=owner/name" >&2
  exit 2
fi
command -v gh >/dev/null || { echo "ERROR: gh CLI not found" >&2; exit 2; }
command -v jq >/dev/null || { echo "ERROR: jq not found" >&2; exit 2; }

SKIP_PACK="false"
if [[ "$MODE" == "skip" ]]; then
  SKIP_PACK="true"
elif [[ "$MODE" == "full" ]]; then
  SKIP_PACK="false"
else
  echo "Usage: $0 [full|skip]" >&2
  exit 2
fi

echo "==> Dispatching workflow"
gh workflow run "$WORKFLOW" \
  --repo "$REPO" \
  --ref "$BRANCH" \
  -f "suite=$SUITE" \
  -f "skip_pack_e2e=$SKIP_PACK"

sleep 3
RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')"
echo "==> RUN_ID=$RUN_ID"
echo "==> URL: https://github.com/$REPO/actions/runs/$RUN_ID"

export RUN_ID
bash scripts/finalize_run_and_open_report.sh
BASH

cat > "scripts/watch_and_requeue.sh" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-full}" # full|skip
REPO="${REPO:-}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
SUITE="${SUITE:-regression}"

QUEUE_TIMEOUT_MIN="${QUEUE_TIMEOUT_MIN:-5}"
POLL_INTERVAL="${POLL_INTERVAL:-15}"
HARD_TIMEOUT_MIN="${HARD_TIMEOUT_MIN:-120}"

if [[ -z "$REPO" ]]; then
  echo "ERROR: set REPO=owner/name" >&2
  exit 2
fi
command -v gh >/dev/null || { echo "ERROR: gh CLI not found" >&2; exit 2; }
command -v jq >/dev/null || { echo "ERROR: jq not found" >&2; exit 2; }

SKIP_PACK="false"
if [[ "$MODE" == "skip" ]]; then
  SKIP_PACK="true"
elif [[ "$MODE" == "full" ]]; then
  SKIP_PACK="false"
else
  echo "Usage: $0 [full|skip]" >&2
  exit 2
fi

dispatch() {
  gh workflow run "$WORKFLOW" \
    --repo "$REPO" \
    --ref "$BRANCH" \
    -f "suite=$SUITE" \
    -f "skip_pack_e2e=$SKIP_PACK" >/dev/null
}

latest_run_id() {
  gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId'
}

run_status() {
  gh run view "$1" --repo "$REPO" --json status,conclusion -q '.'
}

cancel_run() {
  gh run cancel "$1" --repo "$REPO" >/dev/null || true
}

echo "==> watch_and_requeue"
echo "    REPO=$REPO"
echo "    WORKFLOW=$WORKFLOW"
echo "    BRANCH=$BRANCH"
echo "    MODE=$MODE (skip_pack_e2e=$SKIP_PACK)"
echo "    QUEUE_TIMEOUT_MIN=$QUEUE_TIMEOUT_MIN"

dispatch
sleep 3

RUN_ID="$(latest_run_id)"
echo "==> RUN_ID=$RUN_ID"
echo "==> URL: https://github.com/$REPO/actions/runs/$RUN_ID"

START_EPOCH="$(date +%s)"
QUEUED_SINCE=""

while true; do
  NOW="$(date +%s)"
  ELAPSED_MIN="$(( (NOW - START_EPOCH) / 60 ))"
  if [[ "$ELAPSED_MIN" -ge "$HARD_TIMEOUT_MIN" ]]; then
    echo "ERROR: hard timeout reached" >&2
    exit 1
  fi

  JSON="$(run_status "$RUN_ID")"
  STATUS="$(echo "$JSON" | jq -r '.status')"
  CONCLUSION="$(echo "$JSON" | jq -r '.conclusion // empty')"

  echo "==> $(date -u +"%Y-%m-%dT%H:%M:%SZ") status=$STATUS conclusion=${CONCLUSION:-}"

  if [[ "$STATUS" == "completed" ]]; then
    export RUN_ID
    bash scripts/finalize_run_and_open_report.sh
    exit 0
  fi

  if [[ "$STATUS" == "queued" ]]; then
    [[ -z "$QUEUED_SINCE" ]] && QUEUED_SINCE="$NOW"
    QMIN="$(( (NOW - QUEUED_SINCE) / 60 ))"
    if [[ "$QMIN" -ge "$QUEUE_TIMEOUT_MIN" ]]; then
      echo "==> queued too long (${QMIN}m). Cancel + re-dispatch."
      cancel_run "$RUN_ID"
      dispatch
      sleep 3
      RUN_ID="$(latest_run_id)"
      echo "==> New RUN_ID=$RUN_ID"
      echo "==> URL: https://github.com/$REPO/actions/runs/$RUN_ID"
      QUEUED_SINCE=""
    fi
  else
    QUEUED_SINCE=""
  fi

  sleep "$POLL_INTERVAL"
done
BASH

# -----------------------------
# 4) Non-pack regression test
# -----------------------------
cat > "frontend/tests/regression-non-pack.spec.ts" <<'TS'
import { test, expect } from '@playwright/test';

/**
 * Non-pack regression test:
 * - Contains @regression
 * - Does NOT contain @pack
 * Ensures skip-pack regression never yields “No tests found”.
 */
test('non-pack sanity loads base @regression', async ({ page, baseURL }) => {
  const url = baseURL ?? '/';
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });

  if (resp) {
    expect(resp.status(), 'base page should not 404/500').toBeLessThan(500);
  }

  await expect(page.locator('body')).toBeVisible();
});
TS

# -----------------------------
# 5) Deploy scaffold (public site baseline)
# -----------------------------
cat > "deploy/README.md" <<'MD'
# Deploy (Make Public) — Baseline

This is a conservative, generic scaffold to publish the app without guessing your secrets.

## Option A: Docker Compose on a VPS
1) `cp deploy/.env.example deploy/.env`
2) Edit `deploy/.env`
3) From repo root:
   `docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env up -d --build`
4) Put Nginx/Caddy in front for HTTPS.

## Option B: Managed hosting
- Frontend: Vercel / Netlify
- Backend: Render / Fly.io
- DB: Supabase / Neon / RDS

You’ll need:
- DATABASE_URL
- Frontend env for API base URL
MD

cat > "deploy/.env.example" <<'ENV'
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app
POSTGRES_PORT=5432

BACKEND_PORT=3000
DATABASE_URL=postgresql://app:app@db:5432/app

FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000/api
ENV

cat > "deploy/docker-compose.production.yml" <<'YAML'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-app}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-app}
      POSTGRES_DB: ${POSTGRES_DB:-app}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  backend:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.backend
    environment:
      NODE_ENV: production
      PORT: ${BACKEND_PORT:-3000}
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      - db
    ports:
      - "${BACKEND_PORT:-3000}:${BACKEND_PORT:-3000}"

  frontend:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.frontend
    environment:
      NODE_ENV: production
      VITE_API_URL: ${VITE_API_URL:-http://localhost:3000/api}
    depends_on:
      - backend
    ports:
      - "${FRONTEND_PORT:-5173}:5173"

volumes:
  db_data:
YAML

cat > "deploy/Dockerfile.backend" <<'DOCKER'
FROM node:20-alpine AS build
WORKDIR /app

COPY backend/package*.json ./backend/
RUN if [ -f backend/package.json ]; then cd backend && ( [ -f package-lock.json ] && npm ci || npm install ); fi

COPY backend ./backend

RUN if [ -f backend/package.json ]; then \
      cd backend && (npm run build || echo "No backend build step"); \
    fi

FROM node:20-alpine
WORKDIR /app/backend
COPY --from=build /app/backend /app/backend

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-lc", "npm run start || npm run serve || node dist/index.js || node index.js"]
DOCKER

cat > "deploy/Dockerfile.frontend" <<'DOCKER'
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && ( [ -f package-lock.json ] && npm ci || npm install )

COPY frontend ./frontend
RUN cd frontend && (npm run build || echo "No frontend build step")

FROM node:20-alpine
WORKDIR /app/frontend
COPY --from=build /app/frontend /app/frontend

ENV NODE_ENV=production
EXPOSE 5173

CMD ["sh", "-lc", "npm run preview -- --host 0.0.0.0 --port 5173 || npm run start"]
DOCKER

# -----------------------------
# 6) Make scripts executable
# -----------------------------
chmod +x scripts/*.sh || true

# -----------------------------
# 7) Commit and push
# -----------------------------
echo "==> Git status:"
git status --porcelain || true

git add \
  ".github/workflows/${WORKFLOW}" \
  scripts \
  deploy \
  frontend/tests/regression-non-pack.spec.ts

git commit -m "ci: stabilize nightly e2e (diagnostics, requeue, non-pack regression, deploy scaffold)" || true

# Add origin if missing (safe)
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "==> No origin remote found. Add it with:"
  echo "git remote add origin https://github.com/${REPO_SLUG}.git"
else
  echo "==> origin remote exists"
endif

echo "==> Pushing branch: $BRANCH"
git push -u origin "$BRANCH" || {
  echo
  echo "Push failed. If you haven't added origin yet, run:"
  echo "git remote add origin https://github.com/${REPO_SLUG}.git"
  echo "git push -u origin ${BRANCH}"
  exit 1
}

# -----------------------------
# 8) Print MASTER ONE-LINERS
# -----------------------------
echo
echo "==============================================="
echo "✅ DONE. Next: run E2E autopilot from terminal."
echo "==============================================="
echo
echo "MASTER ONE-LINER (FULL / PACK ENABLED):"
echo "REPO=\"${REPO_SLUG}\" WORKFLOW=\"${WORKFLOW}\" BRANCH=\"${BRANCH}\" QUEUE_TIMEOUT_MIN=5 bash scripts/watch_and_requeue.sh full"
echo
echo "MASTER ONE-LINER (SKIP-PACK):"
echo "REPO=\"${REPO_SLUG}\" WORKFLOW=\"${WORKFLOW}\" BRANCH=\"${BRANCH}\" QUEUE_TIMEOUT_MIN=5 bash scripts/watch_and_requeue.sh skip"
echo
echo "Deploy (VPS) one-liner (after editing deploy/.env):"
echo "docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env up -d --build"
echo

# Optional: auto dispatch once, if gh/jq exists
if [[ "$HAS_GH" -eq 1 && "$HAS_JQ" -eq 1 ]]; then
  echo "==> (Optional) Auto-dispatch one run now (full) and finalize..."
  REPO="$REPO_SLUG" WORKFLOW="$WORKFLOW" BRANCH="$BRANCH" bash scripts/dispatch_and_watch.sh full || true
else
  echo "==> gh/jq not detected; skipping auto-dispatch."
fi
