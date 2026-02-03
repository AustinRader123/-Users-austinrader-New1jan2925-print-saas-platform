# SkuFlow Vertical Slice #1 - Release Candidate Checklist

**Date**: February 1, 2026  
**Slice**: Product Customization → Mockup Generation → Add to Cart  
**Status**: [IN PROGRESS - See results below]

---

## PRE-STARTUP CHECKS

- [ ] **Environment Verified**
  - PostgreSQL running on localhost:5432
  - Redis running on localhost:6379
  - Node.js v18+ installed
  - All `.env` files configured

- [ ] **Dependencies Installed**
  - `cd backend && npm install` - SUCCESS
  - `cd frontend && npm install` - SUCCESS

---

## STARTUP VERIFICATION

### Backend Startup

- [ ] **Database Migration**
  - Command: `cd backend && npx prisma migrate reset --force`
  - Expected: "Database reset successful"
  - Result: **PASS** / **FAIL**
  - Notes: _______________

- [ ] **Seed Data**
  - Command: `cd backend && npx tsx src/db/seed.ts`
  - Expected: All 7 seed operations complete
  - Result: **PASS** / **FAIL**
  - Notes: _______________

- [ ] **Backend Server Start**
  - Command: `cd backend && npm run dev`
  - Expected: "🚀 SkuFlow server running on port 3000"
  - Expected logs: Environment loaded, services initialized
  - Result: **PASS** / **FAIL**
  - Notes: _______________

- [ ] **TypeScript Compilation**
  - Command: `cd backend && npx tsc --noEmit`
  - Expected: No errors
  - Result: **PASS** / **FAIL**
  - Notes: _______________

### Frontend Startup

- [ ] **Frontend Build**
  - Command: `cd frontend && npm run build`
  - Expected: Build succeeds, dist/ created
  - Result: **PASS** / **FAIL**
  - Notes: _______________

- [ ] **Frontend Dev Server**
  - Command: `cd frontend && npm run dev`
  - Expected: "VITE ... ready in XXX ms" on port 5174
  - Result: **PASS** / **FAIL**
  - Notes: _______________

- [ ] **Frontend Loads**
  - URL: `http://localhost:5174`
  - Expected: HomePage renders, navigation visible
  - Result: **PASS** / **FAIL**
  - Notes: _______________

---

## FUNCTIONAL TESTS

### Test 1: Login

- [ ] **UI Renders**
  - Click "Sign In" button
  - Login form appears with email + password fields
  - Result: **PASS** / **FAIL**

- [ ] **Credentials Work**
  - Email: `customer@example.com`
  - Password: `password123`
  - Expected: Token received, localStorage updated
  - Result: **PASS** / **FAIL**

- [ ] **Redirect to Products**
  - After login, route changes to `/products`
  - Navigation bar shows user email
  - Result: **PASS** / **FAIL**

- [ ] **API Call**
  - Network tab shows: `POST /api/auth/login` → 200 OK
  - Response includes: token, userId, role
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

### Test 2: Product Display

- [ ] **Products Load**
  - API call: `GET /api/products?storeId=default`
  - Expected: 1 product (Classic T-Shirt) returned
  - Result: **PASS** / **FAIL**

- [ ] **Product Card Renders**
  - Name: "Classic T-Shirt" visible
  - Price: "$12.99" visible
  - Image renders
  - Result: **PASS** / **FAIL**

- [ ] **Customize Button**
  - Button text: "Customize with Design"
  - Button clickable
  - Result: **PASS** / **FAIL**

- [ ] **Navigation**
  - Click customize button
  - Route: `/design?productId=...&variantId=...`
  - Design editor page loads
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

### Test 3: Design Editor - Upload

- [ ] **UI Components**
  - File upload input visible
  - Design name input visible
  - Save Design button visible
  - Generate Mockup button visible
  - Result: **PASS** / **FAIL**

- [ ] **Valid File Upload**
  - Upload: test image (PNG, 500×500, 1MB)
  - Expected: Image preview in canvas
  - Result: **PASS** / **FAIL**

- [ ] **File Validation - Too Large**
  - Upload: 10MB file
  - Expected: Error message: "File too large. Maximum size is 5MB"
  - Result: **PASS** / **FAIL**

- [ ] **File Validation - Invalid Type**
  - Upload: .txt file
  - Expected: Error: "Invalid file type"
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

### Test 4: Design Editor - Save

- [ ] **Save Disabled Without Upload**
  - No file uploaded
  - "Save Design" button appears disabled
  - Result: **PASS** / **FAIL**

