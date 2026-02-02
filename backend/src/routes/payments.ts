import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import CheckoutService from '../services/CheckoutService.js';
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
