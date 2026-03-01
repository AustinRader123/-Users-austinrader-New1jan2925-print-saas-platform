import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import BillingService from '../services/BillingService.js';
import FeatureGateService from '../services/FeatureGateService.js';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('billing.manage'));

const checkoutSchema = z.object({
  planCode: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});

router.get('/snapshot', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const snapshot = await BillingService.getTenantBillingSnapshot(tenantId);
  const gate = await FeatureGateService.snapshot(tenantId);
  res.json({ ...snapshot, gate });
});

router.post('/checkout', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const session = await BillingService.createCheckoutSession({
    tenantId,
    planCode: parsed.data.planCode,
    successUrl: parsed.data.successUrl,
    cancelUrl: parsed.data.cancelUrl,
    userId: req.userId,
  });

  res.status(201).json(session);
});

router.post('/cancel', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const out = await BillingService.cancelSubscription(tenantId);
  res.json(out);
});

router.get('/events', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const events = await BillingService.listBillingEvents(tenantId);
  res.json(events);
});

export default router;
