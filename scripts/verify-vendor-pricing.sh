#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE:-}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@local.test}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin123!}
VENDOR_NAME=${VENDOR_NAME:-Acme Vendor}
STORE_ID=${STORE_ID:-cml43c2kt000110xp4pq3a76b}
CSV='productExternalId,productName,variantExternalId,variantSku,variantColor,variantSize,variantPrice,variantInventory,imageUrl\nSKU-001,Classic Tee,SKU-001-BLK-L,VEND-TSHIRT-BLACK-L,Black,L,12.99,100,https://via.placeholder.com/300x300\nSKU-001,Classic Tee,SKU-001-WHT-M,VEND-TSHIRT-WHITE-M,White,M,12.99,50,https://via.placeholder.com/300x300'

function json_get() {
  # Usage: json_get <json> <js-expr>
  node -e "const [expr,json]=process.argv.slice(1); let j; try{ j=JSON.parse(json); }catch(e){ process.exit(2); } function f(obj){ try{ return eval('(j) => ('+expr+')')(obj); }catch(e){ return ''; } } const v=f(j); if(v==null) process.stdout.write(''); else process.stdout.write(String(v));" "$2" "$1"
}

detect_base() {
  if [[ -n "$BASE" ]]; then echo "Using BASE override: $BASE"; return; fi
  for port in 3000 3001; do
    if curl -m 2 -sS "http://127.0.0.1:$port/__ping" >/dev/null; then
      BASE="http://127.0.0.1:$port"
      echo "Detected backend on $BASE"
      return
    fi
  done
  echo "No backend detected on 3000/3001. Attempting to start on 3000..."
  (cd /Users/austinrader/feb1/backend && nohup node dist/index.js > logs/server-3000.log 2>&1 &)
  sleep 1
  if curl -m 2 -sS "http://127.0.0.1:3000/__ping" >/dev/null; then
    BASE="http://127.0.0.1:3000"
    echo "Started backend on $BASE"
    return
  fi
  echo "FAIL: Unable to detect or start backend. Start it manually: (cd backend && nohup node dist/index.js &)." >&2
  exit 1
}

detect_base
echo "BASE=$BASE"

# 0) Ping + health
echo "[CHECK] /__ping"; curl -m 10 -sS "$BASE/__ping" >/dev/null || { echo "FAIL: /__ping"; exit 1; }
echo "[CHECK] /health"; curl -m 10 -sS "$BASE/health" >/dev/null || { echo "FAIL: /health"; exit 1; }

# 1) Login admin
echo "[AUTH] Logging in admin $ADMIN_EMAIL";
LOGIN_JSON=$(curl -m 10 -sS -H "Content-Type: application/json" -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}' "$BASE/api/auth/login")
TOKEN=$(json_get "$LOGIN_JSON" 'j.token')
if [[ -z "$TOKEN" ]]; then 

  echo "FAIL: admin login. Obtain token via docs/admin-access.md and set BASE accordingly."; 
  echo "Example: BASE=$BASE TOKEN=$(curl -sS -H \"Content-Type: application/json\" -d '{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}' \"$BASE/api/auth/login\" | jq -r .token)";
  exit 1; 
fi
echo "TOKEN acquired (${#TOKEN} bytes)"
AUTH=( -H "Authorization: Bearer $TOKEN" )
# 2) Create or get vendor
echo "[VENDOR] Listing vendors";
VENDORS_JSON=$(curl -m 10 -sS "${AUTH[@]}" "$BASE/api/vendors")
VENDOR_ID=$(node -e 'const fs=require("fs"); const vendors=JSON.parse(fs.readFileSync(0,"utf8")); const name=process.argv[1]; const id=(Array.isArray(vendors)? vendors.find(v=>v.name===name)?.id : ""); process.stdout.write(id||"");' "$VENDOR_NAME" <<< "$VENDORS_JSON")
if [[ -z "$VENDOR_ID" ]]; then
  echo "[VENDOR] Creating $VENDOR_NAME";
  node -e "const fs=require('fs'); const body={name:'$VENDOR_NAME',email:'vendor@acme.com',connectorType:'csv'}; fs.writeFileSync('/tmp/create_vendor.json', JSON.stringify(body));"
  CREATE_JSON=$(curl -m 10 -sS "${AUTH[@]}" -H "Content-Type: application/json" -d @/tmp/create_vendor.json "$BASE/api/vendors")
  VENDOR_ID=$(json_get "$CREATE_JSON" 'j.id || j.vendorId')
