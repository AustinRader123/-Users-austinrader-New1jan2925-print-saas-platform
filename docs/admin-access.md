# Admin Access

## Credentials
- Email: admin@local.test
- Password: Admin123!
- Role: ADMIN

## Get JWT Token (curl)
```bash
BASE=http://127.0.0.1:3000
curl -sS -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  "$BASE/api/auth/login"
```
Response includes `token`, `userId`, and `role`.

Save token for reuse (macOS/Linux):
```bash
TOKEN=$(curl -sS -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  "$BASE/api/auth/login" | jq -r '.token')
```

## Use Token in Requests
Example: list vendors
```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/vendors"
```
Create vendor:
```bash
# Verified IDs
STORE_ID=cml43c2kt000110xp4pq3a76b
VENDOR_ID=cml4eylpx000ozt0e6befp2j4
PRODUCT_ID=cml4f2nnm00035srzk19av3o4
VARIANT_ID=cml4f2vhz000a11xu2c4hla35

curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Acme Vendor","email":"vendor@acme.com","connectorType":"csv"}' \
  "$BASE/api/vendors"
```
Import CSV:
```bash
cat > /tmp/vendor_import_body.json <<'JSON'
{
  "storeId": "cml43c2kt000110xp4pq3a76b",
  "mapping": {
    "productExternalId": "productExternalId",
    "productName": "productName",
    "imageUrl": "imageUrl",
    "variantExternalId": "variantExternalId",
    "variantSku": "variantSku",
    "variantColor": "variantColor",
    "variantSize": "variantSize",
    "variantPrice": "variantPrice",
    "variantInventory": "variantInventory"
  },
  "csv": "productExternalId,productName,variantExternalId,variantSku,variantColor,variantSize,variantPrice,variantInventory,imageUrl\nSKU-001,Classic Tee,SKU-001-BLK-L,VEND-TSHIRT-BLACK-L,Black,L,12.99,100,https://via.placeholder.com/300x300\nSKU-001,Classic Tee,SKU-001-WHT-M,VEND-TSHIRT-WHITE-M,White,M,12.99,50,https://via.placeholder.com/300x300"
}
JSON

curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d @/tmp/vendor_import_body.json \
  "$BASE/api/vendors/$VENDOR_ID/import-csv"
```
Create pricing rule:
```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
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
Preview pricing:
```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"storeId":"'$STORE_ID'","productVariantId":"'$VARIANT_ID'","quantity":12,"decoration":{"method":"SCREEN_PRINT","locations":1,"colors":1}}' \
  "$BASE/api/pricing/preview"
```