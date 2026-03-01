#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/proc.sh"

BACKEND_PORT="${BACKEND_PORT:-3100}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@demo.local}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-AdminPass123!}"
PID_DIR="$ROOT_DIR/artifacts/pids"
LOG_DIR="$ROOT_DIR/artifacts/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

cleanup() {
  stop_pidfile "$PID_DIR/backend.pid"
  wait_port_closed "$BACKEND_PORT" 10 || true
}
trap cleanup EXIT INT TERM

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');const v=j['${field}'];process.stdout.write(v==null?'':String(v));});"
}

echo "[phase7] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase7] start backend"
start_cmd "backend-smoke-phase7" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase7.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase7] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:store?.id,status:'ACTIVE'}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||'',productId:product?.id||'',storeSlug:store?.slug||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
product_id=$(printf '%s' "$ids_json" | json_field productId)
store_slug=$(printf '%s' "$ids_json" | json_field storeSlug)

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase7] onboarding"
curl --fail --silent --show-error "$BASE_URL/api/onboarding?storeId=$store_id" "${auth_headers[@]}" >/dev/null
curl --fail --silent --show-error -X PUT "$BASE_URL/api/onboarding" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"step\":3,\"data\":{\"business\":{\"name\":\"Smoke Store\"}}}" >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/onboarding/complete" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}" >/dev/null

echo "[phase7] theme draft + publish + preview"
theme_payload='{"colors":{"primary":"#2563EB","secondary":"#0F172A","accent":"#22C55E","background":"#FFFFFF","text":"#111827"},"typography":{"fontPreset":"INTER"},"layout":{"heroStyle":"STANDARD","showFeaturedCollections":true},"hero":{"title":"Smoke Theme"},"banner":{"enabled":false},"footerLinks":[],"featuredCollectionIds":[]}'
curl --fail --silent --show-error -X PUT "$BASE_URL/api/theme" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"config\":$theme_payload}" >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/theme/publish" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}" >/dev/null
preview_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/theme/preview-token" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}")
preview_token=$(printf '%s' "$preview_json" | json_field token)
curl --fail --silent --show-error "$BASE_URL/api/theme/preview?token=$preview_token" "${auth_headers[@]}" >/dev/null

echo "[phase7] communications config"
curl --fail --silent --show-error -X PUT "$BASE_URL/api/communications/email-config" "${auth_headers[@]}" -d '{"provider":"MOCK","fromName":"Smoke","fromEmail":"smoke@local.test","enabled":true}' >/dev/null
curl --fail --silent --show-error "$BASE_URL/api/communications/logs?storeId=$store_id" "${auth_headers[@]}" >/dev/null

echo "[phase7] quote send + public link"
quote_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/quotes" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"customerName\":\"Phase 7\",\"customerEmail\":\"phase7@example.test\"}")
quote_id=$(printf '%s' "$quote_json" | json_field id)
curl --fail --silent --show-error "$BASE_URL/api/quotes/$quote_id/pdf?storeId=$store_id" "${auth_headers[@]}" >/dev/null
quote_send=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/quotes/$quote_id/send" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}")
quote_url=$(printf '%s' "$quote_send" | json_field publicUrl)
quote_token="${quote_url##*/}"
curl --fail --silent --show-error "$BASE_URL/api/public/quote/$quote_token" >/dev/null

echo "[phase7] order invoice send + public link"
cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeId\":\"$store_id\",\"storeSlug\":\"$store_slug\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)
if [[ -n "$product_id" ]]; then
  curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" -H 'Content-Type: application/json' -d "{\"productId\":\"$product_id\",\"quantity\":2}" >/dev/null
fi
checkout_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase7-order@example.test","customerName":"Phase 7 Order","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
curl --fail --silent --show-error "$BASE_URL/api/orders/$order_id/invoice.pdf" "${auth_headers[@]}" >/dev/null
invoice_send=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/orders/$order_id/send-invoice" "${auth_headers[@]}" -d '{}')
invoice_url=$(printf '%s' "$invoice_send" | json_field publicUrl)
invoice_token="${invoice_url##*/}"
curl --fail --silent --show-error "$BASE_URL/api/public/invoice/$invoice_token" >/dev/null

echo "[phase7] PASS tenant=$tenant_id store=$store_id quote=$quote_id order=$order_id"
