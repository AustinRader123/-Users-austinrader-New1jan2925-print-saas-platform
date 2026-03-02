import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async pipeline(tenantId: string, storeId: string) {
    const [draftQuotes, approvedQuotes, inProductionOrders, shippedOrders] = await Promise.all([
      this.prisma.quote.count({ where: { tenantId, storeId, status: 'DRAFT' as any, deletedAt: null } }),
      this.prisma.quote.count({ where: { tenantId, storeId, status: 'APPROVED' as any, deletedAt: null } }),
      this.prisma.order.count({ where: { tenantId, storeId, status: 'IN_PRODUCTION' as any, deletedAt: null } }),
      this.prisma.order.count({ where: { tenantId, storeId, status: 'SHIPPED' as any, deletedAt: null } }),
    ]);

    return {
      stages: ['Lead', 'Quoted', 'Approved', 'In Production', 'Shipped'],
      cards: [
        { stage: 'Lead', count: 0 },
        { stage: 'Quoted', count: draftQuotes },
        { stage: 'Approved', count: approvedQuotes },
        { stage: 'In Production', count: inProductionOrders },
        { stage: 'Shipped', count: shippedOrders },
      ],
    };
  }

  async listCustomers(tenantId: string, storeId?: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(storeId ? { storeId } : {}),
      },
      include: {
        orders: {
          where: { deletedAt: null },
          select: { id: true, grandTotal: true, status: true, createdAt: true },
        },
        quotes: {
          where: { deletedAt: null },
          select: { id: true, status: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    return customers.map((customer: any) => ({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      quoteCount: customer.quotes.length,
      orderCount: customer.orders.length,
      lifetimeValue: customer.orders.reduce((sum: number, order: any) => sum + Number(order.grandTotal), 0),
      lastActivityAt: [
        ...customer.orders.map((order: any) => order.createdAt),
        ...customer.quotes.map((quote: any) => quote.createdAt),
        customer.updatedAt,
      ]
        .sort((a, b) => (a < b ? 1 : -1))[0],
    }));
  }

  async getCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: {
        orders: {
          where: { deletedAt: null },
          select: {
            id: true,
            number: true,
            status: true,
            grandTotal: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          where: { deletedAt: null },
          select: {
            id: true,
            number: true,
            status: true,
            grandTotal: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('customer not found');
    }

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      quoteCount: customer.quotes.length,
      orderCount: customer.orders.length,
      lifetimeValue: customer.orders.reduce((sum: number, order: any) => sum + Number(order.grandTotal), 0),
      orders: customer.orders,
      quotes: customer.quotes,
    };
  }

  async customerTimeline(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: {
        orders: {
          where: { deletedAt: null },
          select: { id: true, number: true, status: true, grandTotal: true, createdAt: true },
        },
        quotes: {
          where: { deletedAt: null },
          select: { id: true, number: true, status: true, grandTotal: true, createdAt: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('customer not found');
    }

    const orderIds = customer.orders.map((order: any) => order.id);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        orderId: { in: orderIds.length > 0 ? orderIds : ['__none__'] },
        deletedAt: null,
      },
      select: {
        id: true,
        orderId: true,
        number: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });

    const payments = await this.prisma.paymentRecord.findMany({
      where: {
        tenantId,
        orderId: { in: orderIds.length > 0 ? orderIds : ['__none__'] },
      },
      select: {
        id: true,
        orderId: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const events = [
      ...customer.quotes.map((quote: any) => ({
        type: 'QUOTE',
        id: quote.id,
        number: quote.number,
        status: quote.status,
        amount: Number(quote.grandTotal),
        createdAt: quote.createdAt,
      })),
      ...customer.orders.map((order: any) => ({
        type: 'ORDER',
        id: order.id,
        number: order.number,
        status: order.status,
        amount: Number(order.grandTotal),
        createdAt: order.createdAt,
      })),
      ...invoices.map((invoice: any) => ({
        type: 'INVOICE',
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: Number(invoice.total),
        createdAt: invoice.createdAt,
      })),
      ...payments.map((payment: any) => ({
        type: 'PAYMENT',
        id: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        createdAt: payment.createdAt,
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
      events,
    };
  }
}
