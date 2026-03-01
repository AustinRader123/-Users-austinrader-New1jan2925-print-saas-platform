#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/proc.sh"

BACKEND_PORT="${BACKEND_PORT:-3100}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
LEGACY_PORTS=(3000 3102 3103 3104)
PID_DIR="$ROOT_DIR/artifacts/pids"
mkdir -p "$PID_DIR"

echo "[stop] stopping pidfile processes"
stop_pidfile "$PID_DIR/backend.pid"
stop_pidfile "$PID_DIR/frontend.pid"
stop_pidfile "$PID_DIR/mock.pid"
stop_pidfile "$PID_DIR/supplier-scheduler.pid"

echo "[stop] stopping listeners on configured ports"
stop_port "$BACKEND_PORT"
stop_port "$FRONTEND_PORT"
for port in "${LEGACY_PORTS[@]}"; do
  stop_port "$port"
done

if ! wait_port_closed "$BACKEND_PORT" 10; then
  echo "[stop] backend port still busy: $BACKEND_PORT"
  exit 1
fi
if ! wait_port_closed "$FRONTEND_PORT" 10; then
  echo "[stop] frontend port still busy: $FRONTEND_PORT"
  exit 1
fi
for port in "${LEGACY_PORTS[@]}"; do
  if ! wait_port_closed "$port" 10; then
    echo "[stop] port still busy: $port"
    exit 1
  fi
done

echo "[stop] OK backend=$BACKEND_PORT frontend=$FRONTEND_PORT"
