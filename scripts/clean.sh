#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

remove_dir() {
  local rel="$1"
  local target="$ROOT_DIR/$rel"
  if [[ -d "$target" ]]; then
    rm -rf "$target"
    echo "[clean] removed $rel"
  fi
}

remove_dir "frontend/dist"
remove_dir "frontend/build"
remove_dir "frontend/.next"
remove_dir "frontend/out"
remove_dir "frontend/coverage"
remove_dir "repo/frontend/dist"
remove_dir "repo/frontend/build"
remove_dir "repo/frontend/.next"
remove_dir "repo/frontend/out"
remove_dir "repo/frontend/coverage"
remove_dir "frontend/test-results"
remove_dir "frontend/playwright-report"
remove_dir "artifacts/pids"
remove_dir "artifacts/backups"
remove_dir "backend/logs"

if [[ -d "$ROOT_DIR/backend/uploads" ]]; then
  find "$ROOT_DIR/backend/uploads" -mindepth 1 -not -name '.gitkeep' -exec rm -rf {} +
  echo "[clean] removed backend/uploads/*"
fi

if [[ -d "$ROOT_DIR/artifacts/logs" ]]; then
  find "$ROOT_DIR/artifacts/logs" -type f -name '*.log' -delete
  find "$ROOT_DIR/artifacts/logs" -type f -name '*.pid' -delete
  find "$ROOT_DIR/artifacts/logs" -type f -name 'noninteractive-*.log' -delete
  echo "[clean] removed artifacts/logs/*.log"
fi

mkdir -p \
  "$ROOT_DIR/artifacts/logs" \
  "$ROOT_DIR/artifacts/pids" \
  "$ROOT_DIR/artifacts/backups" \
  "$ROOT_DIR/backend/uploads" \
  "$ROOT_DIR/backend/logs" \
  "$ROOT_DIR/frontend/test-results" \
  "$ROOT_DIR/frontend/playwright-report"

touch \
  "$ROOT_DIR/artifacts/logs/.gitkeep" \
  "$ROOT_DIR/artifacts/pids/.gitkeep" \
  "$ROOT_DIR/artifacts/backups/.gitkeep" \
  "$ROOT_DIR/backend/uploads/.gitkeep" \
  "$ROOT_DIR/backend/logs/.gitkeep" \
  "$ROOT_DIR/frontend/test-results/.gitkeep" \
  "$ROOT_DIR/frontend/playwright-report/.gitkeep"

echo "[clean] OK"
