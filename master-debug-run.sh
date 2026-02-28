#!/usr/bin/env bash
set -euo pipefail

# ====== master-debug-run.sh (drop in repo root, run: bash master-debug-run.sh) ======
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
MOCK_DN_ENTRY="${ROOT}/mock-dn/server.js"   # adjust if your mock DN entry differs
BOOT_SCRIPT="${ROOT}/scripts/run_register_and_bootstrap.sh"  # adjust if differs

# Ports (override by env if needed)
: "${BACKEND_PORT:=3000}"
: "${FRONTEND_PORT:=5173}"
: "${MOCK_PORT:=6060}"

# Timeouts (seconds)
: "${BOOT_TIMEOUT:=600}"
: "${HEALTH_TIMEOUT:=60}"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(ts)] $*"; }

kill_port() {
  local p="$1"
  local pids
  pids="$(lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    log "Killing listeners on :$p -> ${pids}"
    kill -9 ${pids} || true
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
  local name="$1"
  shift
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

log "=== INSTALL/BUILD (safe) ==="
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
  log "Fix MOCK_DN_ENTRY path near top of this script."
  exit 1
fi

log "=== WAIT MOCK DN READY ==="
if ! wait_http_ok "http://localhost:${MOCK_PORT}/health" "$HEALTH_TIMEOUT"; then
  # some mocks don't have /health; try a known endpoint fallback
  wait_http_ok "http://localhost:${MOCK_PORT}/products/search" "$HEALTH_TIMEOUT" || true
fi

log "=== START BACKEND (dev) ==="
if [[ -d "$BACKEND_DIR" ]]; then
  # ensure backend binds to BACKEND_PORT
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
# adjust command if your worker script differs
bg_start "worker" bash -lc "cd \"$BACKEND_DIR\" && DN_SDK_DEBUG=1 NODE_ENV=development npx tsx src/worker.ts"

log "=== START FRONTEND (optional) ==="
if [[ -d "$FRONTEND_DIR" ]]; then
  bg_start "frontend" bash -lc "cd \"$FRONTEND_DIR\" && npm run dev -- --host --port $FRONTEND_PORT"
fi

log "=== BOOTSTRAP: register + enqueue ==="
if [[ -f "$BOOT_SCRIPT" ]]; then
  # ensure the bootstrap points SDK baseUrl to mock DN port
  MOCK_PORT="$MOCK_PORT" bash "$BOOT_SCRIPT" >>"$LOG_DIR/bootstrap.invoke.log" 2>&1 || true
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
  # also detect common failure patterns early
  if grep -E "ERROR|Foreign key|constraint|PrismaClientKnownRequestError" "$LOG_DIR/worker.log" >/dev/null 2>&1; then
    log "Detected error patterns in worker.log (continuing to capture logs, but likely failing)."
    break
  fi
  sleep 2
done

if [[ "$found" -eq 1 ]]; then
  log "Bootstrap completion detected."
else
  log "Bootstrap did NOT complete within ${BOOT_TIMEOUT}s (this is why it 'hangs')."
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
log "  $LOG_DIR/db_counts.log"
