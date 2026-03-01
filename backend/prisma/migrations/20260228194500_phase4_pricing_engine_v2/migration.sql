-- Phase 4: Pricing Engine V2 inputs + shipping/tax config tables

ALTER TABLE "User"
  ADD COLUMN "taxExempt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "taxExemptId" TEXT;

ALTER TABLE "QuoteLineItem"
  ADD COLUMN "decorationInput" JSONB,
  ADD COLUMN "printSizeTier" TEXT,
  ADD COLUMN "colorCount" INTEGER,
  ADD COLUMN "stitchCount" INTEGER,
  ADD COLUMN "rush" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "weightOz" DOUBLE PRECISION;

ALTER TABLE "OrderItem"
  ADD COLUMN "decorationMethod" TEXT,
  ADD COLUMN "decorationLocations" JSONB,
  ADD COLUMN "decorationInput" JSONB,
  ADD COLUMN "printSizeTier" TEXT,
  ADD COLUMN "colorCount" INTEGER,
  ADD COLUMN "stitchCount" INTEGER,
  ADD COLUMN "rush" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "weightOz" DOUBLE PRECISION;

CREATE TABLE "ShippingRate" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "minSubtotal" DOUBLE PRECISION,
  "maxSubtotal" DOUBLE PRECISION,
  "baseCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "perItemCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "perOzCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rushMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxRate" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "jurisdiction" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "rate" DOUBLE PRECISION NOT NULL,
  "appliesShipping" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShippingRate_storeId_active_idx" ON "ShippingRate"("storeId", "active");
CREATE INDEX "TaxRate_storeId_active_idx" ON "TaxRate"("storeId", "active");

ALTER TABLE "ShippingRate"
  ADD CONSTRAINT "ShippingRate_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaxRate"
  ADD CONSTRAINT "TaxRate_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
