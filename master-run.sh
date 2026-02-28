#!/usr/bin/env bash
# master-run.sh
# One command to: clean ports -> install deps -> migrate -> start mock DN -> start backend -> start worker -> start frontend -> run Day-3 idempotency (with timeout) -> dump logs.
# Works even if something fails: it will print where to look (logs) and keep services running unless you CTRL+C.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
MOCK_DN_ENTRY="${ROOT}/mock-dn/server.js"

DAY3_SCRIPT="$ROOT/scripts/day3-idempotency.sh"
DAY2_SCRIPT="$ROOT/scripts/day2-idempotency.sh"

# ---- Config (override by env vars) ----
: "${BACKEND_PORT:=3000}"
: "${FRONTEND_PORT:=5173}"
: "${MOCK_DN_PORT:=6060}"
: "${DAY3_TIMEOUT_SECONDS:=180}"
: "${RUN_DAY3:=1}"
: "${RUN_DAY2:=0}"
: "${SKIP_FRONTEND:=0}"
: "${SKIP_MOCK_DN:=0}"
: "${SKIP_WORKER:=0}"
: "${SKIP_BACKEND:=0}"
: "${PRISMA_MIGRATE_MODE:=deploy}"
: "${DATABASE_URL:=}"

ts() { date +"%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(ts)] $*"; }

die() { echo "[$(ts)] ERROR: $*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }

need_cmd node
need_cmd npm
need_cmd npx
need_cmd lsof
need_cmd curl

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" || true)"
  if [[ -n "${pids:-}" ]]; then
    log "Killing processes on port $port: $pids"
    kill -9 $pids || true
  fi
}

start_bg() {
  local name="$1"; shift
  local logfile="$1"; shift
  log "Starting $name (logs: $logfile)"
  ( "$@" ) >>"$logfile" 2>&1 &
  echo $! >"$LOG_DIR/${name}.pid"
}

wait_http() {
  local url="$1"
  local name="$2"
  local tries=60
  local i=1
  while [[ $i -le $tries ]]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "$name is up: $url"
      return 0
    fi
    sleep 1
    i=$((i+1))
  done
  die "$name did not become ready in time: $url"
}

