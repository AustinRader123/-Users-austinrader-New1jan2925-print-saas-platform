# SkuFlow Vertical Slice #1 - Manual Test Script

**Vertical Slice Goal**: Customer customizes product → adds design → generates mockup → adds to cart

---

## PART 1: STARTUP FROM SCRATCH

### 1.1 Prerequisites
- macOS (tested on Feb 1, 2026)
- Node.js v18+ installed
- PostgreSQL 12+ running on localhost:5432
- Redis running on localhost:6379

### 1.2 Complete Startup Procedure

```bash
# 1. Clone/prepare repo
cd /Users/austinrader/feb1

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies  
cd ../frontend
npm install
cd ..

# 4. Configure environment
# Backend should have .env with:
#   DATABASE_URL=postgresql://user:password@localhost:5432/deco_network
#   JWT_SECRET=test-secret-key
#   REDIS_URL=redis://localhost:6379
#   S3_USE_LOCAL=true
cat backend/.env  # Verify exists

# Frontend should have .env with:
#   VITE_API_URL=http://localhost:3000
cat frontend/.env  # Verify exists

# 5. Reset database and seed
cd backend
npx prisma migrate reset --force
npx tsx src/db/seed.ts

# Expect output:
# 🌱 Starting database seed...
# ✓ Created user: customer@example.com
# ✓ Created store: Default Store
# ✓ Created product: Classic T-Shirt
# ✓ Created 24 product variants
# ✓ Created decoration area: Front Chest
# ✓ Created mockup template for product
# ✓ Created pricing rule
# 🎉 Seed completed successfully!

# 6. Start backend (Terminal 1)
npm run dev
# Expect: "🚀 SkuFlow server running on port 3000"

# 7. Start frontend (Terminal 2)
cd ../frontend
npm run dev
# Expect: "VITE ... ready in XXX ms"
# ➜ Local: http://localhost:5174/

# 8. Verify both running
curl -s http://localhost:3000/api/products?storeId=default | jq . | head -10
# Should return array of products

curl -s http://localhost:5174 | head -20
# Should return HTML
```

---

## PART 2: TEST USER CREDENTIALS

| Field | Value |
|-------|-------|
| Email | customer@example.com |
| Password | password123 |
| User Role | CUSTOMER |
| Store | Default Store |

**Test Product**:
- Name: Classic T-Shirt
- Base Price: $12.99
- Variants: 24 (6 sizes × 4 colors)
  - Sizes: S, M, L, XL, 2XL, 3XL
  - Colors: Black, White, Navy, Red
- Decoration Area: Front Chest (800×600 px, SCREEN_PRINT method)

---

## PART 3: STEP-BY-STEP WORKFLOW TEST

### STEP 1: Homepage Load

**Action**: Open browser to `http://localhost:5174`

**Expected UI**:
- Navigation bar visible with "SkuFlow" logo
- "Sign In" button in top right (user not logged in)
- Main content area displays

**Expected API Calls**: None yet (homepage is static)

**Expected Files/DB**: None created

**Terminal Output**: Frontend logs app initialization

---

### STEP 2: Login

**Action**: 
1. Click "Sign In" button
2. Enter email: `customer@example.com`
3. Enter password: `password123`
4. Click "Login" button

**Expected Flow**:
- Route to login page: `/login`
- Form appears with email + password fields
- Loading spinner shows during submission

**Expected API Call**:
```
POST /api/auth/login
Headers: Content-Type: application/json
Body: {
  "email": "customer@example.com",
  "password": "password123"
}

Response (200 OK):
{
  "token": "eyJhbGc...",
  "userId": "cml42d9...",
  "role": "CUSTOMER"
}
```

**Expected Backend Logs**:
```
[auth] User login successful userId=cml42d9... email=customer@example.com
```

**Expected DB**:
- No new records (user exists from seed)

**Expected Storage**:
- No files created

**Expected UI State**:
- Token stored in localStorage
- Navbar shows user email
- Redirects to `/products`

---

### STEP 3: View Products List

**Action**: Page automatically navigates to `/products` after login

**Expected UI**:
- Product grid displays
- "Classic T-Shirt" card visible
- Shows image, name, price ($12.99)
- "Customize with Design" button visible

**Expected API Call**:
```
GET /api/products?storeId=default
Headers: Accept: application/json
Response (200 OK):
{
  [
    {
      "id": "cml42d90b...",
      "name": "Classic T-Shirt",
      "basePrice": 12.99,
      "variants": [
        {"id": "cml42d90m...", "size": "S", "color": "Black"},
        {"id": "cml42d90l...", "size": "M", "color": "Black"},
        ...
      ],
      ...
    }
  ]
}
```

