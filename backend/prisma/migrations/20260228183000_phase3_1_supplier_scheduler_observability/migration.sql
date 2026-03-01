ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'SUPPLIER_SYNC_LOG';

ALTER TABLE "SupplierConnection"
ADD COLUMN "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN "syncNextAt" TIMESTAMP(3),
ADD COLUMN "syncLastAttemptAt" TIMESTAMP(3);

CREATE INDEX "SupplierConnection_syncEnabled_idx" ON "SupplierConnection"("syncEnabled");
CREATE INDEX "SupplierConnection_syncNextAt_idx" ON "SupplierConnection"("syncNextAt");
