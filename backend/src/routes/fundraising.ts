import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import FundraisingService from '../services/FundraisingService.js';

const router = Router();

router.use(authMiddleware);
router.use(requireFeature('fundraising.enabled'));

function tenantIdFrom(req: AuthRequest) {
  return String((req as any).tenantId || req.headers['x-tenant-id'] || req.query.tenantId || '');
}

const campaignCreateSchema = z.object({
  storeId: z.string().min(1),
  networkId: z.string().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED']).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  fundraisingGoalCents: z.number().int().optional(),
  defaultFundraiserPercent: z.number().optional(),
  shippingMode: z.enum(['DIRECT', 'CONSOLIDATED']).optional(),
  allowSplitShip: z.boolean().optional(),
  metadata: z.any().optional(),
});

const productOverrideSchema = z.object({
  productId: z.string().min(1),
  overridePrice: z.number().optional(),
  overrideFundraiserPercent: z.number().optional(),
  active: z.boolean().optional(),
  metadata: z.any().optional(),
});

const memberSchema = z.object({
  id: z.string().optional(),
  teamStoreId: z.string().optional(),
  rosterEntryId: z.string().optional(),
  displayName: z.string().min(1),
  publicCode: z.string().optional(),
  isActive: z.boolean().optional(),
  goalCents: z.number().int().optional(),
  metadata: z.any().optional(),
});

router.get('/campaigns', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const storeId = req.query.storeId ? String(req.query.storeId) : undefined;
    const rows = await FundraisingService.listCampaigns(tenantId, storeId);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list campaigns' });
  }
});

router.post('/campaigns', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const parsed = campaignCreateSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

    const created = await FundraisingService.createCampaign({
      tenantId,
      storeId: parsed.data.storeId,
      networkId: parsed.data.networkId,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
      fundraisingGoalCents: parsed.data.fundraisingGoalCents,
      defaultFundraiserPercent: parsed.data.defaultFundraiserPercent,
      shippingMode: parsed.data.shippingMode,
      allowSplitShip: parsed.data.allowSplitShip,
      metadata: parsed.data.metadata,
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to create campaign' });
  }
});

router.get('/campaigns/:campaignId', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const result = await FundraisingService.getCampaign(tenantId, req.params.campaignId);
    return res.json(result);
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message || 'Campaign not found' });
  }
});

router.put('/campaigns/:campaignId', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const row = await FundraisingService.updateCampaign(tenantId, req.params.campaignId, req.body || {});
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to update campaign' });
  }
});

router.post('/campaigns/:campaignId/catalog-overrides', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const parsed = productOverrideSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

    const row = await FundraisingService.saveCatalogOverride(tenantId, req.params.campaignId, parsed.data);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to save catalog override' });
  }
});

router.post('/campaigns/:campaignId/team-stores', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const teamStoreId = String(req.body?.teamStoreId || '').trim();
    if (!teamStoreId) return res.status(400).json({ error: 'teamStoreId is required' });

    const row = await FundraisingService.linkTeamStore(tenantId, req.params.campaignId, teamStoreId);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to link team store' });
  }
});

router.post('/campaigns/:campaignId/members', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const parsed = memberSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

    const row = await FundraisingService.upsertMember(tenantId, req.params.campaignId, parsed.data);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to save member' });
  }
});

router.get('/campaigns/:campaignId/leaderboard', requirePermission('fundraising.reports.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    await FundraisingService.getCampaign(tenantId, req.params.campaignId);
    const rows = await FundraisingService.getLeaderboard(req.params.campaignId);
    return res.json(rows);
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message || 'Campaign not found' });
  }
});

router.post('/campaigns/:campaignId/consolidate', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const idempotencyKey = req.body?.idempotencyKey ? String(req.body.idempotencyKey) : undefined;
    const run = await FundraisingService.consolidateOrders({
      tenantId,
      campaignId: req.params.campaignId,
      idempotencyKey,
      actorUserId: req.userId,
    });
    return res.status(201).json(run);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to consolidate campaign orders' });
  }
});

router.get('/campaigns/:campaignId/consolidation-runs', requirePermission('fundraising.reports.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const rows = await FundraisingService.listConsolidationRuns(tenantId, req.params.campaignId);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list consolidation runs' });
  }
});

router.get('/campaigns/:campaignId/summary', requirePermission('fundraising.reports.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const summary = await FundraisingService.summary(tenantId, req.params.campaignId);
    return res.json(summary);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to load summary' });
  }
});

router.get('/campaigns/:campaignId/ledger', requirePermission('fundraising.reports.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const rows = await FundraisingService.listLedger(tenantId, req.params.campaignId);
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list payout ledger' });
  }
});

router.get('/campaigns/:campaignId/ledger.csv', requirePermission('fundraising.reports.view'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const csv = await FundraisingService.exportLedgerCsv(tenantId, req.params.campaignId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fundraiser-ledger-${req.params.campaignId}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to export payout ledger CSV' });
  }
});

router.post('/ledger/:entryId/approve', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const row = await FundraisingService.approvePayoutEntry(tenantId, req.params.entryId, req.body?.notes);
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to approve payout entry' });
  }
});

router.post('/ledger/:entryId/pay', requirePermission('fundraising.manage'), async (req: AuthRequest, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const row = await FundraisingService.markPayoutEntryPaid(tenantId, req.params.entryId, req.body?.notes);
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to mark payout entry paid' });
  }
});

export default router;
