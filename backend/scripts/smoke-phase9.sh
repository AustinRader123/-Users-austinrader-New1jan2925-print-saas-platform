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

json_eval() {
  local expr="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');let v='';try{v=(function(){return ${expr};})();}catch{}process.stdout.write(v==null?'':String(v));});"
}

echo "[phase9] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase9] start backend"
start_cmd "backend-smoke-phase9" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase9.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase9] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const ownerStore=await prisma.store.findFirst({where:{tenantId:tenant?.id},orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:ownerStore?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',ownerStoreId:ownerStore?.id||'',ownerStoreSlug:ownerStore?.slug||'',sourceProductId:product?.id||'',sourceVariantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
owner_store_id=$(printf '%s' "$ids_json" | json_field ownerStoreId)
source_product_id=$(printf '%s' "$ids_json" | json_field sourceProductId)

if [[ -z "$tenant_id" || -z "$owner_store_id" || -z "$source_product_id" ]]; then
  echo "[phase9] missing tenant/store/product seed data"
  exit 1
fi

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenantId=process.env.TENANT_ID; await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key:'network.enabled' } }, update:{ enabled:true }, create:{ tenantId, key:'network.enabled', enabled:true } }); await prisma.\$disconnect();")

echo "[phase9] create network + stores"
network_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"name\":\"Smoke Network\",\"ownerStoreId\":\"$owner_store_id\"}")
network_id=$(printf '%s' "$network_json" | json_field id)
if [[ -z "$network_id" ]]; then
  echo "[phase9] failed to create network"
  exit 1
fi

stamp="$(date +%s)"
hub_slug="smoke-hub-$stamp"
spoke_slug="smoke-spoke-$stamp"

hub_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/stores/create?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"name\":\"Smoke Hub\",\"slug\":\"$hub_slug\",\"role\":\"HUB\"}")
hub_store_id=$(printf '%s' "$hub_json" | json_eval 'j.store?.id')

spoke_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/stores/create?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"name\":\"Smoke Spoke\",\"slug\":\"$spoke_slug\",\"role\":\"SPOKE\"}")
spoke_store_id=$(printf '%s' "$spoke_json" | json_eval 'j.store?.id')

if [[ -z "$hub_store_id" || -z "$spoke_store_id" ]]; then
  echo "[phase9] failed to create hub/spoke stores"
  exit 1
fi

echo "[phase9] publish + apply shared catalog"
curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/publish/product/$source_product_id?tenantId=$tenant_id" "${auth_headers[@]}" -d '{}' >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/apply?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"storeId\":\"$hub_store_id\"}" >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/apply?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"storeId\":\"$spoke_store_id\"}" >/dev/null

echo "[phase9] configure routing + royalties"
curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/routing-rules?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"name\":\"Manual Hub\",\"strategy\":\"MANUAL\",\"config\":{\"manualToStoreId\":\"$hub_store_id\"}}" >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/royalty-rules?tenantId=$tenant_id" "${auth_headers[@]}" -d '{"name":"Five Percent","basis":"REVENUE","ratePercent":5}' >/dev/null

spoke_catalog_json=$(cd "$ROOT_DIR/backend" && SPOKE_STORE_ID="$spoke_store_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const storeId=process.env.SPOKE_STORE_ID; const product=await prisma.product.findFirst({where:{storeId,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}},orderBy:{createdAt:'desc'}}); console.log(JSON.stringify({productId:product?.id||'',variantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
spoke_product_id=$(printf '%s' "$spoke_catalog_json" | json_field productId)
spoke_variant_id=$(printf '%s' "$spoke_catalog_json" | json_field variantId)
if [[ -z "$spoke_product_id" || -z "$spoke_variant_id" ]]; then
  echo "[phase9] failed to find cloned spoke product/variant"
  exit 1
fi

echo "[phase9] create spoke checkout order"
cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeId\":\"$spoke_store_id\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)
curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" -H 'Content-Type: application/json' -d "{\"productId\":\"$spoke_product_id\",\"variantId\":\"$spoke_variant_id\",\"quantity\":2}" >/dev/null
checkout_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase9@example.test","customerName":"Phase 9","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
if [[ -z "$order_id" ]]; then
  echo "[phase9] checkout did not return orderId"
  exit 1
fi

echo "[phase9] route + complete routed order"
curl --fail --silent --show-error -X POST "$BASE_URL/api/network/route-order/$order_id?tenantId=$tenant_id" "${auth_headers[@]}" -d '{}' >/dev/null || true
routed_json=$(curl --fail --silent --show-error "$BASE_URL/api/network/networks/$network_id/routed-orders?tenantId=$tenant_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
routed_id=$(printf '%s' "$routed_json" | json_eval 'j.find((r)=>r.orderId==="'"$order_id"'" )?.id || j[0]?.id')
if [[ -z "$routed_id" ]]; then
  echo "[phase9] no routed order found"
  exit 1
fi

for st in ACCEPTED IN_PRODUCTION SHIPPED COMPLETED; do
  curl --fail --silent --show-error -X POST "$BASE_URL/api/network/networks/$network_id/routed-orders/$routed_id/status?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"status\":\"$st\"}" >/dev/null
done

echo "[phase9] verify royalty ledger"
royalty_report=$(curl --fail --silent --show-error "$BASE_URL/api/network/networks/$network_id/royalties/report?tenantId=$tenant_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
royalty_row_order=$(printf '%s' "$royalty_report" | json_eval 'j.rows?.find((r)=>r.orderId==="'"$order_id"'" )?.orderId')
royalty_cents=$(printf '%s' "$royalty_report" | json_eval 'j.rows?.find((r)=>r.orderId==="'"$order_id"'" )?.royaltyCents')
if [[ -z "$royalty_row_order" ]]; then
  echo "[phase9] expected royalty row for routed order"
  exit 1
fi

echo "[phase9] PASS tenant=$tenant_id network=$network_id spoke=$spoke_store_id hub=$hub_store_id order=$order_id royaltyCents=${royalty_cents:-0}"
