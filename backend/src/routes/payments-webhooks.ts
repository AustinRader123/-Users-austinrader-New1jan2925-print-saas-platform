import { Router } from 'express';
import crypto from 'crypto';
import PaymentsService from '../services/PaymentsService.js';
import { isProd } from '../config/providers.js';
import { PROD } from '../config/prod.js';

const router = Router();

function isValidHmac(payload: unknown, secret: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload || {})).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

router.post('/webhook/:provider', async (req, res) => {
  const configuredBase = String(process.env.PAYMENTS_PROVIDER || 'mock').toLowerCase();
  const configuredProvider = configuredBase === 'real'
    ? String(process.env.PAYMENTS_REAL_PROVIDER || 'stripe').toLowerCase()
    : configuredBase;
  const requestedProvider = String(req.params.provider || '').toLowerCase();

  if (!requestedProvider || !['mock', 'stripe', 'real'].includes(requestedProvider)) {
    return res.status(404).json({ error: 'Unknown payments provider' });
  }

  const requestedResolved = requestedProvider === 'real'
    ? String(process.env.PAYMENTS_REAL_PROVIDER || 'stripe').toLowerCase()
    : requestedProvider;

  if (requestedResolved !== configuredProvider) {
    return res.status(404).json({ error: 'Provider not active' });
  }

  if (isProd() && PROD.requireWebhookSignatures && PROD.requirePaymentWebhookSig) {
    const secret = String(process.env.PAYMENTS_WEBHOOK_SECRET || '').trim();
    const signature = String(req.header('x-webhook-signature') || '').trim();
    if (!secret) {
      return res.status(500).json({ error: 'PAYMENTS_WEBHOOK_SECRET is required in production' });
    }
    if (!signature) {
      return res.status(400).json({ error: 'Missing x-webhook-signature' });
    }
    if (!isValidHmac(req.body, secret, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  const verification = await PaymentsService.verifyWebhook(req.body, {
    'stripe-signature': req.header('stripe-signature') || undefined,
    'x-webhook-secret': req.header('x-webhook-secret') || undefined,
  });

  if (!verification.accepted) {
    return res.status(400).json({ error: verification.reason || 'Webhook rejected' });
  }

  return res.status(200).json({ ok: true, provider: requestedResolved, eventType: verification.eventType || 'unknown' });
});

export default router;
