-- Phase 2C: customer portal, checkout sessions, team stores, inventory/purchasing, automations, audit hardening

-- ---------------------------------------------------------------------------
-- Existing tables: additive columns
-- ---------------------------------------------------------------------------

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "actorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "actorType" TEXT,
  ADD COLUMN IF NOT EXISTS "entityType" TEXT,
  ADD COLUMN IF NOT EXISTS "entityId" TEXT,
  ADD COLUMN IF NOT EXISTS "meta" JSONB;

ALTER TABLE "Cart"
  ADD COLUMN IF NOT EXISTS "storeId" TEXT,
  ADD COLUMN IF NOT EXISTS "token" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Cart_token_key" ON "Cart"("token");
CREATE INDEX IF NOT EXISTS "Cart_storeId_idx" ON "Cart"("storeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cart_storeId_fkey') THEN
    ALTER TABLE "Cart"
      ADD CONSTRAINT "Cart_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "CartItem"
  ADD COLUMN IF NOT EXISTS "storeId" TEXT,
  ADD COLUMN IF NOT EXISTS "variantId" TEXT,
  ADD COLUMN IF NOT EXISTS "qty" JSONB,
  ADD COLUMN IF NOT EXISTS "decorationMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "decorationLocations" JSONB,
  ADD COLUMN IF NOT EXISTS "pricingSnapshotData" JSONB;

CREATE INDEX IF NOT EXISTS "CartItem_storeId_idx" ON "CartItem"("storeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CartItem_storeId_fkey') THEN
    ALTER TABLE "CartItem"
      ADD CONSTRAINT "CartItem_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "publicToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_publicToken_key" ON "Order"("publicToken");
CREATE INDEX IF NOT EXISTS "Order_publicToken_idx" ON "Order"("publicToken");

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "externalId" TEXT,
  "connectionId" TEXT,
  "storeId" TEXT,
  "vendorId" TEXT,
  "status" TEXT DEFAULT 'DRAFT',
  "total" DOUBLE PRECISION DEFAULT 0,
  "rawJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_connectionId_externalId_key" ON "PurchaseOrder"("connectionId", "externalId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_storeId_idx" ON "PurchaseOrder"("storeId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

ALTER TABLE "PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "supplierName" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_storeId_fkey') THEN
    ALTER TABLE "PurchaseOrder"
      ADD CONSTRAINT "PurchaseOrder_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- New enum types
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CheckoutSessionStatus') THEN
    CREATE TYPE "CheckoutSessionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Storefront / content tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Storefront" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "theme" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Storefront_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Collection" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "storefrontId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollectionProduct" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "collectionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Page" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "storefrontId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sections" JSONB,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Storefront_storeId_slug_key" ON "Storefront"("storeId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Collection_storeId_storefrontId_slug_key" ON "Collection"("storeId", "storefrontId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "CollectionProduct_storeId_collectionId_productId_key" ON "CollectionProduct"("storeId", "collectionId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "Page_storeId_storefrontId_slug_key" ON "Page"("storeId", "storefrontId", "slug");

CREATE INDEX IF NOT EXISTS "Storefront_storeId_idx" ON "Storefront"("storeId");
CREATE INDEX IF NOT EXISTS "Collection_storeId_idx" ON "Collection"("storeId");
CREATE INDEX IF NOT EXISTS "Collection_storefrontId_idx" ON "Collection"("storefrontId");
CREATE INDEX IF NOT EXISTS "CollectionProduct_storeId_idx" ON "CollectionProduct"("storeId");
CREATE INDEX IF NOT EXISTS "CollectionProduct_collectionId_idx" ON "CollectionProduct"("collectionId");
CREATE INDEX IF NOT EXISTS "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");
CREATE INDEX IF NOT EXISTS "Page_storeId_idx" ON "Page"("storeId");
CREATE INDEX IF NOT EXISTS "Page_storefrontId_idx" ON "Page"("storefrontId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Storefront_storeId_fkey') THEN
    ALTER TABLE "Storefront"
      ADD CONSTRAINT "Storefront_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Collection_storeId_fkey') THEN
    ALTER TABLE "Collection"
      ADD CONSTRAINT "Collection_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Collection_storefrontId_fkey') THEN
    ALTER TABLE "Collection"
      ADD CONSTRAINT "Collection_storefrontId_fkey"
      FOREIGN KEY ("storefrontId") REFERENCES "Storefront"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionProduct_storeId_fkey') THEN
    ALTER TABLE "CollectionProduct"
      ADD CONSTRAINT "CollectionProduct_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionProduct_collectionId_fkey') THEN
    ALTER TABLE "CollectionProduct"
      ADD CONSTRAINT "CollectionProduct_collectionId_fkey"
      FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionProduct_productId_fkey') THEN
    ALTER TABLE "CollectionProduct"
      ADD CONSTRAINT "CollectionProduct_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Page_storeId_fkey') THEN
    ALTER TABLE "Page"
      ADD CONSTRAINT "Page_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Page_storefrontId_fkey') THEN
    ALTER TABLE "Page"
      ADD CONSTRAINT "Page_storefrontId_fkey"
      FOREIGN KEY ("storefrontId") REFERENCES "Storefront"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Checkout session table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CheckoutSession" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'PENDING',
  "customerEmail" TEXT NOT NULL,
  "shippingAddress" JSONB NOT NULL,
  "billingAddress" JSONB,
  "totals" JSONB NOT NULL,
  "paymentProvider" TEXT NOT NULL DEFAULT 'NONE',
  "providerRef" TEXT,
  "orderId" TEXT,
  "token" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutSession_token_key" ON "CheckoutSession"("token");
CREATE INDEX IF NOT EXISTS "CheckoutSession_storeId_idx" ON "CheckoutSession"("storeId");
CREATE INDEX IF NOT EXISTS "CheckoutSession_cartId_idx" ON "CheckoutSession"("cartId");
CREATE INDEX IF NOT EXISTS "CheckoutSession_status_idx" ON "CheckoutSession"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CheckoutSession_storeId_fkey') THEN
    ALTER TABLE "CheckoutSession"
      ADD CONSTRAINT "CheckoutSession_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CheckoutSession_cartId_fkey') THEN
    ALTER TABLE "CheckoutSession"
      ADD CONSTRAINT "CheckoutSession_cartId_fkey"
      FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CheckoutSession_orderId_fkey') THEN
    ALTER TABLE "CheckoutSession"
      ADD CONSTRAINT "CheckoutSession_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Team/Fundraiser store tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "TeamStore" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "closeAt" TIMESTAMP(3),
  "minOrderQty" INTEGER,
  "fundraiserPercent" DOUBLE PRECISION,
  "groupShipping" BOOLEAN NOT NULL DEFAULT false,
  "theme" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamStore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Roster" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "teamStoreId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "number" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PersonalizationField" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "teamStoreId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "options" JSONB,
  "required" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PersonalizationField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamStoreOrderMeta" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "teamStoreId" TEXT NOT NULL,
  "rosterEntryId" TEXT,
  "personalization" JSONB,
  CONSTRAINT "TeamStoreOrderMeta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamStore_storeId_slug_key" ON "TeamStore"("storeId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "PersonalizationField_teamStoreId_key_key" ON "PersonalizationField"("teamStoreId", "key");

CREATE INDEX IF NOT EXISTS "TeamStore_storeId_idx" ON "TeamStore"("storeId");
CREATE INDEX IF NOT EXISTS "TeamStore_status_idx" ON "TeamStore"("status");
CREATE INDEX IF NOT EXISTS "Roster_storeId_idx" ON "Roster"("storeId");
CREATE INDEX IF NOT EXISTS "Roster_teamStoreId_idx" ON "Roster"("teamStoreId");
CREATE INDEX IF NOT EXISTS "PersonalizationField_storeId_idx" ON "PersonalizationField"("storeId");
CREATE INDEX IF NOT EXISTS "PersonalizationField_teamStoreId_idx" ON "PersonalizationField"("teamStoreId");
CREATE INDEX IF NOT EXISTS "TeamStoreOrderMeta_storeId_idx" ON "TeamStoreOrderMeta"("storeId");
CREATE INDEX IF NOT EXISTS "TeamStoreOrderMeta_orderId_idx" ON "TeamStoreOrderMeta"("orderId");
CREATE INDEX IF NOT EXISTS "TeamStoreOrderMeta_teamStoreId_idx" ON "TeamStoreOrderMeta"("teamStoreId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamStore_storeId_fkey') THEN
    ALTER TABLE "TeamStore"
      ADD CONSTRAINT "TeamStore_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Roster_storeId_fkey') THEN
    ALTER TABLE "Roster"
      ADD CONSTRAINT "Roster_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Roster_teamStoreId_fkey') THEN
    ALTER TABLE "Roster"
      ADD CONSTRAINT "Roster_teamStoreId_fkey"
      FOREIGN KEY ("teamStoreId") REFERENCES "TeamStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PersonalizationField_storeId_fkey') THEN
    ALTER TABLE "PersonalizationField"
      ADD CONSTRAINT "PersonalizationField_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PersonalizationField_teamStoreId_fkey') THEN
    ALTER TABLE "PersonalizationField"
      ADD CONSTRAINT "PersonalizationField_teamStoreId_fkey"
      FOREIGN KEY ("teamStoreId") REFERENCES "TeamStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamStoreOrderMeta_storeId_fkey') THEN
    ALTER TABLE "TeamStoreOrderMeta"
      ADD CONSTRAINT "TeamStoreOrderMeta_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamStoreOrderMeta_orderId_fkey') THEN
    ALTER TABLE "TeamStoreOrderMeta"
      ADD CONSTRAINT "TeamStoreOrderMeta_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamStoreOrderMeta_teamStoreId_fkey') THEN
    ALTER TABLE "TeamStoreOrderMeta"
      ADD CONSTRAINT "TeamStoreOrderMeta_teamStoreId_fkey"
      FOREIGN KEY ("teamStoreId") REFERENCES "TeamStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamStoreOrderMeta_rosterEntryId_fkey') THEN
    ALTER TABLE "TeamStoreOrderMeta"
      ADD CONSTRAINT "TeamStoreOrderMeta_rosterEntryId_fkey"
      FOREIGN KEY ("rosterEntryId") REFERENCES "Roster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Inventory and purchasing tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "warehouseId" TEXT,
  "qtyOnHand" INTEGER NOT NULL DEFAULT 0,
  "qtyReserved" INTEGER NOT NULL DEFAULT 0,
  "reorderPoint" INTEGER,
  "reorderQty" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "inventoryItemId" TEXT,
  "type" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "refType" TEXT NOT NULL,
  "refId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "qtyOrdered" INTEGER NOT NULL,
  "qtyReceived" INTEGER NOT NULL DEFAULT 0,
  "costEach" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_storeId_variantId_warehouseId_key" ON "InventoryItem"("storeId", "variantId", "warehouseId");
CREATE INDEX IF NOT EXISTS "InventoryItem_storeId_idx" ON "InventoryItem"("storeId");
CREATE INDEX IF NOT EXISTS "InventoryItem_variantId_idx" ON "InventoryItem"("variantId");

CREATE INDEX IF NOT EXISTS "StockMovement_storeId_idx" ON "StockMovement"("storeId");
CREATE INDEX IF NOT EXISTS "StockMovement_variantId_idx" ON "StockMovement"("variantId");
CREATE INDEX IF NOT EXISTS "StockMovement_type_idx" ON "StockMovement"("type");

CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_storeId_idx" ON "PurchaseOrderLine"("storeId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_variantId_idx" ON "PurchaseOrderLine"("variantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_storeId_fkey') THEN
    ALTER TABLE "InventoryItem"
      ADD CONSTRAINT "InventoryItem_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_variantId_fkey') THEN
    ALTER TABLE "InventoryItem"
      ADD CONSTRAINT "InventoryItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_storeId_fkey') THEN
    ALTER TABLE "StockMovement"
      ADD CONSTRAINT "StockMovement_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_variantId_fkey') THEN
    ALTER TABLE "StockMovement"
      ADD CONSTRAINT "StockMovement_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_inventoryItemId_fkey') THEN
    ALTER TABLE "StockMovement"
      ADD CONSTRAINT "StockMovement_inventoryItemId_fkey"
      FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrderLine_storeId_fkey') THEN
    ALTER TABLE "PurchaseOrderLine"
      ADD CONSTRAINT "PurchaseOrderLine_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrderLine_purchaseOrderId_fkey') THEN
    ALTER TABLE "PurchaseOrderLine"
      ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey"
      FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrderLine_variantId_fkey') THEN
    ALTER TABLE "PurchaseOrderLine"
      ADD CONSTRAINT "PurchaseOrderLine_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Webhook endpoint/delivery tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "eventTypes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "webhookEndpointId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebhookEndpoint_storeId_idx" ON "WebhookEndpoint"("storeId");
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_enabled_idx" ON "WebhookEndpoint"("enabled");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_storeId_idx" ON "WebhookDelivery"("storeId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookEndpointId_idx" ON "WebhookDelivery"("webhookEndpointId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_eventType_idx" ON "WebhookDelivery"("eventType");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookEndpoint_storeId_fkey') THEN
    ALTER TABLE "WebhookEndpoint"
      ADD CONSTRAINT "WebhookEndpoint_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_storeId_fkey') THEN
    ALTER TABLE "WebhookDelivery"
      ADD CONSTRAINT "WebhookDelivery_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_webhookEndpointId_fkey') THEN
    ALTER TABLE "WebhookDelivery"
      ADD CONSTRAINT "WebhookDelivery_webhookEndpointId_fkey"
      FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
