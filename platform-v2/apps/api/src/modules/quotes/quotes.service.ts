import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConvertQuoteDto, CreateQuoteDto } from './quotes.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, storeId: string) {
    return this.prisma.quote.findMany({
      where: { tenantId, storeId, deletedAt: null },
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getById(tenantId: string, storeId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, tenantId, storeId, deletedAt: null },
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        items: true,
      },
    });
    if (!quote) {
      throw new NotFoundException('quote not found');
    }
    return quote;
  }

  async create(tenantId: string, dto: CreateQuoteDto, ownerUserId?: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!store) {
      throw new NotFoundException('store not found');
    }

    const customerEmail = dto.customerEmail.trim().toLowerCase();
    const customer = await this.prisma.customer.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email: customerEmail,
        },
      },
      create: {
        tenantId,
        storeId: dto.storeId,
        email: customerEmail,
        firstName: dto.customerFirstName.trim(),
        lastName: dto.customerLastName.trim(),
      },
      update: {
        firstName: dto.customerFirstName.trim(),
        lastName: dto.customerLastName.trim(),
        storeId: dto.storeId,
      },
      select: { id: true },
    });

    const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const number = await this.nextQuoteNumber(dto.storeId);

    try {
      return await this.prisma.quote.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          customerId: customer.id,
          ownerUserId,
          number,
          status: 'DRAFT' as any,
          subtotal,
          taxTotal: 0,
          shippingTotal: 0,
          grandTotal: subtotal,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          items: {
            create: dto.items.map((item) => ({
              tenantId,
              productId: item.productId,
              variantId: item.variantId,
              designId: item.designId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.unitPrice * item.quantity,
              pricingSnapshot: item.pricingSnapshot ?? {},
            })),
          },
        },
        include: {
          customer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          items: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('duplicate quote number for store');
      }
      throw error;
    }
  }

  async convertToOrder(tenantId: string, storeId: string, quoteId: string, body: ConvertQuoteDto = {}) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        tenantId,
        storeId,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('quote not found');
    }

    if (quote.status === ('CONVERTED' as any)) {
      const existingOrder = await this.prisma.order.findFirst({
        where: { quoteId: quote.id, tenantId, storeId, deletedAt: null },
        include: { customer: true, items: true },
      });
      if (existingOrder) {
        return existingOrder;
      }
    }

    const orderNumber = await this.nextOrderNumber(storeId);
    const taxTotal = body.taxTotal ?? 0;
    const shippingTotal = body.shippingTotal ?? 0;
    const grandTotal = Number(quote.subtotal) + taxTotal + shippingTotal;

    const createdOrder = await this.prisma.$transaction(async (tx: any) => {
      const order = await tx.order.create({
        data: {
          tenantId,
          storeId,
          customerId: quote.customerId,
          quoteId: quote.id,
          ownerUserId: quote.ownerUserId,
          number: orderNumber,
          status: 'APPROVED' as any,
          subtotal: quote.subtotal,
          taxTotal,
          shippingTotal,
          grandTotal,
          items: {
            create: quote.items.map((item: any) => ({
              tenantId,
              productId: item.productId,
              variantId: item.variantId,
              designId: item.designId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              pricingSnapshot: item.pricingSnapshot,
            })),
          },
        },
        include: {
          customer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          items: true,
        },
      });

      await tx.quote.update({
        where: { id: quote.id },
        data: { status: 'CONVERTED' as any },
      });

      return order;
    });

    return createdOrder;
  }

  private async nextQuoteNumber(storeId: string) {
    const count = await this.prisma.quote.count({ where: { storeId } });
    return `QTE-${String(count + 1).padStart(6, '0')}`;
  }

  private async nextOrderNumber(storeId: string) {
    const count = await this.prisma.order.count({ where: { storeId } });
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }
}
