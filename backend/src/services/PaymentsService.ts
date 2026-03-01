import prisma from '../lib/prisma.js';
import { getPaymentsProvider } from '../providers/payments/index.js';
import { PaymentIntentInput } from '../providers/payments/PaymentsProvider.js';

export class PaymentsService {
  private provider = getPaymentsProvider();

  async healthcheck() {
    return this.provider.healthcheck();
  }

  async createIntent(input: PaymentIntentInput) {
    if (input.amountCents <= 0) {
      throw new Error('amountCents must be > 0');
    }

    return this.provider.createPaymentIntent(input);
  }

  async applyRefund(input: { storeId: string; invoiceId: string; providerRef: string; amountCents: number; currency?: string }) {
    if (input.amountCents <= 0) {
      throw new Error('amountCents must be > 0');
    }

    const refund = await this.provider.refundPayment({
      providerRef: input.providerRef,
      amountCents: input.amountCents,
      reason: 'requested_by_store',
      metadata: {
        storeId: input.storeId,
        invoiceId: input.invoiceId,
      },
    });

    await (prisma as any).paymentLedgerEntry.create({
      data: {
        storeId: input.storeId,
        invoiceId: input.invoiceId,
        orderId: await this.resolveOrderIdByInvoice(input.invoiceId),
        entryType: 'REFUND',
        amountCents: input.amountCents,
        currency: input.currency || 'USD',
        externalRef: refund.providerRef,
        description: 'Refund recorded via PaymentsService',
      },
    });

    return refund;
  }

  async reconcileInvoiceBalance(invoiceId: string) {
    const invoice = await (prisma as any).invoice.findUnique({
      where: { id: invoiceId },
      include: { ledgerEntries: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const totals = (invoice.ledgerEntries || []).reduce(
      (acc: { payments: number; refunds: number; adjustments: number }, row: any) => {
        const amount = Number(row.amountCents || 0);
        if (row.entryType === 'PAYMENT_RECEIVED') acc.payments += amount;
        if (row.entryType === 'REFUND') acc.refunds += amount;
        if (row.entryType === 'ADJUSTMENT') acc.adjustments += amount;
        return acc;
      },
      { payments: 0, refunds: 0, adjustments: 0 }
    );

    const computedBalance = Number(invoice.totalCents || 0) - totals.payments + totals.refunds - totals.adjustments;

    const updated = await (prisma as any).invoice.update({
      where: { id: invoiceId },
      data: {
        balanceDueCents: Math.max(0, computedBalance),
        status: computedBalance <= 0 ? 'PAID' : invoice.status,
        paidAt: computedBalance <= 0 ? new Date() : invoice.paidAt,
      },
    });

    return {
      invoiceId,
      totals,
      balanceDueCents: updated.balanceDueCents,
      status: updated.status,
    };
  }

  async verifyWebhook(payload: unknown, headers: Record<string, string | undefined>) {
    return this.provider.parseWebhookEvent(payload, headers);
  }

  private async resolveOrderIdByInvoice(invoiceId: string): Promise<string> {
    const invoice = await (prisma as any).invoice.findUnique({ where: { id: invoiceId }, select: { orderId: true } });
    if (!invoice?.orderId) {
      throw new Error('Invoice order relation missing');
    }
    return String(invoice.orderId);
  }
}

export default new PaymentsService();
