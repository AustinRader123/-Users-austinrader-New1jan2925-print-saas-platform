import { randomUUID } from 'node:crypto';
import {
  ConfirmPaymentIntentResult,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentsProvider,
  ProviderHealthcheck,
  RefundInput,
  RefundResult,
} from '../PaymentsProvider.js';

export class MockPaymentsProvider implements PaymentsProvider {
  async healthcheck(): Promise<ProviderHealthcheck> {
    return { ok: true, provider: 'mock', message: 'Mock payments provider ready' };
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const prefix = String(input.invoiceId || input.orderId || input.storeId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'store';
    const amountPart = Math.max(0, Number(input.amountCents || 0));
    const providerRef = `mock_pi_${prefix}_${amountPart}`;
    return {
      id: randomUUID(),
      provider: 'mock',
      providerRef,
      status: 'requires_confirmation',
      clientSecret: 'mock_secret',
    };
  }

  async confirmPaymentIntent(providerRef: string): Promise<ConfirmPaymentIntentResult> {
    return {
      provider: 'mock',
      providerRef,
      status: 'succeeded',
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    return {
      id: randomUUID(),
      provider: 'mock',
      providerRef: input.providerRef,
      status: 'succeeded',
    };
  }

  async parseWebhookEvent(payload: unknown, _headers: Record<string, string | undefined>) {
    const body = (payload || {}) as any;
    if (body?.event === 'payment_succeeded' && body?.providerRef) {
      return {
        accepted: true,
        eventType: 'payment_succeeded',
        providerRef: String(body.providerRef),
        amountCents: Number(body.amountCents || 0),
        raw: payload,
      };
    }
    return {
      accepted: false,
      reason: 'Unsupported mock webhook payload',
      raw: payload,
    };
  }
}

export default MockPaymentsProvider;
