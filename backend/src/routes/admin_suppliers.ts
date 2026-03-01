import { Router, Response } from 'express';
import { SupplierAuthType, SupplierName } from '@prisma/client';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import prisma from '../lib/prisma.js';
import { encryptSupplierCredentials, decryptSupplierCredentials } from '../modules/suppliers/credentials.js';
import { getSupplierAdapter } from '../modules/suppliers/adapters/index.js';
import supplierSyncService from '../modules/suppliers/supplierSyncService.js';
import { SupplierSyncQueue } from '../queue/SupplierSyncQueue.js';
import storageProvider from '../services/StorageProvider.js';
import logger from '../logger.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('suppliers.manage'));
router.use(requireFeature('suppliers.enabled'));

async function resolveStoreId(req: AuthRequest): Promise<string | null> {
  const byToken = req.storeId;
  const byBody = req.body?.storeId as string | undefined;
  const byQuery = req.query?.storeId as string | undefined;
  const picked = byToken || byBody || byQuery;
  if (picked) return picked;

  const fallback = await prisma.store.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  return fallback?.id ?? null;
}

const csvEscape = (value: unknown) => {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

router.get('/suppliers/connections', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const rows = await prisma.supplierConnection.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        syncRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    res.json(
      rows.map((row) => ({
        ...row,
        credentials: decryptSupplierCredentials(row.credentialsEncrypted),
      }))
    );
  } catch (error) {
    logger.error('List supplier connections failed', error);
    res.status(500).json({ error: 'Failed to list supplier connections' });
  }
});

router.post('/suppliers/connections', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const supplier = String(req.body?.supplier || 'MOCK') as SupplierName;
    const authType = String(req.body?.authType || 'MOCK') as SupplierAuthType;
    const name = String(req.body?.name || `${supplier} connection`);
    const baseUrl = req.body?.baseUrl ? String(req.body.baseUrl) : null;
    const credentials = req.body?.credentials || {};
    const enabled = req.body?.enabled !== false;
    const syncEnabled = req.body?.syncEnabled === true;
    const syncIntervalMinutes = req.body?.syncIntervalMinutes ? Math.max(1, Number(req.body.syncIntervalMinutes)) : 1440;
    const syncNextAt = syncEnabled ? new Date() : null;

    const created = await prisma.supplierConnection.create({
      data: {
        storeId,
        supplier,
        authType,
        name,
        baseUrl,
        credentialsEncrypted: encryptSupplierCredentials(credentials),
        enabled,
        syncEnabled,
        syncIntervalMinutes,
        syncNextAt,
      },
    });

    res.status(201).json({
      ...created,
      credentials,
    });
  } catch (error) {
    logger.error('Create supplier connection failed', error);
    res.status(500).json({ error: 'Failed to create supplier connection' });
  }
});

router.patch('/suppliers/connections/:connectionId', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const existing = await prisma.supplierConnection.findFirst({
      where: { id: req.params.connectionId, storeId },
    });
    if (!existing) return res.status(404).json({ error: 'Supplier connection not found' });

    const updated = await prisma.supplierConnection.update({
      where: { id: existing.id },
      data: {
        ...(req.body?.name !== undefined ? { name: String(req.body.name) } : {}),
        ...(req.body?.baseUrl !== undefined ? { baseUrl: req.body.baseUrl ? String(req.body.baseUrl) : null } : {}),
        ...(req.body?.authType !== undefined ? { authType: String(req.body.authType) as SupplierAuthType } : {}),
        ...(req.body?.enabled !== undefined ? { enabled: Boolean(req.body.enabled) } : {}),
        ...(req.body?.syncEnabled !== undefined ? { syncEnabled: Boolean(req.body.syncEnabled) } : {}),
        ...(req.body?.syncIntervalMinutes !== undefined
          ? { syncIntervalMinutes: Math.max(1, Number(req.body.syncIntervalMinutes || 1)) }
          : {}),
        ...(req.body?.syncEnabled === true ? { syncNextAt: req.body?.syncNextAt ? new Date(req.body.syncNextAt) : new Date() } : {}),
        ...(req.body?.credentials !== undefined ? { credentialsEncrypted: encryptSupplierCredentials(req.body.credentials) } : {}),
      },
    });

    res.json({
      ...updated,
      credentials: req.body?.credentials ?? decryptSupplierCredentials(updated.credentialsEncrypted),
    });
  } catch (error) {
    logger.error('Update supplier connection failed', error);
    res.status(500).json({ error: 'Failed to update supplier connection' });
  }
});

router.delete('/suppliers/connections/:connectionId', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    await prisma.supplierConnection.deleteMany({
      where: { id: req.params.connectionId, storeId },
    });

    res.json({ ok: true });
  } catch (error) {
    logger.error('Delete supplier connection failed', error);
    res.status(500).json({ error: 'Failed to delete supplier connection' });
  }
});

