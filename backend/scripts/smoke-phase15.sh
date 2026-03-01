#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/proc.sh"

BACKEND_PORT="${BACKEND_PORT:-3100}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@demo.local}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-AdminPass123!}"
PAYMENTS_WEBHOOK_SECRET="${PAYMENTS_WEBHOOK_SECRET:-phase15-payments-secret}"
SHIPPING_WEBHOOK_SECRET="${SHIPPING_WEBHOOK_SECRET:-phase15-shipping-secret}"
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
		echo "[phase15] request failed url=$url status=$status body=$payload"
		return 1
	fi
	printf '%s' "$payload"
}

echo "[phase15] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase15] start backend (deterministic providers + webhook secrets)"
start_cmd "backend-smoke-phase15" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" PAYMENTS_PROVIDER=mock SHIPPING_PROVIDER=mock TAX_PROVIDER=internal PAYMENTS_WEBHOOK_SECRET=\"$PAYMENTS_WEBHOOK_SECRET\" SHIPPING_WEBHOOK_SECRET=\"$SHIPPING_WEBHOOK_SECRET\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase15.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase15] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({where:{tenantId:tenant?.id},orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:store?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||'',productId:product?.id||'',variantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
product_id=$(printf '%s' "$ids_json" | json_field productId)
variant_id=$(printf '%s' "$ids_json" | json_field variantId)
if [[ -z "$tenant_id" || -z "$store_id" || -z "$product_id" || -z "$variant_id" ]]; then
	echo "[phase15] missing tenant/store/product/variant"
	exit 1
fi

login_resp=$(api_post "$BASE_URL/api/auth/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" -H "x-tenant-id: $tenant_id")
token=$(printf '%s' "$login_resp" | json_field token)
if [[ -z "$token" ]]; then
	echo "[phase15] login failed body=$login_resp"
	exit 1
fi
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")

echo "[phase15] enable feature gates"
(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenantId=process.env.TENANT_ID; for (const key of ['billing.enabled','payments.enabled','shipping.enabled','tax.enabled','webhooks.enabled']) { await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key } }, update:{ enabled:true }, create:{ tenantId, key, enabled:true } }); } await prisma.\$disconnect();")

echo "[phase15] create webhook endpoint"
webhook_ep=$(api_post "$BASE_URL/api/webhooks/endpoints" "{\"storeId\":\"$store_id\",\"name\":\"Phase15 Hook\",\"url\":\"https://example.invalid/webhooks/phase15\",\"secret\":\"phase15-outbound-secret\",\"isActive\":true,\"eventTypes\":[\"invoice.sent\",\"payment.receipt\",\"shipment.created\"]}" "${auth_headers[@]}")
endpoint_id=$(printf '%s' "$webhook_ep" | json_field id)
[[ -n "$endpoint_id" ]] || { echo "[phase15] endpoint creation failed body=$webhook_ep"; exit 1; }

