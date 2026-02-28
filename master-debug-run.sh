#!/usr/bin/env bash
set -Eeuo pipefail

# master-debug-run.sh - robust debug orchestrator
# Usage: DEBUG=1 bash master-debug-run.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
MOCK_DN_ENTRY="${ROOT}/mock-dn/server.js"
BOOT_SCRIPT="${ROOT}/scripts/run_register_and_bootstrap.sh"

: "${BACKEND_PORT:=3000}"
: "${FRONTEND_PORT:=5173}"
: "${MOCK_PORT:=6060}"

# Acceptance wants <=90s failures
: "${BOOT_TIMEOUT:=90}"
: "${HEALTH_TIMEOUT:=30}"

DEBUG=${DEBUG:-0}

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(ts)] $*"; }

if [[ "$DEBUG" == "1" ]]; then
  set -x
  log "DEBUG mode ON"
  log "ENV: BACKEND_PORT=$BACKEND_PORT FRONTEND_PORT=$FRONTEND_PORT MOCK_PORT=$MOCK_PORT BOOT_TIMEOUT=$BOOT_TIMEOUT"
fi

# kill processes listening on a port
kill_port() {
  local p="$1"
  local pids
  pids="$(lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    log "Killing listeners on :$p -> ${pids}"
    kill -9 ${pids} >/dev/null 2>&1 || true
  fi
}

# wait for an http endpoint with per-request timeouts and visible attempts
wait_http_ok() {
  local url="$1"
  local seconds="${2:-30}"
  local i=0
  while (( i < seconds )); do
    # connect timeout 2s, max time 5s
    if curl -fsS --connect-timeout 2 --max-time 5 "$url" -o /dev/null 2>/dev/null; then
      log "HTTP ok: $url"
      return 0
    fi
    log "HTTP wait: attempt=$((i+1))/$seconds $url"
    sleep 1
    ((i++)) || true
  done
  return 1
}

# start background process with timestamped log lines and pidfile
bg_start() {
  local name="$1"; shift
  local outfile="$LOG_DIR/${name}.log"
  log "Starting $name -> $outfile"
  (
    set +e
    "$@" 2>&1 | while IFS= read -r line; do printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$line"; done >>"$outfile"
    echo "[$(ts)] $name exited with code $?" >>"$outfile"
  ) &
  echo $! >"$LOG_DIR/${name}.pid"
  disown || true
  log "$name PID $(cat "$LOG_DIR/${name}.pid")"
}

# stop by pidfile
bg_stop() {
  local name="$1"
  local pidfile="$LOG_DIR/${name}.pid"
  if [[ -f "$pidfile" ]]; then
    local pid; pid=$(cat "$pidfile")
    if kill -0 "$pid" >/dev/null 2>&1; then
      log "Stopping $name PID $pid"
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$pidfile"
  fi
}

# track pidfiles to ensure cleanup
PIDS_TO_CLEAN=()
register_pidfile() { PIDS_TO_CLEAN+=("$LOG_DIR/$1.pid"); }

cleanup() {
  log "Cleanup: stopping background processes"
  for pf in "${PIDS_TO_CLEAN[@]:-}"; do
    if [[ -f "$pf" ]]; then
      local pid; pid=$(cat "$pf")
      if kill -0 "$pid" >/dev/null 2>&1; then
        log "Killing pid=$pid (from $pf)"
        kill "$pid" >/dev/null 2>&1 || true
        sleep 1
        kill -9 "$pid" >/dev/null 2>&1 || true
      fi
      rm -f "$pf"
    fi
  done
}
trap cleanup EXIT INT TERM

log "=== CLEANUP: kill common ports ==="
kill_port "$MOCK_PORT"
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

log "=== INSTALL/BUILD (safe, non-interactive) ==="
if [[ -d "$BACKEND_DIR" ]]; then
  (cd "$BACKEND_DIR" && npm ci --no-audit --no-fund >>"$LOG_DIR/backend.npmci.log" 2>&1 || true)
  (cd "$BACKEND_DIR" && npx prisma migrate deploy >>"$LOG_DIR/prisma.migrate.log" 2>&1 || true)
  (cd "$BACKEND_DIR" && npx prisma generate >>"$LOG_DIR/prisma.generate.log" 2>&1 || true)
fi
if [[ -d "$FRONTEND_DIR" ]]; then
  (cd "$FRONTEND_DIR" && NPM_CONFIG_PRODUCTION=false npm ci >>"$LOG_DIR/frontend.npmci.log" 2>&1 || true)
fi

log "=== START MOCK DN ==="
if [[ -f "$MOCK_DN_ENTRY" ]]; then
  bg_start mock-dn node "$MOCK_DN_ENTRY"
  register_pidfile mock-dn
else
  log "ERROR: mock DN entry not found at: $MOCK_DN_ENTRY"
  exit 1
fi

log "=== WAIT MOCK DN READY ==="
if ! wait_http_ok "http://localhost:${MOCK_PORT}/health" "$HEALTH_TIMEOUT"; then
  if ! wait_http_ok "http://localhost:${MOCK_PORT}/products/search" "$HEALTH_TIMEOUT"; then
    log "Mock DN not ready on http://localhost:${MOCK_PORT} -> exiting"
    exit 2
  fi
fi

log "=== START BACKEND (dev) ==="
if [[ -d "$BACKEND_DIR" ]]; then
  bg_start backend bash -lc "cd \"$BACKEND_DIR\" && PORT=$BACKEND_PORT npm run dev"
  register_pidfile backend
