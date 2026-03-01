import prisma from '../lib/prisma.js';

type RefType = 'PO' | 'BATCH' | 'ORDER' | 'MANUAL';
type LedgerType = 'ADJUSTMENT' | 'RECEIPT' | 'ISSUE' | 'RESERVE' | 'RELEASE' | 'CONSUME';

type MaterialRequirement = {
  skuId: string;
  qty: number;
};

export class InventoryV2Service {
  async listLocations(storeId: string) {
    return (prisma as any).inventoryLocation.findMany({
      where: { storeId },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async createLocation(input: { storeId: string; name: string; code: string; type?: 'WAREHOUSE' | 'SHELF' | 'BIN' | 'EXTERNAL'; address?: any }) {
    return (prisma as any).inventoryLocation.create({
      data: {
        storeId: input.storeId,
        name: input.name,
        code: input.code,
        type: input.type || 'WAREHOUSE',
        address: input.address || null,
      },
    });
  }

  async listSkus(storeId: string) {
    return (prisma as any).inventorySku.findMany({
      where: { storeId },
      orderBy: [{ skuCode: 'asc' }],
    });
  }

  async createSku(input: {
    storeId: string;
    skuCode: string;
    name: string;
    unit?: string;
    supplierSku?: string;
    defaultReorderPoint?: number;
    defaultReorderQty?: number;
  }) {
    return (prisma as any).inventorySku.upsert({
      where: { storeId_skuCode: { storeId: input.storeId, skuCode: input.skuCode } },
      update: {
        name: input.name,
        unit: input.unit || 'each',
        supplierSku: input.supplierSku || null,
        defaultReorderPoint: input.defaultReorderPoint ?? null,
        defaultReorderQty: input.defaultReorderQty ?? null,
      },
      create: {
        storeId: input.storeId,
        skuCode: input.skuCode,
        name: input.name,
        unit: input.unit || 'each',
        supplierSku: input.supplierSku || null,
        defaultReorderPoint: input.defaultReorderPoint ?? null,
        defaultReorderQty: input.defaultReorderQty ?? null,
      },
    });
  }

  async listMaterialMaps(storeId: string) {
    return (prisma as any).productMaterialMap.findMany({
      where: { storeId },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, sku: true } },
        sku: { select: { id: true, skuCode: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async upsertMaterialMap(input: {
    storeId: string;
    productId: string;
    variantId?: string;
    skuId: string;
    qtyPerUnit: number;
  }) {
    return (prisma as any).productMaterialMap.upsert({
      where: {
        storeId_productId_variantId_skuId: {
          storeId: input.storeId,
          productId: input.productId,
          variantId: input.variantId || null,
          skuId: input.skuId,
        },
      },
      update: {
        qtyPerUnit: Math.max(1, Number(input.qtyPerUnit || 1)),
      },
      create: {
        storeId: input.storeId,
        productId: input.productId,
        variantId: input.variantId || null,
        skuId: input.skuId,
        qtyPerUnit: Math.max(1, Number(input.qtyPerUnit || 1)),
      },
    });
  }

  async adjustStock(input: {
    storeId: string;
    locationId: string;
    skuId: string;
    deltaOnHand?: number;
    deltaReserved?: number;
    type: LedgerType;
    refType?: RefType;
    refId?: string;
    meta?: any;
  }) {
    const deltaOnHand = Number(input.deltaOnHand || 0);
    const deltaReserved = Number(input.deltaReserved || 0);
    if (!deltaOnHand && !deltaReserved) throw new Error('At least one stock delta is required');

    return prisma.$transaction(async (tx: any) => {
      const existing = await tx.inventoryStock.findUnique({
        where: { locationId_skuId: { locationId: input.locationId, skuId: input.skuId } },
      });

      const currentOnHand = Number(existing?.onHand || 0);
      const currentReserved = Number(existing?.reserved || 0);
      const nextOnHand = currentOnHand + deltaOnHand;
      const nextReserved = currentReserved + deltaReserved;

      if (nextOnHand < 0) {
        throw new Error('Insufficient on-hand inventory for operation');
      }
      if (nextReserved < 0) {
        throw new Error('Reserved quantity cannot be negative');
      }
      if (nextReserved > nextOnHand) {
        throw new Error('Reserved quantity cannot exceed on-hand quantity');
      }

      const stock = await tx.inventoryStock.upsert({
        where: { locationId_skuId: { locationId: input.locationId, skuId: input.skuId } },
        update: {
          onHand: nextOnHand,
          reserved: nextReserved,
        },
        create: {
          storeId: input.storeId,
          locationId: input.locationId,
          skuId: input.skuId,
          onHand: Math.max(0, nextOnHand),
          reserved: Math.max(0, nextReserved),
        },
      });

      await tx.inventoryLedgerEntry.create({
        data: {
          storeId: input.storeId,
          locationId: input.locationId,
          skuId: input.skuId,
          type: input.type,
          qty: deltaOnHand || deltaReserved,
          refType: input.refType || 'MANUAL',
          refId: input.refId || null,
          meta: input.meta || null,
        },
      });

      return stock;
    });
  }

  async getStockSnapshot(storeId: string, skuId?: string) {
    const stocks = await (prisma as any).inventoryStock.findMany({
      where: {
        storeId,
        ...(skuId ? { skuId } : {}),
      },
      include: {
        location: { select: { id: true, code: true, name: true } },
        sku: { select: { id: true, skuCode: true, name: true, defaultReorderPoint: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const bySku: Record<string, { skuId: string; skuCode: string; name: string; onHand: number; reserved: number; available: number; reorderPoint: number | null }> = {};

    for (const row of stocks as any[]) {
      const key = row.skuId;
      if (!bySku[key]) {
        bySku[key] = {
          skuId: row.skuId,
          skuCode: row.sku?.skuCode || row.skuId,
          name: row.sku?.name || row.skuId,
          onHand: 0,
          reserved: 0,
          available: 0,
          reorderPoint: row.sku?.defaultReorderPoint ?? null,
        };
      }
      bySku[key].onHand += Number(row.onHand || 0);
      bySku[key].reserved += Number(row.reserved || 0);
      bySku[key].available = bySku[key].onHand - bySku[key].reserved;
    }

    return {
      stocks,
      summary: Object.values(bySku).map((item) => ({
        ...item,
        lowStock: item.reorderPoint != null ? item.available <= item.reorderPoint : false,
      })),
    };
  }

  private async requirementsForBatch(batchId: string): Promise<MaterialRequirement[]> {
    const batch = await (prisma as any).productionBatch.findUnique({
      where: { id: batchId },
      include: {
        items: true,
      },
    });
    if (!batch) throw new Error('Batch not found');

    const bySku = new Map<string, number>();
    for (const item of batch.items as any[]) {
      const maps = await (prisma as any).productMaterialMap.findMany({
        where: {
          storeId: batch.storeId,
          productId: item.productId,
          OR: [{ variantId: item.variantId }, { variantId: null }],
        },
        orderBy: [{ variantId: 'desc' }],
      });

      if (!maps.length) {
        continue;
      }

      for (const map of maps as any[]) {
        const required = Math.max(0, Number(item.qty || 0) * Math.max(1, Number(map.qtyPerUnit || 1)));
        bySku.set(map.skuId, Number(bySku.get(map.skuId) || 0) + required);
      }
    }

    return Array.from(bySku.entries()).map(([skuId, qty]) => ({ skuId, qty }));
  }

  private async pickLocation(storeId: string, skuId: string, required: number) {
    const rows = await (prisma as any).inventoryStock.findMany({
      where: { storeId, skuId },
      include: { location: true },
      orderBy: [{ onHand: 'desc' }, { updatedAt: 'asc' }],
    });

    if (!rows.length) return null;

    const withAvailable = rows.map((row: any) => ({
      row,
      available: Number(row.onHand || 0) - Number(row.reserved || 0),
    }));

    const good = withAvailable.find((entry: { available: number; row: any }) => entry.available >= required);
    if (good) return good.row;
    return withAvailable[0].row;
  }

  async reserveForBatch(batchId: string, actorUserId?: string | null) {
    const batch = await (prisma as any).productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('Batch not found');

    const requirements = await this.requirementsForBatch(batchId);
    if (!requirements.length) {
      await (prisma as any).productionBatch.update({
        where: { id: batchId },
        data: { inventoryStatus: 'NOT_MAPPED' },
      });
      return { batchId, status: 'NOT_MAPPED', reservations: [] };
    }

    const reservations: any[] = [];
    let hasShortage = false;

    await prisma.$transaction(async (tx: any) => {
      for (const req of requirements) {
        const selectedStock = await this.pickLocation(batch.storeId, req.skuId, req.qty);
        if (!selectedStock) {
          hasShortage = true;
          continue;
        }

        const available = Number(selectedStock.onHand || 0) - Number(selectedStock.reserved || 0);
        if (available < req.qty) hasShortage = true;

        const existing = await tx.inventoryReservation.findFirst({
          where: {
            batchId,
            skuId: req.skuId,
          },
        });

        const priorQty = Number(existing?.qty || 0);
        const delta = req.qty - priorQty;

        const updated = await tx.inventoryReservation.upsert({
          where: { batchId_skuId: { batchId, skuId: req.skuId } },
          update: {
            qty: req.qty,
            status: 'HELD',
            locationId: selectedStock.locationId,
          },
          create: {
            storeId: batch.storeId,
            skuId: req.skuId,
            locationId: selectedStock.locationId,
            batchId,
            qty: req.qty,
            status: 'HELD',
          },
        });

        if (delta !== 0) {
          const stock = await tx.inventoryStock.findUnique({
            where: { locationId_skuId: { locationId: selectedStock.locationId, skuId: req.skuId } },
          });
          const onHand = Number(stock?.onHand || 0);
          const reserved = Number(stock?.reserved || 0);
          const nextReserved = reserved + delta;
          if (nextReserved < 0 || nextReserved > onHand) {
            throw new Error(`Unable to reserve inventory for sku ${req.skuId}`);
          }

          await tx.inventoryStock.update({
            where: { locationId_skuId: { locationId: selectedStock.locationId, skuId: req.skuId } },
            data: { reserved: nextReserved },
          });

          await tx.inventoryLedgerEntry.create({
            data: {
              storeId: batch.storeId,
              locationId: selectedStock.locationId,
              skuId: req.skuId,
              type: delta > 0 ? 'RESERVE' : 'RELEASE',
              qty: delta,
              refType: 'BATCH',
              refId: batchId,
              meta: { actorUserId: actorUserId || null },
            },
          });
        }

        reservations.push(updated);
      }
    });

    const status = hasShortage ? 'LOW_STOCK' : 'OK';
    await (prisma as any).productionBatch.update({
      where: { id: batchId },
      data: { inventoryStatus: status },
    });

    return { batchId, status, reservations };
  }

  async releaseBatchReservations(batchId: string, actorUserId?: string | null) {
    const batch = await (prisma as any).productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('Batch not found');

    return prisma.$transaction(async (tx: any) => {
      const reservations = await tx.inventoryReservation.findMany({
        where: { batchId, status: 'HELD' },
      });

      for (const reservation of reservations as any[]) {
        if (!reservation.locationId) continue;

        const stock = await tx.inventoryStock.findUnique({
          where: { locationId_skuId: { locationId: reservation.locationId, skuId: reservation.skuId } },
        });
        const reserved = Number(stock?.reserved || 0);
        const nextReserved = Math.max(0, reserved - Number(reservation.qty || 0));

        await tx.inventoryStock.update({
          where: { locationId_skuId: { locationId: reservation.locationId, skuId: reservation.skuId } },
          data: { reserved: nextReserved },
        });

        await tx.inventoryLedgerEntry.create({
          data: {
            storeId: batch.storeId,
            locationId: reservation.locationId,
            skuId: reservation.skuId,
            type: 'RELEASE',
            qty: -Math.abs(Number(reservation.qty || 0)),
            refType: 'BATCH',
            refId: batchId,
            meta: { actorUserId: actorUserId || null },
          },
        });
      }

      await tx.inventoryReservation.updateMany({
        where: { batchId, status: 'HELD' },
        data: { status: 'RELEASED' },
      });

      await tx.productionBatch.update({ where: { id: batchId }, data: { inventoryStatus: 'NOT_CHECKED' } });

      return { released: reservations.length };
    });
  }

  async consumeBatchReservations(batchId: string, actorUserId?: string | null) {
    const batch = await (prisma as any).productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('Batch not found');

    return prisma.$transaction(async (tx: any) => {
      const reservations = await tx.inventoryReservation.findMany({
        where: { batchId, status: 'HELD' },
      });

      for (const reservation of reservations as any[]) {
        if (!reservation.locationId) continue;
        const stock = await tx.inventoryStock.findUnique({
          where: { locationId_skuId: { locationId: reservation.locationId, skuId: reservation.skuId } },
        });

        const onHand = Number(stock?.onHand || 0);
        const reserved = Number(stock?.reserved || 0);
        const qty = Number(reservation.qty || 0);
        if (onHand < qty || reserved < qty) {
          throw new Error(`Cannot consume reservation for sku ${reservation.skuId}: insufficient stock`);
        }

        await tx.inventoryStock.update({
          where: { locationId_skuId: { locationId: reservation.locationId, skuId: reservation.skuId } },
          data: { onHand: onHand - qty, reserved: reserved - qty },
        });

        await tx.inventoryLedgerEntry.create({
          data: {
            storeId: batch.storeId,
            locationId: reservation.locationId,
            skuId: reservation.skuId,
            type: 'CONSUME',
            qty: -Math.abs(qty),
            refType: 'BATCH',
            refId: batchId,
            meta: { actorUserId: actorUserId || null },
          },
        });
      }

      await tx.inventoryReservation.updateMany({
        where: { batchId, status: 'HELD' },
        data: { status: 'FULFILLED', fulfilledAt: new Date() },
      });

      await tx.productionBatch.update({ where: { id: batchId }, data: { inventoryStatus: 'OK' } });

      return { consumed: reservations.length };
    });
  }

  async assertBatchCanPrint(batchId: string) {
    const batch = await (prisma as any).productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('Batch not found');

    if (batch.inventoryStatus === 'NOT_MAPPED') {
      throw new Error('Batch has no material mapping and cannot enter PRINT');
    }
    if (batch.inventoryStatus === 'LOW_STOCK') {
      throw new Error('Batch has low stock and cannot enter PRINT');
    }

    const openReservations = await (prisma as any).inventoryReservation.count({
      where: { batchId, status: 'HELD' },
    });

    if (openReservations === 0) {
      throw new Error('Batch has no held reservations and cannot enter PRINT');
    }
  }

  async listBatchReservations(batchId: string) {
    return (prisma as any).inventoryReservation.findMany({
      where: { batchId },
      include: {
        sku: { select: { id: true, skuCode: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export default new InventoryV2Service();
