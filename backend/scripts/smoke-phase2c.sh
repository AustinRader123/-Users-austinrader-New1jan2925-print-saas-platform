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

echo "[phase2c] doctor preflight"
(cd "$ROOT_DIR/backend" && DOCTOR_ALLOW_BUSY_PORTS=1 BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" BASE_URL="$BASE_URL" npm run doctor)

echo "[phase2c] clean start"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" npm run stop)

echo "[phase2c] start backend on :$BACKEND_PORT"
start_cmd "backend-smoke" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase2c] backend failed to open :$BACKEND_PORT"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}'); const v=j['${field}']; process.stdout.write(v==null?'':String(v));});"
}

echo "[phase2c] resolve tenant/store/product/variant/slug"
ids_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:store?.id,status:'ACTIVE'},include:{variants:true},orderBy:{createdAt:'asc'}}); let slug=store?.slug||''; if (store?.id && !slug) { slug='store-'+store.id.slice(0,8); await prisma.store.update({where:{id:store.id},data:{slug}}); } console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||'',storeSlug:slug||'',productId:product?.id||'',variantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")

tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
store_slug=$(printf '%s' "$ids_json" | json_field storeSlug)
product_id=$(printf '%s' "$ids_json" | json_field productId)
variant_id=$(printf '%s' "$ids_json" | json_field variantId)

if [[ -z "$tenant_id" || -z "$store_id" || -z "$store_slug" || -z "$product_id" || -z "$variant_id" ]]; then
  echo "[phase2c] missing base seed data (tenant/store/slug/product/variant)"
  exit 1
fi

echo "[phase2c] login admin"
login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H "x-tenant-id: $tenant_id" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

token=$(printf '%s' "$login_resp" | json_field token)
if [[ -z "$token" ]]; then
  echo "[phase2c] login failed"
  exit 1
fi

auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase2c] create design"
design_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/designs" "${auth_headers[@]}" \
  -d '{"name":"Smoke Phase2C Design","description":"phase2c smoke","content":{"layers":[],"canvas":{"width":800,"height":600}}}')
design_id=$(printf '%s' "$design_json" | json_field id)
if [[ -z "$design_id" ]]; then
  echo "[phase2c] design create failed"
  exit 1
fi

