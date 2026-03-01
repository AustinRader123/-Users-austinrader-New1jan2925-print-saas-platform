#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/proc.sh"

BACKEND_PORT="${BACKEND_PORT:-3100}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
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

echo "[smoke] doctor preflight"
(cd "$ROOT_DIR/backend" && DOCTOR_ALLOW_BUSY_PORTS=1 BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" BASE_URL="$BASE_URL" npm run doctor)

echo "[smoke] clean start"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" npm run stop)

echo "[smoke] start backend on :$BACKEND_PORT"
start_cmd "backend-smoke" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[smoke] backend failed to open :$BACKEND_PORT"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d||'{}')['${field}']; process.stdout.write(v==null?'':String(v));});"
}

echo "[smoke] resolving tenant/store IDs from database"
ids_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const storeByTenant=tenant ? await prisma.store.findFirst({where:{tenantId:tenant.id},orderBy:{createdAt:'asc'}}) : null; const store=storeByTenant || await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||''})); await prisma.\$disconnect();")

tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
if [[ -z "$tenant_id" || -z "$store_id" ]]; then
  echo "[smoke] missing tenant/store IDs"
  exit 1
fi

echo "[smoke] logging in"
login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H "x-tenant-id: $tenant_id" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
if [[ -z "$token" ]]; then
  echo "[smoke] login failed, no token"
  exit 1
fi

auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[smoke] fetching products"
products_json=$(curl --fail --silent --show-error "$BASE_URL/api/products?storeId=$store_id" "${auth_headers[@]}")
product_count=$(printf '%s' "$products_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const arr=JSON.parse(d||'[]'); process.stdout.write(String(Array.isArray(arr)?arr.length:0));});")
if [[ "$product_count" -lt 1 ]]; then
  echo "[smoke] expected seeded products"
  exit 1
fi

product_id=$(printf '%s' "$products_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const arr=JSON.parse(d||'[]'); process.stdout.write(arr?.[0]?.id || '');});")
variant_id=$(printf '%s' "$products_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const arr=JSON.parse(d||'[]'); process.stdout.write(arr?.[0]?.variants?.[0]?.id || '');});")
if [[ -z "$product_id" ]]; then
  echo "[smoke] failed to resolve product id"
  exit 1
fi

echo "[smoke] evaluating pricing"
pricing_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/pricing/evaluate" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\",\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"qty\":24,\"decorationMethod\":\"SCREEN_PRINT\",\"locations\":[\"front\"]}")
pricing_total=$(printf '%s' "$pricing_json" | json_field total)
if [[ -z "$pricing_total" ]]; then
  echo "[smoke] pricing evaluate returned invalid payload"
  exit 1
fi

echo "[smoke] creating draft quote"
quote_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/quotes" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\",\"customerName\":\"Smoke Test\",\"customerEmail\":\"smoke@example.com\"}")
quote_id=$(printf '%s' "$quote_json" | json_field id)
if [[ -z "$quote_id" ]]; then
  echo "[smoke] quote creation failed"
  exit 1
fi

echo "[smoke] adding quote item with snapshot"
item_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/quotes/$quote_id/items" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\",\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"qty\":{\"units\":24},\"decorationMethod\":\"SCREEN_PRINT\",\"decorationLocations\":[\"front\"]}")
item_id=$(printf '%s' "$item_json" | json_field id)
if [[ -z "$item_id" ]]; then
  echo "[smoke] add quote item failed"
  exit 1
fi

quote_detail=$(curl --fail --silent --show-error "$BASE_URL/api/quotes/$quote_id?storeId=$store_id" "${auth_headers[@]}")
has_snapshot=$(printf '%s' "$quote_detail" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const q=JSON.parse(d||'{}'); const snap=q?.lineItems?.[0]?.pricingSnapshot; process.stdout.write(snap ? 'yes' : 'no');});")
if [[ "$has_snapshot" != "yes" ]]; then
  echo "[smoke] missing pricing snapshot"
  exit 1
fi

echo "[smoke] PASS products=$product_count quote=$quote_id item=$item_id pricingTotal=$pricing_total"
