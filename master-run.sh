#!/usr/bin/env bash
set -euo pipefail

# master-run.sh - lightweight orchestrator: start mock DN, backend, worker, frontend, run Day-3 idempotency (safe)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
MOCK_DN_ENTRY="${ROOT}/mock-dn/server.js"
BOOT_SCRIPT="${ROOT}/scripts/run_register_and_bootstrap.sh"
DAY3_SCRIPT="${ROOT}/scripts/day3-idempotency.sh"

: "${BACKEND_PORT:=3000}"
: "${FRONTEND_PORT:=5173}"
: "${MOCK_PORT:=6060}"
: "${BOOT_TIMEOUT:=600}"
: "${HEALTH_TIMEOUT:=60}"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(ts)] $*"; }

die() { log "ERROR: $*"; exit 1; }

kill_port() {
  local p="$1"
  local pids
  pids="$(lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    log "Killing listeners on :$p -> ${pids}"
    kill -9 ${pids} >/dev/null 2>&1 || true
  fi
}

wait_http_ok() {
  local url="$1"
  local seconds="${2:-30}"
  local i=0
  while (( i < seconds )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    ((i++)) || true
  done
  return 1
}

bg_start() {
  local name="$1"; shift
  local outfile="$LOG_DIR/${name}.log"
  log "Starting $name -> $outfile"
  (
    set +e
    "$@" >>"$outfile" 2>&1
    echo "[$(ts)] $name exited with code $?" >>"$outfile"
  ) &
  echo $! >"$LOG_DIR/${name}.pid"
  disown || true
  log "$name PID $(cat "$LOG_DIR/${name}.pid")"
}

bg_stop() {
  local name="$1"
  local pidfile="$LOG_DIR/${name}.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      log "Stopping $name PID $pid"
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$pidfile"
  fi
}

trap 'log "Stopping background processes..."; bg_stop frontend || true; bg_stop worker || true; bg_stop backend || true; bg_stop mock-dn || true' EXIT

log "=== CLEANUP: kill common ports ==="
kill_port "$MOCK_PORT"
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

log "=== INSTALL/BUILD (non-fatal) ==="
if [[ -d "$BACKEND_DIR" ]]; then
  (cd "$BACKEND_DIR" && npm ci >>"$LOG_DIR/backend.npmci.log" 2>&1 || true)
  (cd "$BACKEND_DIR" && npx prisma migrate deploy >>"$LOG_DIR/prisma.migrate.log" 2>&1 || true)
  (cd "$BACKEND_DIR" && npx prisma generate >>"$LOG_DIR/prisma.generate.log" 2>&1 || true)
fi
if [[ -d "$FRONTEND_DIR" ]]; then
  (cd "$FRONTEND_DIR" && NPM_CONFIG_PRODUCTION=false npm ci >>"$LOG_DIR/frontend.npmci.log" 2>&1 || true)
fi

log "=== START MOCK DN ==="
if [[ -f "$MOCK_DN_ENTRY" ]]; then
  bg_start "mock-dn" node "$MOCK_DN_ENTRY"
else
  log "ERROR: mock DN entry not found at: $MOCK_DN_ENTRY"
  exit 1
fi

log "=== WAIT MOCK DN READY ==="
if ! wait_http_ok "http://localhost:${MOCK_PORT}/health" "$HEALTH_TIMEOUT"; then
  wait_http_ok "http://localhost:${MOCK_PORT}/products/search" "$HEALTH_TIMEOUT" || true
fi

log "=== START BACKEND (dev) ==="
if [[ -d "$BACKEND_DIR" ]]; then
  bg_start "backend" bash -lc "cd \"$BACKEND_DIR\" && PORT=$BACKEND_PORT npm run dev"
else
  log "ERROR: backend dir not found: $BACKEND_DIR"
  exit 1
fi

log "=== WAIT BACKEND READY (/health or /api/health) ==="
if ! wait_http_ok "http://localhost:${BACKEND_PORT}/health" "$HEALTH_TIMEOUT"; then
  wait_http_ok "http://localhost:${BACKEND_PORT}/api/health" "$HEALTH_TIMEOUT" || true
fi

log "=== START WORKER ==="
bg_start "worker" bash -lc "cd \"$BACKEND_DIR\" && DN_SDK_DEBUG=1 NODE_ENV=development npx tsx src/worker.ts"

log "=== START FRONTEND (optional) ==="
if [[ -d "$FRONTEND_DIR" ]]; then
  bg_start "frontend" bash -lc "cd \"$FRONTEND_DIR\" && npm run dev -- --host --port $FRONTEND_PORT"
fi

log "=== BOOTSTRAP: register + enqueue ==="
if [[ -f "$BOOT_SCRIPT" ]]; then
  MOCK_PORT="$MOCK_PORT" bash "$BOOT_SCRIPT" >>"$LOG_DIR/bootstrap.invoke.log" 2>&1 || true
else
  log "WARN: bootstrap script not found at: $BOOT_SCRIPT"
fi

log "=== RUN Day-3 (background, timeout) ==="
if [[ -f "$DAY3_SCRIPT" ]]; then
  (
    set +e
    "$DAY3_SCRIPT" >>"$LOG_DIR/day3.console.log" 2>&1
    echo "[$(ts)] day3 exited code=$?" >>"$LOG_DIR/day3.console.log"
  ) &
  DAY3_PID=$!
  end=$(( $(date +%s) + BOOT_TIMEOUT ))
  while kill -0 "$DAY3_PID" >/dev/null 2>&1; do
    if [[ $(date +%s) -ge $end ]]; then
      log "Day-3 exceeded ${BOOT_TIMEOUT}s -> killing PID ${DAY3_PID}"
      kill "$DAY3_PID" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$DAY3_PID" >/dev/null 2>&1 || true
      break
    fi
    sleep 2
  done
fi

log "=== LAST LOGS ==="
for f in mock-dn backend worker day3.console bootstrap.invoke; do
  file="$LOG_DIR/${f}.log"
  [[ "$f" == "day3.console" ]] && file="$LOG_DIR/day3.console.log"
  [[ "$f" == "bootstrap.invoke" ]] && file="$LOG_DIR/bootstrap.invoke.log"
  [[ -f "$file" ]] || continue
  echo
  log "-- tail $file"
  tail -n 120 "$file" || true
done

log "=== READY ==="
log "Frontend (if started): http://localhost:${FRONTEND_PORT}/"
log "Backend:              http://localhost:${BACKEND_PORT}/health"
log "Mock DN:              http://localhost:${MOCK_PORT}/health (or products/search)"
log "Logs:                 $LOG_DIR"