echo "[phase2c] public cart + checkout"
storefront_resp=$(curl --silent --show-error "$BASE_URL/api/public/storefront/$store_slug" -w $'\n%{http_code}')
storefront_json=${storefront_resp%$'\n'*}
storefront_code=${storefront_resp##*$'\n'}
if [[ "$storefront_code" == "401" ]]; then
  echo "[phase2c] public storefront unexpectedly unauthorized (http=$storefront_code body=$storefront_json)"
  exit 1
fi
if [[ "$storefront_code" != "200" ]]; then
  echo "[phase2c] public storefront failed (http=$storefront_code body=$storefront_json)"
  exit 1
fi

products_resp=$(curl --silent --show-error "$BASE_URL/api/public/products?storeSlug=$store_slug" -w $'\n%{http_code}')
products_json=${products_resp%$'\n'*}
products_code=${products_resp##*$'\n'}
if [[ "$products_code" == "401" ]]; then
  echo "[phase2c] public products unexpectedly unauthorized (http=$products_code body=$products_json)"
  exit 1
fi
if [[ "$products_code" != "200" ]]; then
  echo "[phase2c] public products failed (http=$products_code body=$products_json)"
  exit 1
fi

cart_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeSlug\":\"$store_slug\"}" -w $'\n%{http_code}')
cart_json=${cart_resp%$'\n'*}
cart_code=${cart_resp##*$'\n'}
if [[ "$cart_code" == "401" ]]; then
  echo "[phase2c] create public cart unexpectedly unauthorized (http=$cart_code body=$cart_json)"
  exit 1
fi
if [[ "$cart_code" != "201" ]]; then
  echo "[phase2c] create public cart failed (http=$cart_code body=$cart_json)"
  exit 1
fi
cart_token=$(printf '%s' "$cart_json" | json_field token)
if [[ -z "$cart_token" ]]; then
  echo "[phase2c] create public cart failed"
  exit 1
fi

add_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"quantity\":12,\"decorationMethod\":\"SCREEN_PRINT\",\"decorationLocations\":[\"front\"],\"designId\":\"$design_id\"}" -w $'\n%{http_code}')
add_json=${add_resp%$'\n'*}
add_code=${add_resp##*$'\n'}
if [[ "$add_code" == "401" ]]; then
  echo "[phase2c] add cart item unexpectedly unauthorized (http=$add_code body=$add_json)"
  exit 1
fi
if [[ "$add_code" != "201" ]]; then
  echo "[phase2c] add cart item failed (http=$add_code body=$add_json)"
  exit 1
fi

email="phase2c+$(date +%s)@example.com"
checkout_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" \
  -H 'Content-Type: application/json' \
  -d "{\"customerEmail\":\"$email\",\"customerName\":\"Phase2C Smoke\",\"shippingAddress\":{\"line1\":\"123 Main\",\"city\":\"Austin\",\"state\":\"TX\",\"postal\":\"78701\"}}" -w $'\n%{http_code}')
checkout_json=${checkout_resp%$'\n'*}
checkout_code=${checkout_resp##*$'\n'}
if [[ "$checkout_code" == "401" ]]; then
  echo "[phase2c] checkout unexpectedly unauthorized (http=$checkout_code body=$checkout_json)"
  exit 1
fi
if [[ "$checkout_code" != "201" ]]; then
  echo "[phase2c] checkout failed (http=$checkout_code body=$checkout_json)"
  exit 1
fi
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
order_token=$(printf '%s' "$checkout_json" | json_field orderToken)
if [[ -z "$order_id" || -z "$order_token" ]]; then
  echo "[phase2c] checkout failed"
  exit 1
fi

order_public=$(curl --fail --silent --show-error "$BASE_URL/api/public/order/$order_token")
public_order_id=$(printf '%s' "$order_public" | json_field id)
if [[ "$public_order_id" != "$order_id" ]]; then
  echo "[phase2c] public order lookup failed"
  exit 1
fi

echo "[phase2c] create + approve proof"
proof_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/proofs/request" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\",\"orderId\":\"$order_id\",\"designId\":\"$design_id\",\"recipientEmail\":\"$email\"}")
proof_token=$(printf '%s' "$proof_json" | json_field token)
if [[ -z "$proof_token" ]]; then
  echo "[phase2c] proof request failed"
  exit 1
fi

approve_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/proofs/public/$proof_token/approve" -H 'Content-Type: application/json' -d '{"comment":"approved by phase2c smoke"}')
proof_status=$(printf '%s' "$approve_json" | json_field status)
if [[ "$proof_status" != "APPROVED" ]]; then
  echo "[phase2c] proof approval failed"
  exit 1
fi

echo "[phase2c] verify production + generate work order"
job_id=$(printf '%s' "$order_public" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(j?.productionJobs?.[0]?.id||'');});")
if [[ -z "$job_id" ]]; then
  echo "[phase2c] missing production job"
  exit 1
fi

work_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/production/jobs/$job_id/work-order" "${auth_headers[@]}" -d '{}')
work_url=$(printf '%s' "$work_json" | json_field workOrderUrl)
if [[ -z "$work_url" ]]; then
  echo "[phase2c] work order generation failed"
  exit 1
fi

echo "[phase2c] create PO and receive stock"
po_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/purchase-orders" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"supplierName\":\"Smoke Supplier\"}")
po_id=$(printf '%s' "$po_json" | json_field id)
if [[ -z "$po_id" ]]; then
  echo "[phase2c] PO create failed"
  exit 1
fi

line_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/purchase-orders/$po_id/lines" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"variantId\":\"$variant_id\",\"qtyOrdered\":5,\"costEach\":3.5}")
line_id=$(printf '%s' "$line_json" | json_field id)
if [[ -z "$line_id" ]]; then
  echo "[phase2c] PO line create failed"
  exit 1
fi

receive_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/purchase-orders/$po_id/receive" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"lines\":[{\"lineId\":\"$line_id\",\"qtyReceived\":5}]}")
po_status=$(printf '%s' "$receive_json" | json_field status)
if [[ "$po_status" != "RECEIVED" ]]; then
  echo "[phase2c] PO receive failed (status=$po_status)"
  exit 1
fi

echo "[phase2c] PASS order=$order_id proofToken=$proof_token job=$job_id po=$po_id"