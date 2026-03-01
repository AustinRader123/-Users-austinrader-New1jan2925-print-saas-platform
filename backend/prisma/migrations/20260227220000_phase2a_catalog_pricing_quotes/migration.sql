-- Phase 2A: tenancy alignment + catalog/pricing/quote scaffolding

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStatus') THEN
    CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Tenancy tables/columns missing from initial migrations
-- ---------------------------------------------------------------------------
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantUser" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantUserRole" (
  "id" TEXT NOT NULL,
  "tenantUserId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantUserRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX IF NOT EXISTS "Tenant_slug_idx" ON "Tenant"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "TenantUser_tenantId_userId_key" ON "TenantUser"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantUser_userId_idx" ON "TenantUser"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TenantUserRole_tenantUserId_roleId_key" ON "TenantUserRole"("tenantUserId", "roleId");
CREATE INDEX IF NOT EXISTS "TenantUserRole_roleId_idx" ON "TenantUserRole"("roleId");
CREATE INDEX IF NOT EXISTS "TenantUserRole_tenantUserId_idx" ON "TenantUserRole"("tenantUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Role_tenantId_name_key" ON "Role"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Role_tenantId_idx" ON "Role"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Permission_name_key" ON "Permission"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");
CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");
CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "Store_tenantId_idx" ON "Store"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Store_tenantId_slug_key" ON "Store"("tenantId", "slug");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Store_tenantId_fkey') THEN
    ALTER TABLE "Store"
      ADD CONSTRAINT "Store_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantUser_tenantId_fkey') THEN
    ALTER TABLE "TenantUser"
      ADD CONSTRAINT "TenantUser_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantUser_userId_fkey') THEN
    ALTER TABLE "TenantUser"
      ADD CONSTRAINT "TenantUser_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantUserRole_tenantUserId_fkey') THEN
    ALTER TABLE "TenantUserRole"
      ADD CONSTRAINT "TenantUserRole_tenantUserId_fkey"
      FOREIGN KEY ("tenantUserId") REFERENCES "TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantUserRole_roleId_fkey') THEN
    ALTER TABLE "TenantUserRole"
      ADD CONSTRAINT "TenantUserRole_roleId_fkey"
      FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Role_tenantId_fkey') THEN
    ALTER TABLE "Role"
      ADD CONSTRAINT "Role_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RolePermission_roleId_fkey') THEN
    ALTER TABLE "RolePermission"
      ADD CONSTRAINT "RolePermission_roleId_fkey"
      FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RolePermission_permissionId_fkey') THEN
    ALTER TABLE "RolePermission"
      ADD CONSTRAINT "RolePermission_permissionId_fkey"
      FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_tenantId_fkey') THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_userId_fkey') THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ProductVariant/ProductImage explicit store scoping
-- ---------------------------------------------------------------------------
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

UPDATE "ProductVariant" pv
SET "storeId" = p."storeId"
FROM "Product" p
WHERE pv."productId" = p."id" AND pv."storeId" IS NULL;

UPDATE "ProductImage" pi
SET "storeId" = p."storeId"
FROM "Product" p
WHERE pi."productId" = p."id" AND pi."storeId" IS NULL;

ALTER TABLE "ProductVariant" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "ProductImage" ALTER COLUMN "storeId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "ProductVariant_storeId_idx" ON "ProductVariant"("storeId");
CREATE INDEX IF NOT EXISTS "ProductImage_storeId_idx" ON "ProductImage"("storeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductVariant_storeId_fkey') THEN
    ALTER TABLE "ProductVariant"
      ADD CONSTRAINT "ProductVariant_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductImage_storeId_fkey') THEN
    ALTER TABLE "ProductImage"
      ADD CONSTRAINT "ProductImage_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Pricing Rule Sets
-- ---------------------------------------------------------------------------
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "ruleSetId" TEXT;

CREATE TABLE IF NOT EXISTS "PricingRuleSet" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingRuleSet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingRuleSet_storeId_name_key" ON "PricingRuleSet"("storeId", "name");
CREATE INDEX IF NOT EXISTS "PricingRuleSet_storeId_active_idx" ON "PricingRuleSet"("storeId", "active");
CREATE INDEX IF NOT EXISTS "PricingRule_ruleSetId_idx" ON "PricingRule"("ruleSetId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingRuleSet_storeId_fkey') THEN
    ALTER TABLE "PricingRuleSet"
      ADD CONSTRAINT "PricingRuleSet_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingRule_ruleSetId_fkey') THEN
    ALTER TABLE "PricingRule"
      ADD CONSTRAINT "PricingRule_ruleSetId_fkey"
      FOREIGN KEY ("ruleSetId") REFERENCES "PricingRuleSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "quoteNumber" TEXT NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "notes" TEXT,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuoteLineItem" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productVariantId" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "lineTotal" DOUBLE PRECISION NOT NULL,
  "pricingBreakdown" JSONB,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Quote_storeId_quoteNumber_key" ON "Quote"("storeId", "quoteNumber");
CREATE INDEX IF NOT EXISTS "Quote_storeId_status_idx" ON "Quote"("storeId", "status");
CREATE INDEX IF NOT EXISTS "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");
CREATE INDEX IF NOT EXISTS "QuoteLineItem_productId_idx" ON "QuoteLineItem"("productId");
CREATE INDEX IF NOT EXISTS "QuoteLineItem_productVariantId_idx" ON "QuoteLineItem"("productVariantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Quote_storeId_fkey') THEN
    ALTER TABLE "Quote"
      ADD CONSTRAINT "Quote_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuoteLineItem_quoteId_fkey') THEN
    ALTER TABLE "QuoteLineItem"
      ADD CONSTRAINT "QuoteLineItem_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuoteLineItem_productId_fkey') THEN
    ALTER TABLE "QuoteLineItem"
      ADD CONSTRAINT "QuoteLineItem_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuoteLineItem_productVariantId_fkey') THEN
    ALTER TABLE "QuoteLineItem"
      ADD CONSTRAINT "QuoteLineItem_productVariantId_fkey"
      FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
