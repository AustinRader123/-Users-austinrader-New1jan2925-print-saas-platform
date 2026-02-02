# DecoNetwork API Documentation

Complete API reference for DecoNetwork Commerce Platform.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <token>
```

Tokens are obtained via `/auth/login` or `/auth/register`.

## Response Format

Success (2xx):
```json
{
  "id": "...",
  "data": {...}
}
```

Error (4xx, 5xx):
```json
{
  "error": "Error message"
}
```

---

## Authentication Endpoints

### POST /auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "User Name"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "userId": "user_id",
  "role": "CUSTOMER"
}
```

### POST /auth/login

Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "userId": "user_id",
  "role": "CUSTOMER"
}
```

### GET /auth/me

Get current user profile (requires auth).

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "createdAt": "2024-02-01T00:00:00Z"
}
```

---

## Products Endpoints

### GET /products

List products (public).

**Query Parameters:**
- `storeId` (required) - Store ID
- `skip` - Pagination offset (default: 0)
- `take` - Items per page (default: 20)
- `status` - Filter by status (ACTIVE, DRAFT, ARCHIVED)
- `category` - Filter by category
- `search` - Search in name/description

**Response:**
```json
[
  {
    "id": "product_id",
    "storeId": "store_id",
    "name": "T-Shirt",
    "slug": "t-shirt",
    "description": "...",
    "basePrice": 12.99,
    "status": "ACTIVE",
    "type": "BLANK",
    "variants": [...],
    "images": [...],
    "decorationAreas": [...]
  }
]
```

### GET /products/:productId

Get product details (public).

**Query Parameters:**
- `storeId` (required)

### POST /products

Create product (admin/store owner).

**Request:**
```json
{
  "storeId": "store_id",
  "name": "Product Name",
  "description": "Description",
  "category": "Category",
  "basePrice": 15.99
}
```

### POST /products/:productId/variants

Add product variant.

**Request:**
```json
{
  "name": "Red - Small",
  "sku": "SKU-001",
  "size": "S",
  "color": "Red",
  "supplierCost": 5.00
}
```

### POST /products/:productId/decoration-areas

Add decoration zone.

**Request:**
```json
{
  "name": "Front Left Chest",
  "printMethod": "SCREEN_PRINT",
  "maxWidth": 800,
  "maxHeight": 600,
  "costPerSquareIn": 0.50
}
```

---

## Designs Endpoints

### POST /designs

Create design (requires auth).

**Request:**
```json
{
  "name": "My Design",
  "description": "Design description",
  "content": {
    "layers": [...],
    "canvas": { "width": 800, "height": 600 }
  }
}
```

**Response:**
```json
{
  "id": "design_id",
  "userId": "user_id",
  "name": "My Design",
  "status": "DRAFT",
  "content": {...},
  "createdAt": "2024-02-01T00:00:00Z"
}
```

### GET /designs

List user designs (requires auth).

**Query Parameters:**
- `skip` - Pagination offset
- `take` - Items per page

### GET /designs/:designId

Get design details.

**Response includes:**
- Design content
- Assets (images, clipart)
- Generated mockups
- User info

### PUT /designs/:designId

Update design (requires auth).

**Request:**
```json
{
  "content": {...},
  "name": "Updated Name"
}
```

### POST /designs/:designId/validate

Validate design against decoration area.

**Request:**
```json
{
  "decorationAreaId": "area_id"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### POST /designs/:designId/generate-mockups

Generate mockups for variants.

**Request:**
```json
{
  "variantIds": ["variant_1", "variant_2"]
}
```

**Response:**
```json
[
  {
    "id": "mockup_id",
    "designId": "design_id",
    "productVariantId": "variant_id",
    "status": "PENDING",
    "createdAt": "2024-02-01T00:00:00Z"
  }
]
```

### GET /designs/:designId/mockups

Get completed mockups.

---

## Cart Endpoints

### GET /cart

Get or create cart.

**Query Parameters:**
- `sessionId` - Session ID (for guest carts)

**Response:**
```json
{
  "id": "cart_id",
  "items": [...],
  "total": 99.99,
  "status": "ACTIVE"
}
```

### POST /cart/items

Add item to cart.

**Request:**
```json
{
  "cartId": "cart_id",
  "productId": "product_id",
  "variantId": "variant_id",
  "quantity": 2,
  "designId": "design_id",
  "mockupUrl": "https://..."
}
```

### PUT /cart/items/:itemId

Update cart item quantity.

**Request:**
```json
{
  "quantity": 3
}
```

### DELETE /cart/items/:itemId

Remove item from cart.

---

## Pricing Endpoints

### POST /pricing/preview

Calculate product pricing.

**Request:**
```json
{
  "productVariantId": "variant_id",
  "quantity": 10,
  "decorationAreaId": "area_id",
  "colorCount": 2,
  "stitchCount": 5000
}
```

**Response:**
```json
{
  "basePrice": 10.00,
  "colorSurcharge": 2.50,
  "quantityDiscount": 1.00,
  "decorationCost": 5.00,
  "total": 185.00,
  "breakdown": {...}
}
```

---

## Orders Endpoints

### POST /orders

Create order (requires auth).

**Request:**
```json
{
  "storeId": "store_id",
  "cartId": "cart_id",
  "shippingData": {
    "email": "customer@example.com",
    "name": "Customer Name",
    "address": {
      "street": "123 Main St",
      "city": "City",
      "state": "State",
      "zip": "12345",
      "country": "US"
    }
  }
}
```

**Response:**
```json
{
  "id": "order_id",
  "orderNumber": "ORD-...",
  "status": "PENDING",
  "paymentStatus": "UNPAID",
  "items": [...],
  "totalAmount": 299.99,
  "createdAt": "2024-02-01T00:00:00Z"
}
```

### GET /orders

List user orders (requires auth).

### GET /orders/:orderId

Get order details (requires auth).

---

## Production Endpoints (Admin/Manager)

### GET /production/jobs

List production jobs.

**Query Parameters:**
- `status` - Filter by status
- `priority` - Filter by priority
- `skip`, `take` - Pagination

### GET /production/kanban

Get Kanban view of all jobs.

**Response:**
```json
{
  "QUEUED": [...],
  "ARTWORK_REVIEW": [...],
  "IN_PRODUCTION": [...],
  "QUALITY_CHECK": [...],
  "READY_TO_PACK": [...],
  "PACKED": [...]
}
```

### PATCH /production/jobs/:jobId/status

Update production job status.

**Request:**
```json
{
  "status": "IN_PRODUCTION"
}
```

### PATCH /production/steps/:stepId

Update production step.

**Request:**
```json
{
  "status": "COMPLETED",
  "notes": "Step completed successfully"
}
```

---

## Vendor Endpoints (Admin)

### GET /vendors

List all vendors.

### POST /vendors

Create new vendor.

**Request:**
```json
{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "connectorType": "api" | "csv"
}
```

### POST /vendors/:vendorId/sync

Trigger vendor product sync.

**Response:**
```json
{
  "success": true,
  "message": "Sync started"
}
```

### GET /vendors/:vendorId/products

Get products from vendor.

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 422 | Validation error |
| 500 | Server error |

---

## Rate Limiting

Currently no rate limiting. Recommended: 1000 req/min per IP.

## Webhooks

Webhooks available for:
- `order.created`
- `order.paid`
- `design.created`
- `mockup.rendered`
- `production.job_updated`

Sign webhooks with HMAC-SHA256.