**Expected Backend Logs**:
```
[products] Listed 1 products for store=default
```

**Expected DB**: No new records

**Expected UI State**:
- Product list rendered
- Ready to customize

---

### STEP 4: Navigate to Designer

**Action**:
1. Click "Customize with Design" on T-Shirt card
2. Select variant: Black, Size M (or any variant)

**Expected Flow**:
- Variant selector dropdown opens
- User selects: Color=Black, Size=M
- Click "Customize" button
- Route to `/design?productId=cml42d90b...&variantId=cml42d90l...`

**Expected API Calls**: None yet

**Expected UI**:
- Design Editor page loads
- Canvas area displays
- File upload input visible
- "Save Design", "Generate Mockup", "Add to Cart" buttons present

**Expected DB**: No new records yet

---

### STEP 5: Upload Image

**Action**:
1. Prepare test image: `test-image.png` (500×500 px, 1MB)
2. Click file upload input
3. Select test image
4. File should load into canvas preview

**Expected Flow**:
- File upload dialog opens
- User selects file
- Image preview shows in canvas area
- No immediate upload to server

**Expected API Calls**: None yet (upload happens on save)

**Expected UI**:
- Image renders in canvas
- Shows dimensions (500×500)
- File name displayed

**Expected DB**: No new records

---

### STEP 6: Save Design

**Action**: Click "Save Design" button

**Expected Flow**:
- Loading spinner shows
- Design data sent to backend

**Expected API Call**:
```
POST /api/designs
Headers: 
  Content-Type: application/json
  Authorization: Bearer {token}
Body: {
  "name": "Custom Design",
  "description": "Custom design",
  "content": {
    "layers": [...],
    "canvas": {"width": 800, "height": 600}
  }
}

Response (201 Created):
{
  "id": "cml43abc...",
  "userId": "cml42d9...",
  "name": "Custom Design",
  "status": "DRAFT",
  "createdAt": "2026-02-01T18:25:00.000Z",
  ...
}
```

**Expected Backend Logs**:
```
[designs] Design created designId=cml43abc... userId=cml42d9... name=Custom Design
```

**Expected DB Records**:
- `designs` table: 1 new record
  - id: cml43abc...
  - userId: cml42d9...
  - name: Custom Design
  - status: DRAFT

- `design_assets` table: 1 new record
  - designId: cml43abc...
  - fileKey: uploads/design-cml43abc-1.png
  - type: IMAGE

**Expected Files**:
- `/Users/austinrader/feb1/backend/uploads/design-cml43abc-1.png`
  - File size: ~1MB
  - Dimensions: 500×500 px

**Expected UI**:
- Design ID stored in component state
- Button state: "Generate Mockup" now enabled
- "Design saved" toast notification appears

---

### STEP 7: Generate Mockup

**Action**: Click "Generate Mockup" button

**Expected Flow**:
- Loading spinner shows: "Generating mockup..."
- API call sends design + variant to backend
- Queue job created for async rendering
- Frontend polls for job completion (every 2 seconds, 30 attempts)

**Expected API Call (1st - Queue Job)**:
```
POST /api/designs/cml43abc.../generate-mockups
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
  X-Request-ID: req-xxx-yyy (unique per request)
Body: {
  "variantIds": ["cml42d90l..."]
}

Response (202 Accepted):
{
  "jobId": "mockup-cml43xyz...",
  "status": "QUEUED",
  "message": "Mockup rendering started"
}
```

**Expected Backend Logs**:
```
[mockup:create] Job queued jobId=mockup-cml43xyz... designId=cml43abc... variantId=cml42d90l...
[mockup:render:start] Rendering mockup jobId=mockup-cml43xyz... 
[mockup:render:progress] Compositing images jobId=mockup-cml43xyz...
[mockup:render:complete] Mockup rendered jobId=mockup-cml43xyz... duration=2.3s mockupUrl=uploads/mockups/mockup-cml43xyz-.png
```

**Expected DB Records**:
- `mockups` table: 1 new record
  - id: cml43xyz...
  - designId: cml43abc...
  - variantId: cml42d90l...
  - status: COMPLETED
  - mockupUrl: uploads/mockups/mockup-cml43xyz-.png

- `production_jobs` table: 1 new record (created auto)
  - id: prod-cml43...
  - orderItemId: (reference to future order item)
  - status: PENDING

**Expected Files**:
- `/Users/austinrader/feb1/backend/uploads/mockups/mockup-cml43xyz-.png`
  - Composite image with:
    - T-Shirt template (base image)
    - Uploaded design placed on Front Chest area
  - Dimensions: 1000×1000 px (template size)
  - File size: 200-300KB