else
  log "ERROR: backend dir not found: $BACKEND_DIR"
  exit 1
fi

log "=== WAIT BACKEND READY (/health then /api/health) ==="
if ! wait_http_ok "http://localhost:${BACKEND_PORT}/health" "$HEALTH_TIMEOUT"; then
  if ! wait_http_ok "http://localhost:${BACKEND_PORT}/api/health" "$HEALTH_TIMEOUT"; then
    log "Backend HTTP health failed on port ${BACKEND_PORT} -> exit"
    exit 3
  fi
fi

# Also probe /ready for DB connectivity (non-blocking short wait)
if ! wait_http_ok "http://localhost:${BACKEND_PORT}/ready" 15; then
  log "Backend /ready probe failed (DB may be unavailable) -> exit"
  exit 4
fi

log "=== START WORKER ==="
bg_start worker bash -lc "cd \"$BACKEND_DIR\" && DN_SDK_DEBUG=1 NODE_ENV=development npx tsx src/worker.ts"
register_pidfile worker

log "=== START FRONTEND (optional) ==="
if [[ -d "$FRONTEND_DIR" ]]; then
  bg_start frontend bash -lc "cd \"$FRONTEND_DIR\" && npm run dev -- --host --port $FRONTEND_PORT"
  register_pidfile frontend
fi

# helper: run a command with a hard timeout (portable shell-only)
run_with_timeout() {
  local to="$1"; shift
  ("$@") &
  local pid=$!
  local end=$(( $(date +%s) + to ))
  while kill -0 "$pid" >/dev/null 2>&1; do
    if [[ $(date +%s) -ge $end ]]; then
      log "Command exceeded ${to}s -> killing PID ${pid}"
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$pid" >/dev/null 2>&1 || true
      return 124
    fi
    sleep 1
  done
  wait "$pid" || return $?
  return 0
}

log "=== BOOTSTRAP: register + enqueue ==="
if [[ -f "$BOOT_SCRIPT" ]]; then
  log "Invoking bootstrap script (timeout ${BOOT_TIMEOUT}s): $BOOT_SCRIPT"
  if ! run_with_timeout "$BOOT_TIMEOUT" bash -lc "MOCK_PORT=\"$MOCK_PORT\" bash \"$BOOT_SCRIPT\"" >>"$LOG_DIR/bootstrap.invoke.log" 2>&1; then
    log "Bootstrap invocation failed or timed out; see $LOG_DIR/bootstrap.invoke.log"
  else
    log "Bootstrap invocation finished (invocation log: $LOG_DIR/bootstrap.invoke.log)"
  fi
else
  log "WARN: bootstrap script not found at: $BOOT_SCRIPT"
  log "Set BOOT_SCRIPT path near top of this script."
fi

log "=== WAIT FOR BOOTSTRAP TO FINISH (poll worker log for completion) ==="
end=$(( $(date +%s) + BOOT_TIMEOUT ))
found=0
while [[ $(date +%s) -lt $end ]]; do
  if grep -E "bootstrap completed|Queue dn:bootstrap.*completed|DN bootstrap completed" -i "$LOG_DIR/worker.log" >/dev/null 2>&1; then
    found=1
    break
  fi
  if grep -E "ERROR|Foreign key|constraint|PrismaClientKnownRequestError" "$LOG_DIR/worker.log" >/dev/null 2>&1; then
    log "Detected error patterns in worker.log (captured)"
    break
  fi
  sleep 2
done

if [[ "$found" -eq 1 ]]; then
  log "Bootstrap completion detected."
else
  log "Bootstrap did NOT complete within ${BOOT_TIMEOUT}s. See logs: $LOG_DIR/worker.log and $LOG_DIR/bootstrap.invoke.log"
fi

log "=== QUICK DB COUNTS (Prisma) ==="
cat >"$LOG_DIR/db_counts.mjs" <<'JS'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const tables = [
  "Product",
  "ProductVariant",
  "DnProductMap",
  "DnVariantMap",
  "Order",
  "DnOrderMap",
  "InventoryEvent",
  "DnInventoryEventMap",
  "IntegrationPayloadSnapshot",
  "SyncRun",
];
async function main() {
  for (const t of tables) {
    const key = t[0].toLowerCase() + t.slice(1);
    const model = prisma[key];
    if (!model?.count) {
      console.log(`${t}: (missing model)`);
      continue;
    }
    try {
      const n = await model.count();
      console.log(`${t}: ${n}`);
    } catch (e) {
      console.log(`${t}: (count failed) ${e?.message || e}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
JS

(cd "$BACKEND_DIR" && node "$LOG_DIR/db_counts.mjs") | tee "$LOG_DIR/db_counts.log" || true

log "=== TAIL LOGS (last 120 lines) ==="
tail -n 120 "$LOG_DIR/mock-dn.log" 2>/dev/null || true
tail -n 120 "$LOG_DIR/backend.log" 2>/dev/null || true
tail -n 200 "$LOG_DIR/worker.log" 2>/dev/null || true

log "=== DONE ==="
log "If it still 'hangs', open these logs:"
log "  $LOG_DIR/worker.log"
log "  $LOG_DIR/backend.log"
log "  $LOG_DIR/mock-dn.log"
log "  $LOG_DIR/bootstrap.invoke.log"
log "  $LOG_DIR/db_counts.log"
