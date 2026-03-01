import { Prisma, PrismaClient } from '@prisma/client';
import PricingRuleService from './PricingRuleService.js';

const prisma = new PrismaClient();

export class QuoteService {
  private generateOrderNumber() {
    return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  async listQuotes(storeId: string) {
    return prisma.quote.findMany({
      where: { storeId },
      include: { lineItems: true, convertedOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuote(storeId: string, quoteId: string) {
    return prisma.quote.findFirst({
      where: { id: quoteId, storeId },
      include: {
        lineItems: {
          orderBy: { createdAt: 'asc' },
        },
        convertedOrder: true,
      },
    });
  }

  async createQuote(storeId: string, input: { customerId?: string; customerName?: string; customerEmail?: string; notes?: string }) {
    const latest = await prisma.quote.findFirst({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: { quoteNumber: true },
    });

    let nextNumber = 1;
    if (latest?.quoteNumber) {
      const n = Number(latest.quoteNumber.replace(/\D/g, ''));
      nextNumber = Number.isFinite(n) ? n + 1 : 1;
    }

    const quoteNumber = `Q-${String(nextNumber).padStart(5, '0')}`;

    return prisma.quote.create({
      data: {
        storeId,
        quoteNumber,
        customerId: input.customerId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        notes: input.notes,
        status: 'DRAFT',
      },
      include: { lineItems: true, convertedOrder: true },
    });
  }

  async updateQuote(storeId: string, quoteId: string, input: { customerId?: string; customerName?: string; customerEmail?: string; notes?: string }) {
    const quote = await prisma.quote.findFirst({ where: { id: quoteId, storeId }, select: { id: true } });
    if (!quote) throw new Error('Quote not found');

    return prisma.quote.update({
      where: { id: quoteId },
      data: {
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
        ...(input.customerEmail !== undefined ? { customerEmail: input.customerEmail } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: { lineItems: true, convertedOrder: true },
    });
  }

  async updateStatus(storeId: string, quoteId: string, status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED') {
    const quote = await prisma.quote.findFirst({ where: { id: quoteId, storeId }, select: { id: true } });
    if (!quote) throw new Error('Quote not found');

    return prisma.quote.update({
      where: { id: quoteId },
      data: { status },
      include: { lineItems: true, convertedOrder: true },
    });
  }

  async addLineItem(
    storeId: string,
    quoteId: string,
    input: {
      productId: string;
      variantId?: string;
      qty: { units: number; [key: string]: unknown };
      decorationMethod?: string;
      decorationLocations?: string[];
      decorationInput?: Prisma.JsonValue;
      printSizeTier?: 'SMALL' | 'MEDIUM' | 'LARGE';
      colorCount?: number;
      stitchCount?: number;
      rush?: boolean;
      weightOz?: number;
      description?: string;
    }
  ) {
    const quote = await prisma.quote.findFirst({ where: { id: quoteId, storeId } });
    if (!quote) throw new Error('Quote not found');

    const product = await prisma.product.findFirst({ where: { id: input.productId, storeId } });
    if (!product) throw new Error('Product not found for store');

    if (input.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: input.variantId, productId: input.productId, storeId },
      });
      if (!variant) throw new Error('Variant not found for product/store');
    }

    const quantity = Math.max(1, Number(input.qty?.units || 1));
    const breakdown = await PricingRuleService.evaluate({
      storeId,
      productId: input.productId,
      variantId: input.variantId,
      qty: quantity,
      decorationMethod: input.decorationMethod,
      locations: input.decorationLocations,
      printSizeTier: input.printSizeTier,
      colorCount: input.colorCount,
      stitchCount: input.stitchCount,
      rush: input.rush,
      weightOz: input.weightOz,
    });

    const unitPrice = Number(((breakdown.subtotal + breakdown.fees.reduce((sum, fee) => sum + fee.amount, 0)) / quantity).toFixed(2));
    const lineTotal = Number((quantity * unitPrice).toFixed(2));

    const lineItem = await prisma.quoteLineItem.create({
      data: {
        quoteId,
        storeId,
        productId: input.productId,
        variantId: input.variantId,
        productVariantId: input.variantId,
        qty: input.qty as Prisma.InputJsonValue,
        quantity,
        decorationMethod: input.decorationMethod,
        decorationLocations: input.decorationLocations,
        decorationInput: (input.decorationInput || {
          printSizeTier: input.printSizeTier,
          colorCount: input.colorCount,
          stitchCount: input.stitchCount,
          rush: Boolean(input.rush),
          weightOz: input.weightOz,
          locations: input.decorationLocations || [],
        }) as Prisma.InputJsonValue,
        printSizeTier: input.printSizeTier,
        colorCount: input.colorCount,
        stitchCount: input.stitchCount,
        rush: Boolean(input.rush),
        weightOz: input.weightOz,
        pricingSnapshot: breakdown,
        unitPrice,
        lineTotal,
        description: input.description,
        pricingBreakdown: {
          quantity,
          unitPrice,
          lineTotal,
          breakdown,
        },
      },
    });

    const totals = await prisma.quoteLineItem.aggregate({
      where: { quoteId },
      _sum: { lineTotal: true },
    });
    const subtotal = Number(totals._sum.lineTotal || 0);

    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        subtotal,
        total: subtotal,
      },
    });

    return lineItem;
  }

  async convertToOrder(storeId: string, quoteId: string, userId: string) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, storeId },
      include: { lineItems: true, convertedOrder: true },
    });

    if (!quote) throw new Error('Quote not found');
    if (quote.lineItems.length === 0) throw new Error('Quote has no line items');
    if (quote.convertedOrder) {
      return quote.convertedOrder;
    }
    if (!['APPROVED', 'SENT', 'DRAFT'].includes(quote.status)) {
      throw new Error('Quote is not convertible in its current status');
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          storeId,
          userId,
          orderNumber: this.generateOrderNumber(),
          sourceQuoteId: quote.id,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          subtotal: quote.subtotal,
          totalAmount: quote.total,
          customerEmail: quote.customerEmail || 'quote-converted@example.local',
          customerName: quote.customerName || 'Quote Customer',
          shippingAddress: { source: 'quote-conversion' },
          metadata: {
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            convertedAt: new Date().toISOString(),
          },
        },
      });

      for (const item of quote.lineItems) {
        let productVariantId = item.productVariantId || item.variantId || null;
        if (!productVariantId) {
          const fallbackVariant = await tx.productVariant.findFirst({
            where: { productId: item.productId, storeId },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
          });
          if (!fallbackVariant) {
            throw new Error(`No variant found for product ${item.productId}`);
          }
          productVariantId = fallbackVariant.id;
        }

        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: item.productId,
            productVariantId,
            quantity: item.quantity,
            decorationMethod: item.decorationMethod,
            decorationLocations: item.decorationLocations as any,
            decorationInput: item.decorationInput as any,
            printSizeTier: item.printSizeTier,
            colorCount: item.colorCount,
            stitchCount: item.stitchCount,
            rush: item.rush,
            weightOz: item.weightOz,
            unitPrice: item.unitPrice,
            totalPrice: item.lineTotal,
            pricingSnapshot: item.pricingSnapshot as any,
          },
        });
      }

      await tx.quote.update({
        where: { id: quote.id },
        data: { status: 'CONVERTED' },
      });

      return created;
    });

    return order;
  }

  async repriceQuote(storeId: string, quoteId: string) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, storeId },
      include: { lineItems: true },
    });
    if (!quote) throw new Error('Quote not found');

    for (const item of quote.lineItems) {
      const breakdown = await PricingRuleService.evaluate({
        storeId,
        productId: item.productId,
        variantId: item.productVariantId || item.variantId || undefined,
        qty: Math.max(1, item.quantity),
        decorationMethod: item.decorationMethod || undefined,
        locations: Array.isArray(item.decorationLocations as any) ? (item.decorationLocations as any as string[]) : undefined,
        printSizeTier: (item.printSizeTier as any) || undefined,
        colorCount: item.colorCount || undefined,
        stitchCount: item.stitchCount || undefined,
        rush: item.rush,
        weightOz: item.weightOz || undefined,
      });
      const unitPrice = Number(((breakdown.subtotal + breakdown.fees.reduce((sum, fee) => sum + fee.amount, 0)) / item.quantity).toFixed(2));
      const lineTotal = Number((item.quantity * unitPrice).toFixed(2));
      await prisma.quoteLineItem.update({
        where: { id: item.id },
        data: {
          unitPrice,
          lineTotal,
          pricingSnapshot: breakdown as any,
          pricingBreakdown: {
            quantity: item.quantity,
            unitPrice,
            lineTotal,
            breakdown,
          },
        },
      });
    }

    const totals = await prisma.quoteLineItem.aggregate({
      where: { quoteId },
      _sum: { lineTotal: true },
    });
    const subtotal = Number(totals._sum.lineTotal || 0);

    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        subtotal,
        total: subtotal,
      },
    });

    return this.getQuote(storeId, quoteId);
  }
}

export default new QuoteService();