echo "[phase15] create order + invoice + payment + shipment to generate events"
cart_json=$(api_post "$BASE_URL/api/public/cart" "{\"storeId\":\"$store_id\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)
[[ -n "$cart_token" ]] || { echo "[phase15] cart token missing body=$cart_json"; exit 1; }

api_post "$BASE_URL/api/public/cart/$cart_token/items" "{\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"quantity\":1}" >/dev/null
checkout_json=$(api_post "$BASE_URL/api/public/checkout/$cart_token" '{"customerEmail":"phase15@example.test","customerName":"Phase 15","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
[[ -n "$order_id" ]] || { echo "[phase15] order creation failed body=$checkout_json"; exit 1; }

invoice_json=$(api_post "$BASE_URL/api/order-billing/orders/$order_id/invoice" "{\"storeId\":\"$store_id\"}" "${auth_headers[@]}")
invoice_id=$(printf '%s' "$invoice_json" | json_field id)
invoice_total=$(printf '%s' "$invoice_json" | json_field totalCents)
[[ -n "$invoice_id" && -n "$invoice_total" ]] || { echo "[phase15] invoice create failed body=$invoice_json"; exit 1; }

api_post "$BASE_URL/api/orders/$order_id/send-invoice" "{\"expiresHours\":72}" "${auth_headers[@]}" >/dev/null

intent_json=$(api_post "$BASE_URL/api/payments/intent" "{\"storeId\":\"$store_id\",\"invoiceId\":\"$invoice_id\",\"orderId\":\"$order_id\",\"amountCents\":$invoice_total,\"currency\":\"USD\"}" "${auth_headers[@]}")
payment_intent_id=$(printf '%s' "$intent_json" | json_field id)
[[ -n "$payment_intent_id" ]] || { echo "[phase15] payment intent failed body=$intent_json"; exit 1; }
api_post "$BASE_URL/api/payments/confirm" "{\"storeId\":\"$store_id\",\"paymentIntentId\":\"$payment_intent_id\"}" "${auth_headers[@]}" >/dev/null

rates_json=$(api_post "$BASE_URL/api/shipping/rates" "{\"storeId\":\"$store_id\",\"orderId\":\"$order_id\"}" "${auth_headers[@]}")
rate_id=$(printf '%s' "$rates_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'[]');const id=Array.isArray(j)&&j[0]?j[0].id:'';process.stdout.write(String(id||''));});")
[[ -n "$rate_id" ]] || { echo "[phase15] shipping rates missing body=$rates_json"; exit 1; }
api_post "$BASE_URL/api/shipping/label" "{\"storeId\":\"$store_id\",\"orderId\":\"$order_id\",\"rateId\":\"$rate_id\"}" "${auth_headers[@]}" >/dev/null

echo "[phase15] enforce mock webhook secret checks"
status_no_secret=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/payments/webhook/mock" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json' -d '{"event":"payment_succeeded","providerRef":"mock_ref_1","amountCents":100}')
[[ "$status_no_secret" == "400" ]] || { echo "[phase15] expected payments webhook 400 without secret, got $status_no_secret"; exit 1; }
status_with_secret=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/payments/webhook/mock" -H "x-tenant-id: $tenant_id" -H "x-webhook-secret: $PAYMENTS_WEBHOOK_SECRET" -H 'Content-Type: application/json' -d '{"event":"payment_succeeded","providerRef":"mock_ref_1","amountCents":100}')
[[ "$status_with_secret" == "200" ]] || { echo "[phase15] expected payments webhook 200 with secret, got $status_with_secret"; exit 1; }

status_ship_no_secret=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/shipping/webhook/mock" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json' -d '{"trackingNumber":"MOCKTRACK1234","eventType":"TRACKING_UPDATE"}')
[[ "$status_ship_no_secret" == "400" ]] || { echo "[phase15] expected shipping webhook 400 without secret, got $status_ship_no_secret"; exit 1; }
status_ship_with_secret=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/shipping/webhook/mock" -H "x-tenant-id: $tenant_id" -H "x-webhook-secret: $SHIPPING_WEBHOOK_SECRET" -H 'Content-Type: application/json' -d '{"trackingNumber":"MOCKTRACK1234","eventType":"TRACKING_UPDATE"}')
[[ "$status_ship_with_secret" == "200" ]] || { echo "[phase15] expected shipping webhook 200 with secret, got $status_ship_with_secret"; exit 1; }

echo "[phase15] process notifications and webhooks"
api_post "$BASE_URL/api/notifications/outbox/process" '{"limit":200}' "${auth_headers[@]}" >/dev/null
api_post "$BASE_URL/api/webhooks/deliveries/process" '{"limit":200}' "${auth_headers[@]}" >/dev/null

echo "[phase15] verify events/outbox/deliveries in DB"
counts_json=$(cd "$ROOT_DIR/backend" && STORE_ID="$store_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const [eventCount,outboxSent,deliverySent]=await Promise.all([(prisma).eventLog.count({where:{storeId:process.env.STORE_ID}}),(prisma).notificationOutbox.count({where:{storeId:process.env.STORE_ID,status:'SENT'}}),(prisma).webhookDelivery.count({where:{storeId:process.env.STORE_ID,status:'SENT'}})]); console.log(JSON.stringify({eventCount,outboxSent,deliverySent})); await prisma.\$disconnect();")
event_count=$(printf '%s' "$counts_json" | json_field eventCount)
outbox_sent=$(printf '%s' "$counts_json" | json_field outboxSent)
delivery_sent=$(printf '%s' "$counts_json" | json_field deliverySent)
[[ "${event_count:-0}" -ge 3 ]] || { echo "[phase15] expected event logs >=3, got ${event_count:-0}"; exit 1; }
[[ "${outbox_sent:-0}" -ge 1 ]] || { echo "[phase15] expected sent outbox >=1, got ${outbox_sent:-0}"; exit 1; }
[[ "${delivery_sent:-0}" -ge 1 ]] || { echo "[phase15] expected delivered webhooks >=1, got ${delivery_sent:-0}"; exit 1; }

echo "[phase15] verify analytics endpoints"
summary_json=$(curl -sS "$BASE_URL/api/analytics/summary?storeId=$store_id" "${auth_headers[@]}")
summary_store=$(printf '%s' "$summary_json" | json_field storeId)
[[ "$summary_store" == "$store_id" ]] || { echo "[phase15] analytics summary mismatch body=$summary_json"; exit 1; }

funnel_json=$(curl -sS "$BASE_URL/api/analytics/funnel?storeId=$store_id" "${auth_headers[@]}")
funnel_order=$(printf '%s' "$funnel_json" | json_field order)
[[ "${funnel_order:-0}" -ge 1 ]] || { echo "[phase15] analytics funnel unexpected body=$funnel_json"; exit 1; }

csv_status=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/analytics/export.csv?storeId=$store_id" "${auth_headers[@]}")
[[ "$csv_status" == "200" ]] || { echo "[phase15] analytics csv export failed status=$csv_status"; exit 1; }

echo "[phase15] PASS tenant=$tenant_id store=$store_id order=$order_id invoice=$invoice_id endpoint=$endpoint_id events=$event_count outbox=$outbox_sent deliveries=$delivery_sent"