**Expected API Call (2nd+ - Poll Status)** (every 2 seconds):
```
GET /api/designs/cml43abc.../mockups?variantId=cml42d90l...
Headers: Authorization: Bearer {token}
Response (200 OK):
{
  "status": "COMPLETED",
  "mockupUrl": "uploads/mockups/mockup-cml43xyz-.png",
  "completedAt": "2026-02-01T18:26:02.000Z"
}
```

**Expected UI**:
- Polling indicator shows: "Rendering... (attempt 1/30)"
- After ~2-3 seconds: polling stops
- Mockup image displays in preview area
- Shows composite of T-shirt with design applied
- "Add to Cart" button becomes enabled

---

### STEP 8: Add to Cart

**Action**: Click "Add to Cart" button

**Expected Flow**:
- Loading spinner shows
- Backend checks/creates cart for user
- Cart item created with pricing snapshot

**Expected API Calls**:

*Call 1 - Get or Create Cart*:
```
GET /api/cart
Headers: 
  Authorization: Bearer {token}
  X-Request-ID: req-xxx-yyy
Response (200 OK):
{
  "id": "cart-cml42...",
  "userId": "cml42d9...",
  "items": [],
  "status": "OPEN",
  "total": 0
}
```

*Call 2 - Add Item to Cart*:
```
POST /api/cart/items
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
  X-Request-ID: req-xxx-yyy
Body: {
  "productId": "cml42d90b...",
  "variantId": "cml42d90l...",
  "designId": "cml43abc...",
  "mockupUrl": "uploads/mockups/mockup-cml43xyz-.png",
  "quantity": 1
}

Response (201 Created):
{
  "id": "item-cml44...",
  "cartId": "cart-cml42...",
  "quantity": 1,
  "pricingSnapshot": {
    "basePrice": 12.99,
    "quantityBreakDiscount": 0,
    "colorSurcharge": 0,
    "totalPrice": 12.99,
    "currency": "USD",
    "snapshotTime": "2026-02-01T18:26:05.000Z"
  }
}
```

**Expected Backend Logs**:
```
[cart] Cart retrieved/created cartId=cart-cml42... userId=cml42d9...
[cart:items] Item added itemId=item-cml44... cartId=cart-cml42... quantity=1 price=12.99
[pricing] Pricing snapshot frozen snapshotTime=2026-02-01T18:26:05.000Z basePrice=12.99
```

**Expected DB Records**:
- `carts` table: 1 record (created or existing)
  - id: cart-cml42...
  - userId: cml42d9...
  - status: OPEN

- `cart_items` table: 1 new record
  - id: item-cml44...
  - cartId: cart-cml42...
  - productId: cml42d90b...
  - variantId: cml42d90l...
  - designId: cml43abc...
  - quantity: 1
  - mockupUrl: uploads/mockups/mockup-cml43xyz-.png

- `pricing_snapshots` table: 1 new record
  - id: snap-cml44...
  - cartItemId: item-cml44...
  - basePrice: 12.99
  - totalPrice: 12.99
  - snapshotTime: 2026-02-01T18:26:05.000Z

**Expected UI**:
- Toast: "Added to cart!"
- Navbar cart icon shows badge: "1"
- Button text changes to "View Cart"

---

### STEP 9: View Cart

**Action**: Click "View Cart" button or cart icon in navbar

**Expected Flow**:
- Route to `/cart`
- Cart data loaded from API

**Expected API Call**:
```
GET /api/cart
Headers: Authorization: Bearer {token}
Response (200 OK):
{
  "id": "cart-cml42...",
  "items": [
    {
      "id": "item-cml44...",
      "product": {
        "id": "cml42d90b...",
        "name": "Classic T-Shirt",
        "basePrice": 12.99
      },
      "productVariant": {
        "id": "cml42d90l...",
        "size": "M",
        "color": "Black"
      },
      "design": {
        "id": "cml43abc...",
        "name": "Custom Design"
      },
      "mockupUrl": "uploads/mockups/mockup-cml43xyz-.png",
      "quantity": 1,
      "pricingSnapshot": {
        "basePrice": 12.99,
        "totalPrice": 12.99
      }
    }
  ],
  "total": 12.99
}
```

**Expected UI**:
- Cart page displays
- Shows 1 item:
  - Product name: "Classic T-Shirt"
  - Variant: "Black - M"
  - Design: "Custom Design"
  - Mockup preview image renders (shows T-shirt with design)
  - Quantity: 1
  - Price: $12.99
- Total price: $12.99
- "Checkout" button visible

**Expected DB**: No new records (cart already exists)

---

## PART 4: NEGATIVE TESTS

