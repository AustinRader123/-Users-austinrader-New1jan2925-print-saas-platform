import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import VendorService from '../services/VendorService.js';
import VendorImportService from '../services/VendorImportService.js';
import logger from '../logger.js';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const prisma = new PrismaClient();

// Create vendor (admin only)
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, connectorType } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const vendor = await VendorService.createVendor(name, email, connectorType);
    res.status(201).json(vendor);
  } catch (error) {
    logger.error('Create vendor error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// List vendors
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const vendors = await VendorService.listVendors();
    res.json(vendors);
  } catch (error) {
    logger.error('List vendors error:', error);
    res.status(500).json({ error: 'Failed to list vendors' });
  }
});

// Get vendor
router.get('/:vendorId', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const vendor = await VendorService.getVendor(req.params.vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    logger.error('Get vendor error:', error);
    res.status(500).json({ error: 'Failed to get vendor' });
  }
});

// Sync vendor products
router.post('/:vendorId/sync', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    await VendorService.syncVendorProducts(req.params.vendorId);
    res.json({ success: true, message: 'Sync started' });
  } catch (error) {
    logger.error('Sync vendor error:', error);
    res.status(500).json({ error: 'Failed to sync vendor' });
  }
});

// Get vendor products
router.get('/:vendorId/products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const products = await VendorService.getVendorProducts(req.params.vendorId);
    res.json(products);
  } catch (error) {
    logger.error('Get vendor products error:', error);
    res.status(500).json({ error: 'Failed to get vendor products' });
  }
});

// Canonical CSV Import (supports multipart file or JSON body)
router.post(
  '/:vendorId/import-csv',
  authMiddleware,
  roleMiddleware(['ADMIN']),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const vendorId = req.params.vendorId;
      const storeId = (req.body?.storeId as string) || '';
      let csv: string | undefined;
      let mapping: any = {};
      if (req.file) {
        csv = req.file.buffer.toString('utf-8');
        const mappingStr = (req.body?.mapping as string) || '';
        if (mappingStr) {
          try { mapping = JSON.parse(mappingStr); } catch (e) { return res.status(400).json({ error: 'mapping must be valid JSON' }); }
        }
      } else {
        csv = (req.body?.csv as string) || '';
        mapping = req.body?.mapping || {};
      }
      if (!storeId || !csv) {
        return res.status(400).json({ error: 'storeId and CSV file/content required' });
      }
      const out = await VendorImportService.importCsv(vendorId, storeId, csv, mapping);
      res.status(200).json(out);
    } catch (error: any) {
      logger.error('Vendor CSV import error:', error?.stack || error);
      const details = process.env.NODE_ENV === 'development' ? { details: error?.message, stack: error?.stack } : {};
      res.status(500).json({ error: 'Failed to import CSV', ...details });
    }
  }
);

// Deprecated: multipart route moved to canonical /import-csv above

// List import jobs for a vendor (latest first)
router.get('/:vendorId/import-jobs', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.vendorId;
    const limit = parseInt(String((req.query?.limit as any) ?? '20')) || 20;
    const jobs = await prisma.vendorSyncJob.findMany({
      where: { vendorId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    res.json(jobs);
  } catch (error) {
    logger.error('List import jobs error:', error);
    res.status(500).json({ error: 'Failed to list import jobs' });
  }
});

export default router;
