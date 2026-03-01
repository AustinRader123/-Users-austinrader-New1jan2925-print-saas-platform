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

echo "[phase13] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase13] start backend"
start_cmd "backend-smoke-phase13" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase13.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase13] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({where:{tenantId:tenant?.id},orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:store?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||'',productId:product?.id||'',variantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
product_id=$(printf '%s' "$ids_json" | json_field productId)
variant_id=$(printf '%s' "$ids_json" | json_field variantId)

if [[ -z "$tenant_id" || -z "$store_id" || -z "$product_id" || -z "$variant_id" ]]; then
  echo "[phase13] missing tenant/store/product/variant"
  exit 1
fi

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenantId=process.env.TENANT_ID; for (const key of ['portal.enabled','billing.enabled','shipping.enabled']) { await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key } }, update:{ enabled:true }, create:{ tenantId, key, enabled:true } }); } await prisma.\$disconnect();")

echo "[phase13] create public order"
cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeId\":\"$store_id\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)

curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" -H 'Content-Type: application/json' -d "{\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"quantity\":1}" >/dev/null
checkout_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase13@example.test","customerName":"Phase 13","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
if [[ -z "$order_id" ]]; then
  echo "[phase13] failed creating order"
  exit 1
fi

echo "[phase13] create invoice + payment"
invoice_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/order-billing/orders/$order_id/invoice" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}")
invoice_id=$(printf '%s' "$invoice_json" | json_field id)
invoice_number=$(printf '%s' "$invoice_json" | json_field invoiceNumber)
if [[ -z "$invoice_id" || -z "$invoice_number" ]]; then
  echo "[phase13] invoice creation failed"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/order-billing/invoices/$invoice_id/payments" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"amountCents\":100}" >/dev/null
ledger_json=$(curl --fail --silent --show-error "$BASE_URL/api/order-billing/ledger?storeId=$store_id" "${auth_headers[@]}")
ledger_count=$(printf '%s' "$ledger_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'[]');process.stdout.write(String(Array.isArray(j)?j.length:0));});")
if [[ "$ledger_count" -lt 2 ]]; then
  echo "[phase13] expected at least 2 ledger entries"
  exit 1
fi

echo "[phase13] create shipment label"
shipment_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/shipping/orders/$order_id/label" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"carrier\":\"MOCK_CARRIER\",\"serviceLevel\":\"GROUND\"}")
tracking_number=$(printf '%s' "$shipment_json" | json_field trackingNumber)
if [[ -z "$tracking_number" ]]; then
  echo "[phase13] shipping label creation failed"
  exit 1
fi

public_token=$(cd "$ROOT_DIR/backend" && ORDER_ID="$order_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const order=await prisma.order.findUnique({where:{id:process.env.ORDER_ID||''}}); process.stdout.write(order?.publicToken||''); await prisma.\$disconnect();")
if [[ -z "$public_token" ]]; then
  echo "[phase13] missing order public token"
  exit 1
fi

portal_json=$(curl --fail --silent --show-error "$BASE_URL/api/public/portal/$public_token")
portal_order=$(printf '%s' "$portal_json" | json_field order)
if [[ -z "$portal_order" ]]; then
  echo "[phase13] portal payload missing order"
  exit 1
fi

echo "[phase13] PASS tenant=$tenant_id store=$store_id order=$order_id invoice=$invoice_number tracking=$tracking_number"
