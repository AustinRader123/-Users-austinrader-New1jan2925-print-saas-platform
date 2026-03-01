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

echo "[phase8] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase8] start backend"
start_cmd "backend-smoke-phase8" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase8.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase8] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:store?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||'',productId:product?.id||'',variantId:product?.variants?.[0]?.id||'',storeSlug:store?.slug||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
product_id=$(printf '%s' "$ids_json" | json_field productId)
variant_id=$(printf '%s' "$ids_json" | json_field variantId)
store_slug=$(printf '%s' "$ids_json" | json_field storeSlug)

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase8] configure product builder profile"
profile_payload=$(cat <<JSON
{
  "storeId": "$store_id",
  "enabled": true,
  "locations": [
    {
      "key": "front",
      "label": "Front",
      "bounds": {"maxWidth": 900, "maxHeight": 900},
      "allowedLayers": ["TEXT", "ARTWORK", "UPLOAD"]
    }
  ],
  "rules": {"maxLayers": 10}
}
JSON
)
profile_json=$(curl --fail --silent --show-error -X PUT "$BASE_URL/api/customizer/products/$product_id/profile" "${auth_headers[@]}" -d "$profile_payload")
profile_id=$(printf '%s' "$profile_json" | json_field id)

schemas_payload=$(cat <<JSON
{
  "storeId": "$store_id",
  "schemas": [
    {
      "key": "name",
      "label": "Name",
      "type": "TEXT",
      "required": true,
      "minLength": 2,
      "maxLength": 16,
      "pricing": {"flatFee": 1.5, "perCharacter": 0.1},
      "sortOrder": 1,
      "active": true
    }
  ]
}
JSON
)
curl --fail --silent --show-error -X PUT "$BASE_URL/api/customizer/products/$product_id/personalization-schemas" "${auth_headers[@]}" -d "$schemas_payload" >/dev/null

category_payload=$(cat <<JSON
{
  "storeId": "$store_id",
  "profileId": "$profile_id",
  "name": "Mascots",
  "slug": "mascots"
}
JSON
)
category_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/customizer/artwork-categories" "${auth_headers[@]}" -d "$category_payload")
category_id=$(printf '%s' "$category_json" | json_field id)

png_file="$ROOT_DIR/artifacts/smoke-phase8-art.png"
echo 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+v7QAAAAASUVORK5CYII=' | base64 -d > "$png_file"

artwork_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/customizer/artwork-assets/upload" \
  -H "Authorization: Bearer $token" \
  -H "x-tenant-id: $tenant_id" \
  -F "storeId=$store_id" \
  -F "categoryId=$category_id" \
  -F "name=Smoke Mascot" \
  -F "tags=smoke,test" \
  -F "file=@$png_file;type=image/png")
artwork_asset_id=$(printf '%s' "$artwork_json" | json_field id)

echo "[phase8] public customizer flow"
curl --fail --silent --show-error "$BASE_URL/api/public/customizer/products/$product_id/config?storeId=$store_id" >/dev/null

cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeSlug\":\"$store_slug\"}")
cart_token=$(printf '%s' "$cart_json" | json_field token)

upload_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/customizer/upload" \
  -F "storeSlug=$store_slug" \
  -F "file=@$png_file;type=image/png")
upload_file_id=$(printf '%s' "$upload_json" | json_field fileId)

preview_payload=$(cat <<JSON
{
  "storeSlug": "$store_slug",
  "productId": "$product_id",
  "variantId": "$variant_id",
  "customization": {
    "locations": [
      {
        "key": "front",
        "layers": [
          {"type": "TEXT", "text": "Smoke", "x": 50, "y": 40, "width": 220, "height": 80, "rotation": 0},
          {"type": "ARTWORK", "artworkAssetId": "$artwork_asset_id", "x": 60, "y": 130, "width": 220, "height": 220, "rotation": 0},
          {"type": "UPLOAD", "fileId": "$upload_file_id", "x": 300, "y": 130, "width": 220, "height": 220, "rotation": 0}
        ]
      }
    ],
    "personalization": {"name": "SMOKE"}
  }
}
JSON
)

preview_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/customizer/preview" -H 'Content-Type: application/json' -d "$preview_payload")
preview_file_id=$(printf '%s' "$preview_json" | json_field previewFileId)

add_payload=$(cat <<JSON
{
  "productId": "$product_id",
  "variantId": "$variant_id",
  "quantity": 2,
  "previewFileId": "$preview_file_id",
  "customization": {
    "locations": [
      {
        "key": "front",
        "layers": [
          {"type": "TEXT", "text": "Smoke", "x": 50, "y": 40, "width": 220, "height": 80, "rotation": 0},
          {"type": "ARTWORK", "artworkAssetId": "$artwork_asset_id", "x": 60, "y": 130, "width": 220, "height": 220, "rotation": 0},
          {"type": "UPLOAD", "fileId": "$upload_file_id", "x": 300, "y": 130, "width": 220, "height": 220, "rotation": 0}
        ]
      }
    ],
    "personalization": {"name": "SMOKE"}
  }
}
JSON
)

curl --fail --silent --show-error -X POST "$BASE_URL/api/public/customizer/cart/$cart_token/customize-add" -H 'Content-Type: application/json' -d "$add_payload" >/dev/null

checkout_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase8@example.test","customerName":"Phase 8","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)

proofs_json=$(curl --fail --silent --show-error "$BASE_URL/api/proofs?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
proof_id=$(printf '%s' "$proofs_json" | json_eval 'j[0]?.id')
if [[ -z "$proof_id" ]]; then
  echo "[phase8] expected proof request but none found"
  exit 1
fi

jobs_json=$(curl --fail --silent --show-error "$BASE_URL/api/production/jobs?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
job_id=$(printf '%s' "$jobs_json" | json_eval 'j[0]?.id')
if [[ -z "$job_id" ]]; then
  echo "[phase8] expected production job but none found"
  exit 1
fi

package_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/production/jobs/$job_id/print-package" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
package_url=$(printf '%s' "$package_json" | json_field url)
if [[ -z "$package_url" ]]; then
  echo "[phase8] print package generation failed"
  exit 1
fi

echo "[phase8] PASS tenant=$tenant_id store=$store_id product=$product_id order=$order_id proof=$proof_id job=$job_id"
