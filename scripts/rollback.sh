#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") --yes [--ref <git-ref>] [--backup <backup.sql|backup.sql.gz>] [--skip-db]

Examples:
  $(basename "$0") --yes --ref HEAD~1 --backup artifacts/backups/db-20260101-120000.sql.gz
  $(basename "$0") --yes --ref v1.2.3 --skip-db
EOF
}

confirm=0
skip_db=0
git_ref=""
backup_file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      confirm=1
      shift
      ;;
    --skip-db)
      skip_db=1
      shift
      ;;
    --ref)
      git_ref="${2:-}"
      shift 2
      ;;
    --backup)
      backup_file="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[rollback] ERROR: unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

if [[ "$confirm" -ne 1 ]]; then
  echo "[rollback] Refusing to run without --yes"
  exit 2
fi

if [[ -n "$git_ref" ]]; then
  echo "[rollback] checking out git ref: $git_ref"
  (cd "$ROOT_DIR" && git rev-parse --verify "$git_ref" >/dev/null)
  (cd "$ROOT_DIR" && git checkout "$git_ref")
fi

if [[ "$skip_db" -eq 0 ]]; then
  if [[ -z "$backup_file" ]]; then
    echo "[rollback] ERROR: --backup is required unless --skip-db is set"
    exit 2
  fi
  "$ROOT_DIR/scripts/restore-db.sh" --yes "$backup_file"
fi

echo "[rollback] completed"
