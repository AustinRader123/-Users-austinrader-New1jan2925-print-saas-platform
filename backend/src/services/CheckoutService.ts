import { PrismaClient } from '@prisma/client';
import MockPaymentService from './MockPaymentService.js';
import { CheckoutPayload, PaymentService } from './PaymentService.js';
import OrderService from './OrderService.js';
import ProductionService from './ProductionService.js';

const prisma = new PrismaClient();

// Basic provider selection: use Mock unless a real provider is configured per store.
async function getPaymentServiceForStore(storeId: string): Promise<PaymentService> {
  const config = await prisma.paymentConfig.findUnique({ where: { storeId } });
  // TODO: Add StripePaymentService when stripeSecretKey is present.
  return MockPaymentService;
}

export class CheckoutService {
  async startCheckout(payload: CheckoutPayload) {
    const paymentService = await getPaymentServiceForStore(payload.storeId);

    // Validate cart exists and has items
    const cart = await prisma.cart.findUnique({
      where: { id: payload.cartId },
      include: {
        items: { include: { pricingSnapshot: true } },
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty or not found');
    }

    // Create payment intent with metadata snapshot
    const intent = await paymentService.createPaymentIntent(payload);

    return {
      provider: intent.provider,
      intentId: intent.id,
      clientSecret: intent.clientSecret,
      status: intent.status,
    };
  }

  async handleMockConfirmation(intentId: string) {
    const intent = await MockPaymentService.confirmPayment!(intentId);
    if (intent.status === 'succeeded') {
      const { storeId, userId, cartId, shipping } = (intent.metadata || {}) as any;
      // Create immutable order snapshot from cart
      const order = await OrderService.createOrder(storeId, userId, cartId, shipping);
      if (!order) {
        throw new Error('Order creation failed');
      }
      // Auto-create production job post-payment
      await ProductionService.createProductionJob(order.id);
      // Mark payment as recorded in DB
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          paymentMethod: 'COD',
          status: 'PAID',
          transactionId: intent.id,
          metadata: intent.metadata || {},
        },
      });
      await OrderService.updatePaymentStatus(order.id, 'PAID');
      return { status: 'ok', orderId: order.id };
    }
    return { status: 'pending' };
  }
}

export default new CheckoutService();
