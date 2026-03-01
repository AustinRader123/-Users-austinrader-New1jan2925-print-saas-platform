#!/usr/bin/env bash
set -euo pipefail

is_port_open() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return $?
  fi
  return 1
}

wait_port_open() {
  local port="$1"
  local timeout="${2:-30}"
  local elapsed=0
  while (( elapsed < timeout )); do
    if is_port_open "$port"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

wait_port_closed() {
  local port="$1"
  local timeout="${2:-30}"
  local elapsed=0
  while (( elapsed < timeout )); do
    if ! is_port_open "$port"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

stop_pidfile() {
  local pidfile="$1"
  if [[ ! -f "$pidfile" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  rm -f "$pidfile"

  if [[ -z "$pid" ]]; then
    return 0
  fi
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  if command -v pgrep >/dev/null 2>&1; then
    local child_pids
    child_pids="$(pgrep -P "$pid" 2>/dev/null || true)"
    for child_pid in $child_pids; do
      kill "$child_pid" >/dev/null 2>&1 || true
    done
  fi

  kill "$pid" >/dev/null 2>&1 || true
  sleep 1
  if kill -0 "$pid" >/dev/null 2>&1; then
    if command -v pgrep >/dev/null 2>&1; then
      local child_pids
      child_pids="$(pgrep -P "$pid" 2>/dev/null || true)"
      for child_pid in $child_pids; do
        kill -9 "$child_pid" >/dev/null 2>&1 || true
      done
    fi
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
}

stop_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi

  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  for pid in $pids; do
    kill "$pid" >/dev/null 2>&1 || true
  done
  sleep 1
  for pid in $pids; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  done
}

start_cmd() {
  local name="$1"
  local cmd="$2"
  local logfile="$3"
  local pidfile="$4"

  mkdir -p "$(dirname "$logfile")" "$(dirname "$pidfile")"
  stop_pidfile "$pidfile"

  nohup bash -lc "$cmd" >>"$logfile" 2>&1 &
  local pid=$!
  echo "$pid" >"$pidfile"
  echo "[proc] started $name pid=$pid"
}
