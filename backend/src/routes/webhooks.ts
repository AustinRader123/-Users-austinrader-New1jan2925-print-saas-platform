import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import WebhookService from '../services/WebhookService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const createSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1).optional(),
  url: z.string().url(),
  secret: z.string().min(8),
  isActive: z.boolean().optional(),
  eventTypes: z.array(z.string()).optional(),
});

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('webhooks.manage'));
router.use(requireFeature('webhooks.enabled'));

router.get('/endpoints', async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const endpoints = await (prisma as any).webhookEndpoint.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
  return res.json(endpoints);
});

router.post('/endpoints', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const endpoint = await (prisma as any).webhookEndpoint.create({
    data: {
      storeId: parsed.data.storeId,
      name: parsed.data.name,
      url: parsed.data.url,
      secret: parsed.data.secret,
      isActive: parsed.data.isActive ?? true,
      eventTypes: parsed.data.eventTypes || [],
    },
  });
  return res.status(201).json(endpoint);
});

router.put('/endpoints/:id', async (req, res) => {
  const storeId = String(req.body?.storeId || '');
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const endpoint = await (prisma as any).webhookEndpoint.updateMany({
    where: { id: req.params.id, storeId },
    data: {
      ...(req.body?.name !== undefined ? { name: String(req.body.name || '').trim() || null } : {}),
      ...(req.body?.url !== undefined ? { url: req.body.url } : {}),
      ...(req.body?.secret !== undefined ? { secret: req.body.secret } : {}),
      ...(req.body?.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {}),
      ...(req.body?.eventTypes !== undefined ? { eventTypes: req.body.eventTypes } : {}),
    },
  });
  return res.json(endpoint);
});

router.delete('/endpoints/:id', async (req, res) => {
  const storeId = String(req.query.storeId || req.body?.storeId || '');
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  await (prisma as any).webhookEndpoint.deleteMany({ where: { id: req.params.id, storeId } });
  return res.json({ ok: true });
});

router.post('/endpoints/:id/test', async (req, res) => {
  const storeId = String(req.body?.storeId || req.query.storeId || '');
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const delivery = await WebhookService.testEndpoint(storeId, req.params.id);
  return res.status(201).json(delivery);
});

router.get('/deliveries', async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const deliveries = await (prisma as any).webhookDelivery.findMany({
    where: { storeId },
    include: { webhookEndpoint: true },
    orderBy: { createdAt: 'desc' },
    take: req.query.take ? Number(req.query.take) : 100,
  });
  return res.json(deliveries);
});

router.post('/deliveries/process', async (_req, res) => {
  const limit = Number(_req.body?.limit || 50);
  const out = await WebhookService.processPending({ limit });
  return res.json(out);
});

router.post('/deliveries/:id/retry', async (req, res) => {
  const delivery = await WebhookService.retryDelivery(req.params.id);
  if (!delivery) {
    return res.status(404).json({ error: 'Delivery not found' });
  }
  return res.json(delivery);
});

export default router;
