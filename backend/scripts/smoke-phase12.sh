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

echo "[phase12] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase12] start backend"
start_cmd "backend-smoke-phase12" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase12.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase12] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const ownerStore=await prisma.store.findFirst({where:{tenantId:tenant?.id},orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:ownerStore?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',ownerStoreId:ownerStore?.id||'',sourceProductId:product?.id||'',sourceVariantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
owner_store_id=$(printf '%s' "$ids_json" | json_field ownerStoreId)
source_product_id=$(printf '%s' "$ids_json" | json_field sourceProductId)
source_variant_id=$(printf '%s' "$ids_json" | json_field sourceVariantId)

if [[ -z "$tenant_id" || -z "$owner_store_id" || -z "$source_product_id" || -z "$source_variant_id" ]]; then
  echo "[phase12] missing tenant/store/product/variant seed data"
  exit 1
fi

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenantId=process.env.TENANT_ID; for (const key of ['production_v2.enabled','inventory.enabled']) { await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key } }, update:{ enabled:true }, create:{ tenantId, key, enabled:true } }); } await prisma.\$disconnect();")

echo "[phase12] create location + sku + material map + stock"
location_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/inventory/locations" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\",\"name\":\"Main Warehouse\",\"code\":\"MAIN\",\"type\":\"WAREHOUSE\"}")
location_id=$(printf '%s' "$location_json" | json_field id)

sku_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/inventory/skus" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\",\"skuCode\":\"FILM-BLACK\",\"name\":\"DTF Film Black\",\"unit\":\"sheet\",\"defaultReorderPoint\":2}")
sku_id=$(printf '%s' "$sku_json" | json_field id)

curl --fail --silent --show-error -X POST "$BASE_URL/api/inventory/materials" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\",\"productId\":\"$source_product_id\",\"variantId\":\"$source_variant_id\",\"skuId\":\"$sku_id\",\"qtyPerUnit\":1}" >/dev/null

curl --fail --silent --show-error -X POST "$BASE_URL/api/inventory/stocks/adjust" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\",\"locationId\":\"$location_id\",\"skuId\":\"$sku_id\",\"deltaOnHand\":20,\"type\":\"ADJUSTMENT\"}" >/dev/null

echo "[phase12] create order and verify reservation flow"
cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeId\":\"$owner_store_id\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)

curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" -H 'Content-Type: application/json' -d "{\"productId\":\"$source_product_id\",\"variantId\":\"$source_variant_id\",\"quantity\":2}" >/dev/null
checkout_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase12@example.test","customerName":"Phase 12","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)

batch_id=$(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" ORDER_ID="$order_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const b=await prisma.productionBatch.findFirst({where:{store:{tenantId:process.env.TENANT_ID||''},sourceType:'ORDER',sourceId:process.env.ORDER_ID||''}}); process.stdout.write(b?.id||''); await prisma.\$disconnect();")
if [[ -z "$batch_id" ]]; then
  echo "[phase12] no production batch for order"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/production-v2/batches/$batch_id/inventory/reserve?tenantId=$tenant_id" "${auth_headers[@]}" >/dev/null
reservations_json=$(curl --fail --silent --show-error "$BASE_URL/api/production-v2/batches/$batch_id/inventory?tenantId=$tenant_id" "${auth_headers[@]}")
reservation_count=$(printf '%s' "$reservations_json" | json_eval 'Array.isArray(j)?j.length:0')
if [[ "$reservation_count" -lt 1 ]]; then
  echo "[phase12] expected reservations for batch"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/production-v2/batches/$batch_id/stage?tenantId=$tenant_id" "${auth_headers[@]}" -d '{"toStage":"APPROVED"}' >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/production-v2/batches/$batch_id/stage?tenantId=$tenant_id" "${auth_headers[@]}" -d '{"toStage":"PRINT"}' >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/production-v2/batches/$batch_id/stage?tenantId=$tenant_id" "${auth_headers[@]}" -d '{"toStage":"CURE"}' >/dev/null

post_consume_json=$(cd "$ROOT_DIR/backend" && BATCH_ID="$batch_id" SKU_ID="$sku_id" LOCATION_ID="$location_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const reservation=await prisma.inventoryReservation.findFirst({where:{batchId:process.env.BATCH_ID||'',skuId:process.env.SKU_ID||''}}); const stock=await prisma.inventoryStock.findFirst({where:{locationId:process.env.LOCATION_ID||'',skuId:process.env.SKU_ID||''}}); console.log(JSON.stringify({reservationStatus:reservation?.status||'',onHand:Number(stock?.onHand||0),reserved:Number(stock?.reserved||0)})); await prisma.\$disconnect();")
reservation_status=$(printf '%s' "$post_consume_json" | json_field reservationStatus)
stock_on_hand=$(printf '%s' "$post_consume_json" | json_field onHand)
stock_reserved=$(printf '%s' "$post_consume_json" | json_field reserved)

if [[ "$reservation_status" != "FULFILLED" ]]; then
  echo "[phase12] reservation not fulfilled after CURE"
  exit 1
fi
if [[ "$stock_reserved" != "0" ]]; then
  echo "[phase12] reserved stock should be zero after consume"
  exit 1
fi

echo "[phase12] create PO + receive"
po_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/purchasing/pos" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\",\"supplierName\":\"Phase12 Supplier\"}")
po_id=$(printf '%s' "$po_json" | json_field id)

po_line_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/purchasing/pos/$po_id/lines" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\",\"skuId\":\"$sku_id\",\"qtyOrdered\":5}")
line_id=$(printf '%s' "$po_line_json" | json_field id)

curl --fail --silent --show-error -X POST "$BASE_URL/api/purchasing/pos/$po_id/send" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\"}" >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/purchasing/pos/$po_id/receive" "${auth_headers[@]}" -d "{\"tenantId\":\"$tenant_id\",\"storeId\":\"$owner_store_id\",\"locationId\":\"$location_id\",\"lines\":[{\"lineId\":\"$line_id\",\"qtyReceived\":5}]}" >/dev/null

po_verify_json=$(cd "$ROOT_DIR/backend" && PO_ID="$po_id" SKU_ID="$sku_id" LOCATION_ID="$location_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const po=await prisma.purchaseOrder.findUnique({where:{id:process.env.PO_ID||''},include:{lines:true}}); const stock=await prisma.inventoryStock.findFirst({where:{locationId:process.env.LOCATION_ID||'',skuId:process.env.SKU_ID||''}}); console.log(JSON.stringify({poStatus:po?.status||'',qtyReceived:Number(po?.lines?.[0]?.qtyReceived||0),onHand:Number(stock?.onHand||0)})); await prisma.\$disconnect();")
po_status=$(printf '%s' "$po_verify_json" | json_field poStatus)
po_qty_received=$(printf '%s' "$po_verify_json" | json_field qtyReceived)
final_on_hand=$(printf '%s' "$po_verify_json" | json_field onHand)

if [[ "$po_status" != "RECEIVED" ]]; then
  echo "[phase12] purchase order status expected RECEIVED"
  exit 1
fi
if [[ "$po_qty_received" != "5" ]]; then
  echo "[phase12] purchase order line qtyReceived expected 5"
  exit 1
fi
if [[ "$final_on_hand" -lt "$stock_on_hand" ]]; then
  echo "[phase12] expected on-hand stock increase after receipt"
  exit 1
fi

echo "[phase12] PASS tenant=$tenant_id store=$owner_store_id batch=$batch_id po=$po_id onHand=$final_on_hand"
