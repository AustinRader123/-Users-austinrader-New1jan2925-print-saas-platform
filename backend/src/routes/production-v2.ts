import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import ProductionV2Service from '../services/ProductionV2Service.js';
import InventoryV2Service from '../services/InventoryV2Service.js';

const router = Router();

function tenantIdFrom(req: AuthRequest) {
  return String((req as any).tenantId || req.headers['x-tenant-id'] || req.query.tenantId || '').trim();
}

const stageSchema = z.object({
  toStage: z.enum(['ART', 'APPROVED', 'PRINT', 'CURE', 'PACK', 'SHIP', 'COMPLETE', 'HOLD', 'CANCELLED']),
  note: z.string().optional(),
});

const assignSchema = z.object({
  userId: z.string().min(1),
});

const scanSchema = z.object({
  action: z.enum(['advance', 'hold', 'cancel', 'ship', 'complete']),
  note: z.string().optional(),
});

router.post('/scan/:token', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = scanSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

    const row = await ProductionV2Service.scanAction(req.params.token, parsed.data.action, parsed.data.note, req.userId);
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to process scan action' });
  }
});

router.use(authMiddleware);
router.use(requireFeature('production_v2.enabled'));

router.get('/batches', requirePermission('production.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const rows = await ProductionV2Service.listBatches({
      tenantId,
      stage: req.query.stage ? String(req.query.stage) : undefined,
      method: req.query.method ? String(req.query.method) : undefined,
      storeId: req.query.storeId ? String(req.query.storeId) : undefined,
      campaignId: req.query.campaignId ? String(req.query.campaignId) : undefined,
      q: req.query.q ? String(req.query.q) : undefined,
    });

    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list production batches' });
  }
});

router.get('/batches/:id', requirePermission('production.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const row = await ProductionV2Service.getBatch(tenantId, req.params.id);
    return res.json(row);
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message || 'Batch not found' });
  }
});

router.post('/batches/from-order/:orderId', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  try {
    const rows = await ProductionV2Service.createBatchesFromOrder(req.params.orderId, req.userId);
    return res.status(201).json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to create batches from order' });
  }
});

router.post('/batches/from-bulk-order/:bulkOrderId', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  try {
    const rows = await ProductionV2Service.createBatchesFromCampaignBulkOrder(req.params.bulkOrderId, req.userId);
    return res.status(201).json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to create batches from bulk order' });
  }
});

router.post('/batches/:id/assign', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const parsed = assignSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

    const row = await ProductionV2Service.assignBatch(tenantId, req.params.id, parsed.data.userId, req.userId);
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to assign batch' });
  }
});

router.post('/batches/:id/unassign', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const row = await ProductionV2Service.unassignBatch(tenantId, req.params.id, req.userId);
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to unassign batch' });
  }
});

router.post('/batches/:id/stage', requirePermission('production.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const parsed = stageSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

    const row = await ProductionV2Service.transitionBatchStage({
      tenantId,
      batchId: req.params.id,
      toStage: parsed.data.toStage,
      note: parsed.data.note,
      actorUserId: req.userId,
    });

    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to update batch stage' });
  }
});

router.get('/batches/:id/inventory', requireFeature('inventory.enabled'), requirePermission('production.view'), async (req: AuthRequest, res) => {
  try {
    const rows = await InventoryV2Service.listBatchReservations(req.params.id);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to load batch inventory' });
  }
});

router.post('/batches/:id/inventory/reserve', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  try {
    const out = await InventoryV2Service.reserveForBatch(req.params.id, req.userId);
    return res.json(out);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to reserve inventory' });
  }
});

router.post('/batches/:id/inventory/release', requireFeature('inventory.enabled'), requirePermission('production.manage'), async (req: AuthRequest, res) => {
  try {
    const out = await InventoryV2Service.releaseBatchReservations(req.params.id, req.userId);
    return res.json(out);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to release inventory' });
  }
});

router.get('/batches/:id/ticket', requirePermission('production.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const html = await ProductionV2Service.createTicketHtml(tenantId, req.params.id, true);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to generate ticket' });
  }
});

router.get('/batches/:id/export.zip', requirePermission('production.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const zip = await ProductionV2Service.exportBatchZip(tenantId, req.params.id, req.userId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="production-batch-${req.params.id}.zip"`);
    return res.status(200).send(zip);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to export batch zip' });
  }
});

export default router;
