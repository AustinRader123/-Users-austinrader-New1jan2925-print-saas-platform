#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3100}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi
  echo "[phase6] ERROR: docker compose is required"
  exit 2
}

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');const v=j['${field}'];process.stdout.write(v==null?'':String(v));});"
}

wait_http_ok() {
  local url="$1"
  local timeout="${2:-90}"
  local elapsed=0
  while (( elapsed < timeout )); do
    if curl --silent --show-error --fail "$url" >/dev/null; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

cleanup() {
  compose --profile prod down -v --remove-orphans || true
}
trap cleanup EXIT INT TERM

if ! docker info >/dev/null 2>&1; then
  echo "[phase6] ERROR: docker daemon is not available"
  exit 2
fi

echo "[phase6] docker compose up (prod profile)"
compose --profile prod up -d --build postgres redis backend frontend

echo "[phase6] waiting for backend health + readiness"
wait_http_ok "$BASE_URL/health" 120 || { echo "[phase6] backend /health failed"; exit 1; }
wait_http_ok "$BASE_URL/ready" 120 || { echo "[phase6] backend /ready failed"; exit 1; }

echo "[phase6] waiting for frontend health"
wait_http_ok "http://localhost:${FRONTEND_PORT}/health" 120 || { echo "[phase6] frontend /health failed"; exit 1; }

echo "[phase6] public checkout flow"
products_json=$(curl --fail --silent --show-error "$BASE_URL/api/public/products?storeSlug=default")
product_id=$(printf '%s' "$products_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d||'[]');process.stdout.write(a?.[0]?.id||'');});")
variant_id=$(printf '%s' "$products_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d||'[]');process.stdout.write(a?.[0]?.variants?.[0]?.id||'');});")
if [[ -z "$product_id" || -z "$variant_id" ]]; then
  echo "[phase6] missing seeded public product/variant"
  exit 1
fi

cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d '{"storeSlug":"default"}')
cart_token=$(printf '%s' "$cart_json" | json_field token)
if [[ -z "$cart_token" ]]; then
  echo "[phase6] cart creation failed"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"quantity\":2}" >/dev/null

checkout_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" \
  -H 'Content-Type: application/json' \
  -d '{"customerEmail":"phase6-smoke@example.com","customerName":"Phase6 Smoke","shippingAddress":{"line1":"123 Main","city":"Austin","state":"TX","postalCode":"78701","country":"US"},"paymentProvider":"NONE"}' \
  -w $'\n%{http_code}')
checkout_json=${checkout_resp%$'\n'*}
checkout_code=${checkout_resp##*$'\n'}
if [[ "$checkout_code" != "201" ]]; then
  echo "[phase6] checkout failed (http=$checkout_code body=$checkout_json)"
  exit 1
fi

order_id=$(printf '%s' "$checkout_json" | json_field orderId)
if [[ -z "$order_id" ]]; then
  echo "[phase6] checkout response missing orderId"
  exit 1
fi

echo "[phase6] PASS orderId=$order_id"
