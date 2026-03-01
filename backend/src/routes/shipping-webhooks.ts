import { Router } from 'express';
import { getShippingProvider } from '../providers/shipping/index.js';

const router = Router();

router.post('/webhook/:provider', async (req, res) => {
  const configuredProvider = String(process.env.SHIPPING_PROVIDER || 'mock').toLowerCase();
  const requestedProvider = String(req.params.provider || '').toLowerCase();

  if (requestedProvider && requestedProvider !== configuredProvider) {
    return res.status(400).json({ error: 'Provider mismatch' });
  }

  const provider = getShippingProvider();
  const verification = await provider.parseWebhookEvent(req.body, {
    'x-webhook-secret': req.header('x-webhook-secret') || undefined,
  });

  if (!verification.accepted) {
    return res.status(400).json({ error: verification.reason || 'Webhook rejected' });
  }

  return res.status(202).json({ accepted: true, eventType: verification.eventType || 'TRACKING_UPDATE' });
});

export default router;
