# DecoNetwork - Custom Product Commerce & Production Platform

Complete enterprise-grade platform for designing, pricing, and manufacturing custom products.

**Status:** ✅ Phase 1 Complete - Full Architecture & Foundation Built

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 6+

### Installation

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Database:**
```bash
cd backend
npm run db:migrate
npm run db:seed
```

Access the application at `http://localhost:5173`

## 🧪 E2E Testing (Playwright)

Run the smoke suite locally (uses Vite preview on 5173):

```bash
bash scripts/ci-e2e.sh smoke
```

Run the full regression locally, skipping pack tests (until pack routes are finalized):

```bash
SKIP_PACK_E2E=true bash scripts/ci-e2e.sh regression
```

Notes:
- Base URL for Playwright is configured via `PLAYWRIGHT_BASE_URL` > `E2E_BASE_URL` > defaults to `http://127.0.0.1:5173`.
- Frontend preview uses `VITE_API_URL=http://localhost:3000/api` during CI/local runs.
- Pack-related tests are tagged `@pack` and can be excluded via `--grep-invert @pack`.

### How to trigger Nightly E2E manually
- In GitHub: Actions → Nightly E2E → Run workflow
- Choose branch: `chore/nightly-regression-pass` (or `main`)
- Optional inputs (if present): set flags to skip pack tests
- Artifacts:
  - Playwright HTML report: `frontend/playwright-report`

Local smoke reminder:

```bash
SKIP_PACK_E2E=true bash scripts/ci-e2e.sh
```

Base URL precedence: `PLAYWRIGHT_BASE_URL` > `E2E_BASE_URL` > `http://127.0.0.1:5173`.

## 📋 What's Built

### Backend (Express + TypeScript)
- ✅ Complete REST API with 30+ endpoints
- ✅ JWT authentication & RBAC
- ✅ PostgreSQL with Prisma ORM (40+ models)
- ✅ Dynamic pricing engine
- ✅ Shopping cart system
- ✅ Order management workflow
- ✅ Production job tracking
- ✅ Vendor integration framework
- ✅ Multi-tenant support
- ✅ Background job queue (Bull)

### Frontend (React + TypeScript)
- ✅ React Router navigation
- ✅ Zustand state management
- ✅ Tailwind CSS styling
- ✅ Authentication flows
- ✅ API client with interceptors
- ✅ Page structure for all major features
- ✅ Responsive navbar
- ✅ Home page with features

### Database
- ✅ 40+ models covering:
  - Users & authentication
  - Products & variants
  - Designs & mockups
  - Orders & fulfillment
  - Production workflow
  - Vendor management
  - Multi-store support
  - Payment & billing

### Documentation
- ✅ [System Inventory](docs/system-inventory.md) - Complete architecture overview
- ✅ [API Reference](docs/api.md) - Full endpoint documentation
- ✅ [Feature Gap Matrix](docs/feature-gap-matrix.md) - Status & roadmap
- ✅ [Deployment Guide](docs/deployment.md) - Production setup
- ✅ [Inventory JSON](docs/inventory.json) - Structured system info

## 🏗️ Architecture

### Backend Structure
```
backend/
├── src/
│   ├── services/          # Business logic
│   │   ├── AuthService.ts
│   │   ├── ProductService.ts
│   │   ├── DesignService.ts
│   │   ├── CartService.ts
│   │   ├── PricingEngine.ts
│   │   ├── MockupService.ts
│   │   ├── OrderService.ts
│   │   ├── ProductionService.ts
│   │   └── VendorService.ts
│   ├── routes/            # API endpoints
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── designs.ts
│   │   ├── cart.ts
│   │   ├── pricing.ts
│   │   ├── orders.ts
│   │   ├── production.ts
│   │   ├── vendors.ts
│   │   └── admin.ts
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── config.ts          # Configuration
│   ├── logger.ts          # Logging
│   ├── app.ts             # Express app
│   └── index.ts           # Entry point
├── prisma/
│   └── schema.prisma      # Database schema (40+ models)
├── package.json
├── tsconfig.json
└── .env.example
```

