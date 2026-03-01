import { Router } from 'express';
import { getShippingProvider } from '../providers/shipping/index.js';

const router = Router();

router.post('/webhook/:provider', async (req, res) => {
  const configuredProvider = String(process.env.SHIPPING_PROVIDER || 'mock').toLowerCase();
  const requestedProvider = String(req.params.provider || '').toLowerCase();

  if (!requestedProvider || !['mock', 'shippo', 'easypost'].includes(requestedProvider)) {
    return res.status(404).json({ error: 'Unknown shipping provider' });
  }

  if (requestedProvider !== configuredProvider) {
    return res.status(404).json({ error: 'Provider not active' });
  }

  const provider = getShippingProvider();
  const verification = await provider.parseWebhookEvent(req.body, {
    'x-webhook-secret': req.header('x-webhook-secret') || undefined,
  });

  if (!verification.accepted) {
    return res.status(400).json({ error: verification.reason || 'Webhook rejected' });
  }

  return res.status(200).json({ ok: true, provider: requestedProvider, eventType: verification.eventType || 'TRACKING_UPDATE' });
});

export default router;
