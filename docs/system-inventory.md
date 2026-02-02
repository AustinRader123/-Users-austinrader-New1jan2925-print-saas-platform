# DecoNetwork System Inventory

**Generated:** February 1, 2026

## Overview

DecoNetwork is a complete custom product commerce and production platform built from scratch with enterprise-grade architecture.

## Backend Architecture

### Framework & API
- **Framework:** Express.js (Node.js)
- **Language:** TypeScript
- **API Structure:** RESTful with modular route handlers
- **Request/Response:** JSON
- **Async Handling:** Express async errors with error middleware

### Database
- **Primary:** PostgreSQL
- **ORM:** Prisma
- **Schema:** Comprehensive multi-tenant design
- **Models:** 40+ interconnected entities

### Authentication & Security
- **Auth Method:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs
- **Middleware:** Custom auth + role-based access control (RBAC)
- **Roles:** CUSTOMER, VENDOR, ADMIN, STORE_OWNER, PRODUCTION_MANAGER

### File Storage
- **Primary:** AWS S3 (configurable)
- **File Types:** Images (JPEG, PNG, WebP, SVG), Designs
- **Folders:** mockups/, designs/
- **Local Dev:** Fallback support

### Queue System
- **Technology:** Bull (with Redis)
- **Jobs:** Vendor sync, mockup generation, email notifications
- **Retry Logic:** Automatic with configurable backoff

### Payment Processing
- **Primary:** Stripe
- **Alternative:** PayPal, Cash on Delivery (COD)
- **Currency:** USD (extensible)

### Email
- **Service:** SendGrid
- **Event Types:** Order confirmations, design ready, shipping notifications

### Third-party Integrations
- **Vendor APIs:** Pluggable connectors (CSV, API, custom)
- **Shipping:** Integration points prepared
- **CRM:** Framework ready

## Frontend Architecture

### Framework & Tooling
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **Package Manager:** npm

### State Management
- **Library:** Zustand
- **Stores:** authStore, cartStore
- **Pattern:** Minimal, functional

### UI & Styling
- **CSS Framework:** Tailwind CSS
- **Components:** Custom components + Radix UI
- **Icons:** Lucide React
- **Toast Notifications:** React Hot Toast
- **Animations:** Framer Motion

### API Communication
- **HTTP Client:** Axios
- **Interceptors:** Automatic token injection
- **Error Handling:** Centralized

### Features Available
- Login/Register
- Product browsing
- Design creation
- Shopping cart
- Checkout flow
- Order management
- Production dashboard

## Database Schema - Key Models

### Core Entities
- **Users:** Authentication, roles, profiles
- **Stores:** Multi-tenant support with themes
- **Teams:** Organizational units

### Products & Variants
- **Product:** Base product with metadata
- **ProductVariant:** Size/color/brand combinations
- **DecorationArea:** Print locations with cost rules
- **ProductImage:** Product gallery

### Design System
- **Design:** User-created designs with canvas state
- **DesignAsset:** Referenced images, clipart, text
- **Mockup:** Generated previews
- **MockupTemplate:** Base images for mockup generation

### Vendors & Suppliers
- **Vendor:** Third-party supplier management
- **VendorProduct:** Catalog items from vendors
- **VendorProductVariant:** Supplier variant mappings
- **VendorSyncJob:** Background sync tracking

### Commerce Flow
- **Cart:** Shopping cart with session support
- **CartItem:** Individual items with pricing snapshots
- **PricingRule:** Dynamic pricing configurations
- **PricingSnapshot:** Frozen pricing at cart time
- **Order:** Complete order records
- **OrderItem:** Order line items

### Production & Fulfillment
- **ProductionJob:** Order-to-production mapping
- **ProductionStep:** Multi-step workflow tracking
- **Shipment:** Delivery tracking

### Supporting
- **Payment:** Transaction records
- **Invoice:** PDF + metadata
- **ApiKey:** API access for vendors
- **Notification:** User notifications
- **CustomPage:** CMS pages per store
- **WebhookLog:** Integration audit trail

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user profile

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `POST /api/products/:id/variants` - Add variant
- `POST /api/products/:id/decoration-areas` - Add decoration zone

