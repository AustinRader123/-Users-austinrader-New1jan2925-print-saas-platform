import { Router } from 'express';
import PaymentsService from '../services/PaymentsService.js';

const router = Router();

router.post('/webhook/:provider', async (req, res) => {
  const configuredProvider = String(process.env.PAYMENTS_PROVIDER || 'mock').toLowerCase();
  const requestedProvider = String(req.params.provider || '').toLowerCase();

  if (!requestedProvider || !['mock', 'stripe'].includes(requestedProvider)) {
    return res.status(404).json({ error: 'Unknown payments provider' });
  }

  if (requestedProvider !== configuredProvider) {
    return res.status(404).json({ error: 'Provider not active' });
  }

  if (requestedProvider === 'mock') {
    return res.status(200).json({ ok: true, provider: 'mock' });
  }

  const verification = await PaymentsService.verifyWebhook(req.body, {
    'stripe-signature': req.header('stripe-signature') || undefined,
    'x-webhook-secret': req.header('x-webhook-secret') || undefined,
  });

  if (!verification.accepted) {
    return res.status(400).json({ error: verification.reason || 'Webhook rejected' });
  }

  return res.status(200).json({ ok: true, provider: requestedProvider, eventType: verification.eventType || 'unknown' });
});

export default router;
