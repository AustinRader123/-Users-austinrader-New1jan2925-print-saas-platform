import { PrismaClient } from '@prisma/client';
import WebhookService from './WebhookService.js';

const prisma = new PrismaClient();

export class InventoryService {
  async getOrCreateInventoryItem(storeId: string, variantId: string) {
    const existing = await (prisma as any).inventoryItem.findFirst({
      where: { storeId, variantId, warehouseId: null },
    });
    if (existing) return existing;
    return (prisma as any).inventoryItem.create({
      data: { storeId, variantId, warehouseId: null, qtyOnHand: 0, qtyReserved: 0 },
    });
  }

  async list(storeId: string, productId?: string, variantId?: string) {
    return (prisma as any).inventoryItem.findMany({
      where: {
        storeId,
        ...(variantId ? { variantId } : {}),
        ...(productId ? { variant: { productId } } : {}),
      },
      include: {
        variant: { include: { product: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async adjust(input: { storeId: string; variantId: string; qty: number; note?: string; actorUserId?: string }) {
    const item = await this.getOrCreateInventoryItem(input.storeId, input.variantId);
    const nextOnHand = item.qtyOnHand + input.qty;
    const updated = await (prisma as any).inventoryItem.update({
      where: { id: item.id },
      data: { qtyOnHand: nextOnHand },
    });

    await (prisma as any).stockMovement.create({
      data: {
        storeId: input.storeId,
        variantId: input.variantId,
        inventoryItemId: item.id,
        type: 'ADJUST',
        qty: input.qty,
        refType: 'inventory.adjust',
        refId: item.id,
        note: input.note,
      },
    });

    await this.emitLowStockIfNeeded(input.storeId, updated.id);
    return updated;
  }

  async reserveForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error('Order not found');

    for (const line of order.items) {
      const item = await this.getOrCreateInventoryItem(order.storeId, line.productVariantId);
      await (prisma as any).inventoryItem.update({
        where: { id: item.id },
        data: { qtyReserved: item.qtyReserved + line.quantity },
      });
      await (prisma as any).stockMovement.create({
        data: {
          storeId: order.storeId,
          variantId: line.productVariantId,
          inventoryItemId: item.id,
          type: 'RESERVE',
          qty: line.quantity,
          refType: 'order',
          refId: order.id,
          note: `Reserved for ${order.orderNumber}`,
        },
      });
      await this.emitLowStockIfNeeded(order.storeId, item.id);
    }
  }

  async releaseForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error('Order not found');

    for (const line of order.items) {
      const item = await this.getOrCreateInventoryItem(order.storeId, line.productVariantId);
      await (prisma as any).inventoryItem.update({
        where: { id: item.id },
        data: { qtyReserved: Math.max(0, item.qtyReserved - line.quantity) },
      });
      await (prisma as any).stockMovement.create({
        data: {
          storeId: order.storeId,
          variantId: line.productVariantId,
          inventoryItemId: item.id,
          type: 'RELEASE',
          qty: line.quantity,
          refType: 'order',
          refId: order.id,
          note: `Released for ${order.orderNumber}`,
        },
      });
    }
  }

  async shipForOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new Error('Order not found');

    for (const line of order.items) {
      const item = await this.getOrCreateInventoryItem(order.storeId, line.productVariantId);
      await (prisma as any).inventoryItem.update({
        where: { id: item.id },
        data: {
          qtyReserved: Math.max(0, item.qtyReserved - line.quantity),
          qtyOnHand: item.qtyOnHand - line.quantity,
        },
      });
      await (prisma as any).stockMovement.create({
        data: {
          storeId: order.storeId,
          variantId: line.productVariantId,
          inventoryItemId: item.id,
          type: 'SHIP',
          qty: line.quantity,
          refType: 'order',
          refId: order.id,
          note: `Shipped for ${order.orderNumber}`,
        },
      });
      await this.emitLowStockIfNeeded(order.storeId, item.id);
    }
  }

  async receivePurchaseOrder(input: { purchaseOrderId: string; storeId: string; lines: Array<{ lineId: string; qtyReceived: number }> }) {
    const po = await (prisma as any).purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { lines: true },
    });
    if (!po) throw new Error('Purchase order not found');

    for (const receivedLine of input.lines) {
      const line = po.lines.find((l: any) => l.id === receivedLine.lineId);
      if (!line) continue;

      const nextReceived = Math.min(line.qtyOrdered, line.qtyReceived + Math.max(0, receivedLine.qtyReceived));
      await (prisma as any).purchaseOrderLine.update({ where: { id: line.id }, data: { qtyReceived: nextReceived } });

      const item = await this.getOrCreateInventoryItem(input.storeId, line.variantId);
      await (prisma as any).inventoryItem.update({
        where: { id: item.id },
        data: { qtyOnHand: item.qtyOnHand + Math.max(0, receivedLine.qtyReceived) },
      });

      await (prisma as any).stockMovement.create({
        data: {
          storeId: input.storeId,
          variantId: line.variantId,
          inventoryItemId: item.id,
          type: 'RECEIVE',
          qty: Math.max(0, receivedLine.qtyReceived),
          refType: 'purchase_order',
          refId: po.id,
          note: `Received for PO ${po.id}`,
        },
      });
      await this.emitLowStockIfNeeded(input.storeId, item.id);
    }

    const updatedLines = await (prisma as any).purchaseOrderLine.findMany({ where: { purchaseOrderId: po.id } });
    const allReceived = updatedLines.every((line: any) => line.qtyReceived >= line.qtyOrdered);
    const anyReceived = updatedLines.some((line: any) => line.qtyReceived > 0);

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'SENT',
      },
    });

    await WebhookService.publish({
      storeId: input.storeId,
      eventType: 'purchase_order.received',
      payload: { purchaseOrderId: po.id },
    });

    return prisma.purchaseOrder.findUnique({ where: { id: po.id }, include: { lines: true } } as any);
  }

  private async emitLowStockIfNeeded(storeId: string, inventoryItemId: string) {
    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { variant: true },
    });
    if (!item) return;
    if (item.reorderPoint == null) return;

    const available = item.qtyOnHand - item.qtyReserved;
    if (available <= item.reorderPoint) {
      await WebhookService.publish({
        storeId,
        eventType: 'inventory.low_stock',
        payload: {
          inventoryItemId: item.id,
          variantId: item.variantId,
          sku: item.variant?.sku,
          available,
          reorderPoint: item.reorderPoint,
        },
      });
    }
  }
}

export default new InventoryService();
