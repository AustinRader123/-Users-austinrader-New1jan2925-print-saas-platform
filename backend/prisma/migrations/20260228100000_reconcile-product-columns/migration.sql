-- Reconcile Product table columns that exist in Prisma schema but may be missing in legacy DBs.
-- Safe, additive migration only (no destructive changes).

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "connectionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_connectionId_externalId_key"
  ON "Product"("connectionId", "externalId");
