import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';
import InventoryService from './InventoryService.js';
import AuditService from './AuditService.js';
import PricingRuleService from './PricingRuleService.js';

const prisma = new PrismaClient();

export class OrderService {
  async createOrder(storeId: string, userId: string, cartId: string, shippingData: any) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
            design: true,
            pricingSnapshot: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty or not found');
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        storeId,
        userId,
        orderNumber,
        customerEmail: shippingData.email,
        customerName: shippingData.name,
        shippingAddress: shippingData.address,
        subtotal: cart.total,
        totalAmount: cart.total,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
      },
    });

    // Create order items
    for (const cartItem of cart.items) {
      // Build export asset refs from design exports if available
      const exportAssets: any[] = [];
      if (cartItem.design) {
        if ((cartItem.design as any).vectorUrl) exportAssets.push({ type: 'VECTOR', url: (cartItem.design as any).vectorUrl });
        if ((cartItem.design as any).exportedImageUrl) exportAssets.push({ type: 'PNG', url: (cartItem.design as any).exportedImageUrl });
      }

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: cartItem.productId,
          productVariantId: cartItem.productVariantId,
          designId: cartItem.designId,
          mockupUrl: cartItem.mockupUrl,
          mockupPreviewUrl: cartItem.mockupUrl,
          pricingSnapshot: cartItem.pricingSnapshot ? (cartItem.pricingSnapshot as any).breakdown ? (cartItem.pricingSnapshot as any) : {
            basePrice: cartItem.pricingSnapshot?.basePrice,
            colorSurcharge: cartItem.pricingSnapshot?.colorSurcharge,
            quantityDiscount: cartItem.pricingSnapshot?.quantityDiscount,
            totalPrice: cartItem.pricingSnapshot?.totalPrice,
            breakdown: cartItem.pricingSnapshot?.breakdown,
          } : undefined,
          exportAssets: exportAssets.length ? exportAssets : undefined,
          quantity: cartItem.quantity,
          unitPrice: (cartItem.pricingSnapshot?.totalPrice || 0) / cartItem.quantity,
          totalPrice: cartItem.pricingSnapshot?.totalPrice || 0,
        },
      });
    }

    // Mark cart as converted
    await prisma.cart.update({
      where: { id: cartId },
      data: { status: 'CONVERTED' },
    });

    return this.getOrder(order.id, storeId);
  }

  async getOrder(orderId: string, storeId?: string) {
    const where: any = { id: orderId };
    if (storeId) where.storeId = storeId;

    return prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
            design: true,
          },
        },
        payments: true,
        productionJobs: {
          include: {
            steps: true,
            shipments: true,
          },
        },
      },
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });

    if (status === 'CANCELLED') {
      await InventoryService.releaseForOrder(orderId);
    }
    if (status === 'SHIPPED') {
      await InventoryService.shipForOrder(orderId);
    }

    await AuditService.log({
      actorType: 'System',
      action: 'order.status_changed',
      entityType: 'Order',
      entityId: orderId,
      meta: { status },
    });

    return updated;
  }

  async updatePaymentStatus(orderId: string, paymentStatus: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: paymentStatus as any },
    });
  }

  async listStoreOrders(storeId: string, options: any = {}) {
    return prisma.order.findMany({
      where: {
        storeId,
        ...(options.status && { status: options.status }),
        ...(options.paymentStatus && { paymentStatus: options.paymentStatus }),
      },
      include: {
        items: true,
        productionJobs: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: options.skip || 0,
      take: options.take || 20,
    });
  }

  async listUserOrders(userId: string, storeId?: string) {
    return prisma.order.findMany({
      where: {
        userId,
        ...(storeId && { storeId }),
      },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1 } } },
            design: true,
          },
        },
        productionJobs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async repriceOrder(orderId: string, storeId?: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, ...(storeId ? { storeId } : {}) },
      include: { items: true, user: { select: { taxExempt: true } } },
    });
    if (!order) throw new Error('Order not found');

    let subtotal = 0;
    let taxAmount = 0;
    let shippingCost = 0;

    for (const item of order.items) {
      const locations = Array.isArray(item.decorationLocations as any) ? (item.decorationLocations as any as string[]) : undefined;
      const breakdown = await PricingRuleService.evaluate({
        storeId: order.storeId,
        productId: item.productId,
        variantId: item.productVariantId,
        qty: Math.max(1, item.quantity),
        decorationMethod: item.decorationMethod || undefined,
        locations,
        printSizeTier: (item.printSizeTier as any) || undefined,
        colorCount: item.colorCount || undefined,
        stitchCount: item.stitchCount || undefined,
        rush: item.rush,
        weightOz: item.weightOz || undefined,
        userId: order.userId,
      });

      const setupTotal = breakdown.fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
      const lineTotal = Number((breakdown.blanksSubtotal + breakdown.decorationSubtotal + setupTotal).toFixed(2));
      const unitPrice = Number((lineTotal / item.quantity).toFixed(2));

      subtotal += lineTotal;
      taxAmount += Number(breakdown.tax || 0);
      shippingCost += Number(breakdown.shipping || 0);

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          unitPrice,
          totalPrice: lineTotal,
          pricingSnapshot: breakdown as any,
        },
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    taxAmount = Number(taxAmount.toFixed(2));
    shippingCost = Number(shippingCost.toFixed(2));
    const totalAmount = Number((subtotal + taxAmount + shippingCost).toFixed(2));

    await prisma.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        taxAmount,
        shippingCost,
        totalAmount,
      },
    });

    return this.getOrder(order.id, order.storeId);
  }
}

export default new OrderService();