fi
if [[ -z "$VENDOR_ID" ]]; then echo "FAIL: vendor create/get"; exit 1; fi
echo "VENDOR_ID=$VENDOR_ID"

# 3) Import CSV via HTTP
echo "[IMPORT] Building body and POST $BASE/api/vendors/$VENDOR_ID/import-csv";
node -e "const fs=require('fs'); const body={storeId:'$STORE_ID', csv:'$CSV', mapping:{productExternalId:'productExternalId',productName:'productName',imageUrl:'imageUrl',variantExternalId:'variantExternalId',variantSku:'variantSku',variantColor:'variantColor',variantSize:'variantSize',variantPrice:'variantPrice',variantInventory:'variantInventory'}}; fs.writeFileSync('/tmp/vendor_import_body.json', JSON.stringify(body));"
IMPORT_JSON=$(curl -m 10 -sS "${AUTH[@]}" -H "Content-Type: application/json" -d @/tmp/vendor_import_body.json "$BASE/api/vendors/$VENDOR_ID/import-csv")
JOB_ID=$(json_get "$IMPORT_JSON" 'j.jobId')
if [[ -z "$JOB_ID" ]]; then echo "FAIL: import-csv"; echo "$IMPORT_JSON"; exit 1; fi
echo "IMPORT jobId=$JOB_ID"

# 4) List vendor catalog
echo "[CATALOG] GET $BASE/api/vendors/$VENDOR_ID/products";
CATALOG_JSON=$(curl -m 10 -sS "${AUTH[@]}" "$BASE/api/vendors/$VENDOR_ID/products")
PRODUCT_ID=$(json_get "$CATALOG_JSON" "(Array.isArray(j)? j[0]?.id : (j.products? j.products[0]?.id : j.id))")
VARIANT_ID=$(json_get "$CATALOG_JSON" "(Array.isArray(j)? j[0]?.variants[0]?.productVariantId : (j.products? j.products[0]?.variants[0]?.productVariantId : j.variants?.[0]?.productVariantId))")
SKU=$(json_get "$CATALOG_JSON" "(Array.isArray(j)? j[0]?.variants[0]?.sku : (j.products? j.products[0]?.variants[0]?.sku : j.variants?.[0]?.sku))")
VENDOR_VARIANT_ID=$(json_get "$CATALOG_JSON" "(Array.isArray(j)? j[0]?.variants[0]?.id : (j.products? j.products[0]?.variants[0]?.id : j.variants?.[0]?.id))")
BASE_PRICE=$(json_get "$CATALOG_JSON" "(Array.isArray(j)? j[0]?.basePrice : (j.basePrice||0))")
if [[ -z "$PRODUCT_ID" || -z "$VARIANT_ID" ]]; then echo "FAIL: catalog parse"; exit 1; fi
echo "PRODUCT_ID=$PRODUCT_ID VARIANT_ID=$VARIANT_ID SKU=$SKU VENDOR_VARIANT_ID=$VENDOR_VARIANT_ID BASE_PRICE=$BASE_PRICE"

# Resolve main Product ID from ProductVariant ID via products list
echo "[PRODUCTS] GET $BASE/api/products?storeId=$STORE_ID";
PRODUCTS_JSON=$(curl -m 10 -sS "${AUTH[@]}" "$BASE/api/products?storeId=$STORE_ID")
MAIN_PRODUCT_ID=$(node -e 'const fs=require("fs"); const list=JSON.parse(fs.readFileSync(0,"utf8")); const vid=process.argv[1]; const p=list.find(p=>Array.isArray(p.variants)&&p.variants.some(v=>v.id===vid)); process.stdout.write(p?.id||"");' "$VARIANT_ID" <<< "$PRODUCTS_JSON")
if [[ -z "$MAIN_PRODUCT_ID" ]]; then echo "FAIL: resolve main productId from variant"; exit 1; fi
echo "MAIN_PRODUCT_ID=$MAIN_PRODUCT_ID"

