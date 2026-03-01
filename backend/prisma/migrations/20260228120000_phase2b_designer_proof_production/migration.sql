-- Phase 2B: designer assets, proof approvals, quote->order conversion metadata, production work-order artifacts

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FileAssetKind') THEN
    CREATE TYPE "FileAssetKind" AS ENUM (
      'DESIGN_UPLOAD',
      'MOCKUP_RENDER',
      'EXPORT_IMAGE',
      'EXPORT_VECTOR',
      'PROOF_PDF',
      'WORK_ORDER_PDF',
      'QR_CODE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProofApprovalStatus') THEN
    CREATE TYPE "ProofApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProofActorType') THEN
    CREATE TYPE "ProofActorType" AS ENUM ('SYSTEM', 'ADMIN', 'CUSTOMER');
  END IF;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "connectionId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceQuoteId" TEXT;

ALTER TABLE "ProductionJob"
  ADD COLUMN IF NOT EXISTS "workOrderFileId" TEXT,
  ADD COLUMN IF NOT EXISTS "workOrderUrl" TEXT;

CREATE TABLE IF NOT EXISTS "FileAsset" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "designId" TEXT,
  "orderId" TEXT,
  "productionJobId" TEXT,
  "kind" "FileAssetKind" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "url" TEXT NOT NULL,
  "sizeBytes" INTEGER,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProofApproval" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "designId" TEXT,
  "mockupId" TEXT,
  "token" TEXT NOT NULL,
  "status" "ProofApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "recipientEmail" TEXT,
  "message" TEXT,
  "expiresAt" TIMESTAMP(3),
  "requestedById" TEXT,
  "respondedAt" TIMESTAMP(3),
  "responseComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProofApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProofApprovalEvent" (
  "id" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "actorType" "ProofActorType" NOT NULL,
  "actorId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProofApprovalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_sourceQuoteId_key" ON "Order"("sourceQuoteId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_connectionId_externalId_key" ON "Order"("connectionId", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProofApproval_token_key" ON "ProofApproval"("token");

CREATE INDEX IF NOT EXISTS "FileAsset_storeId_idx" ON "FileAsset"("storeId");
CREATE INDEX IF NOT EXISTS "FileAsset_designId_idx" ON "FileAsset"("designId");
CREATE INDEX IF NOT EXISTS "FileAsset_orderId_idx" ON "FileAsset"("orderId");
CREATE INDEX IF NOT EXISTS "FileAsset_productionJobId_idx" ON "FileAsset"("productionJobId");
CREATE INDEX IF NOT EXISTS "FileAsset_kind_idx" ON "FileAsset"("kind");

CREATE INDEX IF NOT EXISTS "ProofApproval_storeId_status_idx" ON "ProofApproval"("storeId", "status");
CREATE INDEX IF NOT EXISTS "ProofApproval_orderId_idx" ON "ProofApproval"("orderId");
CREATE INDEX IF NOT EXISTS "ProofApproval_token_idx" ON "ProofApproval"("token");

CREATE INDEX IF NOT EXISTS "ProofApprovalEvent_approvalId_idx" ON "ProofApprovalEvent"("approvalId");
CREATE INDEX IF NOT EXISTS "ProofApprovalEvent_storeId_idx" ON "ProofApprovalEvent"("storeId");
CREATE INDEX IF NOT EXISTS "ProofApprovalEvent_eventType_idx" ON "ProofApprovalEvent"("eventType");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_sourceQuoteId_fkey') THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_sourceQuoteId_fkey"
      FOREIGN KEY ("sourceQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_storeId_fkey') THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_designId_fkey') THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_designId_fkey"
      FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_orderId_fkey') THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_productionJobId_fkey') THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_productionJobId_fkey"
      FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_createdById_fkey') THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApproval_storeId_fkey') THEN
    ALTER TABLE "ProofApproval"
      ADD CONSTRAINT "ProofApproval_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApproval_orderId_fkey') THEN
    ALTER TABLE "ProofApproval"
      ADD CONSTRAINT "ProofApproval_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApproval_designId_fkey') THEN
    ALTER TABLE "ProofApproval"
      ADD CONSTRAINT "ProofApproval_designId_fkey"
      FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApproval_mockupId_fkey') THEN
    ALTER TABLE "ProofApproval"
      ADD CONSTRAINT "ProofApproval_mockupId_fkey"
      FOREIGN KEY ("mockupId") REFERENCES "Mockup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApproval_requestedById_fkey') THEN
    ALTER TABLE "ProofApproval"
      ADD CONSTRAINT "ProofApproval_requestedById_fkey"
      FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApprovalEvent_approvalId_fkey') THEN
    ALTER TABLE "ProofApprovalEvent"
      ADD CONSTRAINT "ProofApprovalEvent_approvalId_fkey"
      FOREIGN KEY ("approvalId") REFERENCES "ProofApproval"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApprovalEvent_storeId_fkey') THEN
    ALTER TABLE "ProofApprovalEvent"
      ADD CONSTRAINT "ProofApprovalEvent_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProofApprovalEvent_actorId_fkey') THEN
    ALTER TABLE "ProofApprovalEvent"
      ADD CONSTRAINT "ProofApprovalEvent_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
