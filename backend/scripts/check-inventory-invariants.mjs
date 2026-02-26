#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const errors = [];
  // 1) DnInventoryEventMap duplicates by (storeId, dnInventoryEventId)
  const dupMaps = await prisma.$queryRawUnsafe(`SELECT "storeId", "dnInventoryEventId", count(*) as c FROM "DnInventoryEventMap" GROUP BY "storeId", "dnInventoryEventId" HAVING count(*) > 1`);
  if (dupMaps.length) errors.push(`Duplicate DnInventoryEventMap rows: ${dupMaps.length}`);

  // 2) DnInventoryEventMap inventoryEventId uniqueness
  const dupPointers = await prisma.$queryRawUnsafe(`SELECT "inventoryEventId", count(*) as c FROM "DnInventoryEventMap" GROUP BY "inventoryEventId" HAVING count(*) > 1`);
  if (dupPointers.length) errors.push(`Duplicate mapping pointers: ${dupPointers.length}`);

  // 3) Orphan mapping rows
  const orphanMaps = await prisma.$queryRawUnsafe(`SELECT m.* FROM "DnInventoryEventMap" m LEFT JOIN "InventoryEvent" e ON e.id = m."inventoryEventId" WHERE e.id IS NULL LIMIT 1`);
  if (orphanMaps.length) errors.push(`Found orphan DnInventoryEventMap rows: ${orphanMaps.length}`);

  // 4) Unresolved variant references: events with rawJson containing SKU but variantId is null
  const unresolved = await prisma.$queryRawUnsafe(`SELECT count(*) as c FROM "InventoryEvent" ie WHERE ie."variantId" IS NULL AND (ie.sku IS NOT NULL)`);
  const unresolvedCount = (unresolved[0] && (unresolved[0].c || unresolved[0].count || unresolved[0].cnt)) || 0;

  console.log('Inventory invariant check:');
  console.log(`  duplicate DnInventoryEventMap keys: ${dupMaps.length}`);
  console.log(`  duplicate mapping pointers: ${dupPointers.length}`);
  console.log(`  orphan mapping rows: ${orphanMaps.length}`);
  console.log(`  unresolved variant refs (events with sku but no variant): ${unresolvedCount}`);

  if (errors.length) {
    console.error('INVARIANTS FAILED:', errors.join(' | '));
    process.exit(2);
  }
  console.log('INVARIANTS OK');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(3); });
