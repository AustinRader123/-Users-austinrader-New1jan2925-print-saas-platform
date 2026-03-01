import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import NotificationService from '../services/NotificationService.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('comms.manage'));

const templateSchema = z.object({
  storeId: z.string().min(1),
  key: z.string().min(1),
  channel: z.enum(['EMAIL', 'SMS']),
  subject: z.string().optional(),
  body: z.string().min(1),
  isActive: z.boolean().optional(),
});

router.get('/templates', async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const rows = await (prisma as any).notificationTemplate.findMany({
    where: { storeId },
    orderBy: [{ key: 'asc' }, { createdAt: 'asc' }],
  });
  return res.json(rows);
});

router.put('/templates/:key', async (req: AuthRequest, res) => {
  const parsed = templateSchema.safeParse({ ...req.body, key: req.params.key });
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const row = await (prisma as any).notificationTemplate.upsert({
    where: { storeId_key: { storeId: parsed.data.storeId, key: parsed.data.key } },
    update: {
      channel: parsed.data.channel,
      subject: parsed.data.subject,
      body: parsed.data.body,
      isActive: parsed.data.isActive ?? true,
    },
    create: {
      storeId: parsed.data.storeId,
      key: parsed.data.key,
      channel: parsed.data.channel,
      subject: parsed.data.subject,
      body: parsed.data.body,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return res.json(row);
});

router.get('/outbox', async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const take = Math.max(1, Math.min(200, Number(req.query.take || 100)));

  const rows = await (prisma as any).notificationOutbox.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return res.json(rows);
});

router.post('/outbox/process', async (req: AuthRequest, res) => {
  const limit = Number(req.body?.limit || 50);
  const out = await NotificationService.processPending({ limit });
  return res.json(out);
});

router.post('/outbox/:id/retry', async (req: AuthRequest, res) => {
  const row = await (prisma as any).notificationOutbox.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Outbox row not found' });

  await (prisma as any).notificationOutbox.update({
    where: { id: req.params.id },
    data: { status: 'PENDING', lastError: null },
  });

  const out = await NotificationService.processPending({ limit: 1 });
  return res.json(out);
});

export default router;
