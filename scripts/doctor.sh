#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/proc.sh"

BACKEND_PORT="${BACKEND_PORT:-3100}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"
ALLOW_BUSY_PORTS="${DOCTOR_ALLOW_BUSY_PORTS:-0}"
DOCTOR_PROFILE="${DOCTOR_PROFILE:-development}"
LOG_DIR="$ROOT_DIR/artifacts/logs"
mkdir -p "$LOG_DIR"

fail=0

get_env_or_dotenv() {
  local key="$1"
  local backend_env="$ROOT_DIR/backend/.env"
  local root_env="$ROOT_DIR/.env"
  local val="${!key:-}"
  if [[ -n "$val" ]]; then
    printf '%s' "$val"
    return 0
  fi
  if [[ -f "$backend_env" ]]; then
    val="$(grep -E "^${key}=" "$backend_env" | tail -n1 | sed -E "s/^${key}=//" || true)"
    if [[ -n "$val" ]]; then
      printf '%s' "$val"
      return 0
    fi
  fi
  if [[ -f "$root_env" ]]; then
    val="$(grep -E "^${key}=" "$root_env" | tail -n1 | sed -E "s/^${key}=//" || true)"
    if [[ -n "$val" ]]; then
      printf '%s' "$val"
      return 0
    fi
  fi
  printf ''
}

echo "[doctor] BACKEND_PORT=$BACKEND_PORT FRONTEND_PORT=$FRONTEND_PORT BASE_URL=$BASE_URL"

if [[ "$ALLOW_BUSY_PORTS" != "1" ]]; then
  if is_port_open "$BACKEND_PORT"; then
    echo "[doctor] FAIL backend port in use: $BACKEND_PORT (run npm run stop)"
    fail=1
  fi
  if is_port_open "$FRONTEND_PORT"; then
    echo "[doctor] FAIL frontend port in use: $FRONTEND_PORT (run npm run stop)"
    fail=1
  fi
fi

database_url="$(get_env_or_dotenv DATABASE_URL)"
jwt_secret="$(get_env_or_dotenv JWT_SECRET)"
s3_use_local="$(get_env_or_dotenv S3_USE_LOCAL)"
aws_key="$(get_env_or_dotenv AWS_ACCESS_KEY_ID)"
aws_secret="$(get_env_or_dotenv AWS_SECRET_ACCESS_KEY)"
s3_bucket="$(get_env_or_dotenv S3_BUCKET)"
billing_provider="$(get_env_or_dotenv BILLING_PROVIDER)"
stripe_secret_key="$(get_env_or_dotenv STRIPE_SECRET_KEY)"
stripe_webhook_secret="$(get_env_or_dotenv STRIPE_WEBHOOK_SECRET)"
cors_origin="$(get_env_or_dotenv CORS_ORIGIN)"
node_env="$(get_env_or_dotenv NODE_ENV)"
billing_provider_lower="$(printf '%s' "$billing_provider" | tr '[:upper:]' '[:lower:]')"

if [[ -z "$database_url" ]]; then
  echo "[doctor] FAIL missing DATABASE_URL"
  fail=1
fi
if [[ -z "$jwt_secret" ]]; then
  echo "[doctor] FAIL missing JWT_SECRET"
  fail=1
fi

if [[ "$s3_use_local" == "false" ]]; then
  if [[ -z "$aws_key" || -z "$aws_secret" || -z "$s3_bucket" ]]; then
    echo "[doctor] FAIL S3_USE_LOCAL=false but AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/S3_BUCKET missing"
    fail=1
  fi
fi

if [[ "$billing_provider_lower" == "stripe" && -z "$stripe_secret_key" ]]; then
  echo "[doctor] FAIL BILLING_PROVIDER=stripe but STRIPE_SECRET_KEY missing"
  fail=1
fi
if [[ "$billing_provider_lower" == "stripe" && -z "$stripe_webhook_secret" ]]; then
  echo "[doctor] FAIL BILLING_PROVIDER=stripe but STRIPE_WEBHOOK_SECRET missing"
  fail=1
fi

if [[ "$DOCTOR_PROFILE" == "production" ]]; then
  if [[ -z "$cors_origin" || "$cors_origin" == "*" ]]; then
    echo "[doctor] FAIL production profile requires explicit CORS_ORIGIN allowlist"
    fail=1
  fi
  if [[ -n "$node_env" && "$node_env" != "production" ]]; then
    echo "[doctor] FAIL DOCTOR_PROFILE=production but NODE_ENV is '$node_env'"
    fail=1
  fi
  if [[ ${#jwt_secret} -lt 32 ]]; then
    echo "[doctor] FAIL production profile requires JWT_SECRET length >= 32"
    fail=1
  fi
fi

DB_LOG="$LOG_DIR/doctor-db.log"
if ! (cd "$ROOT_DIR/backend" && npm run db:migrate >"$DB_LOG" 2>&1); then
  if grep -q "P1001" "$DB_LOG"; then
    echo "[doctor] FAIL database unreachable (Prisma P1001). Check DATABASE_URL and Postgres status."
  else
    echo "[doctor] FAIL database migration check failed. See artifacts/logs/doctor-db.log"
  fi
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[doctor] recent logs"
  if [[ -d "$LOG_DIR" ]]; then
    for f in "$LOG_DIR"/*; do
      [[ -f "$f" ]] || continue
      echo "----- ${f#$ROOT_DIR/} (last 50) -----"
      tail -n 50 "$f" || true
    done
  fi
  exit 1
fi

echo "[doctor] OK"
