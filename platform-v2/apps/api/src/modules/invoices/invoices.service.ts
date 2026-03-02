import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto, RecordPaymentDto } from './invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, storeId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId, storeId, deletedAt: null },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            customer: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getById(tenantId: string, storeId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, storeId, deletedAt: null },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            customer: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('invoice not found');
    }
    return invoice;
  }

  async create(tenantId: string, storeId: string, body: CreateInvoiceDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: body.orderId, tenantId, storeId, deletedAt: null },
      select: {
        id: true,
        storeId: true,
        subtotal: true,
        taxTotal: true,
        grandTotal: true,
      },
    });

    if (!order) {
      throw new NotFoundException('order not found');
    }

    const existing = await this.prisma.invoice.findFirst({
      where: { tenantId, storeId, orderId: order.id, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('invoice already exists for order');
    }

    const number = await this.nextInvoiceNumber(storeId);

    return this.prisma.invoice.create({
      data: {
        tenantId,
        storeId,
        orderId: order.id,
        number,
        status: 'OPEN' as any,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtotal: order.subtotal,
        taxTotal: order.taxTotal,
        total: order.grandTotal,
      },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            customer: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async recordPayment(tenantId: string, storeId: string, invoiceId: string, body: RecordPaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId, storeId, deletedAt: null },
      select: { id: true, orderId: true, total: true },
    });

    if (!invoice) {
      throw new NotFoundException('invoice not found');
    }

    const payment = await this.prisma.paymentRecord.create({
      data: {
        tenantId,
        orderId: invoice.orderId,
        provider: (body.provider || 'MOCK') as any,
        providerRef: body.providerRef,
        amount: body.amount,
        currency: (body.currency || 'USD').toUpperCase(),
        status: 'SUCCEEDED',
        metadata: body.metadata ?? {},
      },
    });

    const aggregate = await this.prisma.paymentRecord.aggregate({
      where: {
        tenantId,
        orderId: invoice.orderId,
        status: 'SUCCEEDED',
      },
      _sum: { amount: true },
    });

    const paid = Number(aggregate._sum.amount ?? 0);
    const due = Number(invoice.total);

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: paid >= due ? ('PAID' as any) : ('OPEN' as any),
      },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            customer: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      invoice: updatedInvoice,
      payment,
      paidAmount: paid,
      dueAmount: Math.max(due - paid, 0),
    };
  }

  private async nextInvoiceNumber(storeId: string) {
    const count = await this.prisma.invoice.count({ where: { storeId } });
    return `INV-${String(count + 1).padStart(6, '0')}`;
  }
}
