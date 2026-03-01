import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import InventoryService from '../services/InventoryService.js';
import InventoryV2Service from '../services/InventoryV2Service.js';
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

const locationSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(['WAREHOUSE', 'SHELF', 'BIN', 'EXTERNAL']).optional(),
  address: z.any().optional(),
});

const skuSchema = z.object({
  storeId: z.string().min(1),
  skuCode: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().optional(),
  supplierSku: z.string().optional(),
  defaultReorderPoint: z.number().int().optional(),
  defaultReorderQty: z.number().int().optional(),
});

const mapSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().optional(),
  skuId: z.string().min(1),
  qtyPerUnit: z.number().int().positive(),
});

const stockAdjustSchema = z.object({
  storeId: z.string().min(1),
  locationId: z.string().min(1),
  skuId: z.string().min(1),
  deltaOnHand: z.number().int().optional(),
  deltaReserved: z.number().int().optional(),
  type: z.enum(['ADJUSTMENT', 'RECEIPT', 'ISSUE', 'RESERVE', 'RELEASE', 'CONSUME']),
  refType: z.enum(['PO', 'BATCH', 'ORDER', 'MANUAL']).optional(),
  refId: z.string().optional(),
  meta: z.any().optional(),
});

function tenantIdFrom(req: AuthRequest) {
  const requestTenantId = (req as unknown as { tenantId?: string }).tenantId;
  return String(requestTenantId || req.headers['x-tenant-id'] || req.query.tenantId || '').trim();
}

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

router.get('/locations', requireFeature('inventory.enabled'), requirePermission('production.view'), async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const rows = await InventoryV2Service.listLocations(storeId);
  return res.json(rows);
});

router.post('/locations', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const row = await InventoryV2Service.createLocation(parsed.data);
  return res.status(201).json(row);
});

router.get('/skus', requireFeature('inventory.enabled'), requirePermission('production.view'), async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const rows = await InventoryV2Service.listSkus(storeId);
  return res.json(rows);
});

router.post('/skus', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const parsed = skuSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const row = await InventoryV2Service.createSku(parsed.data);
  return res.status(201).json(row);
});

router.get('/materials', requireFeature('inventory.enabled'), requirePermission('production.view'), async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const rows = await InventoryV2Service.listMaterialMaps(storeId);
  return res.json(rows);
});

router.post('/materials', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const parsed = mapSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const row = await InventoryV2Service.upsertMaterialMap(parsed.data);
  return res.status(201).json(row);
});

router.get('/stocks', requireFeature('inventory.enabled'), requirePermission('production.view'), async (req: AuthRequest, res) => {
  const storeId = (req.query.storeId as string) || req.storeId;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  const snapshot = await InventoryV2Service.getStockSnapshot(storeId, req.query.skuId ? String(req.query.skuId) : undefined);
  return res.json(snapshot);
});

router.post('/stocks/adjust', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const parsed = stockAdjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const row = await InventoryV2Service.adjustStock(parsed.data);
  return res.status(201).json(row);
});

router.post('/batches/:batchId/reserve', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const tenantId = tenantIdFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const out = await InventoryV2Service.reserveForBatch(req.params.batchId, req.userId);
  return res.json(out);
});

router.post('/batches/:batchId/release', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const tenantId = tenantIdFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const out = await InventoryV2Service.releaseBatchReservations(req.params.batchId, req.userId);
  return res.json(out);
});

router.post('/batches/:batchId/consume', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  const tenantId = tenantIdFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const out = await InventoryV2Service.consumeBatchReservations(req.params.batchId, req.userId);
  return res.json(out);
});

router.get('/batches/:batchId/reservations', requireFeature('inventory.enabled'), requirePermission('production.view'), async (req: AuthRequest, res) => {
  const tenantId = tenantIdFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const rows = await InventoryV2Service.listBatchReservations(req.params.batchId);
  return res.json(rows);
});

export default router;
