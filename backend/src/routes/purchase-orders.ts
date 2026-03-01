import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import PurchaseOrderService from '../services/PurchaseOrderService.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']));

const createSchema = z.object({
  storeId: z.string().min(1),
  supplierName: z.string().min(1),
  expectedAt: z.string().optional(),
});
const addLineSchema = z.object({
  storeId: z.string().min(1),
  variantId: z.string().min(1),
  qtyOrdered: z.number().int().positive(),
  costEach: z.number().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const out = await PurchaseOrderService.list(storeId);
  return res.json(out);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const po = await PurchaseOrderService.get(storeId, req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  return res.json(po);
});

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const po = await PurchaseOrderService.create(parsed.data.storeId, parsed.data);
  return res.status(201).json(po);
});

router.post('/:id/lines', async (req, res) => {
  const parsed = addLineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const line = await PurchaseOrderService.addLine(parsed.data.storeId, req.params.id, parsed.data);
  return res.status(201).json(line);
});

router.put('/:id/status', async (req, res) => {
  const storeId = (req.body?.storeId as string) || '';
  const status = String(req.body?.status || '').toUpperCase();
  if (!storeId || !status) return res.status(400).json({ error: 'storeId and status required' });

  const out = await PurchaseOrderService.updateStatus(storeId, req.params.id, status);
  return res.json(out);
});

router.post('/:id/receive', async (req: AuthRequest, res) => {
  const storeId = String(req.body?.storeId || '');
  const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
  if (!storeId || lines.length === 0) return res.status(400).json({ error: 'storeId and lines required' });

  const out = await PurchaseOrderService.receive(storeId, req.params.id, lines, req.userId);
  return res.status(201).json(out);
});

export default router;
