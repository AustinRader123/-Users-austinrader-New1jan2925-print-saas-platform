#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "[noninteractive] Usage: $0 <command> [args...]" >&2
  exit 2
fi

contains_prisma="false"
if printf '%s\n' "$*" | grep -qi 'prisma'; then
  contains_prisma="true"
fi

if [ "$contains_prisma" = "true" ]; then
  has_db_url="false"
  if [ -n "${DATABASE_URL:-}" ]; then
    has_db_url="true"
  elif [ -f .env ] && grep -q '^DATABASE_URL=' .env; then
    has_db_url="true"
  fi

  if [ "$has_db_url" != "true" ]; then
    echo "[noninteractive] ERROR: DATABASE_URL is missing (env var or .env) for Prisma command: $*" >&2
    exit 2
  fi
fi

TIMEOUT_BIN=""
if command -v timeout >/dev/null 2>&1; then
  TIMEOUT_BIN="timeout"
elif command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_BIN="gtimeout"
fi

run_with_timeout() {
  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" 90s "$@"
    return $?
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$@" <<'PY'
import subprocess
import sys

timeout_seconds = 90
cmd = sys.argv[1:]

try:
    proc = subprocess.Popen(cmd)
except FileNotFoundError:
    print(f"[noninteractive] ERROR: command not found: {cmd[0]}", file=sys.stderr)
    sys.exit(127)

try:
    rc = proc.wait(timeout=timeout_seconds)
    sys.exit(rc)
except subprocess.TimeoutExpired:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    sys.exit(124)
PY
    return $?
  fi

  echo "[noninteractive] ERROR: neither timeout/gtimeout nor python3 is available for timeout enforcement." >&2
  return 2
}

export CI=1
export PRISMA_HIDE_UPDATE_MESSAGE=1
export PRISMA_DISABLE_WARNINGS=1
export npm_config_yes=true
export TERM=dumb

LOG_ROOT="${NONINTERACTIVE_LOG_DIR:-./artifacts/logs}"
mkdir -p "$LOG_ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_ROOT/noninteractive-${STAMP}.log"

set +e
run_with_timeout "$@" 2>&1 | tee "$LOG_FILE"
cmd_status=${PIPESTATUS[0]}
set -e

if [ "$cmd_status" -eq 124 ] || [ "$cmd_status" -eq 137 ]; then
  echo "[noninteractive] ERROR: command timed out after 90s" >&2
  echo "[noninteractive] Command: $*" >&2
  echo "[noninteractive] Last 100 log lines from $LOG_FILE:" >&2
  tail -n 100 "$LOG_FILE" >&2 || true
  if grep -qi prisma "$LOG_FILE"; then
    echo "[noninteractive] Prisma output detected above. Check DATABASE_URL reachability and migration state." >&2
  fi
  exit 1
fi

if [ "$cmd_status" -ne 0 ]; then
  echo "[noninteractive] ERROR: command failed (exit $cmd_status): $*" >&2
  echo "[noninteractive] Last 100 log lines from $LOG_FILE:" >&2
  tail -n 100 "$LOG_FILE" >&2 || true
  exit "$cmd_status"
fi

echo "[noninteractive] OK: $*"
