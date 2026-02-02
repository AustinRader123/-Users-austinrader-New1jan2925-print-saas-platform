# Verify Admin UI (Manual)

Follow these steps in the browser to validate the end-to-end admin flows.

## 1) Login
- Open the frontend dev server (Vite) at http://localhost:5173
- Login with admin: `admin@local.test` / `Admin123!`
- Confirm navbar shows Admin links: Vendors, Vendor Import, Pricing Rules, Pricing Simulator

## 2) Create Vendor
- Navigate to Admin → Vendors
- Click "Create Vendor" and fill name + email
- Confirm vendor appears in list
- Click the vendor to open Vendor Detail

## 3) Import CSV
- In Vendor Detail → Import tab
- Select a CSV file and review mapping JSON
- Click "Upload & Import"
- Confirm Import Result shows a `jobId` and product/variant counts
- Check Recent Import Jobs list for the new job

## 4) Browse Catalog
- Switch to Catalog tab
- Use search by name/SKU to find variants imported
- Confirm variants show SKU, color, size, price, inventory

## 5) Pricing Rules
- Go to Admin → Pricing Rules
- Select a product from the store
- Create a rule via the editor; save
- Edit an existing rule; save changes
- Delete a rule; confirm it disappears from list

## 6) Pricing Simulator
- Go to Admin → Pricing Simulator
- Select store, search for a product/variant, choose a variant
- Set quantity and method (SCREEN_PRINT or EMBROIDERY)
- Set locations and colors, click Run Preview
- Confirm unit price, line total, and breakdown JSON match the `/api/pricing/preview` response

## Expected Result
- All admin flows complete without console errors.
- Data reflects backend changes immediately.
- Pricing simulator displays applied rule and consistent breakdown.
