import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonObject = Record<string, unknown>;

type InvoiceWithOrderAndLines = {
  id: string;
  orderId: string;
  invoiceNumber: string;
  currency?: string;
  balanceDueCents?: number;
  paidAt?: Date | null;
};

type BillingDbClient = {
  invoice: {
    findMany(args: unknown): Promise<unknown[]>;
    findFirst(args: unknown): Promise<InvoiceWithOrderAndLines | null>;
  };
  paymentLedgerEntry: {
    findMany(args: unknown): Promise<unknown[]>;
    create(args: unknown): Promise<unknown>;
  };
  customer: {
    upsert(args: unknown): Promise<{ id: string }>;
  };
  invoiceSequence: {
    upsert(args: unknown): Promise<{ nextNumber: number }>;
  };
  invoiceLine: {
    createMany(args: unknown): Promise<unknown>;
  };
  order: {
    update(args: unknown): Promise<unknown>;
  };
};

const billingDb = prisma as unknown as BillingDbClient;

function formatInvoiceNumber(storeId: string, year: number, number: number) {
  return `INV-${year}-${storeId.slice(0, 6).toUpperCase()}-${String(number).padStart(6, '0')}`;
}

export class OrderBillingService {
  async listInvoices(storeId: string) {
    return billingDb.invoice.findMany({
      where: { order: { storeId } },
      include: {
        order: true,
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(storeId: string, invoiceId: string) {
    return billingDb.invoice.findFirst({
      where: { id: invoiceId, order: { storeId } },
      include: {
        order: true,
        lines: true,
        ledgerEntries: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async getLedger(storeId: string, invoiceId?: string) {
    return billingDb.paymentLedgerEntry.findMany({
      where: {
        storeId,
        ...(invoiceId ? { invoiceId } : {}),
      },
      include: {
        invoice: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async ensureInvoiceForOrder(input: { storeId: string; orderId: string; dueDate?: Date; notes?: string | null }) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, storeId: input.storeId },
      include: { items: true },
    }) as ({
      id: string;
      storeId: string;
      customerEmail: string;
      customerName: string;
      customerId?: string | null;
      shippingAddress: JsonObject;
      billingAddress: JsonObject | null;
      subtotal: number;
      taxAmount: number;
      shippingCost: number;
      totalAmount: number;
      items: Array<{
        quantity: number;
        productId: string;
        unitPrice: number;
        totalPrice: number;
      }>;
    } | null);
    if (!order) throw new Error('Order not found');

    const existing = await billingDb.invoice.findFirst({
      where: { orderId: order.id },
      include: { lines: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    const now = new Date();
    const year = now.getUTCFullYear();

    return prisma.$transaction(async (tx) => {
      const txDb = tx as unknown as BillingDbClient;
      const customer = await txDb.customer.upsert({
        where: { storeId_email: { storeId: order.storeId, email: order.customerEmail } },
        update: {
          name: order.customerName || undefined,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          updatedAt: new Date(),
        },
        create: {
          storeId: order.storeId,
          email: order.customerEmail,
          name: order.customerName,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
        },
      });

      if (!order.customerId) {
        await txDb.order.update({ where: { id: order.id }, data: { customerId: customer.id } });
      }

      const seq = await txDb.invoiceSequence.upsert({
        where: { storeId_year: { storeId: order.storeId, year } },
        update: { nextNumber: { increment: 1 } },
        create: { storeId: order.storeId, year, nextNumber: 2 },
      });
      const sequenceNumber = Math.max(1, Number(seq.nextNumber) - 1);
      const invoiceNumber = formatInvoiceNumber(order.storeId, year, sequenceNumber);

      const subtotalCents = Math.round(Number(order.subtotal || 0) * 100);
      const taxCents = Math.round(Number(order.taxAmount || 0) * 100);
      const shippingCents = Math.round(Number(order.shippingCost || 0) * 100);
      const totalCents = Math.round(Number(order.totalAmount || 0) * 100);

      const created = await (tx as unknown as { invoice: { create(args: unknown): Promise<{ id: string }> } }).invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          status: 'ISSUED',
          currency: 'USD',
          subtotalCents,
          taxCents,
          shippingCents,
          totalCents,
          balanceDueCents: totalCents,
          dueDate: input.dueDate,
          notes: input.notes || undefined,
        },
      });

      const lines = order.items.map((item, index) => ({
        invoiceId: created.id,
        lineNumber: index + 1,
        description: `${item.quantity} × ${item.productId}`,
        quantity: item.quantity,
        unitAmountCents: Math.round(Number(item.unitPrice || 0) * 100),
        totalAmountCents: Math.round(Number(item.totalPrice || 0) * 100),
      }));

      if (lines.length > 0) {
        await txDb.invoiceLine.createMany({ data: lines });
      }

      await txDb.paymentLedgerEntry.create({
        data: {
          storeId: order.storeId,
          orderId: order.id,
          invoiceId: created.id,
          entryType: 'INVOICE_ISSUED',
          amountCents: totalCents,
          currency: 'USD',
          description: `Invoice ${invoiceNumber} issued`,
        },
      });

      return (tx as unknown as { invoice: { findUnique(args: unknown): Promise<unknown> } }).invoice.findUnique({
        where: { id: created.id },
        include: { lines: true, order: true },
      });
    });
  }

  async recordPayment(input: {
    storeId: string;
    invoiceId: string;
    amountCents: number;
    currency?: string;
    description?: string;
    externalRef?: string;
    metadata?: JsonObject;
  }) {
    if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
      throw new Error('amountCents must be positive');
    }

    const invoice = await billingDb.invoice.findFirst({
      where: { id: input.invoiceId, order: { storeId: input.storeId } },
      include: { order: true },
    });
    if (!invoice) throw new Error('Invoice not found');

    return prisma.$transaction(async (tx) => {
      const txDb = tx as unknown as BillingDbClient;
      await txDb.paymentLedgerEntry.create({
        data: {
          storeId: input.storeId,
          orderId: invoice.orderId,
          invoiceId: invoice.id,
          entryType: 'PAYMENT_RECEIVED',
          amountCents: input.amountCents,
          currency: input.currency || invoice.currency || 'USD',
          description: input.description,
          externalRef: input.externalRef,
          metadata: input.metadata,
        },
      });

      const nextBalance = Math.max(0, Number(invoice.balanceDueCents || 0) - input.amountCents);
      const nextStatus = nextBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

      const updated = await (tx as unknown as { invoice: { update(args: unknown): Promise<unknown> } }).invoice.update({
        where: { id: invoice.id },
        data: {
          balanceDueCents: nextBalance,
          status: nextStatus,
          paidAt: nextBalance === 0 ? new Date() : invoice.paidAt,
        },
        include: {
          lines: true,
          ledgerEntries: { orderBy: { createdAt: 'asc' } },
          order: true,
        },
      });

      return updated;
    });
  }
}

export default new OrderBillingService();
