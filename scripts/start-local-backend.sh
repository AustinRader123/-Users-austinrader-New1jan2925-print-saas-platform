#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="/tmp/skuflow-backend.log"
BACKEND_PORT="${BACKEND_PORT:-3100}"
PORT="${PORT:-$BACKEND_PORT}"
BASE_URL="${BASE_URL:-http://127.0.0.1:$PORT}"
CMD="node backend/dist/index.js"

usage() {
  cat <<EOF
Usage: $(basename "$0") [start|stop|status|logs]

Commands:
  start   Kill anything on :$PORT, start backend detached, wait for __ping
  stop    Kill process listening on :$PORT
  status  Show PID listening on :$PORT, if any
  logs    Tail backend logs ($LOG_FILE)
EOF
}

start_server() {
  cd "$ROOT_DIR"
  if lsof -ti ":$PORT" >/dev/null 2>&1; then
    echo "Stopping existing process on :$PORT..."
    kill -9 $(lsof -ti ":$PORT") 2>/dev/null || true
    sleep 0.2
  fi

  echo "Starting backend: $CMD"
  nohup $CMD >"$LOG_FILE" 2>&1 &
  local pid=$!
  echo "PID: $pid (logs: $LOG_FILE)"

  echo -n "Waiting for __ping on :$PORT"
  for i in $(seq 1 40); do
    if curl -sS -m 1 "$BASE_URL/__ping" >/dev/null; then
      echo " - up"
      echo "Health: $(curl -sS -m 2 "$BASE_URL/health" || true)"
      echo "API Health: $(curl -sS -m 2 "$BASE_URL/api/health" || true)"
      return 0
    fi
    echo -n "."
    sleep 0.25
  done
  echo " - failed"
  echo "Startup logs (last 100 lines):"
  tail -n 100 "$LOG_FILE" || true
  return 1
}

stop_server() {
  if lsof -ti ":$PORT" >/dev/null 2>&1; then
    echo "Stopping process on :$PORT..."
    kill -9 $(lsof -ti ":$PORT") 2>/dev/null || true
    echo "Stopped."
  else
    echo "No process listening on :$PORT"
  fi
}

status_server() {
  if lsof -ti ":$PORT" >/dev/null 2>&1; then
    local pid
    pid=$(lsof -ti ":$PORT" | head -n1)
    echo "Listening on :$PORT (PID $pid)"
  else
    echo "No listener on :$PORT"
  fi
}

logs_tail() {
  echo "Tailing $LOG_FILE (Ctrl-C to exit)"
  tail -n 200 -f "$LOG_FILE"
}

cmd="${1:-start}"
case "$cmd" in
  start) start_server ;;
  stop) stop_server ;;
  status) status_server ;;
  logs) logs_tail ;;
  -h|--help|help) usage ;;
  *) usage; exit 1 ;;
esac
