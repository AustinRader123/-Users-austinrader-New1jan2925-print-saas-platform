#!/usr/bin/env bash
set -euo pipefail

# ===========================
# GOD PROMPT FOR VS CODE TERMINAL
# Paste this entire block into VS Code Terminal (repo root) and press Enter.
# It will:
#  1) sanity-check tools (git, node, docker, gh)
#  2) make scripts executable
#  3) start Docker Compose stack if available
#  4) run Prisma migrations if backend container exists + prisma present
#  5) print local/public URLs
#  6) run CI “god” mode (dispatch both lanes, watch, download artifacts, auto-open Playwright report) if gh is authenticated
# ===========================

# ---- CONFIG (edit if needed) ----
REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
AUTO_OPEN_REPORT="${AUTO_OPEN_REPORT:-true}"

# If you want CI to run automatically as part of this one command, keep true:
RUN_CI_GOD_SCRIPT="${RUN_CI_GOD_SCRIPT:-true}"

# Optional: override the base URL the E2E tests hit (only if your workflow/scripts support it)
BASE_URL_OVERRIDE="${BASE_URL_OVERRIDE:-}"

# ---- Helpers ----
have(){ command -v "$1" >/dev/null 2>&1; }
say(){ printf "\n\033[1m%s\033[0m\n" "$*"; }

say "==> 0) Confirm you are in the repo root"
pwd
ls -la | head -n 30

say "==> 1) Tool checks"
have git || { echo "ERROR: git missing"; exit 2; }
have node || echo "WARN: node missing (OK if using Docker only)"
have npm  || echo "WARN: npm missing (OK if using Docker only)"

if have docker; then
	docker version >/dev/null 2>&1 || { echo "ERROR: docker installed but not running"; exit 3; }
else
	echo "WARN: docker missing (compose stack will be skipped)"
fi

if have gh; then
	if gh auth status >/dev/null 2>&1; then
		echo "OK: gh authenticated"
	else
		echo "WARN: gh installed but not authenticated; CI dispatch/watch will be skipped unless you run: gh auth login"
	fi
else
	echo "WARN: gh missing; CI dispatch/watch will be skipped"
fi

say "==> 2) Make scripts executable (if scripts/ exists)"
if [ -d scripts ]; then
	chmod +x scripts/*.sh 2>/dev/null || true
	ls -la scripts | sed -n '1,200p'
else
	echo "WARN: no scripts/ directory found"
fi

say "==> 3) Start local stack (Docker Compose) if available"
COMPOSE_OK=false
if have docker; then
	if docker compose version >/dev/null 2>&1; then
		COMPOSE_OK=true
		echo "OK: docker compose available"
	elif have docker-compose; then
		COMPOSE_OK=true
		echo "OK: docker-compose available"
	else
		echo "WARN: docker compose not available"
	fi
fi

if [ "$COMPOSE_OK" = true ]; then
	if [ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ] || [ -f compose.yaml ]; then
		say "==> Bringing up stack"
		if docker compose version >/dev/null 2>&1; then
			docker compose up -d
			docker compose ps
		else
			docker-compose up -d
			docker-compose ps
		fi
	else
		echo "WARN: no compose file found; skipping compose up"
	fi
else
	echo "Skipping compose up (docker/compose not available)"
fi

say "==> 4) Run Prisma migrate deploy inside backend (best-effort)"
# We’ll try to find a likely backend container and run migrate if prisma exists.
# This is best-effort and will not fail the whole run if not applicable.
if have docker; then
	BACKEND_CID=""
	# Common container name patterns:
	for name in backend api server app; do
		BACKEND_CID="$(docker ps --format '{{.ID}} {{.Names}}' | awk -v n="$name" '$2 ~ n {print $1; exit}')"
		[ -n "$BACKEND_CID" ] && break
	done

	if [ -n "$BACKEND_CID" ]; then
		echo "Found backend-ish container: $BACKEND_CID"
		set +e
		docker exec "$BACKEND_CID" sh -lc 'ls -la 2>/dev/null | head -n 30' >/dev/null 2>&1
		docker exec "$BACKEND_CID" sh -lc 'test -f prisma/schema.prisma || test -d prisma' >/dev/null 2>&1
		HAS_PRISMA=$?
		if [ "$HAS_PRISMA" -eq 0 ]; then
			say "==> Prisma folder detected; attempting migrate deploy"
			docker exec "$BACKEND_CID" sh -lc 'npx prisma migrate deploy' || echo "WARN: prisma migrate deploy failed (check logs)"
			# Optional seed if present
			docker exec "$BACKEND_CID" sh -lc 'npx prisma db seed' || echo "INFO: prisma db seed skipped/failed (ok if no seed configured)"
		else
			echo "INFO: Prisma not detected in backend container; skipping migrations"
		fi
		set -e
	else
		echo "INFO: No backend container detected; skipping prisma step"
	fi
else
	echo "INFO: Docker not available; skipping prisma step"
fi

say "==> 5) Print URLs (adjust ports if your repo differs)"
HOST_IP="$( (ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' ) || true )"
HOST_IP="${HOST_IP:-localhost}"
echo "Frontend (likely): http://$HOST_IP:5173"
echo "Backend  (likely): http://$HOST_IP:3001"
echo "If these ports differ in your repo, check docker compose ports or package.json scripts."

say "==> 6) Run CI God mode (dispatch/watch/download artifacts/open report) if enabled"
if [ "${RUN_CI_GOD_SCRIPT}" = "true" ]; then
	if have gh && gh auth status >/dev/null 2>&1; then
		if [ -f scripts/master.sh ]; then
			say "==> Running scripts/master.sh (DISPATCH=1)"
			DISPATCH=1 REPO="$REPO" BRANCH="$BRANCH" WORKFLOW="$WORKFLOW" AUTO_OPEN_REPORT="$AUTO_OPEN_REPORT" BASE_URL_OVERRIDE="$BASE_URL_OVERRIDE" bash scripts/master.sh
		elif [ -f scripts/god.sh ]; then
			say "==> Running scripts/god.sh (DISPATCH=1)"
			DISPATCH=1 REPO="$REPO" BRANCH="$BRANCH" WORKFLOW="$WORKFLOW" AUTO_OPEN_REPORT="$AUTO_OPEN_REPORT" BASE_URL_OVERRIDE="$BASE_URL_OVERRIDE" bash scripts/god.sh
		else
			echo "WARN: No scripts/master.sh or scripts/god.sh found; CI dispatch skipped."
			echo "      If you have a different CI script, run it manually from scripts/."
		fi
	else
		echo "WARN: gh not authenticated or not installed; skipping CI dispatch."
		echo "      Fix by running: gh auth login"
	fi
else
	echo "CI God mode disabled (RUN_CI_GOD_SCRIPT=false)."
fi

say "==> DONE ✅"
echo "If CI ran, artifacts should be in: artifacts_download/<RUN_ID>/"
echo "If a Playwright report exists, it should be: artifacts_download/<RUN_ID>/.../playwright-report/index.html"