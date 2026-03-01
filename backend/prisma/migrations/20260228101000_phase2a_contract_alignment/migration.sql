-- Phase 2A contract alignment (additive / non-destructive)

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "inventoryQty" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductImage"
  ADD COLUMN IF NOT EXISTS "path" TEXT,
  ADD COLUMN IF NOT EXISTS "color" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PricingRule"
  ADD COLUMN IF NOT EXISTS "storeId" TEXT,
  ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'SCREEN_PRINT',
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "conditions" JSONB,
  ADD COLUMN IF NOT EXISTS "effects" JSONB;

UPDATE "PricingRule" pr
SET "storeId" = p."storeId"
FROM "Product" p
WHERE pr."productId" = p.id
  AND pr."storeId" IS NULL;

ALTER TABLE "PricingRule"
  ALTER COLUMN "storeId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PricingRule_storeId_fkey'
  ) THEN
    ALTER TABLE "PricingRule"
      ADD CONSTRAINT "PricingRule_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PricingRule_storeId_idx" ON "PricingRule"("storeId");
CREATE INDEX IF NOT EXISTS "PricingRule_storeId_ruleSetId_active_idx"
  ON "PricingRule"("storeId", "ruleSetId", "active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'QuoteStatus' AND e.enumlabel = 'DECLINED'
  ) THEN
    ALTER TYPE "QuoteStatus" ADD VALUE 'DECLINED';
  END IF;
END $$;

ALTER TABLE "Quote"
  ADD COLUMN IF NOT EXISTS "customerId" TEXT;

ALTER TABLE "Quote"
  ALTER COLUMN "customerName" DROP NOT NULL,
  ALTER COLUMN "customerEmail" DROP NOT NULL;

ALTER TABLE "QuoteLineItem"
  ADD COLUMN IF NOT EXISTS "storeId" TEXT,
  ADD COLUMN IF NOT EXISTS "variantId" TEXT,
  ADD COLUMN IF NOT EXISTS "qty" JSONB,
  ADD COLUMN IF NOT EXISTS "decorationMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "decorationLocations" JSONB,
  ADD COLUMN IF NOT EXISTS "pricingSnapshot" JSONB;

UPDATE "QuoteLineItem" qli
SET "storeId" = q."storeId"
FROM "Quote" q
WHERE qli."quoteId" = q.id
  AND qli."storeId" IS NULL;

UPDATE "QuoteLineItem"
SET "variantId" = "productVariantId"
WHERE "variantId" IS NULL
  AND "productVariantId" IS NOT NULL;

ALTER TABLE "QuoteLineItem"
  ALTER COLUMN "storeId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteLineItem_storeId_fkey'
  ) THEN
    ALTER TABLE "QuoteLineItem"
      ADD CONSTRAINT "QuoteLineItem_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteLineItem_variantId_fkey'
  ) THEN
    ALTER TABLE "QuoteLineItem"
      ADD CONSTRAINT "QuoteLineItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "QuoteLineItem_storeId_idx" ON "QuoteLineItem"("storeId");
CREATE INDEX IF NOT EXISTS "QuoteLineItem_variantId_idx" ON "QuoteLineItem"("variantId");
