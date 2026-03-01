import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import NetworkService from '../services/NetworkService.js';
import NetworkPublishService from '../services/NetworkPublishService.js';
import NetworkApplyService from '../services/NetworkApplyService.js';
import NetworkRoutingService from '../services/NetworkRoutingService.js';
import RoyaltyService from '../services/RoyaltyService.js';

const router = Router();
router.use(authMiddleware);
router.use(requireFeature('network.enabled'));

function tenantIdFrom(req: AuthRequest) {
  return String((req as any).tenantId || req.headers['x-tenant-id'] || req.query.tenantId || '');
}

router.get('/networks', requirePermission('network.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const rows = await NetworkService.listNetworks(tenantId);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to list networks' });
  }
});

router.post('/networks', requirePermission('network.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const name = String(req.body?.name || '').trim();
    const ownerStoreId = String(req.body?.ownerStoreId || '').trim();

    if (!name || !ownerStoreId) return res.status(400).json({ error: 'name and ownerStoreId are required' });

    const network = await NetworkService.createNetwork({
      tenantId,
      name,
      ownerStoreId,
      actorUserId: req.userId,
    });

    return res.status(201).json(network);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to create network' });
  }
});

router.get('/networks/:networkId/overview', requirePermission('network.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const result = await NetworkService.overview(tenantId, req.params.networkId);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to load network overview' });
  }
});

router.get('/networks/:networkId/stores', requirePermission('network.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const rows = await NetworkService.listStores(tenantId, req.params.networkId);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list network stores' });
  }
});

router.post('/networks/:networkId/stores', requirePermission('network.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const storeId = String(req.body?.storeId || '').trim();
    const role = String(req.body?.role || 'SPOKE').toUpperCase() as 'OWNER' | 'HUB' | 'SPOKE';
    const status = String(req.body?.status || 'ACTIVE').toUpperCase() as 'ACTIVE' | 'SUSPENDED';
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });

    const row = await NetworkService.addStore({ tenantId, networkId: req.params.networkId, storeId, role, status });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to add store to network' });
  }
});

router.post('/networks/:networkId/stores/create', requirePermission('network.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const name = String(req.body?.name || '').trim();
    const slug = String(req.body?.slug || '').trim();
    const role = String(req.body?.role || 'SPOKE').toUpperCase() as 'HUB' | 'SPOKE';
    if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });

    const created = await NetworkService.createChildStore({
      tenantId,
      networkId: req.params.networkId,
      name,
      slug,
      role,
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to create child store' });
  }
});

router.get('/networks/:networkId/shared-items', requirePermission('network.publish'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const type = req.query.type ? String(req.query.type).toUpperCase() : undefined;
    const rows = await NetworkPublishService.listSharedItems(tenantId, req.params.networkId, type as any);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list shared items' });
  }
});

router.post('/networks/:networkId/publish/product/:productId', requirePermission('network.publish'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const row = await NetworkPublishService.publishProduct(tenantId, req.params.networkId, req.params.productId);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to publish product' });
  }
});

router.post('/networks/:networkId/publish/pricing-rule-set/:ruleSetId', requirePermission('network.publish'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const row = await NetworkPublishService.publishPricingRuleSet(tenantId, req.params.networkId, req.params.ruleSetId);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to publish pricing rule set' });
  }
});

router.post('/networks/:networkId/publish/artwork-category/:categoryId', requirePermission('network.publish'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const row = await NetworkPublishService.publishArtworkCategory(tenantId, req.params.networkId, req.params.categoryId);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to publish artwork category' });
  }
});

router.post('/networks/:networkId/publish/artwork-asset/:assetId', requirePermission('network.publish'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const row = await NetworkPublishService.publishArtworkAsset(tenantId, req.params.networkId, req.params.assetId);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to publish artwork asset' });
  }
});

