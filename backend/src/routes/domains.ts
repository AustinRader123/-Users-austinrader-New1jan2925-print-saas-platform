import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('domains.manage'));

const createSchema = z.object({
  storeId: z.string().min(1).optional(),
  hostname: z.string().min(1),
});

router.get('/', async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '');
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const rows = await (prisma as any).storeDomain.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const storeId = parsed.data.storeId || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const verificationToken = crypto.randomBytes(16).toString('hex');
  const domain = await (prisma as any).storeDomain.create({
    data: {
      storeId,
      hostname: parsed.data.hostname.toLowerCase(),
      status: 'PENDING',
      verificationToken,
    },
  });

  res.status(201).json(domain);
});

router.post('/:id/verify', async (req: AuthRequest, res) => {
  const manualActivate = Boolean(req.body?.manualActivate);
  const token = String(req.body?.token || '');

  const domain = await (prisma as any).storeDomain.findUnique({ where: { id: req.params.id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  const tokenValid = token && token === domain.verificationToken;
  const canActivate = tokenValid || (manualActivate && String(process.env.ALLOW_MANUAL_DOMAIN_ACTIVATION || 'true') === 'true');

  if (!canActivate) {
    return res.status(400).json({ error: 'Domain verification failed' });
  }

  const updated = await (prisma as any).storeDomain.update({
    where: { id: domain.id },
    data: {
      status: 'ACTIVE',
      verifiedAt: new Date(),
    },
  });

  res.json(updated);
});

router.post('/:id/disable', async (req: AuthRequest, res) => {
  const domain = await (prisma as any).storeDomain.findUnique({ where: { id: req.params.id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  const updated = await (prisma as any).storeDomain.update({
    where: { id: domain.id },
    data: {
      status: 'DISABLED',
    },
  });

  res.json(updated);
});

export default router;