### Frontend Structure
```
frontend/
├── src/
│   ├── stores/            # Zustand stores
│   │   ├── authStore.ts
│   │   └── cartStore.ts
│   ├── lib/
│   │   └── api.ts         # API client
│   ├── components/        # React components
│   │   └── Navbar.tsx
│   ├── pages/             # Page components
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ProductPage.tsx
│   │   ├── DesignPage.tsx
│   │   ├── DesignEditorPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── OrdersPage.tsx
│   │   └── ProductionDashboard.tsx
│   ├── App.tsx            # Router
│   ├── main.tsx           # Entry point
│   └── index.css          # Styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## 📊 Database Models

**40+ models** organized by feature:

- **Auth**: User, ApiKey, Team
- **Multi-tenant**: Store, StoreSettings, CustomPage
- **Products**: Product, ProductVariant, ProductImage, DecorationArea
- **Vendors**: Vendor, VendorProduct, VendorProductVariant, VendorSyncJob
- **Designs**: Design, DesignAsset
- **Mockups**: Mockup, MockupTemplate
- **Pricing**: PricingRule, PricingSnapshot
- **Commerce**: Cart, CartItem, Order, OrderItem
- **Fulfillment**: ProductionJob, ProductionStep, Shipment
- **Billing**: Payment, Invoice, PaymentConfig
- **Integration**: Notification, WebhookLog

## 🔌 API Endpoints

30+ endpoints covering:

```
Auth (3):
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me

Products (5):
  GET    /api/products
  GET    /api/products/:id
  POST   /api/products
  POST   /api/products/:id/variants
  POST   /api/products/:id/decoration-areas

Designs (7):
  POST   /api/designs
  GET    /api/designs
  GET    /api/designs/:id
  PUT    /api/designs/:id
  POST   /api/designs/:id/validate
  POST   /api/designs/:id/generate-mockups
  GET    /api/designs/:id/mockups

Cart (4):
  GET    /api/cart
  POST   /api/cart/items
  PUT    /api/cart/items/:id
  DELETE /api/cart/items/:id

Pricing (1):
  POST   /api/pricing/preview

Orders (3):
  POST   /api/orders
  GET    /api/orders
  GET    /api/orders/:id

Production (4):
  GET    /api/production/jobs
  GET    /api/production/kanban
  PATCH  /api/production/jobs/:id/status
  PATCH  /api/production/steps/:id

Vendors (4):
  GET    /api/vendors
  POST   /api/vendors
  POST   /api/vendors/:id/sync
  GET    /api/vendors/:id/products

Admin (3):
  GET    /api/admin/orders
  GET    /api/admin/orders/:id
  PATCH  /api/admin/orders/:id/status
```

## 🔐 Authentication & Authorization

- JWT-based authentication
- bcryptjs password hashing
- Role-based access control (RBAC):
  - CUSTOMER - End users
  - VENDOR - Supplier accounts
  - ADMIN - System administration
  - STORE_OWNER - Store management
  - PRODUCTION_MANAGER - Order fulfillment

## 💰 Pricing Engine

Dynamic calculation based on:
- Supplier cost
- Quantity breaks
- Color surcharges
- Decoration costs
- Print methods
- Design size

## 🛒 Commerce Flow

1. User creates account
2. Browses products
3. Creates custom design
4. Generates mockups
5. Adds to cart (frozen pricing)
6. Checkout creates order
7. Auto-creates production job
8. Tracks through fulfillment

## 📦 Vendor Integration

Pluggable connector framework supporting:
- CSV imports
- REST APIs
- Custom connectors

Features:
- Product sync
- Inventory updates
- Pricing sync
- Image download

## 🎨 Design System

- Canvas-based design editor
- Asset management (images, clipart, text)
- Design validation against decoration zones
- Export to PNG/SVG
- Automatic mockup generation

## 🖼️ Mockup Engine

- Template-based generation
- Perspective warping
- Mask application
- Caching (30-day expiration)
- Async processing with retries

## 📈 Scaling

Architecture supports:
- Multi-tenant with 1000s of stores
- Unlimited products/variants
- High-throughput order processing
- Horizontal worker scaling
- Database read replicas
- CDN for static content

## 🚀 What's Next (Recommended Order)

1. **UI Implementation** (20-30h)
   - Design editor (Fabric.js)
   - Product catalog UI
   - Cart/checkout UI
   - Admin dashboard

2. **Worker Jobs** (16-20h)
   - Mockup generation
   - Vendor sync
   - Email notifications
   - Webhook processing

3. **Payment Integration** (12-16h)
   - Stripe webhooks
   - Refund handling
   - Checkout flow

4. **File Management** (8-10h)
   - Image uploads (Multer)
   - S3 integration
   - Image processing (Sharp)

5. **Testing** (16-24h)
   - Unit tests for pricing, validation
   - Integration tests for API
   - E2E tests for workflows

## 📚 Documentation

- **[System Inventory](docs/system-inventory.md)** - Complete architecture
- **[API Reference](docs/api.md)** - Endpoint documentation with examples
- **[Feature Status](docs/feature-gap-matrix.md)** - Implementation roadmap
- **[Deployment](docs/deployment.md)** - Production setup guide
- **[Comparison](docs/added-vs-existing.md)** - What was built

## **Deploy: Render + Vercel**
- Render Web Service: import this repo; [render.yaml](render.yaml) auto-configures.
- Backend requirements enforced:
  - Route: `/health` returns `{ status: "ok" }`
  - Server binds `process.env.PORT` on `0.0.0.0`
  - CORS: production allows origins from `CORS_ORIGIN` (comma-separated); dev is permissive and supports credentials; localhost dev origins allowed.
  - Prisma: `prisma generate` (build) and `migrate deploy` (start) when schema exists.
- Render settings:
  - Root Directory: `backend`
  - Build: `npm ci && ( [ -f prisma/schema.prisma ] && npx prisma generate || true ) && ( npm run build || true )`
  - Start: `node dist/index.js` (Render sets `PORT`)
  - Health Check Path: `/health`
  - Env: set `NODE_ENV=production`, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`
