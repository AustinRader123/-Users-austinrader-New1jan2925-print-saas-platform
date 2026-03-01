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

api_post() {
	local url="$1"
	local body="$2"
	shift 2
	local resp
	resp=$(curl -sS -X POST "$url" "$@" -H 'Content-Type: application/json' -d "$body" -w $'\nHTTP_STATUS:%{http_code}')
	local status="${resp##*HTTP_STATUS:}"
	local payload="${resp%$'\n'HTTP_STATUS:*}"
	if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
		echo "[phase14] request failed url=$url status=$status body=$payload"
		return 1
	fi
	printf '%s' "$payload"
}

echo "[phase14] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase14] start backend (mock/internal deterministic providers)"
start_cmd "backend-smoke-phase14" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" PAYMENTS_PROVIDER=mock SHIPPING_PROVIDER=mock TAX_PROVIDER=internal npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase14.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase14] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({where:{tenantId:tenant?.id},orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:store?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||'',productId:product?.id||'',variantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
product_id=$(printf '%s' "$ids_json" | json_field productId)
variant_id=$(printf '%s' "$ids_json" | json_field variantId)
if [[ -z "$tenant_id" || -z "$store_id" || -z "$product_id" || -z "$variant_id" ]]; then
	echo "[phase14] missing tenant/store/product/variant"
	exit 1
fi

login_resp=$(api_post "$BASE_URL/api/auth/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" -H "x-tenant-id: $tenant_id")
token=$(printf '%s' "$login_resp" | json_field token)
if [[ -z "$token" ]]; then
	echo "[phase14] login failed body=$login_resp"
	exit 1
fi
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")

echo "[phase14] enable billing/payments/shipping/tax feature gates"
(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenantId=process.env.TENANT_ID; for (const key of ['billing.enabled','payments.enabled','shipping.enabled','tax.enabled']) { await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key } }, update:{ enabled:true }, create:{ tenantId, key, enabled:true } }); } await prisma.\$disconnect();")

echo "[phase14] create order + invoice"
cart_json=$(api_post "$BASE_URL/api/public/cart" "{\"storeId\":\"$store_id\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)
[[ -n "$cart_token" ]] || { echo "[phase14] cart token missing body=$cart_json"; exit 1; }

api_post "$BASE_URL/api/public/cart/$cart_token/items" "{\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"quantity\":1}" >/dev/null
checkout_json=$(api_post "$BASE_URL/api/public/checkout/$cart_token" '{"customerEmail":"phase14@example.test","customerName":"Phase 14","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
[[ -n "$order_id" ]] || { echo "[phase14] order creation failed body=$checkout_json"; exit 1; }

invoice_json=$(api_post "$BASE_URL/api/order-billing/orders/$order_id/invoice" "{\"storeId\":\"$store_id\"}" "${auth_headers[@]}")
invoice_id=$(printf '%s' "$invoice_json" | json_field id)
invoice_total=$(printf '%s' "$invoice_json" | json_field totalCents)
[[ -n "$invoice_id" && -n "$invoice_total" ]] || { echo "[phase14] invoice creation failed body=$invoice_json"; exit 1; }

echo "[phase14] create + confirm payment intent and verify ledger"
intent_json=$(api_post "$BASE_URL/api/payments/intent" "{\"storeId\":\"$store_id\",\"invoiceId\":\"$invoice_id\",\"orderId\":\"$order_id\",\"amountCents\":$invoice_total,\"currency\":\"USD\"}" "${auth_headers[@]}")
payment_intent_id=$(printf '%s' "$intent_json" | json_field id)
[[ -n "$payment_intent_id" ]] || { echo "[phase14] payment intent failed body=$intent_json"; exit 1; }

confirm_json=$(api_post "$BASE_URL/api/payments/confirm" "{\"storeId\":\"$store_id\",\"paymentIntentId\":\"$payment_intent_id\"}" "${auth_headers[@]}")
confirm_ok=$(printf '%s' "$confirm_json" | json_field ok)
[[ "$confirm_ok" == "true" ]] || { echo "[phase14] payment confirm failed body=$confirm_json"; exit 1; }

ledger_charge_count=$(cd "$ROOT_DIR/backend" && INVOICE_ID="$invoice_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const count=await prisma.paymentLedgerEntry.count({where:{invoiceId:process.env.INVOICE_ID,entryType:'CHARGE'}}); process.stdout.write(String(count)); await prisma.\$disconnect();")
[[ "$ledger_charge_count" -ge 1 ]] || { echo "[phase14] expected CHARGE ledger entry for invoice=$invoice_id"; exit 1; }

echo "[phase14] rate shop + create label + verify shipment event"
rates_json=$(api_post "$BASE_URL/api/shipping/rates" "{\"storeId\":\"$store_id\",\"orderId\":\"$order_id\"}" "${auth_headers[@]}")
rate_id=$(printf '%s' "$rates_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'[]');const id=Array.isArray(j)&&j[0]?j[0].id:'';process.stdout.write(String(id||''));});")
[[ -n "$rate_id" ]] || { echo "[phase14] shipping rates missing body=$rates_json"; exit 1; }

label_json=$(api_post "$BASE_URL/api/shipping/label" "{\"storeId\":\"$store_id\",\"orderId\":\"$order_id\",\"rateId\":\"$rate_id\"}" "${auth_headers[@]}")
shipment_id=$(printf '%s' "$label_json" | json_field id)
tracking_number=$(printf '%s' "$label_json" | json_field trackingNumber)
[[ -n "$shipment_id" && -n "$tracking_number" ]] || { echo "[phase14] label create failed body=$label_json"; exit 1; }

event_count=$(cd "$ROOT_DIR/backend" && SHIPMENT_ID="$shipment_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const count=await prisma.shipmentEvent.count({where:{shipmentId:process.env.SHIPMENT_ID,status:'label_created'}}); process.stdout.write(String(count)); await prisma.\$disconnect();")
[[ "$event_count" -ge 1 ]] || { echo "[phase14] expected label_created shipment event for shipment=$shipment_id"; exit 1; }

echo "[phase14] create tax quote and verify deterministic totals"
tax_json=$(api_post "$BASE_URL/api/tax/quote" "{\"storeId\":\"$store_id\",\"orderId\":\"$order_id\",\"subtotalCents\":10000,\"shippingCents\":1000,\"destination\":{\"country\":\"US\",\"state\":\"TX\",\"postalCode\":\"78701\"}}" "${auth_headers[@]}")
tax_cents=$(printf '%s' "$tax_json" | json_field taxCents)
total_cents=$(printf '%s' "$tax_json" | json_field totalCents)
quote_id=$(printf '%s' "$tax_json" | json_field id)
[[ -n "$quote_id" && "$tax_cents" == "770" && "$total_cents" == "11770" ]] || { echo "[phase14] deterministic tax mismatch body=$tax_json"; exit 1; }

echo "[phase14] PASS tenant=$tenant_id store=$store_id order=$order_id invoice=$invoice_id intent=$payment_intent_id shipment=$shipment_id quote=$quote_id"
