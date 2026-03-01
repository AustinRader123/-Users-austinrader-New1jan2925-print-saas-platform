import prisma from '../lib/prisma.js';

function poStatusFromLines(lines: Array<{ qtyOrdered: number; qtyReceived: number }>) {
  if (!lines.length) return 'DRAFT';
  const totalOrdered = lines.reduce((sum, row) => sum + Number(row.qtyOrdered || 0), 0);
  const totalReceived = lines.reduce((sum, row) => sum + Number(row.qtyReceived || 0), 0);
  if (totalReceived <= 0) return 'SENT';
  if (totalReceived < totalOrdered) return 'PARTIALLY_RECEIVED';
  return 'RECEIVED';
}

export class PurchasingV2Service {
  async list(storeId: string) {
    return prisma.purchaseOrder.findMany({
      where: { storeId },
      include: {
        lines: {
          include: {
            sku: { select: { id: true, skuCode: true, name: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    } as any);
  }

  async get(storeId: string, id: string) {
    return prisma.purchaseOrder.findFirst({
      where: { storeId, id },
      include: {
        lines: {
          include: {
            sku: { select: { id: true, skuCode: true, name: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    } as any);
  }

  async create(input: {
    storeId: string;
    supplierName: string;
    expectedAt?: string;
    lines?: Array<{
      skuId?: string;
      variantId?: string;
      qtyOrdered: number;
      unitCostCents?: number;
      expectedAt?: string;
    }>;
  }) {
    const rows = (input.lines || []).map((line) => ({
      storeId: input.storeId,
      variantId: line.variantId || null,
      skuId: line.skuId || null,
      qtyOrdered: Math.max(1, Number(line.qtyOrdered || 1)),
      qtyReceived: 0,
      unitCostCents: line.unitCostCents ?? null,
      expectedAt: line.expectedAt ? new Date(line.expectedAt) : null,
    }));

    const po = await prisma.purchaseOrder.create({
      data: {
        storeId: input.storeId,
        supplierName: input.supplierName,
        status: 'DRAFT',
        expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
        lines: rows.length ? { create: rows } : undefined,
      },
      include: { lines: true },
    } as any);

    return po;
  }

  async addLine(input: {
    storeId: string;
    purchaseOrderId: string;
    skuId?: string;
    variantId?: string;
    qtyOrdered: number;
    unitCostCents?: number;
    expectedAt?: string;
  }) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id: input.purchaseOrderId, storeId: input.storeId } });
    if (!po) throw new Error('Purchase order not found');

    return (prisma as any).purchaseOrderLine.create({
      data: {
        storeId: input.storeId,
        purchaseOrderId: input.purchaseOrderId,
        skuId: input.skuId || null,
        variantId: input.variantId || null,
        qtyOrdered: Math.max(1, Number(input.qtyOrdered || 1)),
        qtyReceived: 0,
        unitCostCents: input.unitCostCents ?? null,
        expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
      },
    });
  }

  async send(storeId: string, purchaseOrderId: string) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, storeId } });
    if (!po) throw new Error('Purchase order not found');

    return prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    } as any);
  }

  async close(storeId: string, purchaseOrderId: string) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, storeId } });
    if (!po) throw new Error('Purchase order not found');

    return prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: 'CLOSED',
      },
    } as any);
  }

  async receive(input: {
    storeId: string;
    purchaseOrderId: string;
    locationId: string;
    lines: Array<{ lineId: string; qtyReceived: number }>;
    actorUserId?: string | null;
  }) {
    const po: any = await prisma.purchaseOrder.findFirst({
      where: { id: input.purchaseOrderId, storeId: input.storeId },
      include: { lines: true },
    } as any);
    if (!po) throw new Error('Purchase order not found');

    await prisma.$transaction(async (tx: any) => {
      for (const lineInput of input.lines) {
        const line = (po.lines as any[]).find((row) => row.id === lineInput.lineId);
        if (!line) throw new Error(`Line ${lineInput.lineId} not found on purchase order`);

        const qty = Math.max(0, Number(lineInput.qtyReceived || 0));
        if (!qty) continue;

        const maxAllowed = Math.max(0, Number(line.qtyOrdered || 0) - Number(line.qtyReceived || 0));
        if (qty > maxAllowed) {
          throw new Error(`Received qty exceeds remaining qty for line ${line.id}`);
        }

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: {
            qtyReceived: Number(line.qtyReceived || 0) + qty,
          },
        });

        const skuId = line.skuId;
        if (!skuId) continue;

        const existing = await tx.inventoryStock.findUnique({
          where: { locationId_skuId: { locationId: input.locationId, skuId } },
        });

        await tx.inventoryStock.upsert({
          where: { locationId_skuId: { locationId: input.locationId, skuId } },
          update: {
            onHand: Number(existing?.onHand || 0) + qty,
          },
          create: {
            storeId: input.storeId,
            locationId: input.locationId,
            skuId,
            onHand: qty,
            reserved: 0,
          },
        });

        await tx.inventoryLedgerEntry.create({
          data: {
            storeId: input.storeId,
            locationId: input.locationId,
            skuId,
            type: 'RECEIPT',
            qty,
            refType: 'PO',
            refId: input.purchaseOrderId,
            meta: {
              lineId: line.id,
              actorUserId: input.actorUserId || null,
            },
          },
        });
      }
    });

    const refreshed: any = await prisma.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { lines: true },
    } as any);

    const status = poStatusFromLines((refreshed?.lines || []) as Array<{ qtyOrdered: number; qtyReceived: number }>);

    await prisma.purchaseOrder.update({
      where: { id: input.purchaseOrderId },
      data: {
        status,
        ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {}),
      },
    } as any);

    return this.get(input.storeId, input.purchaseOrderId);
  }
}

export default new PurchasingV2Service();
