#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") [--yes] <backup.sql|backup.sql.gz>
EOF
}

confirm=0
if [[ "${1:-}" == "--yes" ]]; then
  confirm=1
  shift
fi

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  usage
  exit 2
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[restore-db] ERROR: backup file not found: $BACKUP_FILE"
  exit 2
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[restore-db] ERROR: DATABASE_URL is required"
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[restore-db] ERROR: psql is not installed"
  exit 2
fi

if [[ "$confirm" -ne 1 ]]; then
  echo "[restore-db] This will overwrite data in target DATABASE_URL. Re-run with --yes to continue."
  exit 2
fi

echo "[restore-db] restoring from $BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
  psql "$DATABASE_URL" <"$BACKUP_FILE"
fi

echo "[restore-db] OK"