### NEG TEST 1: Upload File Too Large

**Action**:
1. Prepare test image: `huge-image.png` (5000×5000 px, 25MB)
2. Attempt to upload in designer
3. Observe rejection

**Expected Behavior**:
- Frontend validation rejects file > 5MB before upload
- Error message: "File size must be under 5MB"
- No API call made
- No DB records created

**Fallback**:
- If frontend validation bypassed, backend rejects:
  - HTTP 413 Payload Too Large
  - Backend logs: `[upload:error] File too large size=25MB maxSize=5MB`
  - UI shows: "File too large. Maximum 5MB."

---

### NEG TEST 2: Place Design Outside Bounds

**Action**:
1. Upload valid image (500×500 px)
2. Manually adjust layer position to x=900 (outside 800px decoration area)
3. Click "Save Design"
4. Observe validation

**Expected Behavior**:
- Backend validates against decoration area bounds (800×600)
- If invalid, returns 400 Bad Request:
  ```
  {
    "error": "Design exceeds decoration area bounds",
    "details": {
      "area": "Front Chest (800×600)",
      "overflow": "x+width=900+500=1400 > 800"
    }
  }
  ```
- UI shows error toast: "Design must fit within decoration area (800×600)"
- Design not saved to DB
- User can adjust and retry

---

### NEG TEST 3: Mockup Generation Failure

**Action**:
1. Save design successfully
2. Simulate backend failure (stop Redis or mock queue error)
3. Click "Generate Mockup"
4. Observe retry behavior

**Expected Behavior**:
- Initial job queued
- After 10 seconds, polling detects failure
- Backend returns: `{ "status": "FAILED", "error": "Sharp rendering error" }`
- UI shows error: "Mockup generation failed"
- Displays retry button
- User clicks retry → new job queued → polling resumes

**Expected Backend Logs**:
```
[mockup:error] Rendering failed jobId=... error=ENOMEM
[mockup:retry] User retry attempt=1 jobId=...
```

**Expected DB**:
- First mockup record marked `status: FAILED`
- New mockup record created for retry attempt

---

### NEG TEST 4: Authentication Failure

**Action**:
1. Clear localStorage: `localStorage.clear()`
2. Try to access `/cart` directly via URL
3. Observe redirect

**Expected Behavior**:
- No token present
- Route guard redirects to `/login`
- Message: "Please log in to continue"

**Expected API**: No calls made (protected before request)

---

### NEG TEST 5: Concurrent Requests Handling

**Action**:
1. Rapid-click "Generate Mockup" 3 times in succession
2. Observe deduplication

**Expected Behavior**:
- First click queues job
- Clicks 2 & 3 ignored or merged into single job
- No duplicate mockups created

**Expected Backend Logs**:
```
[mockup:dedupe] Request already in flight, ignoring duplicate designId=...
```

**Expected DB**: Only 1 mockup record created

---

## PART 5: SUCCESS CRITERIA

| Check | Status | Details |
|-------|--------|---------|
| **Startup** | REQUIRED | All 4 services start without errors |
| **Login** | REQUIRED | Token received, stored, user state synced |
| **Product Load** | REQUIRED | T-Shirt and 24 variants load from API |
| **Designer** | REQUIRED | Image uploads, canvas renders |
| **Design Save** | REQUIRED | Design saved to DB, file in storage |
| **Mockup Generate** | REQUIRED | Job queued, polling works, image renders |
| **Cart** | REQUIRED | Item added with correct pricing snapshot |
| **Mockup Display** | REQUIRED | Composite image renders in cart |
| **Error Handling** | REQUIRED | Graceful messages, no stack traces in UI |
| **Logs** | REQUIRED | Structured logs with correlationId for tracing |

---

## PART 6: TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Backend won't start | Check `npx tsc --noEmit` for TS errors, verify `.env` files |
| Products API returns `[]` | Run `npx tsx src/db/seed.ts` in backend dir |
| Upload fails silently | Check browser console for CORS errors, verify `vite.config.ts` proxy |
| Mockup never completes | Verify Redis running on 6379, check backend logs for queue errors |
| Images not visible in storage | Verify `/backend/uploads` directory exists and is writable |

---

## PART 7: COMMAND REFERENCE

```bash
# Full fresh start (all terminals)
cd /Users/austinrader/feb1/backend && npx prisma migrate reset --force
npx tsx src/db/seed.ts
npm run dev

# Terminal 2
cd /Users/austinrader/feb1/frontend && npm run dev

# Verify APIs
curl http://localhost:3000/api/products?storeId=default
curl http://localhost:3000/api/designs/debug/jobs (requires admin)

# View logs real-time
tail -f backend/logs/server.log
```
