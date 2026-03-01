-- Phase 12: inventory + purchasing + reservations for production v2

DO $$ BEGIN
  CREATE TYPE "ProductionInventoryStatus" AS ENUM ('NOT_CHECKED', 'OK', 'LOW_STOCK', 'NOT_MAPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryLocationType" AS ENUM ('WAREHOUSE', 'SHELF', 'BIN', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryLedgerType" AS ENUM ('ADJUSTMENT', 'RECEIPT', 'ISSUE', 'RESERVE', 'RELEASE', 'CONSUME', 'TRANSFER_IN', 'TRANSFER_OUT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryRefType" AS ENUM ('PO', 'BATCH', 'ORDER', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryReservationStatus" AS ENUM ('HELD', 'FULFILLED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ProductionBatch"
  ADD COLUMN IF NOT EXISTS "inventoryStatus" "ProductionInventoryStatus" NOT NULL DEFAULT 'NOT_CHECKED';

CREATE TABLE IF NOT EXISTS "InventoryLocation" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "InventoryLocationType" NOT NULL DEFAULT 'WAREHOUSE',
  "address" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InventorySku" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "skuCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'each',
  "supplierSku" TEXT,
  "defaultReorderPoint" INTEGER,
  "defaultReorderQty" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InventoryStock" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "onHand" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InventoryLedgerEntry" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "locationId" TEXT,
  "skuId" TEXT NOT NULL,
  "type" "InventoryLedgerType" NOT NULL,
  "qty" INTEGER NOT NULL,
  "refType" "InventoryRefType" NOT NULL,
  "refId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InventoryReservation" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "locationId" TEXT,
  "batchId" TEXT,
  "orderId" TEXT,
  "qty" INTEGER NOT NULL,
  "status" "InventoryReservationStatus" NOT NULL DEFAULT 'HELD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fulfilledAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "ProductMaterialMap" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "skuId" TEXT NOT NULL,
  "qtyPerUnit" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);

ALTER TABLE "PurchaseOrderLine"
  ADD COLUMN IF NOT EXISTS "skuId" TEXT,
  ADD COLUMN IF NOT EXISTS "unitCostCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "expectedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "variantId" DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryLocation_storeId_code_key" ON "InventoryLocation"("storeId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "InventorySku_storeId_skuCode_key" ON "InventorySku"("storeId", "skuCode");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryStock_locationId_skuId_key" ON "InventoryStock"("locationId", "skuId");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryReservation_batchId_skuId_key" ON "InventoryReservation"("batchId", "skuId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductMaterialMap_storeId_productId_variantId_skuId_key" ON "ProductMaterialMap"("storeId", "productId", "variantId", "skuId");

CREATE INDEX IF NOT EXISTS "InventoryLocation_storeId_idx" ON "InventoryLocation"("storeId");
CREATE INDEX IF NOT EXISTS "InventorySku_storeId_idx" ON "InventorySku"("storeId");
CREATE INDEX IF NOT EXISTS "InventoryStock_storeId_skuId_idx" ON "InventoryStock"("storeId", "skuId");
CREATE INDEX IF NOT EXISTS "InventoryStock_storeId_locationId_idx" ON "InventoryStock"("storeId", "locationId");
CREATE INDEX IF NOT EXISTS "InventoryLedgerEntry_storeId_skuId_createdAt_idx" ON "InventoryLedgerEntry"("storeId", "skuId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryLedgerEntry_refType_refId_idx" ON "InventoryLedgerEntry"("refType", "refId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_storeId_skuId_idx" ON "InventoryReservation"("storeId", "skuId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_batchId_idx" ON "InventoryReservation"("batchId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_status_idx" ON "InventoryReservation"("status");
CREATE INDEX IF NOT EXISTS "ProductMaterialMap_storeId_productId_idx" ON "ProductMaterialMap"("storeId", "productId");
CREATE INDEX IF NOT EXISTS "ProductMaterialMap_variantId_idx" ON "ProductMaterialMap"("variantId");
CREATE INDEX IF NOT EXISTS "ProductMaterialMap_skuId_idx" ON "ProductMaterialMap"("skuId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_skuId_idx" ON "PurchaseOrderLine"("skuId");

DO $$ BEGIN
  ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InventorySku" ADD CONSTRAINT "InventorySku_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "InventorySku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "InventorySku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "InventorySku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductMaterialMap" ADD CONSTRAINT "ProductMaterialMap_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductMaterialMap" ADD CONSTRAINT "ProductMaterialMap_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductMaterialMap" ADD CONSTRAINT "ProductMaterialMap_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductMaterialMap" ADD CONSTRAINT "ProductMaterialMap_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "InventorySku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "InventorySku"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
