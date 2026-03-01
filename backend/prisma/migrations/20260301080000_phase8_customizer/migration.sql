-- Phase 8: product builder + customizer + artwork library + personalization + print packages

DO $$ BEGIN
  ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'CUSTOMIZER_UPLOAD';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'CUSTOMIZER_PREVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'PRINT_PACKAGE_ZIP';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ArtworkAssetStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomizationStatus" AS ENUM ('DRAFT', 'IN_CART', 'ORDERED', 'PROOF_PENDING', 'APPROVED', 'REJECTED', 'PACKAGED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProductCustomizationProfile" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "locations" JSONB NOT NULL,
  "rules" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PersonalizationSchema" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "productId" TEXT,
  "profileId" TEXT,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "minLength" INTEGER,
  "maxLength" INTEGER,
  "options" JSONB,
  "pricing" JSONB,
  "validation" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ArtworkCategory" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "profileId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ArtworkAsset" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "categoryId" TEXT,
  "fileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ArtworkAssetStatus" NOT NULL DEFAULT 'ACTIVE',
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Customization" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "profileId" TEXT,
  "designId" TEXT,
  "artworkAssetId" TEXT,
  "previewFileId" TEXT,
  "cartItemId" TEXT,
  "orderItemId" TEXT,
  "payload" JSONB NOT NULL,
  "pricingSnapshot" JSONB,
  "status" "CustomizationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PrintPackage" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT,
  "productionJobId" TEXT,
  "customizationId" TEXT,
  "fileId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "customizationId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "customizationJson" JSONB;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "previewFileId" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "customizationId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "customizationJson" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "previewFileId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProductCustomizationProfile_productId_key" ON "ProductCustomizationProfile"("productId");
CREATE INDEX IF NOT EXISTS "ProductCustomizationProfile_storeId_idx" ON "ProductCustomizationProfile"("storeId");
CREATE INDEX IF NOT EXISTS "ProductCustomizationProfile_enabled_idx" ON "ProductCustomizationProfile"("enabled");

CREATE UNIQUE INDEX IF NOT EXISTS "PersonalizationSchema_profileId_key_key" ON "PersonalizationSchema"("profileId", "key");
CREATE INDEX IF NOT EXISTS "PersonalizationSchema_storeId_idx" ON "PersonalizationSchema"("storeId");
CREATE INDEX IF NOT EXISTS "PersonalizationSchema_productId_idx" ON "PersonalizationSchema"("productId");
CREATE INDEX IF NOT EXISTS "PersonalizationSchema_profileId_idx" ON "PersonalizationSchema"("profileId");
CREATE INDEX IF NOT EXISTS "PersonalizationSchema_active_idx" ON "PersonalizationSchema"("active");

CREATE UNIQUE INDEX IF NOT EXISTS "ArtworkCategory_storeId_slug_key" ON "ArtworkCategory"("storeId", "slug");
CREATE INDEX IF NOT EXISTS "ArtworkCategory_storeId_idx" ON "ArtworkCategory"("storeId");
CREATE INDEX IF NOT EXISTS "ArtworkCategory_profileId_idx" ON "ArtworkCategory"("profileId");

CREATE INDEX IF NOT EXISTS "ArtworkAsset_storeId_idx" ON "ArtworkAsset"("storeId");
CREATE INDEX IF NOT EXISTS "ArtworkAsset_categoryId_idx" ON "ArtworkAsset"("categoryId");
CREATE INDEX IF NOT EXISTS "ArtworkAsset_fileId_idx" ON "ArtworkAsset"("fileId");
CREATE INDEX IF NOT EXISTS "ArtworkAsset_status_idx" ON "ArtworkAsset"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "Customization_cartItemId_key" ON "Customization"("cartItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "Customization_orderItemId_key" ON "Customization"("orderItemId");
CREATE INDEX IF NOT EXISTS "Customization_storeId_idx" ON "Customization"("storeId");
CREATE INDEX IF NOT EXISTS "Customization_productId_idx" ON "Customization"("productId");
CREATE INDEX IF NOT EXISTS "Customization_variantId_idx" ON "Customization"("variantId");
CREATE INDEX IF NOT EXISTS "Customization_profileId_idx" ON "Customization"("profileId");
CREATE INDEX IF NOT EXISTS "Customization_designId_idx" ON "Customization"("designId");
CREATE INDEX IF NOT EXISTS "Customization_status_idx" ON "Customization"("status");

CREATE INDEX IF NOT EXISTS "PrintPackage_storeId_idx" ON "PrintPackage"("storeId");
CREATE INDEX IF NOT EXISTS "PrintPackage_orderId_idx" ON "PrintPackage"("orderId");
CREATE INDEX IF NOT EXISTS "PrintPackage_productionJobId_idx" ON "PrintPackage"("productionJobId");
CREATE INDEX IF NOT EXISTS "PrintPackage_customizationId_idx" ON "PrintPackage"("customizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_customizationId_key" ON "CartItem"("customizationId");
CREATE INDEX IF NOT EXISTS "CartItem_customizationId_idx" ON "CartItem"("customizationId");
CREATE INDEX IF NOT EXISTS "CartItem_previewFileId_idx" ON "CartItem"("previewFileId");

CREATE UNIQUE INDEX IF NOT EXISTS "OrderItem_customizationId_key" ON "OrderItem"("customizationId");
CREATE INDEX IF NOT EXISTS "OrderItem_customizationId_idx" ON "OrderItem"("customizationId");
CREATE INDEX IF NOT EXISTS "OrderItem_previewFileId_idx" ON "OrderItem"("previewFileId");

DO $$ BEGIN
  ALTER TABLE "ProductCustomizationProfile" ADD CONSTRAINT "ProductCustomizationProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductCustomizationProfile" ADD CONSTRAINT "ProductCustomizationProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PersonalizationSchema" ADD CONSTRAINT "PersonalizationSchema_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PersonalizationSchema" ADD CONSTRAINT "PersonalizationSchema_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PersonalizationSchema" ADD CONSTRAINT "PersonalizationSchema_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProductCustomizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArtworkCategory" ADD CONSTRAINT "ArtworkCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ArtworkCategory" ADD CONSTRAINT "ArtworkCategory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProductCustomizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArtworkAsset" ADD CONSTRAINT "ArtworkAsset_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ArtworkAsset" ADD CONSTRAINT "ArtworkAsset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ArtworkCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ArtworkAsset" ADD CONSTRAINT "ArtworkAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ArtworkAsset" ADD CONSTRAINT "ArtworkAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProductCustomizationProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_artworkAssetId_fkey" FOREIGN KEY ("artworkAssetId") REFERENCES "ArtworkAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_previewFileId_fkey" FOREIGN KEY ("previewFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Customization" ADD CONSTRAINT "Customization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PrintPackage" ADD CONSTRAINT "PrintPackage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PrintPackage" ADD CONSTRAINT "PrintPackage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PrintPackage" ADD CONSTRAINT "PrintPackage_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PrintPackage" ADD CONSTRAINT "PrintPackage_customizationId_fkey" FOREIGN KEY ("customizationId") REFERENCES "Customization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PrintPackage" ADD CONSTRAINT "PrintPackage_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_customizationId_fkey" FOREIGN KEY ("customizationId") REFERENCES "Customization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_previewFileId_fkey" FOREIGN KEY ("previewFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_customizationId_fkey" FOREIGN KEY ("customizationId") REFERENCES "Customization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_previewFileId_fkey" FOREIGN KEY ("previewFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
