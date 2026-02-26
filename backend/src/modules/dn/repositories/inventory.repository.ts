import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

function parseDate(s: any) {
  if (!s) return new Date();
  const d = new Date(s);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

export async function upsertInventoryEventsForConnection(opts: {
  connectionId: string;
  storeId: string;
  events: any[]; // raw DN events
}) {
  const { connectionId, storeId, events } = opts;
  const results = { created: 0, updated: 0, mapped: 0, unresolvedVariantRefs: 0 };

  // Deduplicate within the provided events array by EventID, picking the one with latest CreatedAt
  const byId = new Map();
  for (const ev of events) {
    const id = ev.EventID || ev.id || null;
    const occurred = parseDate(ev.CreatedAt || ev.createdAt || ev.timestamp);
    if (!id) continue; // skip events without id for DN mapping
    const prev = byId.get(id);
    if (!prev || parseDate(prev.CreatedAt || prev.createdAt).getTime() < occurred.getTime()) {
      byId.set(id, ev);
    }
  }

  for (const [dnId, ev] of byId.entries()) {
    const payloadHash = JSON.stringify(ev);
    const occurredAt = parseDate(ev.CreatedAt || ev.createdAt || new Date().toISOString());
    const type = ev.Type || ev.type || 'UNKNOWN';
    const sku = ev.SKU || ev.sku || null;
    const location = ev.Location || ev.location || ev.LocationCode || null;

    // Attempt transactional upsert using mapping as source of truth
    try {
      await prisma.$transaction(async (tx) => {
        // Look for existing map by (storeId, dnInventoryEventId)
        const mapKey = { storeId_dnInventoryEventId: { storeId, dnInventoryEventId: dnId } };
        let existingMap = null;
        try {
          existingMap = await tx.dnInventoryEventMap.findUnique({ where: mapKey, select: { inventoryEventId: true, payloadHash: true } });
        } catch (e) {
          existingMap = null;
        }

        if (existingMap && existingMap.inventoryEventId) {
          // Update existing InventoryEvent if payload changed (or always update to latest)
          if (existingMap.payloadHash !== payloadHash) {
            await tx.inventoryEvent.update({
              where: { id: existingMap.inventoryEventId },
              data: {
                type,
                occurredAt,
                sku,
                locationCode: location,
                deltaQty: ev.NewQty !== undefined && ev.OldQty !== undefined ? Number(ev.NewQty) - Number(ev.OldQty) : undefined,
                resultingQty: ev.NewQty !== undefined ? Number(ev.NewQty) : undefined,
                rawJson: ev,
                updatedAt: new Date(),
              },
            });
            await tx.dnInventoryEventMap.update({ where: { id: existingMap.id }, data: { payloadHash } as any });
            results.updated += 1;
          }
          results.mapped += 1;
          return;
        }

        // If no map exists, create InventoryEvent then mapping
        const created = await tx.inventoryEvent.create({
          data: {
            storeId,
            connectionId,
            externalId: dnId,
            type,
            occurredAt,
            sku,
            locationCode: location,
            deltaQty: ev.NewQty !== undefined && ev.OldQty !== undefined ? Number(ev.NewQty) - Number(ev.OldQty) : undefined,
            resultingQty: ev.NewQty !== undefined ? Number(ev.NewQty) : undefined,
            rawJson: ev,
          },
          select: { id: true },
        });

        try {
          await tx.dnInventoryEventMap.create({
            data: {
              storeId,
              dnInventoryEventId: dnId,
              inventoryEventId: created.id,
              payloadHash,
              rawJson: ev,
            },
          });
          results.created += 1;
          results.mapped += 1;
        } catch (err: any) {
          // unique constraint race: another worker created the mapping
          if (err?.code === 'P2002' || (err?.message && err.message.includes('duplicate key value'))) {
            // find the winning mapping
            const winner = await tx.dnInventoryEventMap.findUnique({ where: { storeId_dnInventoryEventId: { storeId, dnInventoryEventId: dnId } }, select: { inventoryEventId: true } });
            if (winner && winner.inventoryEventId) {
              // update the winner InventoryEvent with latest payload
              await tx.inventoryEvent.update({ where: { id: winner.inventoryEventId }, data: { type, occurredAt, sku, locationCode: location, deltaQty: ev.NewQty !== undefined && ev.OldQty !== undefined ? Number(ev.NewQty) - Number(ev.OldQty) : undefined, resultingQty: ev.NewQty !== undefined ? Number(ev.NewQty) : undefined, rawJson: ev, updatedAt: new Date() } });
              results.updated += 1;
            }
            // delete the just-created orphan event if it exists
            try {
              await tx.inventoryEvent.delete({ where: { id: created.id } });
            } catch (e) {
              // ignore
            }
          } else {
            throw err;
          }
        }
      });
    } catch (ex) {
      // Log and continue; do not fail whole bootstrap for single event
      console.error('inventory upsert failed', ex?.message || ex);
    }
  }

  return results;
}
