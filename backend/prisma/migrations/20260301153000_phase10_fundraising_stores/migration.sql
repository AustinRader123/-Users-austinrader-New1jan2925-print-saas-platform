-- Phase 10: fundraising campaigns, consolidation, payout ledger, attribution

DO $$ BEGIN
  CREATE TYPE "FundraiserCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignShippingMode" AS ENUM ('DIRECT', 'CONSOLIDATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FundraiserConsolidationStatus" AS ENUM ('CREATED', 'LOCKED', 'RELEASED', 'COMPLETED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FundraiserPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'VOID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FundraiserPayoutDirection" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "fundraiserCampaignId" TEXT;
ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "fundraiserMemberId" TEXT;
ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "fundraiserTeamStoreId" TEXT;

ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "fundraiserCampaignId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "fundraiserMemberId" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fundraiserCampaignId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fundraiserMemberId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fundraiserTeamStoreId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fundraiserAmountCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "FundraiserCampaign" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "networkId" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "FundraiserCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "fundraisingGoalCents" INTEGER,
  "defaultFundraiserPercent" DOUBLE PRECISION,
  "shippingMode" "CampaignShippingMode" NOT NULL DEFAULT 'DIRECT',
  "allowSplitShip" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FundraiserCampaignProduct" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "overridePrice" DOUBLE PRECISION,
  "overrideFundraiserPercent" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FundraiserCampaignTeamStore" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "teamStoreId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FundraiserCampaignMember" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "teamStoreId" TEXT,
  "rosterEntryId" TEXT,
  "displayName" TEXT NOT NULL,
  "publicCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "goalCents" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FundraiserConsolidationRun" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "status" "FundraiserConsolidationStatus" NOT NULL DEFAULT 'CREATED',
  "idempotencyKey" TEXT,
  "createdById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FundraiserConsolidationOrderLine" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "shippingMode" "CampaignShippingMode" NOT NULL,
  "splitGroup" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FundraiserPayoutLedgerEntry" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT,
  "memberId" TEXT,
  "direction" "FundraiserPayoutDirection" NOT NULL DEFAULT 'CREDIT',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "kind" TEXT NOT NULL,
  "status" "FundraiserPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserCampaign_storeId_slug_key" ON "FundraiserCampaign"("storeId", "slug");
CREATE INDEX IF NOT EXISTS "FundraiserCampaign_tenantId_idx" ON "FundraiserCampaign"("tenantId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaign_storeId_idx" ON "FundraiserCampaign"("storeId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaign_networkId_idx" ON "FundraiserCampaign"("networkId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaign_status_idx" ON "FundraiserCampaign"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserCampaignProduct_campaignId_productId_key" ON "FundraiserCampaignProduct"("campaignId", "productId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignProduct_campaignId_idx" ON "FundraiserCampaignProduct"("campaignId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignProduct_productId_idx" ON "FundraiserCampaignProduct"("productId");

CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserCampaignTeamStore_campaignId_teamStoreId_key" ON "FundraiserCampaignTeamStore"("campaignId", "teamStoreId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignTeamStore_campaignId_idx" ON "FundraiserCampaignTeamStore"("campaignId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignTeamStore_teamStoreId_idx" ON "FundraiserCampaignTeamStore"("teamStoreId");

CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserCampaignMember_campaignId_publicCode_key" ON "FundraiserCampaignMember"("campaignId", "publicCode");
CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserCampaignMember_campaignId_rosterEntryId_key" ON "FundraiserCampaignMember"("campaignId", "rosterEntryId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignMember_campaignId_idx" ON "FundraiserCampaignMember"("campaignId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignMember_storeId_idx" ON "FundraiserCampaignMember"("storeId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignMember_teamStoreId_idx" ON "FundraiserCampaignMember"("teamStoreId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignMember_rosterEntryId_idx" ON "FundraiserCampaignMember"("rosterEntryId");
CREATE INDEX IF NOT EXISTS "FundraiserCampaignMember_isActive_idx" ON "FundraiserCampaignMember"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserConsolidationRun_idempotencyKey_key" ON "FundraiserConsolidationRun"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "FundraiserConsolidationRun_campaignId_idx" ON "FundraiserConsolidationRun"("campaignId");
CREATE INDEX IF NOT EXISTS "FundraiserConsolidationRun_storeId_idx" ON "FundraiserConsolidationRun"("storeId");
CREATE INDEX IF NOT EXISTS "FundraiserConsolidationRun_status_idx" ON "FundraiserConsolidationRun"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserConsolidationOrderLine_runId_orderId_key" ON "FundraiserConsolidationOrderLine"("runId", "orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserConsolidationOrderLine_orderId_key" ON "FundraiserConsolidationOrderLine"("orderId");
CREATE INDEX IF NOT EXISTS "FundraiserConsolidationOrderLine_runId_idx" ON "FundraiserConsolidationOrderLine"("runId");
CREATE INDEX IF NOT EXISTS "FundraiserConsolidationOrderLine_orderId_idx" ON "FundraiserConsolidationOrderLine"("orderId");
CREATE INDEX IF NOT EXISTS "FundraiserConsolidationOrderLine_status_idx" ON "FundraiserConsolidationOrderLine"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "FundraiserPayoutLedgerEntry_idempotencyKey_key" ON "FundraiserPayoutLedgerEntry"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "FundraiserPayoutLedgerEntry_campaignId_idx" ON "FundraiserPayoutLedgerEntry"("campaignId");
CREATE INDEX IF NOT EXISTS "FundraiserPayoutLedgerEntry_storeId_idx" ON "FundraiserPayoutLedgerEntry"("storeId");
CREATE INDEX IF NOT EXISTS "FundraiserPayoutLedgerEntry_orderId_idx" ON "FundraiserPayoutLedgerEntry"("orderId");
CREATE INDEX IF NOT EXISTS "FundraiserPayoutLedgerEntry_memberId_idx" ON "FundraiserPayoutLedgerEntry"("memberId");
CREATE INDEX IF NOT EXISTS "FundraiserPayoutLedgerEntry_status_idx" ON "FundraiserPayoutLedgerEntry"("status");
CREATE INDEX IF NOT EXISTS "FundraiserPayoutLedgerEntry_kind_idx" ON "FundraiserPayoutLedgerEntry"("kind");

CREATE INDEX IF NOT EXISTS "Cart_fundraiserCampaignId_idx" ON "Cart"("fundraiserCampaignId");
CREATE INDEX IF NOT EXISTS "Cart_fundraiserMemberId_idx" ON "Cart"("fundraiserMemberId");
CREATE INDEX IF NOT EXISTS "Cart_fundraiserTeamStoreId_idx" ON "Cart"("fundraiserTeamStoreId");

CREATE INDEX IF NOT EXISTS "CartItem_fundraiserCampaignId_idx" ON "CartItem"("fundraiserCampaignId");
CREATE INDEX IF NOT EXISTS "CartItem_fundraiserMemberId_idx" ON "CartItem"("fundraiserMemberId");

CREATE INDEX IF NOT EXISTS "Order_fundraiserCampaignId_idx" ON "Order"("fundraiserCampaignId");
CREATE INDEX IF NOT EXISTS "Order_fundraiserMemberId_idx" ON "Order"("fundraiserMemberId");
CREATE INDEX IF NOT EXISTS "Order_fundraiserTeamStoreId_idx" ON "Order"("fundraiserTeamStoreId");

DO $$ BEGIN
  ALTER TABLE "FundraiserCampaign" ADD CONSTRAINT "FundraiserCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserCampaign" ADD CONSTRAINT "FundraiserCampaign_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserCampaign" ADD CONSTRAINT "FundraiserCampaign_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignProduct" ADD CONSTRAINT "FundraiserCampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignProduct" ADD CONSTRAINT "FundraiserCampaignProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignTeamStore" ADD CONSTRAINT "FundraiserCampaignTeamStore_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignTeamStore" ADD CONSTRAINT "FundraiserCampaignTeamStore_teamStoreId_fkey" FOREIGN KEY ("teamStoreId") REFERENCES "TeamStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignMember" ADD CONSTRAINT "FundraiserCampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignMember" ADD CONSTRAINT "FundraiserCampaignMember_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignMember" ADD CONSTRAINT "FundraiserCampaignMember_teamStoreId_fkey" FOREIGN KEY ("teamStoreId") REFERENCES "TeamStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserCampaignMember" ADD CONSTRAINT "FundraiserCampaignMember_rosterEntryId_fkey" FOREIGN KEY ("rosterEntryId") REFERENCES "Roster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FundraiserConsolidationRun" ADD CONSTRAINT "FundraiserConsolidationRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserConsolidationRun" ADD CONSTRAINT "FundraiserConsolidationRun_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserConsolidationRun" ADD CONSTRAINT "FundraiserConsolidationRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FundraiserConsolidationOrderLine" ADD CONSTRAINT "FundraiserConsolidationOrderLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "FundraiserConsolidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserConsolidationOrderLine" ADD CONSTRAINT "FundraiserConsolidationOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FundraiserPayoutLedgerEntry" ADD CONSTRAINT "FundraiserPayoutLedgerEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserPayoutLedgerEntry" ADD CONSTRAINT "FundraiserPayoutLedgerEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserPayoutLedgerEntry" ADD CONSTRAINT "FundraiserPayoutLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FundraiserPayoutLedgerEntry" ADD CONSTRAINT "FundraiserPayoutLedgerEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FundraiserCampaignMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Cart" ADD CONSTRAINT "Cart_fundraiserCampaignId_fkey" FOREIGN KEY ("fundraiserCampaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Cart" ADD CONSTRAINT "Cart_fundraiserMemberId_fkey" FOREIGN KEY ("fundraiserMemberId") REFERENCES "FundraiserCampaignMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Cart" ADD CONSTRAINT "Cart_fundraiserTeamStoreId_fkey" FOREIGN KEY ("fundraiserTeamStoreId") REFERENCES "TeamStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_fundraiserCampaignId_fkey" FOREIGN KEY ("fundraiserCampaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_fundraiserMemberId_fkey" FOREIGN KEY ("fundraiserMemberId") REFERENCES "FundraiserCampaignMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_fundraiserCampaignId_fkey" FOREIGN KEY ("fundraiserCampaignId") REFERENCES "FundraiserCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_fundraiserMemberId_fkey" FOREIGN KEY ("fundraiserMemberId") REFERENCES "FundraiserCampaignMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_fundraiserTeamStoreId_fkey" FOREIGN KEY ("fundraiserTeamStoreId") REFERENCES "TeamStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