- [ ] **Save With Valid Input**
  - Design name: "My Custom Design"
  - Upload image
  - Click "Save Design"
  - Expected: Loading spinner, then button disabled
  - Result: **PASS** / **FAIL**

- [ ] **API Call**
  - Network: `POST /api/designs`
  - Request headers: `Authorization: Bearer {token}`
  - Request body: name, description, content
  - Response (201): designId, userId, name, status
  - Result: **PASS** / **FAIL**

- [ ] **DB Record**
  - Query: `SELECT * FROM designs WHERE name = 'My Custom Design'`
  - Expected: 1 record with userId, status='DRAFT'
  - Result: **PASS** / **FAIL**

- [ ] **Storage File**
  - Path: `/backend/uploads/design-*`
  - File exists with PNG content
  - Result: **PASS** / **FAIL**

- [ ] **UI Update**
  - "Generate Mockup" button becomes enabled
  - "Design saved!" toast appears
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

### Test 5: Mockup Generation

- [ ] **Generate Button**
  - Click "Generate Mockup"
  - Loading state shows: "Generating mockup..."
  - Result: **PASS** / **FAIL**

- [ ] **Queue Job API**
  - Network: `POST /api/designs/{designId}/generate-mockups`
  - Response (202): jobId, status='QUEUED'
  - Result: **PASS** / **FAIL**

- [ ] **Backend Processing**
  - Backend logs show: mockup rendering started, completed
  - Duration: ~2-5 seconds
  - Result: **PASS** / **FAIL**

- [ ] **Polling**
  - Frontend polls: `GET /api/designs/{designId}/mockups?variantId=...`
  - Expected: After 2-3 seconds, status='COMPLETED'
  - Result: **PASS** / **FAIL**

- [ ] **Mockup File**
  - Path: `/backend/uploads/mockups/mockup-*`
  - File exists (PNG, 1000×1000, ~300KB)
  - Image shows T-shirt with design applied
  - Result: **PASS** / **FAIL**

- [ ] **DB Record**
  - Table: `mockups`
  - Fields: designId, variantId, status='COMPLETED', mockupUrl
  - Result: **PASS** / **FAIL**

- [ ] **UI Update**
  - Mockup image renders in preview
  - "Add to Cart" button becomes enabled
  - Result: **PASS** / **FAIL**

- [ ] **Error Handling - Retry**
  - (Manual: Stop Redis to simulate failure)
  - Error message appears: "Failed to generate mockup"
  - "Retry" button visible and clickable
  - Click retry → new job queued
  - Result: **PASS** / **FAIL** / **N/A**

**OVERALL**: **PASS** / **FAIL**

---

### Test 6: Add to Cart

- [ ] **Button Click**
  - Click "Add to Cart"
  - Loading state: "Adding..."
  - Result: **PASS** / **FAIL**

- [ ] **API Call - Get Cart**
  - Network: `GET /api/cart`
  - Response: cart created/retrieved with empty items
  - Result: **PASS** / **FAIL**

- [ ] **API Call - Add Item**
  - Network: `POST /api/cart/items`
  - Request: productId, variantId, designId, mockupUrl, quantity=1
  - Response (201): itemId, pricingSnapshot
  - Result: **PASS** / **FAIL**

- [ ] **Pricing Snapshot**
  - Response includes:
    - basePrice: 12.99
    - totalPrice: 12.99
    - currency: USD
    - snapshotTime: valid ISO date
  - Result: **PASS** / **FAIL**

- [ ] **DB Records**
  - Table: `carts` → 1 record with userId
  - Table: `cart_items` → 1 record with productId, variantId, designId
  - Table: `pricing_snapshots` → 1 record with cartItemId
  - Result: **PASS** / **FAIL**

- [ ] **UI Update**
  - Toast: "Added to cart!"
  - Navbar cart icon shows badge: "1"
  - Button changes to "View Cart"
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

### Test 7: View Cart

- [ ] **Navigation**
  - Click cart icon or "View Cart" button
  - Route: `/cart`
  - Cart page loads
  - Result: **PASS** / **FAIL**

- [ ] **API Call**
  - Network: `GET /api/cart`
  - Response includes full cart with items, pricing
  - Result: **PASS** / **FAIL**

- [ ] **Item Display**
  - Product name: "Classic T-Shirt"
  - Variant: "Size: M | Color: Black"
  - Design: "My Custom Design"
  - Mockup image: Renders correctly
  - Quantity: "Qty: 1"
  - Price: "$12.99"
  - Result: **PASS** / **FAIL**

