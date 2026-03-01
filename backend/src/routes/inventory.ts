import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import InventoryService from '../services/InventoryService.js';
import AuditService from '../services/AuditService.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']));

const adjustSchema = z.object({
  storeId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int(),
  note: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const items = await InventoryService.list(
    storeId,
    req.query.productId ? String(req.query.productId) : undefined,
    req.query.variantId ? String(req.query.variantId) : undefined,
  );
  return res.json(items);
});

router.post('/adjust', async (req: AuthRequest, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const out = await InventoryService.adjust({ ...parsed.data, actorUserId: req.userId });
  await AuditService.log({
    actorType: 'Admin',
    actorUserId: req.userId,
    action: 'inventory.adjusted',
    entityType: 'InventoryItem',
    entityId: out.id,
    meta: parsed.data,
  });
  return res.status(201).json(out);
});

export default router;
