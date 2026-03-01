import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import TeamStoreService from '../services/TeamStoreService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const createSchema = z.object({
  storeId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: z.string().optional(),
  closeAt: z.string().optional(),
  minOrderQty: z.number().int().optional(),
  fundraiserPercent: z.number().optional(),
  groupShipping: z.boolean().optional(),
  theme: z.any().optional(),
});

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('orders.manage'));
router.use(requireFeature('teamStores.enabled'));

router.get('/', async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const stores = await TeamStoreService.list(storeId);
  return res.json(stores);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const created = await TeamStoreService.create(parsed.data);
  return res.status(201).json(created);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const storeId = (req.body?.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const out = await TeamStoreService.update(req.params.id, storeId, req.body || {});
  return res.json(out);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const storeId = (req.body?.storeId as string) || (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const out = await TeamStoreService.remove(req.params.id, storeId);
  return res.json(out);
});

router.post('/:id/roster/import', upload.single('file'), async (req: AuthRequest, res) => {
  const storeId = (req.body?.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const csv = req.file?.buffer.toString('utf8') || req.body?.csv;
  if (!csv) return res.status(400).json({ error: 'CSV input required' });

  const out = await TeamStoreService.importRoster(storeId, req.params.id, csv);
  return res.status(201).json(out);
});

router.get('/:id/export/orders.csv', async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const csv = await TeamStoreService.exportOrdersCsv(storeId, req.params.id);
  res.setHeader('content-type', 'text/csv');
  res.setHeader('content-disposition', `attachment; filename=team-store-${req.params.id}-orders.csv`);
  return res.send(csv);
});

export default router;
