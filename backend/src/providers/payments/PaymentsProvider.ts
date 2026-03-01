export type PaymentIntentInput = {
  storeId: string;
  amountCents: number;
  currency?: string;
  invoiceId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

export type PaymentIntentResult = {
  id: string;
  provider: string;
  providerRef: string;
  status: 'requires_confirmation' | 'succeeded' | 'failed';
  clientSecret?: string;
};

export type RefundInput = {
  providerRef: string;
  amountCents?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type RefundResult = {
  id: string;
  provider: string;
  providerRef: string;
  status: 'succeeded' | 'failed';
};

export type ProviderHealthcheck = {
  ok: boolean;
  provider: string;
  message?: string;
};

export interface PaymentsProvider {
  healthcheck(): Promise<ProviderHealthcheck>;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
  parseWebhookEvent(payload: unknown, headers: Record<string, string | undefined>): Promise<{
    accepted: boolean;
    eventType?: string;
    providerRef?: string;
    amountCents?: number;
    raw?: unknown;
    reason?: string;
  }>;
}