### Designs
- `POST /api/designs` - Create design
- `GET /api/designs` - List user designs
- `GET /api/designs/:id` - Get design
- `PUT /api/designs/:id` - Update design
- `POST /api/designs/:id/validate` - Validate design
- `POST /api/designs/:id/export` - Export to PNG/SVG
- `POST /api/designs/:id/generate-mockups` - Generate previews
- `GET /api/designs/:id/mockups` - Get generated mockups

### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart/items` - Add to cart
- `PUT /api/cart/items/:id` - Update quantity
- `DELETE /api/cart/items/:id` - Remove item
- `POST /api/cart/:id/abandon` - Abandon cart

### Pricing
- `POST /api/pricing/preview` - Calculate price

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details

### Production (Admin)
- `GET /api/production/jobs` - List jobs
- `GET /api/production/jobs/:id` - Get job details
- `GET /api/production/kanban` - Kanban view
- `PATCH /api/production/jobs/:id/status` - Update job status
- `PATCH /api/production/steps/:id` - Update step status

### Vendors (Admin)
- `GET /api/vendors` - List vendors
- `POST /api/vendors` - Create vendor
- `POST /api/vendors/:id/sync` - Trigger sync
- `GET /api/vendors/:id/products` - Get vendor products

### Admin
- `GET /api/admin/orders` - List all orders
- `PATCH /api/admin/orders/:id/status` - Update order status

## Features Implemented

✅ **Phase 1 - System Architecture**
- Full database schema
- Backend server structure
- Frontend React app
- API documentation

✅ **Phase 2 - Product & Vendor System**
- Product models with variants
- Decoration area definitions
- Vendor management framework
- Connector architecture (CSV, API)
- Background job system

✅ **Phase 3 - Design System**
- Design creation and editing
- Asset management (images, clipart)
- Design validation
- Export capabilities

✅ **Phase 4 - Mockup Engine**
- Mockup generation pipeline
- Template system
- Caching & expiration
- Status tracking

✅ **Phase 5 - Pricing Engine**
- Dynamic price calculation
- Quantity break pricing
- Color surcharges
- Decoration cost estimation
- Frozen pricing snapshots

✅ **Phase 6 - eCommerce**
- Shopping cart with sessions
- Cart item management
- Design + variant combinations
- Cart abandonment tracking

✅ **Phase 7 - Orders & Production**
- Order creation workflow
- Order-to-production mapping
- Multi-step production workflow
- Shipment tracking

✅ **Phase 8 - Multi-store System**
- Multi-tenant architecture
- Store ownership
- Custom domains
- Per-store configurations

✅ **Phase 9 - Admin Dashboard**
- Admin routes and protections
- Order management
- Production Kanban view
- Vendor management

✅ **Phase 10 - Integration Framework**
- Webhook logging
- API key management
- Email notifications ready
- Vendor connector framework

✅ **Phase 11 - Frontend**
- React app with routing
- Auth flows
- Navigation
- Page structure

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend | Node.js + Express | 20.x LTS / 4.18.2 |
| Frontend | React + TypeScript | 18.2 / 5.3 |
| Database | PostgreSQL + Prisma | 15+ / 5.7 |
| Queue | Bull + Redis | 4.13 / 6+ |
| Auth | JWT + bcrypt | - / 2.4 |
| Payments | Stripe | 13.11 |
| Storage | AWS S3 | SDK 2.1566 |
| Email | SendGrid | 8.1 |
| Styling | Tailwind CSS | 3.3 |
| Build | Vite + TypeScript | 5.0 / 5.3 |

## Environment Setup Required

- PostgreSQL database
- Redis server (for queues)
- AWS S3 account (or local storage for dev)
- Stripe account (optional)
- SendGrid account (optional)
- Node.js 18+

## Notes

- System is production-ready with proper error handling, logging, and security
- All services are modular and can be toggled independently
- Database schema supports horizontal scaling with tenant isolation
- API follows REST conventions with consistent response formats
- Frontend uses modern React patterns with hooks and stores
