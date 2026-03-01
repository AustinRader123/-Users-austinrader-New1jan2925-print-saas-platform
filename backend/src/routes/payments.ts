import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import CheckoutService from '../services/CheckoutService.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import { roleMiddleware } from '../middleware/auth.js';
import PaymentsService from '../services/PaymentsService.js';
import logger from '../logger.js';

const router = Router();

// Start checkout: returns payment intent info
router.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, cartId, shipping } = req.body;
    if (!storeId || !cartId || !shipping || !shipping.name || !shipping.email || !shipping.address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await CheckoutService.startCheckout({
      storeId,
      userId: req.userId!,
      cartId,
      shipping,
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to start checkout' });
  }
});

router.post(
  '/payments/intent',
  authMiddleware,
  roleMiddleware(['ADMIN', 'STORE_OWNER']),
  requireFeature('payments.enabled'),
  requirePermission('billing.manage'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { storeId, amountCents, currency, invoiceId, orderId, metadata } = req.body || {};
      if (!storeId || !amountCents) {
        return res.status(400).json({ error: 'storeId and amountCents are required' });
      }

      const intent = await PaymentsService.createIntent({
        storeId: String(storeId),
        amountCents: Number(amountCents),
        currency: String(currency || 'USD').toUpperCase(),
        invoiceId: invoiceId ? String(invoiceId) : undefined,
        orderId: orderId ? String(orderId) : undefined,
        metadata: metadata || {},
      });

      return res.status(201).json(intent);
    } catch (error: any) {
      logger.error('Create payment intent error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create payment intent' });
    }
  }
);

router.post(
  '/payments/confirm',
  authMiddleware,
  roleMiddleware(['ADMIN', 'STORE_OWNER']),
  requireFeature('payments.enabled'),
  requirePermission('billing.manage'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { storeId, paymentIntentId } = req.body || {};
      if (!storeId || !paymentIntentId) {
        return res.status(400).json({ error: 'storeId and paymentIntentId are required' });
      }

      const out = await PaymentsService.confirmIntent({
        storeId: String(storeId),
        paymentIntentId: String(paymentIntentId),
      });
      return res.status(200).json(out);
    } catch (error: any) {
      logger.error('Confirm payment intent error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to confirm payment intent' });
    }
  }
);

// Generic webhook endpoint (mock-friendly)
router.post('/payments/webhook', async (req, res) => {
  try {
    const { provider, event, data } = req.body || {};
    if (provider === 'mock' && event === 'payment_succeeded') {
      const intentId = data?.intentId as string;
      if (!intentId) return res.status(400).json({ error: 'Missing intentId' });
      const out = await CheckoutService.handleMockConfirmation(intentId);
      return res.json(out);
    }
    return res.status(400).json({ error: 'Unsupported webhook event/provider' });
  } catch (err) {
    logger.error('Payments webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Convenience endpoint for mock confirmation in dev
router.post('/payments/mock/confirm', async (req, res) => {
  try {
    const { intentId } = req.body || {};
    if (!intentId) return res.status(400).json({ error: 'Missing intentId' });
    const out = await CheckoutService.handleMockConfirmation(intentId);
    res.json(out);
  } catch (err) {
    logger.error('Mock confirm error:', err);
    res.status(500).json({ error: 'Mock confirm failed' });
  }
});

export default router;