- [ ] **Cart Total**
  - Shows: "$12.99"
  - Matches item price
  - Result: **PASS** / **FAIL**

- [ ] **Buttons**
  - "Checkout" button visible
  - "Continue Shopping" button visible
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

## ERROR HANDLING TESTS

### Test: Invalid File Upload

- [ ] **File Too Large**
  - Upload 25MB file
  - Expected: Error before upload, UI shows max size
  - Result: **PASS** / **FAIL**

- [ ] **Invalid Type**
  - Upload .doc file
  - Expected: Error "Invalid file type"
  - Result: **PASS** / **FAIL**

- [ ] **No Stack Trace in UI**
  - Errors shown are user-friendly
  - No raw exceptions visible
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

### Test: Network Error Recovery

- [ ] **Lost Connection During Save**
  - (Manual: Stop backend)
  - Try to save design
  - Expected: Timeout error, user-friendly message
  - Result: **PASS** / **FAIL**

- [ ] **Retry Available**
  - Error shows retry button
  - Click retry → reattempts after backend restart
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

### Test: Session Expiry

- [ ] **Expired Token**
  - (Manual: Mock token expiry)
  - Try to perform action
  - Expected: Redirect to login, message "Session expired"
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

## LOGGING & OBSERVABILITY TESTS

- [ ] **Backend Logs**
  - Check: `backend/logs/server.log`
  - Structured JSON format: timestamp, level, message, context
  - Result: **PASS** / **FAIL**

- [ ] **Request IDs**
  - Each request has unique `requestId` in logs
  - Response headers include `X-Request-ID`
  - Result: **PASS** / **FAIL**

- [ ] **Correlation IDs**
  - Design → Mockup → Cart operations linked by correlationId
  - Can trace full flow in logs
  - Result: **PASS** / **FAIL**

- [ ] **Debug Endpoint**
  - URL: `GET /api/debug/jobs`
  - (Requires admin token)
  - Response: List of recent mockup jobs with status
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

## PERFORMANCE & CACHING TESTS

- [ ] **Mockup Caching**
  - Generate same design twice
  - Expected: Second request reuses cached mockup URL
  - Result: **PASS** / **FAIL**

- [ ] **Load Time - Products**
  - Page load: < 2 seconds
  - Result: **PASS** / **FAIL**

- [ ] **Mockup Generation**
  - Time: 2-5 seconds end-to-end
  - Result: **PASS** / **FAIL**

**OVERALL**: **PASS** / **FAIL**

---

## FINAL ASSESSMENT

| Area | Status | Issues |
|------|--------|--------|
| **Backend Startup** | PASS / FAIL | _________________ |
| **Frontend Startup** | PASS / FAIL | _________________ |
| **Login** | PASS / FAIL | _________________ |
| **Product Display** | PASS / FAIL | _________________ |
| **Design Upload** | PASS / FAIL | _________________ |
| **Design Save** | PASS / FAIL | _________________ |
| **Mockup Generation** | PASS / FAIL | _________________ |
| **Add to Cart** | PASS / FAIL | _________________ |
| **View Cart** | PASS / FAIL | _________________ |
| **Error Handling** | PASS / FAIL | _________________ |
| **Logging** | PASS / FAIL | _________________ |
| **Performance** | PASS / FAIL | _________________ |

---

## RELEASE DECISION

**Overall Status**: **PASS** / **CONDITIONAL** / **FAIL**

**Blockers**: (List any FAIL items preventing release)
- ___________________________
- ___________________________
- ___________________________

**Known Issues** (To be fixed in next iteration):
- ___________________________
- ___________________________

**Sign-off**:
- QA: _________________ Date: ______
- Dev: ________________ Date: ______
- Product: ____________ Date: ______

---

## NEXT STEPS

If **PASS**: Ready for production deployment  
If **CONDITIONAL**: Fix listed blockers and retest  
If **FAIL**: Fix critical issues and retest all tests  

---

## TEST EXECUTION COMMANDS

```bash
# Full test from scratch
cd /Users/austinrader/feb1

# Terminal 1: Backend
cd backend
npx prisma migrate reset --force
npx tsx src/db/seed.ts
npm run dev

# Terminal 2: Frontend
cd ../frontend
npm run dev

# Browser: Navigate to http://localhost:5174 and follow manual-test-slice1.md

# Check logs
tail -f backend/logs/server.log

# API Test: View recent mockup jobs
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/debug/jobs
```