# 5) Deactivate existing rules for product (deterministic preview)
echo "[RULES] List by store $STORE_ID";
RULES_JSON=$(curl -m 10 -sS "${AUTH[@]}" "$BASE/api/admin/pricing-rules?storeId=$STORE_ID")
RULES_COUNT=$(json_get "$RULES_JSON" 'Array.isArray(j)? j.length : 0')
if [[ "$RULES_COUNT" != "0" ]]; then
  node -e "const fs=require('fs'); const rules=JSON.parse(fs.readFileSync(0,'utf8')); const list=Array.isArray(rules)? rules: []; for(const r of list){ if(r.productId=='"$MAIN_PRODUCT_ID"'){ require('child_process').execSync('curl -sS -X PUT -H \"Authorization: Bearer $TOKEN\" -H \"Content-Type: application/json\" -d \"{\\\"active\\\":false}\" \"$BASE/api/admin/pricing-rules/'+r.id+'\"'); } }" <<< "$RULES_JSON"
fi

# 6) Create pricing rule
echo "[RULES] Creating MVP Rule for product $MAIN_PRODUCT_ID";
CREATE_RULE_JSON=$(curl -m 10 -sS "${AUTH[@]}" -H "Content-Type: application/json" -d '{
  "productId": "'$MAIN_PRODUCT_ID'",
  "name": "MVP Rule",
  "basePrice": '$BASE_PRICE',
  "baseMarkupPercent": 40,
  "quantityBreaks": [
    { "minQty": 1,  "unitMarkupDeltaPercent": 0 },
    { "minQty": 12, "unitMarkupDeltaPercent": -10 },
    { "minQty": 48, "unitMarkupDeltaPercent": -20 }
  ],
  "decorationCosts": {
    "SCREEN_PRINT": { "perLocationFee": 2.0, "setupFee": 10.0, "perColorFee": 0.5 },
    "EMBROIDERY":   { "perLocationFee": 3.0, "setupFee": 15.0, "perColorFee": 0.0 }
  },
  "roundingStrategy": "nearest_cent"
}' "$BASE/api/admin/pricing-rules")
RULE_ID=$(json_get "$CREATE_RULE_JSON" 'j.id')
if [[ -z "$RULE_ID" ]]; then echo "FAIL: create rule"; exit 1; fi
echo "RULE_ID=$RULE_ID"

# 7) Pricing previews
function preview() {
  local qty=$1; local method=$2
  local body=$(node -e "console.log(JSON.stringify({storeId:'$STORE_ID', productVariantId:'$VARIANT_ID', quantity:$qty, decoration:{method:'$method', locations:1, colors:1}}))")
  echo "[PREVIEW] qty=$qty method=$method" >&2;
  local out=$(curl -m 10 -sS "${AUTH[@]}" -H "Content-Type: application/json" -d "$body" "$BASE/api/pricing/preview")
  echo "$out"
}
OUT1=$(preview 1 SCREEN_PRINT)
OUT12=$(preview 12 SCREEN_PRINT)
OUT48=$(preview 48 SCREEN_PRINT)
OUT12E=$(preview 12 EMBROIDERY)
U1=$(json_get "$OUT1" 'j.unitPrice')
U12=$(json_get "$OUT12" 'j.unitPrice')
U48=$(json_get "$OUT48" 'j.unitPrice')
U12E=$(json_get "$OUT12E" 'j.unitPrice')

PASS=1
awk "BEGIN{ if(!($U1>$U12 && $U12>$U48)) exit 1; }" || PASS=0
if [[ "$U12" == "$U12E" ]]; then PASS=0; fi

echo "Results: U1=$U1 U12=$U12 U48=$U48 U12E=$U12E"
if [[ "$PASS" == "1" ]]; then
  echo "PASS: Vendor import + pricing preview"
  echo "VENDOR_ID=$VENDOR_ID PRODUCT_ID=$PRODUCT_ID VARIANT_ID=$VARIANT_ID RULE_ID=$RULE_ID"
  exit 0
else
  echo "FAIL: Pricing verification"
  exit 1
fi
