-- Phase 9: multi-store network layer (shared catalog, routing, royalties)

DO $$ BEGIN
  CREATE TYPE "NetworkStoreRole" AS ENUM ('OWNER', 'HUB', 'SPOKE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NetworkStoreStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NetworkUserRoleType" AS ENUM ('NETWORK_ADMIN', 'NETWORK_VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SharedCatalogItemType" AS ENUM ('PRODUCT', 'PRICING_RULE_SET', 'ARTWORK_CATEGORY', 'ARTWORK_ASSET', 'THEME_TEMPLATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StoreCatalogBindingStatus" AS ENUM ('APPLIED', 'OVERRIDDEN', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoutingStrategy" AS ENUM ('MANUAL', 'GEO', 'CAPACITY', 'PRIORITY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoutedOrderStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoyaltyBasis" AS ENUM ('REVENUE', 'PROFIT', 'DECORATION_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoyaltyLedgerStatus" AS ENUM ('ACCRUED', 'INVOICED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fulfillmentStoreId" TEXT;

CREATE TABLE IF NOT EXISTS "Network" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NetworkStore" (
  "id" TEXT PRIMARY KEY,
  "networkId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "role" "NetworkStoreRole" NOT NULL DEFAULT 'SPOKE',
  "status" "NetworkStoreStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NetworkUserRole" (
  "id" TEXT PRIMARY KEY,
  "networkId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "NetworkUserRoleType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SharedCatalogItem" (
  "id" TEXT PRIMARY KEY,
  "networkId" TEXT NOT NULL,
  "type" "SharedCatalogItemType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StoreCatalogBinding" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "sharedCatalogItemId" TEXT NOT NULL,
  "status" "StoreCatalogBindingStatus" NOT NULL DEFAULT 'APPLIED',
  "overrideData" JSONB,
  "appliedVersion" INTEGER NOT NULL DEFAULT 0,
  "appliedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FulfillmentRoutingRule" (
  "id" TEXT PRIMARY KEY,
  "networkId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "strategy" "RoutingStrategy" NOT NULL DEFAULT 'MANUAL',
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RoutedOrder" (
  "id" TEXT PRIMARY KEY,
  "networkId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStoreId" TEXT NOT NULL,
  "toStoreId" TEXT NOT NULL,
  "status" "RoutedOrderStatus" NOT NULL DEFAULT 'PROPOSED',
  "routingReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RoyaltyRule" (
  "id" TEXT PRIMARY KEY,
  "networkId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "basis" "RoyaltyBasis" NOT NULL DEFAULT 'REVENUE',
  "ratePercent" DOUBLE PRECISION,
  "flatCents" INTEGER,
  "appliesTo" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RoyaltyLedgerEntry" (
  "id" TEXT PRIMARY KEY,
  "networkId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStoreId" TEXT NOT NULL,
  "toStoreId" TEXT NOT NULL,
  "revenueCents" INTEGER NOT NULL,
  "costCents" INTEGER NOT NULL,
  "royaltyCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "RoyaltyLedgerStatus" NOT NULL DEFAULT 'ACCRUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "NetworkStore_networkId_storeId_key" ON "NetworkStore"("networkId", "storeId");
CREATE INDEX IF NOT EXISTS "NetworkStore_storeId_idx" ON "NetworkStore"("storeId");
CREATE INDEX IF NOT EXISTS "NetworkStore_networkId_role_status_idx" ON "NetworkStore"("networkId", "role", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "NetworkUserRole_networkId_userId_role_key" ON "NetworkUserRole"("networkId", "userId", "role");
CREATE INDEX IF NOT EXISTS "NetworkUserRole_userId_idx" ON "NetworkUserRole"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "SharedCatalogItem_networkId_type_sourceId_key" ON "SharedCatalogItem"("networkId", "type", "sourceId");
CREATE INDEX IF NOT EXISTS "SharedCatalogItem_networkId_type_idx" ON "SharedCatalogItem"("networkId", "type");

CREATE UNIQUE INDEX IF NOT EXISTS "StoreCatalogBinding_storeId_sharedCatalogItemId_key" ON "StoreCatalogBinding"("storeId", "sharedCatalogItemId");
CREATE INDEX IF NOT EXISTS "StoreCatalogBinding_sharedCatalogItemId_idx" ON "StoreCatalogBinding"("sharedCatalogItemId");
CREATE INDEX IF NOT EXISTS "StoreCatalogBinding_storeId_status_idx" ON "StoreCatalogBinding"("storeId", "status");

CREATE INDEX IF NOT EXISTS "FulfillmentRoutingRule_networkId_enabled_idx" ON "FulfillmentRoutingRule"("networkId", "enabled");

CREATE UNIQUE INDEX IF NOT EXISTS "RoutedOrder_orderId_key" ON "RoutedOrder"("orderId");
CREATE INDEX IF NOT EXISTS "RoutedOrder_networkId_status_idx" ON "RoutedOrder"("networkId", "status");
CREATE INDEX IF NOT EXISTS "RoutedOrder_fromStoreId_idx" ON "RoutedOrder"("fromStoreId");
CREATE INDEX IF NOT EXISTS "RoutedOrder_toStoreId_idx" ON "RoutedOrder"("toStoreId");

CREATE INDEX IF NOT EXISTS "RoyaltyRule_networkId_enabled_idx" ON "RoyaltyRule"("networkId", "enabled");

CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_networkId_createdAt_idx" ON "RoyaltyLedgerEntry"("networkId", "createdAt");
CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_orderId_idx" ON "RoyaltyLedgerEntry"("orderId");
CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_fromStoreId_idx" ON "RoyaltyLedgerEntry"("fromStoreId");
CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_toStoreId_idx" ON "RoyaltyLedgerEntry"("toStoreId");

CREATE INDEX IF NOT EXISTS "Order_fulfillmentStoreId_idx" ON "Order"("fulfillmentStoreId");

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfillmentStoreId_fkey" FOREIGN KEY ("fulfillmentStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Network" ADD CONSTRAINT "Network_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "NetworkStore" ADD CONSTRAINT "NetworkStore_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "NetworkStore" ADD CONSTRAINT "NetworkStore_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "NetworkUserRole" ADD CONSTRAINT "NetworkUserRole_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "NetworkUserRole" ADD CONSTRAINT "NetworkUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SharedCatalogItem" ADD CONSTRAINT "SharedCatalogItem_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StoreCatalogBinding" ADD CONSTRAINT "StoreCatalogBinding_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "StoreCatalogBinding" ADD CONSTRAINT "StoreCatalogBinding_sharedCatalogItemId_fkey" FOREIGN KEY ("sharedCatalogItemId") REFERENCES "SharedCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FulfillmentRoutingRule" ADD CONSTRAINT "FulfillmentRoutingRule_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RoutedOrder" ADD CONSTRAINT "RoutedOrder_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RoutedOrder" ADD CONSTRAINT "RoutedOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RoutedOrder" ADD CONSTRAINT "RoutedOrder_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RoutedOrder" ADD CONSTRAINT "RoutedOrder_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RoyaltyRule" ADD CONSTRAINT "RoyaltyRule_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
