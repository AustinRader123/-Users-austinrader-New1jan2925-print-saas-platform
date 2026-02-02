import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import OrderService from '../services/OrderService.js';
import ProductionService from '../services/ProductionService.js';
import ProductService from '../services/ProductService.js';
import logger from '../logger.js';

const router = Router();

// List orders for store (admin only)
router.get('/orders', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    const orders = await OrderService.listStoreOrders(storeId, {
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      take: req.query.take ? parseInt(req.query.take as string) : 20,
    });

    res.json(orders);
  } catch (error) {
    logger.error('List store orders error:', error);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// Get order details (admin)
router.get('/orders/:orderId', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId;
    const order = await OrderService.getOrder(req.params.orderId, storeId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Update order status
router.patch('/orders/:orderId/status', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const order = await OrderService.updateOrderStatus(req.params.orderId, status);
    res.json(order);
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;

// ---------------------------------------------------------------------------
// Production Jobs (Admin)
// ---------------------------------------------------------------------------
router.get('/production-jobs', authMiddleware, roleMiddleware(['ADMIN', 'PRODUCTION_MANAGER', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId;
    if (!storeId) return res.status(400).json({ error: 'Store ID required' });
    const jobs = await ProductionService.listProductionJobs(storeId, {
      status: req.query.status as string,
      priority: req.query.priority as string,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      take: req.query.take ? parseInt(req.query.take as string) : 20,
    });
    res.json(jobs);
  } catch (error) {
    logger.error('Admin list production jobs error:', error);
    res.status(500).json({ error: 'Failed to list production jobs' });
  }
});

router.patch('/production-jobs/:id', authMiddleware, roleMiddleware(['ADMIN', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    const job = await ProductionService.updateJobStatus(req.params.id, status);
    // Sync order status from production status (basic mapping)
    if (job) {
      const orderStatus = status === 'IN_PRODUCTION' ? 'IN_PRODUCTION'
        : status === 'COMPLETED' ? 'READY_TO_SHIP'
        : status === 'PACKED' ? 'READY_TO_SHIP'
        : 'CONFIRMED';
      await OrderService.updateOrderStatus(job.orderId, orderStatus);
    }
    res.json(job);
  } catch (error) {
    logger.error('Admin update production job error:', error);
    res.status(500).json({ error: 'Failed to update production job' });
  }
});

router.get('/production-jobs/:id/downloads', authMiddleware, roleMiddleware(['ADMIN', 'PRODUCTION_MANAGER', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const job = await ProductionService.getProductionJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const downloads: { label: string; url: string; itemId?: string }[] = [];
    // Collect from order items
    for (const item of job.order.items as any[]) {
      if (item.mockupUrl) downloads.push({ label: `Mockup - ${item.productId}`, url: item.mockupUrl, itemId: item.id });
      if (item.mockupPreviewUrl) downloads.push({ label: `Mockup Preview - ${item.productId}`, url: item.mockupPreviewUrl, itemId: item.id });
      if (item.exportAssets && Array.isArray(item.exportAssets)) {
        for (const asset of item.exportAssets) {
          if (asset?.url) downloads.push({ label: `${asset.type || 'ASSET'} - ${item.productId}` , url: asset.url, itemId: item.id });
        }
      }
    }
    res.json({ jobId: job.id, downloads });
  } catch (error) {
    logger.error('Admin production job downloads error:', error);
    res.status(500).json({ error: 'Failed to fetch downloads' });
  }
});
