-- Phase 11: production v2 shop-floor workflow

DO $$ BEGIN
  CREATE TYPE "ProductionBatchSourceType" AS ENUM ('ORDER', 'BULK_ORDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductionBatchMethod" AS ENUM ('DTF', 'EMBROIDERY', 'SCREEN', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductionBatchStage" AS ENUM ('ART', 'APPROVED', 'PRINT', 'CURE', 'PACK', 'SHIP', 'COMPLETE', 'HOLD', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductionBatchPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'RUSH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductionBatchEventType" AS ENUM ('CREATED', 'STAGE_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'NOTE', 'EXPORT', 'TICKET_PRINTED', 'SHIPPED', 'COMPLETED', 'HOLD', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductionAssignmentRole" AS ENUM ('OPERATOR', 'LEAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProductionBatch" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "networkId" TEXT,
  "fulfillmentStoreId" TEXT,
  "sourceType" "ProductionBatchSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "method" "ProductionBatchMethod" NOT NULL DEFAULT 'DTF',
  "stage" "ProductionBatchStage" NOT NULL DEFAULT 'ART',
  "priority" "ProductionBatchPriority" NOT NULL DEFAULT 'NORMAL',
  "dueAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductionBatchItem" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "orderId" TEXT,
  "bulkOrderId" TEXT,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "designId" TEXT,
  "location" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "personalizationSummary" JSONB,
  "assetRef" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductionBatchEvent" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "type" "ProductionBatchEventType" NOT NULL,
  "fromStage" "ProductionBatchStage",
  "toStage" "ProductionBatchStage",
  "actorUserId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductionAssignment" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ProductionAssignmentRole" NOT NULL DEFAULT 'OPERATOR',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "ProductionScanToken" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductionScanToken_token_key" ON "ProductionScanToken"("token");

CREATE INDEX IF NOT EXISTS "ProductionBatch_storeId_idx" ON "ProductionBatch"("storeId");
CREATE INDEX IF NOT EXISTS "ProductionBatch_networkId_idx" ON "ProductionBatch"("networkId");
CREATE INDEX IF NOT EXISTS "ProductionBatch_fulfillmentStoreId_idx" ON "ProductionBatch"("fulfillmentStoreId");
CREATE INDEX IF NOT EXISTS "ProductionBatch_sourceType_sourceId_idx" ON "ProductionBatch"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "ProductionBatch_stage_idx" ON "ProductionBatch"("stage");
CREATE INDEX IF NOT EXISTS "ProductionBatch_method_idx" ON "ProductionBatch"("method");
CREATE INDEX IF NOT EXISTS "ProductionBatch_dueAt_idx" ON "ProductionBatch"("dueAt");

CREATE INDEX IF NOT EXISTS "ProductionBatchItem_batchId_idx" ON "ProductionBatchItem"("batchId");
CREATE INDEX IF NOT EXISTS "ProductionBatchItem_orderId_idx" ON "ProductionBatchItem"("orderId");
CREATE INDEX IF NOT EXISTS "ProductionBatchItem_bulkOrderId_idx" ON "ProductionBatchItem"("bulkOrderId");
CREATE INDEX IF NOT EXISTS "ProductionBatchItem_productId_idx" ON "ProductionBatchItem"("productId");
CREATE INDEX IF NOT EXISTS "ProductionBatchItem_variantId_idx" ON "ProductionBatchItem"("variantId");
CREATE INDEX IF NOT EXISTS "ProductionBatchItem_designId_idx" ON "ProductionBatchItem"("designId");

CREATE INDEX IF NOT EXISTS "ProductionBatchEvent_batchId_idx" ON "ProductionBatchEvent"("batchId");
CREATE INDEX IF NOT EXISTS "ProductionBatchEvent_type_idx" ON "ProductionBatchEvent"("type");
CREATE INDEX IF NOT EXISTS "ProductionBatchEvent_createdAt_idx" ON "ProductionBatchEvent"("createdAt");

CREATE INDEX IF NOT EXISTS "ProductionAssignment_batchId_idx" ON "ProductionAssignment"("batchId");
CREATE INDEX IF NOT EXISTS "ProductionAssignment_userId_idx" ON "ProductionAssignment"("userId");
CREATE INDEX IF NOT EXISTS "ProductionAssignment_releasedAt_idx" ON "ProductionAssignment"("releasedAt");

CREATE INDEX IF NOT EXISTS "ProductionScanToken_batchId_idx" ON "ProductionScanToken"("batchId");

DO $$ BEGIN
  ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_fulfillmentStoreId_fkey" FOREIGN KEY ("fulfillmentStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductionBatchItem" ADD CONSTRAINT "ProductionBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchItem" ADD CONSTRAINT "ProductionBatchItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchItem" ADD CONSTRAINT "ProductionBatchItem_bulkOrderId_fkey" FOREIGN KEY ("bulkOrderId") REFERENCES "FundraiserConsolidationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchItem" ADD CONSTRAINT "ProductionBatchItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchItem" ADD CONSTRAINT "ProductionBatchItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchItem" ADD CONSTRAINT "ProductionBatchItem_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductionBatchEvent" ADD CONSTRAINT "ProductionBatchEvent_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchEvent" ADD CONSTRAINT "ProductionBatchEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductionScanToken" ADD CONSTRAINT "ProductionScanToken_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
