#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-3100}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"
EXPECTED_VERSION="${EXPECTED_VERSION:-${APP_VERSION:-}}"

json="$(curl --fail --silent --show-error "$BASE_URL/api/version")"

version="$(printf '%s' "$json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j.version||''));});")"
commit="$(printf '%s' "$json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j.commit||''));});")"
build_time="$(printf '%s' "$json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j.buildTime||''));});")"
env_name="$(printf '%s' "$json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j.env||''));});")"

if [[ -n "$EXPECTED_VERSION" && "$version" != "$EXPECTED_VERSION" ]]; then
  echo "[smoke:version] FAIL expected version=$EXPECTED_VERSION got=$version"
  exit 1
fi

if [[ -z "$version" || -z "$commit" || -z "$build_time" || -z "$env_name" ]]; then
  echo "[smoke:version] FAIL missing fields in /api/version payload: $json"
  exit 1
fi

echo "[smoke:version] PASS base=$BASE_URL version=$version commit=$commit env=$env_name buildTime=$build_time"
