import { randomUUID } from 'node:crypto';
import {
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
    const prefix = input.invoiceId || input.orderId || input.storeId;
    const providerRef = `mock_pi_${String(prefix).slice(0, 12)}_${Date.now()}`;
    return {
      id: randomUUID(),
      provider: 'mock',
      providerRef,
      status: 'requires_confirmation',
      clientSecret: `mock_secret_${providerRef}`,
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