router.post('/suppliers/connections/:connectionId/test', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const connection = await prisma.supplierConnection.findFirst({
      where: { id: req.params.connectionId, storeId },
    });
    if (!connection) return res.status(404).json({ error: 'Supplier connection not found' });

    const adapter = getSupplierAdapter(connection.supplier);
    const startedAt = Date.now();
    const result = await adapter.validateConnection({
      id: connection.id,
      supplier: connection.supplier,
      baseUrl: connection.baseUrl,
      credentials: decryptSupplierCredentials(connection.credentialsEncrypted),
    });

    if (typeof result.latencyMs !== 'number') {
      result.latencyMs = Date.now() - startedAt;
    }

    res.json(result);
  } catch (error) {
    logger.error('Test supplier connection failed', error);
    res.status(500).json({ error: 'Failed to test supplier connection' });
  }
});

router.post('/suppliers/connections/:connectionId/sync', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const connection = await prisma.supplierConnection.findFirst({
      where: { id: req.params.connectionId, storeId, enabled: true },
    });
    if (!connection) return res.status(404).json({ error: 'Supplier connection not found or disabled' });

    const run = await supplierSyncService.createRun(connection);
    const useQueue = req.body?.queue !== false;

    if (useQueue) {
      SupplierSyncQueue.enqueue(run.id);
      return res.status(202).json({ ok: true, queued: true, runId: run.id });
    }

    const result = await supplierSyncService.runSync(run.id, {
      userId: req.userId,
      includeImages: req.body?.includeImages !== false,
      limitProducts: req.body?.limitProducts ? Number(req.body.limitProducts) : undefined,
    });
    return res.json({ ok: true, queued: false, ...result });
  } catch (error) {
    logger.error('Run supplier sync failed', error);
    res.status(500).json({ error: 'Failed to run supplier sync' });
  }
});

router.get('/suppliers/runs', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const runs = await prisma.supplierSyncRun.findMany({
      where: { storeId },
      include: {
        supplierConnection: true,
      },
      orderBy: { createdAt: 'desc' },
      take: req.query.take ? Number(req.query.take) : 50,
    });

    res.json(runs);
  } catch (error) {
    logger.error('List supplier sync runs failed', error);
    res.status(500).json({ error: 'Failed to list supplier sync runs' });
  }
});

router.get('/suppliers/runs/:runId', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const run = await prisma.supplierSyncRun.findFirst({
      where: { id: req.params.runId, storeId },
      include: {
        supplierConnection: true,
        errors: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!run) return res.status(404).json({ error: 'Supplier sync run not found' });
    res.json(run);
  } catch (error) {
    logger.error('Get supplier sync run failed', error);
    res.status(500).json({ error: 'Failed to get supplier sync run' });
  }
});

router.get('/suppliers/sync-runs/:runId/log', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const run = await prisma.supplierSyncRun.findFirst({
      where: { id: req.params.runId, storeId },
      include: { logFile: true },
    });

    if (!run) return res.status(404).json({ error: 'Supplier sync run not found' });
    if (!run.logFile?.url) return res.status(404).json({ error: 'Sync run log file not found' });

    const filePath = storageProvider.getLocalPath(run.logFile.url);
    return res.download(filePath, `${run.id}.log`);
  } catch (error) {
    logger.error('Download supplier sync run log failed', error);
    res.status(500).json({ error: 'Failed to download supplier sync run log' });
  }
});

router.get('/suppliers/export/catalog.csv', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const connectionId = String(req.query.connectionId || '');
    if (!connectionId) return res.status(400).json({ error: 'connectionId query param is required' });

    const connection = await prisma.supplierConnection.findFirst({ where: { id: connectionId, storeId } });
    if (!connection) return res.status(404).json({ error: 'Supplier connection not found' });

    const rows = await prisma.externalVariantMap.findMany({
      where: { storeId, supplierConnectionId: connectionId },
      distinct: ['variantId'],
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const productMapRows = await prisma.externalProductMap.findMany({
      where: { storeId, supplierConnectionId: connectionId },
      select: { externalProductId: true, productId: true },
    });
    const productExternalIdByProduct = new Map(productMapRows.map((row) => [row.productId, row.externalProductId]));

    const imageCounts = await prisma.productImage.groupBy({
      by: ['productId'],
      where: { storeId },
      _count: { _all: true },
    });
    const imageCountByProduct = new Map(imageCounts.map((row) => [row.productId, row._count._all]));

    const header = [
      'productId',
      'productName',
      'externalProductId',
      'variantId',
      'color',
      'size',
      'sku',
      'cost',
      'supplierInventoryQty',
      'imageCount',
      'lastSyncedAt',
    ];

    const lines = [header.join(',')];
    for (const row of rows) {
      const product = row.variant.product;
      lines.push(
        [
          product.id,
          product.name,
          productExternalIdByProduct.get(product.id) || '',
          row.variant.id,
          row.variant.color || '',
          row.variant.size || '',
          row.variant.sku,
          row.variant.cost,
          row.variant.supplierInventoryQty ?? row.variant.inventoryQty,
          imageCountByProduct.get(product.id) || 0,
          connection.lastSyncAt?.toISOString() || '',
        ]
          .map(csvEscape)
          .join(',')
      );
    }

    const csvBody = lines.join('\n').replace(/\r\n/g, '\n').trimEnd();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="supplier-catalog-${connection.id}.csv"`);
    res.status(200).send(csvBody);
  } catch (error) {
    logger.error('Export supplier catalog CSV failed', error);
    res.status(500).json({ error: 'Failed to export supplier catalog CSV' });
  }
});

export default router;
