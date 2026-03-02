#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:4000}"
TENANT_ID="${TENANT_ID:-default}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-}"
TOKEN="${TOKEN:-}"
WEBHOOK_ID="${WEBHOOK_ID:-}"
TARGET_URL="${TARGET_URL:-https://httpbin.org/post}"
EVENT_TYPE="${EVENT_TYPE:-order.updated}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"

req() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local auth_header=()
  if [[ -n "${TOKEN}" ]]; then
    auth_header=(-H "Authorization: Bearer ${TOKEN}")
  fi

  if [[ -n "${body}" ]]; then
    curl -sS -X "${method}" "${API_BASE}${path}" \
      -H "Content-Type: application/json" \
      -H "x-tenant-id: ${TENANT_ID}" \
      "${auth_header[@]}" \
      -d "${body}"
  else
    curl -sS -X "${method}" "${API_BASE}${path}" \
      -H "x-tenant-id: ${TENANT_ID}" \
      "${auth_header[@]}"
  fi
}

json_get() {
  local key="$1"
  python3 - "$key" <<'PY'
import json,sys
key = sys.argv[1]
raw = sys.stdin.read().strip() or '{}'
obj = json.loads(raw)
val = obj.get(key, '') if isinstance(obj, dict) else ''
print(val if val is not None else '')
PY
}

echo "[1/7] Resolve auth token"
if [[ -z "${TOKEN}" ]]; then
  if [[ -z "${EMAIL}" || -z "${PASSWORD}" ]]; then
    echo "ERROR: set TOKEN or EMAIL+PASSWORD"
    exit 1
  fi
  login_payload="{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
  login_resp="$(req POST /api/auth/login "${login_payload}")"
  TOKEN="$(printf '%s' "${login_resp}" | json_get token)"
  if [[ -z "${TOKEN}" ]]; then
    echo "ERROR: login failed (no token)"
    echo "Response: ${login_resp}"
    exit 1
  fi
fi

if [[ -z "${WEBHOOK_ID}" ]]; then
  echo "[2/7] Create temporary webhook endpoint"
  secret="smoke-secret-$(date +%s)"
  create_payload="{\"eventType\":\"${EVENT_TYPE}\",\"endpoint\":\"${TARGET_URL}\",\"provider\":\"CUSTOM\",\"secret\":\"${secret}\",\"isActive\":true}"
  create_resp="$(req POST /api/webhooks "${create_payload}")"
  WEBHOOK_ID="$(printf '%s' "${create_resp}" | json_get id)"
  if [[ -z "${WEBHOOK_ID}" ]]; then
    echo "ERROR: webhook creation failed"
    echo "Response: ${create_resp}"
    exit 1
  fi
  echo "Created WEBHOOK_ID=${WEBHOOK_ID}"
else
  echo "[2/7] Using existing WEBHOOK_ID=${WEBHOOK_ID}"
fi

event_id="evt-$(date +%s)"
idempotency_key="smoke-${WEBHOOK_ID}-${event_id}"
body="{\"source\":\"smoke\",\"eventId\":\"${event_id}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

queue_payload="{\"eventId\":\"${event_id}\",\"idempotencyKey\":\"${idempotency_key}\",\"eventType\":\"${EVENT_TYPE}\",\"maxAttempts\":${MAX_ATTEMPTS},\"body\":${body}}"

echo "[3/7] Queue retry job"
queue_resp="$(req POST "/api/webhooks/${WEBHOOK_ID}/retries/queue" "${queue_payload}")"
retry_id="$(printf '%s' "${queue_resp}" | json_get retryId)"
if [[ -z "${retry_id}" ]]; then
  echo "ERROR: retry queue failed"
  echo "Response: ${queue_resp}"
  exit 1
fi
echo "Queued RETRY_ID=${retry_id}"

echo "[4/7] Verify idempotency duplicate queue"
queue_dup_resp="$(req POST "/api/webhooks/${WEBHOOK_ID}/retries/queue" "${queue_payload}")"
if ! printf '%s' "${queue_dup_resp}" | grep -q '"duplicate"[[:space:]]*:[[:space:]]*true'; then
  echo "ERROR: expected duplicate=true on second queue call"
  echo "Response: ${queue_dup_resp}"
  exit 1
fi
echo "Duplicate queue confirmed"

echo "[5/7] Dispatch retries"
dispatch_resp="$(req POST /api/webhooks/retries/dispatch "{\"webhookId\":\"${WEBHOOK_ID}\",\"limit\":10}")"
echo "Dispatch response: ${dispatch_resp}"

echo "[6/7] Fetch delivery logs"
deliveries_resp="$(req GET "/api/webhooks/deliveries?webhookId=${WEBHOOK_ID}&limit=10")"
echo "Deliveries: ${deliveries_resp}"

echo "[7/7] Done"
echo "WEBHOOK_ID=${WEBHOOK_ID}"
echo "RETRY_ID=${retry_id}"
echo "IDEMPOTENCY_KEY=${idempotency_key}"
