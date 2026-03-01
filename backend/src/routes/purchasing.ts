import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import PurchasingV2Service from '../services/PurchasingV2Service.js';

const router = Router();
router.use(authMiddleware);
router.use(requireFeature('inventory.enabled'));

const createPoSchema = z.object({
  storeId: z.string().min(1),
  supplierName: z.string().min(1),
  expectedAt: z.string().optional(),
  lines: z.array(z.object({
    skuId: z.string().optional(),
    variantId: z.string().optional(),
    qtyOrdered: z.number().int().positive(),
    unitCostCents: z.number().int().nonnegative().optional(),
    expectedAt: z.string().optional(),
  })).optional(),
});

const addLineSchema = z.object({
  storeId: z.string().min(1),
  skuId: z.string().optional(),
  variantId: z.string().optional(),
  qtyOrdered: z.number().int().positive(),
  unitCostCents: z.number().int().nonnegative().optional(),
  expectedAt: z.string().optional(),
});

const receiveSchema = z.object({
  storeId: z.string().min(1),
  locationId: z.string().min(1),
  lines: z.array(z.object({
    lineId: z.string().min(1),
    qtyReceived: z.number().int().positive(),
  })).min(1),
});

router.get('/pos', requirePermission('production.view'), async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const rows = await PurchasingV2Service.list(storeId);
  return res.json(rows);
});

router.get('/pos/:id', requirePermission('production.view'), async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const row = await PurchasingV2Service.get(storeId, req.params.id);
  if (!row) return res.status(404).json({ error: 'Purchase order not found' });
  return res.json(row);
});

router.post('/pos', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const parsed = createPoSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const row = await PurchasingV2Service.create(parsed.data);
  return res.status(201).json(row);
});

router.post('/pos/:id/lines', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const parsed = addLineSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const row = await PurchasingV2Service.addLine({
    ...parsed.data,
    purchaseOrderId: req.params.id,
  });
  return res.status(201).json(row);
});

router.post('/pos/:id/send', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const storeId = (req.body?.storeId as string) || (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const row = await PurchasingV2Service.send(storeId, req.params.id);
  return res.json(row);
});

router.post('/pos/:id/receive', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const parsed = receiveSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const row = await PurchasingV2Service.receive({
    ...parsed.data,
    purchaseOrderId: req.params.id,
    actorUserId: req.userId,
  });
  return res.json(row);
});

router.post('/pos/:id/close', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const storeId = (req.body?.storeId as string) || (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const row = await PurchasingV2Service.close(storeId, req.params.id);
  return res.json(row);
});

export default router;
