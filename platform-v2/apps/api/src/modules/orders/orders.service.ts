import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './orders.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, storeId: string, body: CreateOrderDto) {
    const customerEmail = body.customerEmail.trim().toLowerCase();
    const customer = await this.prisma.customer.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email: customerEmail,
        },
      },
      create: {
        tenantId,
        storeId,
        email: customerEmail,
        firstName: body.customerFirstName.trim(),
        lastName: body.customerLastName.trim(),
      },
      update: {
        firstName: body.customerFirstName.trim(),
        lastName: body.customerLastName.trim(),
        storeId,
      },
      select: { id: true },
    });

    const subtotal = body.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const nextNumber = await this.nextOrderNumber(storeId);

    const created = await this.prisma.order.create({
      data: {
        tenantId,
        storeId,
        customerId: customer.id,
        number: nextNumber,
        subtotal,
        taxTotal: 0,
        shippingTotal: 0,
        grandTotal: subtotal,
        items: {
          create: body.items.map((item) => ({
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
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });

    return created;
  }

  list(tenantId: string, storeId: string) {
    return this.prisma.order.findMany({
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
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId, storeId, deletedAt: null },
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('order not found');
    }
    return order;
  }

  private async nextOrderNumber(storeId: string) {
    const count = await this.prisma.order.count({ where: { storeId } });
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }
}
