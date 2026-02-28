#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

echo "=== Orchestrator diagnosis: $(date) ==="

echo "-- Listening ports (lsof -iTCP -sTCP:LISTEN)"
lsof -iTCP -sTCP:LISTEN 2>/dev/null | sed -n '1,200p' || true

echo "-- Pidfiles in $LOG_DIR"
for f in "$LOG_DIR"/*.pid; do
  [[ -f "$f" ]] || continue
  echo "pidfile: $f -> $(cat "$f")"
  ps -o pid,cmd -p "$(cat "$f")" 2>/dev/null || true
done

echo "-- Last 50 lines of logs"
for f in mock-dn backend worker bootstrap.invoke frontend; do
  file="$LOG_DIR/${f}.log"
  [[ -f "$file" ]] || continue
  echo
  echo "--- $file (last 50) ---"
  tail -n 50 "$file"
done

echo
echo "-- Backend HTTP checks"
for url in "http://localhost:3000/health" "http://localhost:3000/api/health" "http://localhost:3000/ready"; do
  echo "Checking $url"
  curl -fsS --connect-timeout 2 --max-time 5 "$url" || echo "FAIL: $url"
done

echo
echo "-- Worker log error summary"
grep -E "ERROR|PrismaClientKnownRequestError|Foreign key|constraint" "$LOG_DIR/worker.log" 2>/dev/null | tail -n 50 || true
