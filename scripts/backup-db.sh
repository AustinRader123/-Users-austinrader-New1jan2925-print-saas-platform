#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/artifacts/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${1:-$BACKUP_DIR/db-${TIMESTAMP}.sql.gz}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup-db] ERROR: DATABASE_URL is required"
  exit 2
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[backup-db] ERROR: pg_dump is not installed"
  exit 2
fi

mkdir -p "$(dirname "$OUT_FILE")"

echo "[backup-db] creating backup -> ${OUT_FILE}"
pg_dump "$DATABASE_URL" | gzip >"$OUT_FILE"

echo "[backup-db] OK"