- Vercel settings:
  - Root Directory: `frontend`
  - Build: `npm install && npm run build`
  - Output: `dist`
  - Env: `VITE_API_URL=https://<RENDER_URL>`
  - SPA rewrites via [vercel.json](vercel.json)
- Verify:
  - `curl -sSf https://<RENDER_URL>/health | jq`
  - Open `https://<VERCEL_URL>`; in console run `fetch('https://<RENDER_URL>/health').then(r=>r.json()).then(console.log)`
  - Frontend configured via `VITE_API_URL` and app uses `/api` under the base.
  ## **Local Verification**

  - Backend:
    - `cd backend && npm i && npm run dev`
    - `curl http://localhost:3000/health` → `{ "status": "ok" }`

  - Frontend:
    - `cd frontend && npm i`
    - `VITE_API_URL=http://localhost:3000 npm run dev`
    - Browser should load and API calls succeed against `http://localhost:3000/api/*`.
  - If CORS error: ensure `CORS_ORIGIN` includes the exact Vercel domain.
- Helper: `bash scripts/deploy_render_vercel.sh` prints exact settings and env blocks.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js 20 + Express 4 + TypeScript |
| **Frontend** | React 18 + Vite + TypeScript |
| **Database** | PostgreSQL 15+ + Prisma ORM |
| **Queue** | Bull 4 + Redis 6+ |
| **Auth** | JWT + bcryptjs |
| **Styling** | Tailwind CSS + Radix UI |
| **HTTP** | Axios |
| **State** | Zustand |
| **Payments** | Stripe |
| **Storage** | AWS S3 |
| **Email** | SendGrid |
| **Logging** | Winston |

## 📋 Checklist for Production

- [ ] Set up PostgreSQL database
- [ ] Configure Redis server
- [ ] Create AWS S3 bucket
- [ ] Set up Stripe account
- [ ] Configure SendGrid
- [ ] Generate JWT secret
- [ ] Create environment files
- [ ] Run database migrations
- [ ] Configure SSL/HTTPS
- [ ] Set up CI/CD pipeline
- [ ] Configure backups
- [ ] Set up monitoring (Sentry)
- [ ] Configure rate limiting
- [ ] Set up DDoS protection

## 🤝 Contributing

This is a foundation for a production commerce platform. Areas needing development:

- Design canvas UI
- Product catalog frontend
- Admin dashboard UI
- Payment processing
- Email templates
- Image upload handlers
- Worker job implementations

## 📄 License

Proprietary - All rights reserved

## 📧 Support

For questions or issues, refer to the documentation in `/docs` directory.

---

**Built with ❤️ for custom product commerce**

Start time: Feb 1, 2026
Architecture: Enterprise-grade multi-tenant platform
Status: Foundation complete, ready for UI implementation

