export type CheckoutPayload = {
  storeId: string;
  userId: string;
  cartId: string;
  shipping: {
    name: string;
    email: string;
    address: any;
  };
};

export type PaymentIntent = {
  id: string;
  clientSecret?: string;
  status: 'requires_confirmation' | 'succeeded' | 'failed' | 'processing';
  provider: 'mock' | 'stripe';
  metadata?: Record<string, any>;
};

export interface PaymentService {
  createPaymentIntent(payload: CheckoutPayload): Promise<PaymentIntent>;
  // For mock provider, allow programmatic confirmation
  confirmPayment?(intentId: string): Promise<PaymentIntent>;
  // Webhook handler will be implemented at route level, but interface provided for parity
}
