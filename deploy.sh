#!/usr/bin/env bash
# deploy.sh — one-command deploy helper (generic)
# ✅ What it does:
#   1) Ensure clean git state
#   2) Merge your feature branch into main
#   3) Push to origin
#   4) Run Prisma migrations in PRODUCTION mode (migrate deploy)
#   5) Build + restart (choose ONE: docker / pm2 / render/vercel auto-deploy)

set -euo pipefail

########################################
# CONFIG — EDIT THESE
########################################

# Branches
FEATURE_BRANCH="${FEATURE_BRANCH:-day3-inventory-events}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"

# Paths
BACKEND_DIR="${BACKEND_DIR:-backend}"
FRONTEND_DIR="${FRONTEND_DIR:-frontend}"  # set empty "" if you don't have frontend folder

# Prisma / Node
PRISMA_BIN="${PRISMA_BIN:-npx prisma}"
NODE_ENV="${NODE_ENV:-production}"

# Deploy mode: choose one: docker | pm2 | noop
DEPLOY_MODE="${DEPLOY_MODE:-noop}"

# PM2 config (only if DEPLOY_MODE=pm2)
PM2_APP_NAME="${PM2_APP_NAME:-app}"         # change to your PM2 process name
PM2_CWD="${PM2_CWD:-.}"                     # where PM2 runs from

# Docker config (only if DEPLOY_MODE=docker)
DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.yml}"

########################################
# HELPERS
########################################

say() { printf "\n\033[1m%s\033[0m\n" "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

ensure_clean_git() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    die "Git working tree is not clean. Commit/stash first."
  fi
}

########################################
# PRECHECKS
########################################

require_cmd git
require_cmd node
require_cmd npm

########################################
# 1) MERGE FEATURE -> MAIN AND PUSH
########################################

say "1) Sync main, merge ${FEATURE_BRANCH} to ${MAIN_BRANCH}, push"

ensure_clean_git

git fetch origin
git checkout "${MAIN_BRANCH}"
git pull --ff-only origin "${MAIN_BRANCH}"

# Verify feature branch exists locally or remotely
if git show-ref --verify --quiet "refs/heads/${FEATURE_BRANCH}"; then
  :
else
  # try to fetch it from origin
  if git ls-remote --exit-code --heads origin "${FEATURE_BRANCH}" >/dev/null 2>&1; then
    git checkout -b "${FEATURE_BRANCH}" "origin/${FEATURE_BRANCH}"
  else
    die "Feature branch not found locally or on origin: ${FEATURE_BRANCH}"
  fi
fi

git checkout "${MAIN_BRANCH}"

# Merge (no fast-forward so there's a merge commit trail; change to --ff-only if you prefer)
git merge --no-ff "${FEATURE_BRANCH}" -m "Merge ${FEATURE_BRANCH} into ${MAIN_BRANCH}" || {
  die "Merge conflict. Resolve conflicts, commit, then re-run."
}

git push origin "${MAIN_BRANCH}"

########################################
# 2) PRISMA MIGRATIONS (PROD SAFE)
########################################

say "2) Run Prisma PROD migrations + generate client"

if [ ! -d "${BACKEND_DIR}" ]; then
  die "Backend directory not found: ${BACKEND_DIR}"
fi

pushd "${BACKEND_DIR}" >/dev/null

export NODE_ENV="${NODE_ENV}"

# IMPORTANT: migrate deploy is safe for prod; migrate dev is NOT.
${PRISMA_BIN} migrate deploy
${PRISMA_BIN} generate

popd >/dev/null

########################################
# 3) BUILD
########################################

say "3) Build backend (and frontend if present)"

pushd "${BACKEND_DIR}" >/dev/null
npm ci
npm run build
popd >/dev/null

if [ -n "${FRONTEND_DIR}" ] && [ -d "${FRONTEND_DIR}" ]; then
  pushd "${FRONTEND_DIR}" >/dev/null
  npm ci
  npm run build
  popd >/dev/null
fi

########################################
# 4) RESTART / DEPLOY
########################################

say "4) Deploy mode: ${DEPLOY_MODE}"

case "${DEPLOY_MODE}" in
  docker)
    require_cmd docker
    require_cmd docker-compose || true
    # Use docker compose v2 if available
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      docker compose -f "${DOCKER_COMPOSE_FILE}" up -d --build
    else
      require_cmd docker-compose
      docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d --build
    fi
    ;;
  pm2)
    require_cmd pm2
    pushd "${PM2_CWD}" >/dev/null
    pm2 reload "${PM2_APP_NAME}" || pm2 restart "${PM2_APP_NAME}"
    pm2 save
    popd >/dev/null
    ;;
  noop)
    say "DEPLOY_MODE=noop"
    echo "✅ Code pushed + migrations + builds completed."
    echo "➡️ If you use Render/Vercel/Fly/Heroku/etc, pushing main usually triggers deploy automatically."
    echo "➡️ If not, set DEPLOY_MODE=docker or DEPLOY_MODE=pm2 (and configure variables)."
    ;;
  *)
    die "Unknown DEPLOY_MODE=${DEPLOY_MODE}. Use docker | pm2 | noop"
    ;;
esac

########################################
# DONE
########################################

say "✅ Done. Next: verify production endpoints + UI."

echo "Suggested quick checks:"
echo "  - Backend health endpoint (if you have one)"
echo "  - Run a bootstrap/sync in PROD (whatever triggers DN sync)"
echo "  - Confirm InventoryEvent data exists and UI displays it"