router.post('/networks/:networkId/apply', requirePermission('network.publish'), async (req: AuthRequest, res) => {
  try {
    const storeId = String(req.body?.storeId || '').trim();
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });

    const sharedItemId = String(req.body?.sharedItemId || '').trim();

    if (sharedItemId) {
      const result = await NetworkApplyService.applySharedItemToStore(sharedItemId, storeId);
      return res.json(result);
    }

    const all = await (prisma as any).sharedCatalogItem.findMany({
      where: { networkId: req.params.networkId },
      orderBy: { publishedAt: 'desc' },
    });

    const applied = [] as any[];
    for (const item of all) {
      const result = await NetworkApplyService.applySharedItemToStore(item.id, storeId);
      applied.push({ sharedItemId: item.id, ...result });
    }

    return res.json({ appliedCount: applied.length, applied });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to apply shared catalog items' });
  }
});

router.get('/networks/:networkId/bindings', requirePermission('network.publish'), async (req: AuthRequest, res) => {
  try {
    const storeId = String(req.query.storeId || '').trim();
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const rows = await NetworkApplyService.listBindings(storeId);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list bindings' });
  }
});

router.get('/networks/:networkId/routing-rules', requirePermission('network.route'), async (req: AuthRequest, res) => {
  try {
    const rows = await NetworkRoutingService.listRules(req.params.networkId);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list routing rules' });
  }
});

router.post('/networks/:networkId/routing-rules', requirePermission('network.route'), async (req: AuthRequest, res) => {
  try {
    const row = await NetworkRoutingService.upsertRule({
      networkId: req.params.networkId,
      id: req.body?.id ? String(req.body.id) : undefined,
      name: String(req.body?.name || 'Default routing'),
      enabled: req.body?.enabled != null ? Boolean(req.body.enabled) : true,
      strategy: req.body?.strategy ? String(req.body.strategy).toUpperCase() : 'MANUAL',
      config: req.body?.config || null,
    } as any);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to save routing rule' });
  }
});

router.post('/route-order/:orderId', requirePermission('network.route'), async (req: AuthRequest, res) => {
  try {
    const result = await NetworkRoutingService.routeOrder(req.params.orderId);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to route order' });
  }
});

router.get('/networks/:networkId/routed-orders', requirePermission('network.route'), async (req: AuthRequest, res) => {
  try {
    const storeId = req.query.storeId ? String(req.query.storeId) : undefined;
    const rows = await NetworkRoutingService.listRoutedOrders({ networkId: req.params.networkId, storeId });
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list routed orders' });
  }
});

router.post('/networks/:networkId/routed-orders/:routedOrderId/status', requirePermission('network.route'), async (req: AuthRequest, res) => {
  try {
    const status = String(req.body?.status || '').toUpperCase() as any;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const row = await NetworkRoutingService.updateRoutedOrderStatus(req.params.routedOrderId, status);
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to update routed order status' });
  }
});

router.get('/networks/:networkId/royalty-rules', requirePermission('network.reports.view'), async (req: AuthRequest, res) => {
  try {
    const rows = await RoyaltyService.listRules(req.params.networkId);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list royalty rules' });
  }
});

router.post('/networks/:networkId/royalty-rules', requirePermission('network.manage'), async (req: AuthRequest, res) => {
  try {
    const row = await RoyaltyService.upsertRule({
      networkId: req.params.networkId,
      id: req.body?.id ? String(req.body.id) : undefined,
      name: String(req.body?.name || 'Default royalty'),
      enabled: req.body?.enabled != null ? Boolean(req.body.enabled) : true,
      basis: req.body?.basis ? String(req.body.basis).toUpperCase() : 'REVENUE',
      ratePercent: req.body?.ratePercent != null ? Number(req.body.ratePercent) : null,
      flatCents: req.body?.flatCents != null ? Number(req.body.flatCents) : null,
      appliesTo: req.body?.appliesTo || null,
    } as any);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to save royalty rule' });
  }
});

router.get('/networks/:networkId/royalties/report', requirePermission('network.reports.view'), async (req: AuthRequest, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const report = await RoyaltyService.report(req.params.networkId, from, to);
    return res.json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to load royalty report' });
  }
});

router.get('/networks/:networkId/royalties/export.csv', requirePermission('network.reports.view'), async (req: AuthRequest, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const csv = await RoyaltyService.toCsv(req.params.networkId, from, to);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="royalties-${req.params.networkId}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to export royalty CSV' });
  }
});

export default router;
