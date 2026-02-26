-- Migration: day3_inventory_event_map_backfill
-- Idempotent SQL to create InventoryEvent and DnInventoryEventMap tables if missing.

BEGIN;

-- Create InventoryEvent table if not exists
CREATE TABLE IF NOT EXISTS "InventoryEvent" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId" TEXT NOT NULL,
  "connectionId" TEXT,
  "externalId" TEXT,
  "type" TEXT NOT NULL,
  "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  sku TEXT,
  "locationCode" TEXT,
  "deltaQty" INTEGER,
  "resultingQty" INTEGER,
  reference TEXT,
  "rawJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS "InventoryEvent_storeId_occurredAt_idx" ON "InventoryEvent" ("storeId", "occurredAt");
CREATE INDEX IF NOT EXISTS "InventoryEvent_storeId_variantId_occurredAt_idx" ON "InventoryEvent" ("storeId", "variantId", "occurredAt");

-- Create DnInventoryEventMap table
CREATE TABLE IF NOT EXISTS "DnInventoryEventMap" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId" TEXT NOT NULL,
  "dnInventoryEventId" TEXT NOT NULL,
  "inventoryEventId" TEXT NOT NULL,
  "payloadHash" TEXT,
  "rawJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Unique constraints and index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dn_inventory_event_map_store_dn_id_key'
  ) THEN
    ALTER TABLE "DnInventoryEventMap" ADD CONSTRAINT dn_inventory_event_map_store_dn_id_key UNIQUE ("storeId", "dnInventoryEventId");
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- ignore
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dn_inventory_event_map_inventory_event_id_key'
  ) THEN
    ALTER TABLE "DnInventoryEventMap" ADD CONSTRAINT dn_inventory_event_map_inventory_event_id_key UNIQUE ("inventoryEventId");
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- ignore
END$$;

CREATE INDEX IF NOT EXISTS "DnInventoryEventMap_inventoryEventId_idx" ON "DnInventoryEventMap" ("inventoryEventId");

COMMIT;