tail_hint() {
  echo
  echo "---- QUICK LOG POINTERS ----"
  echo "Mock DN   : $LOG_DIR/mock-dn.log"
  #!/usr/bin/env bash
  # master-run.sh
  # One command to run: mock DN + backend + worker + frontend + Day-3 idempotency, with hard timeouts + logs.
  # Usage:
  #   bash master-run.sh
  # Optional env overrides:
  #   MOCK_PORT=6060 BACKEND_PORT=3000 FRONTEND_PORT=5173 BOOT_TIMEOUT=600 HEALTH_TIMEOUT=60

  set -euo pipefail

  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  LOG_DIR="$ROOT/artifacts/logs"
  mkdir -p "$LOG_DIR"

  : "${MOCK_PORT:=6060}"
  : "${BACKEND_PORT:=3000}"
  : "${FRONTEND_PORT:=5173}"
  : "${BOOT_TIMEOUT:=600}"
  : "${HEALTH_TIMEOUT:=60}"

  # ---- Adjust these if your paths differ ----
  MOCK_DN_ENTRY="${ROOT}/mock-dn/server.js"
  BACKEND_DIR="${ROOT}/backend"
  FRONTEND_DIR="${ROOT}/frontend"
  WORKER_CMD=(bash -lc "cd \"$BACKEND_DIR\" && DN_SDK_DEBUG=1 NODE_ENV=development npx tsx src/worker.ts")
  BACKEND_DEV_CMD=(bash -lc "cd \"$BACKEND_DIR\" && PORT=$BACKEND_PORT npm run dev")
  FRONTEND_DEV_CMD=(bash -lc "cd \"$FRONTEND_DIR\" && npm run dev -- --host --port $FRONTEND_PORT")
  DAY3_SCRIPT="${ROOT}/scripts/day3-idempotency.sh"
  BOOTSTRAP_SCRIPT="${ROOT}/scripts/run_register_and_bootstrap.sh"
  # ------------------------------------------

  ts(){ date "+%Y-%m-%d %H:%M:%S"; }
  log(){ echo "[$(ts)] $*"; }

  die(){ log "ERROR: $*"; exit 1; }

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
    local seconds="$2"
    local i=0
    while (( i < seconds )); do
      if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi
      sleep 1
      ((i++)) || true
    done
    return 1
  }

  start_bg() {
    local name="$1"; shift
    local out="$LOG_DIR/${name}.log"
    log "Starting ${name} -> ${out}"
    (
      set +e
      "$@" >>"$out" 2>&1
      echo "[$(ts)] ${name} exited code=$?" >>"$out"
    ) &
    echo $! >"$LOG_DIR/${name}.pid"
    disown || true
    log "${name} pid=$(cat "$LOG_DIR/${name}.pid")"
  }

  stop_bg() {
    local name="$1"
    local pidfile="$LOG_DIR/${name}.pid"
    [[ -f "$pidfile" ]] || return 0
    local pid; pid="$(cat "$pidfile")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      log "Stopping ${name} pid=${pid}"
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$pidfile"
  }

  cleanup() {
    log "Cleanup..."
    stop_bg frontend || true
    stop_bg worker || true
    stop_bg backend || true
    stop_bg mockdn || true
  }
  trap cleanup EXIT

  # ---------- Preflight ----------
  [[ -d "$BACKEND_DIR" ]] || die "Missing backend dir: $BACKEND_DIR"
  [[ -f "$MOCK_DN_ENTRY" ]] || die "Missing mock DN entry: $MOCK_DN_ENTRY"
  [[ -d "$FRONTEND_DIR" ]] || log "WARN: Missing frontend dir (will skip frontend): $FRONTEND_DIR"
  [[ -f "$DAY3_SCRIPT" ]] || log "WARN: Missing Day-3 script (will skip): $DAY3_SCRIPT"
  [[ -f "$BOOTSTRAP_SCRIPT" ]] || log "WARN: Missing bootstrap script (will skip): $BOOTSTRAP_SCRIPT"

  log "Killing common ports..."
  kill_port "$MOCK_PORT"
  kill_port "$BACKEND_PORT"
  kill_port "$FRONTEND_PORT"

  # ---------- Install / Prisma (non-interactive) ----------
  log "Backend deps + prisma..."
   (
    cd "$BACKEND_DIR"
    npm ci
    npx prisma migrate deploy
    npx prisma generate
  ) >>"$LOG_DIR/setup.backend.log" 2>&1 || die "Backend setup failed (see $LOG_DIR/setup.backend.log)"

  if [[ -d "$FRONTEND_DIR" ]]; then
    log "Frontend deps (ensure devDeps installed)..."
    (
      cd "$FRONTEND_DIR"
      NPM_CONFIG_PRODUCTION=false npm ci
    ) >>"$LOG_DIR/setup.frontend.log" 2>&1 || die "Frontend setup failed (see $LOG_DIR/setup.frontend.log)"
  fi

  # ---------- Start services ----------
  start_bg mockdn node "$MOCK_DN_ENTRY"

  log "Wait mock DN..."
  if ! wait_http_ok "http://localhost:${MOCK_PORT}/health" "$HEALTH_TIMEOUT"; then
    # fallback for mocks without /health
    wait_http_ok "http://localhost:${MOCK_PORT}/products/search" "$HEALTH_TIMEOUT" \
      || die "Mock DN not responding on :$MOCK_PORT (see $LOG_DIR/mockdn.log)"
  fi

  start_bg backend "${BACKEND_DEV_CMD[@]}"

  log "Wait backend..."
  if ! wait_http_ok "http://localhost:${BACKEND_PORT}/health" "$HEALTH_TIMEOUT"; then
    wait_http_ok "http://localhost:${BACKEND_PORT}/api/health" "$HEALTH_TIMEOUT" \
      || die "Backend not healthy on :$BACKEND_PORT (see $LOG_DIR/backend.log)"
  fi

  start_bg worker "${WORKER_CMD[@]}"

  if [[ -d "$FRONTEND_DIR" ]]; then
    start_bg frontend "${FRONTEND_DEV_CMD[@]}"
  fi

  # ---------- Bootstrap (non-blocking) ----------
  if [[ -f "$BOOTSTRAP_SCRIPT" ]]; then
    log "Trigger bootstrap..."
    (
      export MOCK_PORT
      bash "$BOOTSTRAP_SCRIPT"
    ) >>"$LOG_DIR/bootstrap.invoke.log" 2>&1 || true
  fi

  # ---------- Run Day-3 idempotency with hard timeout ----------
  if [[ -f "$DAY3_SCRIPT" ]]; then
    log "Run Day-3 idempotency (timeout ${BOOT_TIMEOUT}s)..."
    chmod +x "$DAY3_SCRIPT" || true

    # macOS-safe timeout: run in background, kill if exceeds BOOT_TIMEOUT
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

  # ---------- Show quick last logs ----------
  log "==== LAST LOGS ===="
  for f in mockdn backend worker day3.console bootstrap.invoke; do
    file="$LOG_DIR/${f}.log"
    [[ "$f" == "day3.console" ]] && file="$LOG_DIR/day3.console.log"
    [[ "$f" == "bootstrap.invoke" ]] && file="$LOG_DIR/bootstrap.invoke.log"
    [[ -f "$file" ]] || continue
    echo
    log "-- tail $file"
    tail -n 120 "$file" || true
  done

  log "==== READY ===="
  log "Frontend (if started): http://localhost:${FRONTEND_PORT}/"
  log "Backend:              http://localhost:${BACKEND_PORT}/health"
  log "Mock DN:              http://localhost:${MOCK_PORT}/health (or products/search)"
  log "Logs:                 $LOG_DIR"
