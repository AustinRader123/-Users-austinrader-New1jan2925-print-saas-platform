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

echo "[phase11] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase11] start backend"
start_cmd "backend-smoke-phase11" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase11.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase11] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const ownerStore=await prisma.store.findFirst({where:{tenantId:tenant?.id},orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:ownerStore?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',ownerStoreId:ownerStore?.id||'',sourceProductId:product?.id||'',sourceVariantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
owner_store_id=$(printf '%s' "$ids_json" | json_field ownerStoreId)
source_product_id=$(printf '%s' "$ids_json" | json_field sourceProductId)
source_variant_id=$(printf '%s' "$ids_json" | json_field sourceVariantId)

if [[ -z "$tenant_id" || -z "$owner_store_id" || -z "$source_product_id" || -z "$source_variant_id" ]]; then
  echo "[phase11] missing tenant/store/product/variant seed data"
  exit 1
fi

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenantId=process.env.TENANT_ID; for (const key of ['production_v2.enabled','fundraising.enabled','teamStores.enabled']) { await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key } }, update:{ enabled:true }, create:{ tenantId, key, enabled:true } }); } await prisma.\$disconnect();")

echo "[phase11] create order via public checkout (should auto-batch in production-v2)"
cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeId\":\"$owner_store_id\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)

curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" -H 'Content-Type: application/json' -d "{\"productId\":\"$source_product_id\",\"variantId\":\"$source_variant_id\",\"quantity\":2}" >/dev/null
checkout_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase11@example.test","customerName":"Phase 11","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
if [[ -z "$order_id" ]]; then
  echo "[phase11] checkout did not return orderId"
  exit 1
fi

echo "[phase11] verify batch created for order"
order_batch_json=$(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" ORDER_ID="$order_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const b=await prisma.productionBatch.findFirst({where:{store:{tenantId:process.env.TENANT_ID||''},sourceType:'ORDER',sourceId:process.env.ORDER_ID||''},include:{scanTokens:true,events:true,items:true}}); console.log(JSON.stringify({batchId:b?.id||'',eventCount:b?.events?.length||0,itemCount:b?.items?.length||0,scanToken:b?.scanTokens?.[0]?.token||''})); await prisma.\$disconnect();")
order_batch_id=$(printf '%s' "$order_batch_json" | json_field batchId)
scan_token=$(printf '%s' "$order_batch_json" | json_field scanToken)
event_count_before=$(printf '%s' "$order_batch_json" | json_field eventCount)
if [[ -z "$order_batch_id" || -z "$scan_token" ]]; then
  echo "[phase11] production-v2 batch/token not created"
  exit 1
fi

list_json=$(curl --fail --silent --show-error "$BASE_URL/api/production-v2/batches?tenantId=$tenant_id&sourceType=ORDER&sourceId=$order_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
list_first_id=$(printf '%s' "$list_json" | json_eval 'j[0]?.id')
if [[ "$list_first_id" != "$order_batch_id" ]]; then
  echo "[phase11] list endpoint missing created batch"
  exit 1
fi

detail_json=$(curl --fail --silent --show-error "$BASE_URL/api/production-v2/batches/$order_batch_id?tenantId=$tenant_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
detail_stage=$(printf '%s' "$detail_json" | json_field stage)
if [[ -z "$detail_stage" ]]; then
  echo "[phase11] detail endpoint missing stage"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/production-v2/scan/$scan_token" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d '{"action":"advance"}' >/dev/null

post_scan_json=$(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" BATCH_ID="$order_batch_id" BEFORE="$event_count_before" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const b=await prisma.productionBatch.findUnique({where:{id:process.env.BATCH_ID||''},include:{events:true}}); const now=b?.events?.length||0; const before=Number(process.env.BEFORE||'0'); console.log(JSON.stringify({stage:b?.stage||'',eventCountNow:now,eventDelta:now-before})); await prisma.\$disconnect();")
event_delta=$(printf '%s' "$post_scan_json" | json_field eventDelta)
if [[ -z "$event_delta" || "$event_delta" -lt 1 ]]; then
  echo "[phase11] append-only event check failed after scan advance"
  exit 1
fi

curl --fail --silent --show-error "$BASE_URL/api/production-v2/batches/$order_batch_id/ticket?tenantId=$tenant_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" >/dev/null
curl --fail --silent --show-error "$BASE_URL/api/production-v2/batches/$order_batch_id/export.zip?tenantId=$tenant_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" >/dev/null

echo "[phase11] create fundraiser campaign + consolidate (should create bulk-order batch)"
stamp="$(date +%s)"
campaign_slug="phase11-campaign-$stamp"
campaign_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/campaigns?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"storeId\":\"$owner_store_id\",\"slug\":\"$campaign_slug\",\"name\":\"Phase 11 Campaign\",\"status\":\"ACTIVE\",\"shippingMode\":\"CONSOLIDATED\",\"allowSplitShip\":false,\"defaultFundraiserPercent\":12}")
campaign_id=$(printf '%s' "$campaign_json" | json_field id)
if [[ -z "$campaign_id" ]]; then
  echo "[phase11] failed to create campaign"
  exit 1
fi

f_cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeId\":\"$owner_store_id\",\"fundraiser\":{\"campaignId\":\"$campaign_id\"}}")
f_cart_token=$(printf '%s' "$f_cart_json" | json_field token)
curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$f_cart_token/items" -H 'Content-Type: application/json' -d "{\"productId\":\"$source_product_id\",\"variantId\":\"$source_variant_id\",\"quantity\":1}" >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$f_cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase11-fund@example.test","customerName":"Phase 11 Fund","shippingAddress":{"line1":"123 Test St","city":"Testville"}}' >/dev/null

idem="phase11-$stamp"
consolidate_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/campaigns/$campaign_id/consolidate?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"idempotencyKey\":\"$idem\"}")
run_id=$(printf '%s' "$consolidate_json" | json_field id)
if [[ -z "$run_id" ]]; then
  echo "[phase11] consolidation failed"
  exit 1
fi

fund_batch_id=$(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" RUN_ID="$run_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const i=await prisma.productionBatchItem.findFirst({where:{batch:{store:{tenantId:process.env.TENANT_ID||''}},bulkOrderId:process.env.RUN_ID||''}}); const b=i?await prisma.productionBatch.findUnique({where:{id:i.batchId}}):null; console.log(b?.id||''); await prisma.\$disconnect();")
if [[ -z "$fund_batch_id" ]]; then
  echo "[phase11] missing consolidation production batch linkage"
  exit 1
fi

echo "[phase11] PASS tenant=$tenant_id order=$order_id batch=$order_batch_id run=$run_id fundBatch=$fund_batch_id"
