# Pricing Rules Canonical Schema and CURL Repros

Canonical payload schema for create and update:

{
  "storeId": "string",
  "name": "string",
  "method": "SCREEN_PRINT" | "EMBROIDERY",
  "breaks": [
    { "minQty": 1, "unitPrice": 20.69 },
    { "minQty": 12, "unitPrice": 19.39 },
    { "minQty": 48, "unitPrice": 18.09 }
  ]
}

Server sorts `breaks` by `minQty` and validates: length >= 1, `minQty >= 1`, `unitPrice > 0`.

## Create Rule (POST)

```bash
export BASE=http://127.0.0.1:3000
export ADMIN_TOKEN="PASTE_ADMIN_TOKEN"
export STORE_ID="PASTE_STORE_ID"
export PRODUCT_ID="OPTIONAL_PRODUCT_ID" # optional; if omitted server uses first ACTIVE product in store

curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId":"'$STORE_ID'",
    "name":"Test Rule",
    "method":"SCREEN_PRINT",
    "breaks":[{"minQty":1,"unitPrice":20.69},{"minQty":12,"unitPrice":19.39}],
    "productId":"'$PRODUCT_ID'"
  }' \
  "$BASE/api/admin/pricing-rules" | jq
```

Expected: 201 with rule object including `quantityBreaklist.breaks`.

## Update Rule (PUT)

```bash
export RULE_ID="PASTE_RULE_ID"

# Update name only (breaks preserved)
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -X PUT -d '{"name":"Test Rule Updated"}' \
  "$BASE/api/admin/pricing-rules/$RULE_ID" | jq

# Update breaks (persist new breaks)
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -X PUT -d '{"breaks":[{"minQty":1,"unitPrice":20.69},{"minQty":12,"unitPrice":18.99}]}' \
  "$BASE/api/admin/pricing-rules/$RULE_ID" | jq
```

## List Rules (GET)

```bash
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE/api/admin/pricing-rules?storeId=$STORE_ID" | jq
```

Expected: rules include `printMethod` and `quantityBreaklist.breaks`.

# Pricing Rules & Preview (MVP)

## Admin API

Create rule (port 3000, verified IDs):
```bash
BASE=http://127.0.0.1:3000
STORE_ID=cml43c2kt000110xp4pq3a76b
TOKEN=$(curl -sS -H "Content-Type: application/json" -d '{"email":"admin@local.test","password":"Admin123!"}' "$BASE/api/auth/login" | jq -r '.token')
PRODUCT_ID=cml4f2nns00075srzxw693cj1

curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "name": "MVP Rule",
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
  }' \
  "$BASE/api/admin/pricing-rules"
```

List rules by store:
```bash
STORE_ID=cml43c2kt000110xp4pq3a76b
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/admin/pricing-rules?storeId=$STORE_ID"
```

Update rule:
```bash
RULE_ID=<ruleId>
curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"MVP Rule v2","baseMarkupPercent":42}' \
  "$BASE/api/admin/pricing-rules/$RULE_ID"
```

Delete rule (optional):
```bash
curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/admin/pricing-rules/$RULE_ID"
```

## Pricing Preview API

Preview by `productVariantId` (verified):
```bash
VARIANT_ID=cml4f2vhz000a11xu2c4hla35
curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "storeId": "'$STORE_ID'",
    "productVariantId": "'$VARIANT_ID'",
    "quantity": 12,
    "decoration": { "method":"SCREEN_PRINT", "locations":1, "colors":1 }
  }' \
  "$BASE/api/pricing/preview"
```

Preview by `sku`:
```bash
SKU=VEND-TSHIRT-BLACK-L
curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "storeId": "'$STORE_ID'",
    "sku": "'$SKU'",
    "quantity": 48,
    "decoration": { "method":"SCREEN_PRINT", "locations":1, "colors":1 }
  }' \
  "$BASE/api/pricing/preview"
```

Preview by `vendorVariantId`:
```bash
VENDOR_VARIANT_ID=<vendorVariantId>
curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "storeId": "'$STORE_ID'",
    "vendorVariantId": "'$VENDOR_VARIANT_ID'",
    "quantity": 1,
    "decoration": { "method":"EMBROIDERY", "locations":1, "colors":1 }
  }' \
  "$BASE/api/pricing/preview"
```

## Example Outputs

Real outputs from PASS run (ruleId `cml4h07wz001jd4euwhh5vqsk`):
```json
// Qty 1 (SCREEN_PRINT)
{"currency":"USD","unitPrice":20.69,"lineTotal":30.69,"breakdown":{"blankCost":12.99,"decorationCost":2.5,"setupFee":10,"markup":5.196000000000001,"discount":0,"ruleId":"cml4fe83q0001dqr65s4v7cjv"}}

// Qty 12 (SCREEN_PRINT)
{"currency":"USD","unitPrice":19.39,"lineTotal":242.68,"breakdown":{"blankCost":12.99,"decorationCost":2.5,"setupFee":10,"markup":3.897,"discount":0,"ruleId":"cml4fe83q0001dqr65s4v7cjv"}}

// Qty 48 (SCREEN_PRINT)
{"currency":"USD","unitPrice":18.09,"lineTotal":878.32,"breakdown":{"blankCost":12.99,"decorationCost":2.5,"setupFee":10,"markup":2.5980000000000003,"discount":0,"ruleId":"cml4fe83q0001dqr65s4v7cjv"}}

// Qty 12 (EMBROIDERY)
{"currency":"USD","unitPrice":19.89,"lineTotal":253.68,"breakdown":{"blankCost":12.99,"decorationCost":3,"setupFee":15,"markup":3.897,"discount":0,"ruleId":"cml4fe83q0001dqr65s4v7cjv"}}
```

Breakdown fields:
- blankCost: variant supplier cost
- decorationCost: perLocationFee*locations + perColorFee*colors
- setupFee: one-time per order
- markup: baseMarkupPercent applied to blankCost (plus break delta)
- discount: fixed per-unit discount if provided
- ruleId: applied rule id

Rounding: nearest cent applied to unit and line totals.