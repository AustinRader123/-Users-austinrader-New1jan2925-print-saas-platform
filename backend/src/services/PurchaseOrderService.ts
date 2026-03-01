import { PrismaClient } from '@prisma/client';
import InventoryService from './InventoryService.js';
import AuditService from './AuditService.js';

const prisma = new PrismaClient();

export class PurchaseOrderService {
  async create(storeId: string, input: { supplierName: string; expectedAt?: string }) {
    return prisma.purchaseOrder.create({
      data: {
        storeId,
        supplierName: input.supplierName,
        status: 'DRAFT',
        expectedAt: input.expectedAt ? new Date(input.expectedAt) : undefined,
      } as any,
    });
  }

  async addLine(storeId: string, purchaseOrderId: string, input: { variantId: string; qtyOrdered: number; costEach?: number }) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, storeId } });
    if (!po) throw new Error('Purchase order not found');

    return (prisma as any).purchaseOrderLine.create({
      data: {
        storeId,
        purchaseOrderId,
        variantId: input.variantId,
        qtyOrdered: Math.max(1, Number(input.qtyOrdered || 1)),
        qtyReceived: 0,
        costEach: input.costEach,
      },
    });
  }

  async updateStatus(storeId: string, purchaseOrderId: string, status: string) {
    return prisma.purchaseOrder.updateMany({
      where: { id: purchaseOrderId, storeId },
      data: { status },
    });
  }

  async receive(storeId: string, purchaseOrderId: string, lines: Array<{ lineId: string; qtyReceived: number }>, actorUserId?: string) {
    const po = await InventoryService.receivePurchaseOrder({ purchaseOrderId, storeId, lines });

    await AuditService.log({
      actorType: actorUserId ? 'Admin' : 'System',
      actorUserId: actorUserId || null,
      action: 'purchase_order.received',
      entityType: 'PurchaseOrder',
      entityId: purchaseOrderId,
      meta: { lines },
    });

    return po;
  }

  async list(storeId: string) {
    return prisma.purchaseOrder.findMany({
      where: { storeId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    } as any);
  }

  async get(storeId: string, id: string) {
    return prisma.purchaseOrder.findFirst({ where: { storeId, id }, include: { lines: true } } as any);
  }
}

export default new PurchaseOrderService();
