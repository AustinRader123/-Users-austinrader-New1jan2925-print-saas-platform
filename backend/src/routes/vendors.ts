import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import VendorService from '../services/VendorService.js';
import VendorImportService from '../services/VendorImportService.js';
import logger from '../logger.js';

const router = Router();

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

// CSV Import: Admin uploads CSV content and mapping to normalize catalog
router.post('/:vendorId/import-csv', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, csv, mapping } = req.body || {};
    if (!storeId || !csv || !mapping) {
      return res.status(400).json({ error: 'storeId, csv, and mapping required' });
    }
    const out = await VendorImportService.importCsv(req.params.vendorId, storeId, csv, mapping);
    res.status(200).json(out);
  } catch (error) {
    logger.error('Vendor CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

export default router;
