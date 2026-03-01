import Stripe from 'stripe';
import {
  ConfirmPaymentIntentResult,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentsProvider,
  ProviderHealthcheck,
  RefundInput,
  RefundResult,
} from '../PaymentsProvider.js';

export class StripePaymentsProvider implements PaymentsProvider {
  private readonly stripe?: Stripe;
  private readonly webhookSecret: string;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY || '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    this.stripe = key ? new Stripe(key, { apiVersion: '2023-10-16' as any }) : undefined;
  }

  private assertReady() {
    if (!this.stripe) {
      throw new Error('Stripe provider is not configured (missing STRIPE_SECRET_KEY)');
    }
  }

  async healthcheck(): Promise<ProviderHealthcheck> {
    if (!this.stripe) {
      return { ok: false, provider: 'stripe', message: 'Missing STRIPE_SECRET_KEY' };
    }

    try {
      await this.stripe.balance.retrieve();
      return { ok: true, provider: 'stripe', message: 'Stripe API reachable' };
    } catch (error: any) {
      return { ok: false, provider: 'stripe', message: error?.message || 'Stripe healthcheck failed' };
    }
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    this.assertReady();
    const intent = await this.stripe!.paymentIntents.create({
      amount: input.amountCents,
      currency: (input.currency || 'usd').toLowerCase(),
      metadata: {
        storeId: input.storeId,
        invoiceId: input.invoiceId || '',
        orderId: input.orderId || '',
        ...(input.metadata || {}),
      },
      automatic_payment_methods: { enabled: true },
    });

    return {
      id: intent.id,
      provider: 'stripe',
      providerRef: intent.id,
      status: intent.status === 'succeeded' ? 'succeeded' : intent.status === 'canceled' ? 'failed' : 'requires_confirmation',
      clientSecret: intent.client_secret || undefined,
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    this.assertReady();
    const refund = await this.stripe!.refunds.create({
      payment_intent: input.providerRef,
      ...(input.amountCents ? { amount: input.amountCents } : {}),
      ...(input.reason ? { reason: input.reason as any } : {}),
      metadata: (input.metadata || {}) as Stripe.MetadataParam,
    });

    return {
      id: refund.id,
      provider: 'stripe',
      providerRef: refund.payment_intent as string,
      status: refund.status === 'failed' ? 'failed' : 'succeeded',
    };
  }

  async confirmPaymentIntent(providerRef: string): Promise<ConfirmPaymentIntentResult> {
    this.assertReady();
    const intent = await this.stripe!.paymentIntents.confirm(providerRef);
    return {
      provider: 'stripe',
      providerRef: intent.id,
      status: intent.status === 'succeeded' ? 'succeeded' : 'failed',
      amountCents: Number(intent.amount || 0),
    };
  }

  async parseWebhookEvent(payload: unknown, headers: Record<string, string | undefined>) {
    if (!this.webhookSecret) {
      return { accepted: false, reason: 'Missing STRIPE_WEBHOOK_SECRET', raw: payload };
    }

    const sharedSecret = headers['x-webhook-secret'];
    if (sharedSecret && sharedSecret === this.webhookSecret) {
      const body = (payload || {}) as any;
      return {
        accepted: true,
        eventType: body?.type,
        providerRef: body?.data?.object?.id,
        amountCents: Number(body?.data?.object?.amount_received || body?.data?.object?.amount || 0),
        raw: payload,
      };
    }

    return {
      accepted: false,
      reason: 'Unsupported webhook verification mode; provide x-webhook-secret',
      raw: payload,
    };
  }
}

export default StripePaymentsProvider;
