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

echo "[phase4] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase4] start backend"
start_cmd "backend-smoke-phase4" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase4.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase4] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:store?.id},include:{variants:true}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||'',productId:product?.id||'',variantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
product_id=$(printf '%s' "$ids_json" | json_field productId)
variant_id=$(printf '%s' "$ids_json" | json_field variantId)

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase4] create quote"
quote_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/quotes" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"customerName\":\"Phase4 User\",\"customerEmail\":\"phase4@example.local\"}" -w $'\n%{http_code}')
quote_json=${quote_resp%$'\n'*}
quote_code=${quote_resp##*$'\n'}
if [[ "$quote_code" != "201" ]]; then
  echo "[phase4] create quote failed (http=$quote_code body=$quote_json)"
  exit 1
fi
quote_id=$(printf '%s' "$quote_json" | json_field id)

echo "[phase4] add advanced quote item"
item_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/quotes/$quote_id/items" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"qty\":{\"units\":24},\"decorationMethod\":\"SCREEN_PRINT\",\"decorationLocations\":[\"front\",\"back\"],\"printSizeTier\":\"LARGE\",\"colorCount\":3,\"rush\":true,\"weightOz\":9}" -w $'\n%{http_code}')
item_code=${item_resp##*$'\n'}
if [[ "$item_code" != "201" ]]; then
  echo "[phase4] add item failed"
  exit 1
fi

echo "[phase4] reprice quote"
reprice_quote_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/quotes/$quote_id/reprice" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}" -w $'\n%{http_code}')
reprice_quote_code=${reprice_quote_resp##*$'\n'}
if [[ "$reprice_quote_code" != "200" ]]; then
  echo "[phase4] quote reprice failed"
  exit 1
fi

echo "[phase4] convert quote -> order"
convert_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/quotes/$quote_id/convert?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -w $'\n%{http_code}')
convert_json=${convert_resp%$'\n'*}
convert_code=${convert_resp##*$'\n'}
if [[ "$convert_code" != "201" ]]; then
  echo "[phase4] convert failed (http=$convert_code body=$convert_json)"
  exit 1
fi
order_id=$(printf '%s' "$convert_json" | json_field id)

echo "[phase4] reprice order"
reprice_order_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/orders/$order_id/reprice" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}" -w $'\n%{http_code}')
reprice_order_code=${reprice_order_resp##*$'\n'}
if [[ "$reprice_order_code" != "200" ]]; then
  echo "[phase4] order reprice failed"
  exit 1
fi

echo "[phase4] reports summary + exports"
curl --fail --silent --show-error "$BASE_URL/api/reports/summary?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" >/tmp/phase4-summary.json
curl --fail --silent --show-error "$BASE_URL/api/reports/products?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" >/tmp/phase4-products.json
curl --fail --silent --show-error "$BASE_URL/api/reports/export/orders.csv?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" >/tmp/phase4-orders.csv
curl --fail --silent --show-error "$BASE_URL/api/reports/export/quotes.csv?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" >/tmp/phase4-quotes.csv

if ! head -n 1 /tmp/phase4-orders.csv | grep -q 'orderId,orderNumber,status,subtotal,taxAmount,shippingCost,totalAmount,createdAt'; then
  echo "[phase4] orders CSV header mismatch"
  exit 1
fi
if ! head -n 1 /tmp/phase4-quotes.csv | grep -q 'quoteId,quoteNumber,status,customerEmail,subtotal,total,createdAt'; then
  echo "[phase4] quotes CSV header mismatch"
  exit 1
fi

echo "[phase4] PASS quote=$quote_id order=$order_id"
