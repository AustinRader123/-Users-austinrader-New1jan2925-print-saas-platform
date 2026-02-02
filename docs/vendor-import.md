# Vendor Import Evidence

## Async Import Jobs Flow
- POST `/api/vendors/:vendorId/import-csv` → `202 { jobId }`
- Poll `GET /api/import-jobs/:jobId` for `{ status, percent, processedRows, totalRows, failedRows }`
- View errors via `GET /api/import-jobs/:jobId/errors` (paginated) and download CSV via `GET /api/import-jobs/:jobId/errors.csv`
- Retry failed rows via `POST /api/import-jobs/:jobId/retry` → `{ newJobId }` (reprocesses only failed rowNumbers)

## Async Import Jobs (NEW)
- Upload returns 202 with `{jobId}`.
- Progress available via `GET /api/import-jobs/:jobId`.
- Errors visible via `GET /api/import-jobs/:jobId/errors` and downloadable CSV.
- Retry failed rows via `POST /api/import-jobs/:jobId/retry` → `{ newJobId }`.

## Create/Select Vendor
**Vendor:**
```json
{
  "id": "cml4eylpx000ozt0e6befp2j4",
  "name": "Acme Vendor",
  "email": "vendor@acme.com",
  "apiKey": null,
  "status": "ACTIVE",
  "connectorType": "csv",
  "lastSyncAt": null,
  "lastSyncStatus": null,
  "createdAt": "2026-02-02T00:10:32.949Z",
  "updatedAt": "2026-02-02T00:10:32.949Z",
  "products": [
    {
      "id": "cml4f2nns00075srzxw693cj1",
      "name": "Classic Tee"
    }
  ]
}
```

## Import CSV (HTTP)
Verified PASS details and exact commands:

Store and IDs:
- storeId: `cml43c2kt000110xp4pq3a76b`
- vendorId: `cml4eylpx000ozt0e6befp2j4`
- productId: `cml4f2nnm00035srzk19av3o4`
- variantId: `cml4f2vhz000a11xu2c4hla35`

Commands (macOS):
```bash
BASE=http://127.0.0.1:3000
TOKEN=$(curl -sS -H "Content-Type: application/json" -d '{"email":"admin@local.test","password":"Admin123!"}' "$BASE/api/auth/login" | jq -r '.token')

# Import CSV for the vendor
VENDOR_ID=cml4eylpx000ozt0e6befp2j4
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

curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d @/tmp/vendor_import_body.json \
  "$BASE/api/vendors/$VENDOR_ID/import-csv"
```

Expected response (async):
```json
{ "jobId": "cml4gwhgt0003d4eus049jvmc" }
```

Poll until complete:
```bash
JOB_ID=cml4gwhgt0003d4eus049jvmc
until curl -sS "$BASE/api/import-jobs/$JOB_ID" | jq -e '.status | test("SUCCESS|FAILED")'; do sleep 1; done
curl -sS "$BASE/api/import-jobs/$JOB_ID" | jq '.'
```

## Statuses
- `QUEUED`: awaiting processing
- `RUNNING`: background processing
- `SUCCESS`: completed; may include `failedRows > 0`
- `FAILED`: fatal error; check `error` field

## Retry Behavior
- New job uses same stored CSV (copied) and a whitelist of failed rowNumbers.
- `totalRows` equals the count of failed rows; progress reflects reprocessing.
- Original job remains unchanged for audit.

## Counts
```json
{
  "products": 2,
  "variants": 2
}
```

## Sample Normalized Record
```json
{
  "id": "cml4f2nnm00035srzk19av3o4",
  "vendorId": "cml4eylpx000ozt0e6befp2j4",
  "externalId": "SKU-001",
  "name": "Classic Tee",
  "description": null,
  "basePrice": 12.99,
  "brand": null,
  "category": null,
  "imageUrl": "https://via.placeholder.com/300x300",
  "lastSyncedAt": "2026-02-02T00:14:02.337Z",
  "syncData": {},
  "createdAt": "2026-02-02T00:13:42.082Z",
  "updatedAt": "2026-02-02T00:14:02.337Z",
  "variants": [
    {
      "id": "cml4f2nnq00055srz3qnprpk9",
      "vendorProductId": "cml4f2nnm00035srzk19av3o4",
      "productVariantId": "cml4f2vhz000a11xu2c4hla35",
      "externalId": "SKU-001-BLK-L",
      "size": "L",
      "color": "Black",
      "sku": "VEND-TSHIRT-BLACK-L",
      "price": 12.99,
      "inventory": 100,
      "createdAt": "2026-02-02T00:13:42.086Z",
      "updatedAt": "2026-02-02T00:14:02.336Z"
    },
    {
      "id": "cml4f2vi3000e11xuafwyxxl8",
      "vendorProductId": "cml4f2nnm00035srzk19av3o4",
      "productVariantId": "cml4f2vi6000j11xumcjts5tl",
      "externalId": "SKU-001-WHT-M",
      "size": "M",
      "color": "White",
      "sku": "VEND-TSHIRT-WHITE-M",
      "price": 12.99,
      "inventory": 50,
      "createdAt": "2026-02-02T00:13:52.251Z",
      "updatedAt": "2026-02-02T00:14:02.341Z"
    }
  ]
}
```

## How to get IDs for pricing preview
- Use `productVariantId` from the sample above (e.g., `cml4f2vhz000a11xu2c4hla35`).
- Or use `sku` (e.g., `VEND-TSHIRT-BLACK-L`).
- Or use `vendorVariantId` (e.g., `cml4f2nnq00055srz3qnprpk9`).