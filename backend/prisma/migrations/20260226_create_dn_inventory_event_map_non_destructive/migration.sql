-- Migration: create_dn_inventory_event_map_non_destructive
-- Non-destructive: ensure InventoryEvent has storeId and DnInventoryEventMap exists

BEGIN;

-- Add storeId to InventoryEvent if missing (leave nullable to avoid data loss)
ALTER TABLE IF EXISTS "InventoryEvent" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

-- Create mapping table if it doesn't exist
CREATE TABLE IF NOT EXISTS "DnInventoryEventMap" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId" TEXT NOT NULL,
  "dnInventoryEventId" TEXT NOT NULL,
  "inventoryEventId" TEXT NOT NULL,
  "payloadHash" TEXT,
  "rawJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraints if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dn_inventory_event_map_store_dn_id_key'
  ) THEN
    ALTER TABLE "DnInventoryEventMap" ADD CONSTRAINT dn_inventory_event_map_store_dn_id_key UNIQUE ("storeId", "dnInventoryEventId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dn_inventory_event_map_inventory_event_id_key'
  ) THEN
    ALTER TABLE "DnInventoryEventMap" ADD CONSTRAINT dn_inventory_event_map_inventory_event_id_key UNIQUE ("inventoryEventId");
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "DnInventoryEventMap_inventoryEventId_idx" ON "DnInventoryEventMap" ("inventoryEventId");

COMMIT;
