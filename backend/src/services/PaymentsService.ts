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

    const currency = String(input.currency || 'USD').toUpperCase();
    const localIntent = await (prisma as any).paymentIntent.create({
      data: {
        storeId: input.storeId,
        orderId: input.orderId,
        invoiceId: input.invoiceId,
        provider: String(process.env.PAYMENTS_PROVIDER || 'mock').toLowerCase(),
        status: 'requires_confirmation',
        amountCents: Number(input.amountCents),
        currency,
        metadata: input.metadata || {},
      },
    });

    const providerIntent = await this.provider.createPaymentIntent(input);

    const updated = await (prisma as any).paymentIntent.update({
      where: { id: localIntent.id },
      data: {
        provider: providerIntent.provider,
        providerRef: providerIntent.providerRef,
        clientSecret: providerIntent.clientSecret,
        status: providerIntent.status,
      },
    });

    return {
      id: updated.id,
      provider: updated.provider,
      providerRef: updated.providerRef,
      status: updated.status,
      clientSecret: updated.clientSecret,
      amountCents: updated.amountCents,
      currency: updated.currency,
      invoiceId: updated.invoiceId,
      orderId: updated.orderId,
    };
  }

  async confirmIntent(input: { storeId: string; paymentIntentId: string }) {
    const intent = await (prisma as any).paymentIntent.findFirst({
      where: { id: input.paymentIntentId, storeId: input.storeId },
    });
    if (!intent) {
      throw new Error('PaymentIntent not found');
    }
    if (!intent.providerRef) {
      throw new Error('PaymentIntent missing providerRef');
    }

    const confirmation = await this.provider.confirmPaymentIntent(String(intent.providerRef));

    const confirmedIntent = await (prisma as any).paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: confirmation.status,
        confirmedAt: confirmation.status === 'succeeded' ? new Date() : null,
      },
    });

    if (confirmation.status !== 'succeeded') {
      return { ok: false, intent: confirmedIntent };
    }

    const invoice = intent.invoiceId
      ? await (prisma as any).invoice.findUnique({ where: { id: intent.invoiceId } })
      : null;
    const orderId = intent.orderId || invoice?.orderId;
    if (!orderId) {
      throw new Error('Cannot resolve orderId for ledger entry');
    }

    await (prisma as any).paymentLedgerEntry.create({
      data: {
        storeId: input.storeId,
        orderId,
        invoiceId: intent.invoiceId,
        entryType: 'CHARGE',
        amountCents: Number(intent.amountCents),
        currency: String(intent.currency || 'USD'),
        externalRef: String(intent.providerRef),
        description: 'Charge recorded from payment intent confirmation',
      },
    });

    const reconciliation = intent.invoiceId ? await this.reconcileInvoiceBalance(String(intent.invoiceId)) : null;

    return {
      ok: true,
      intent: confirmedIntent,
      reconciliation,
    };
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
        if (row.entryType === 'PAYMENT_RECEIVED' || row.entryType === 'CHARGE') acc.payments += amount;
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
