import { PaymentService, CheckoutPayload, PaymentIntent } from './PaymentService.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory mock store for payment intents
const mockIntents = new Map<string, PaymentIntent>();

export class MockPaymentService implements PaymentService {
  async createPaymentIntent(payload: CheckoutPayload): Promise<PaymentIntent> {
    const id = `pi_${uuidv4()}`;
    const intent: PaymentIntent = {
      id,
      status: 'requires_confirmation',
      provider: 'mock',
      metadata: {
        storeId: payload.storeId,
        userId: payload.userId,
        cartId: payload.cartId,
        shipping: payload.shipping,
      },
    };
    mockIntents.set(id, intent);
    return intent;
  }

  async confirmPayment(intentId: string): Promise<PaymentIntent> {
    const found = mockIntents.get(intentId);
    if (!found) throw new Error('Payment intent not found');
    const updated: PaymentIntent = { ...found, status: 'succeeded' };
    mockIntents.set(intentId, updated);
    return updated;
  }
}

export default new MockPaymentService();
