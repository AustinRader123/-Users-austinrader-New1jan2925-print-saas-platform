import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import ProductionService from '../services/ProductionService.js';
import PrintPackageService from '../services/PrintPackageService.js';
import NetworkRoutingService from '../services/NetworkRoutingService.js';
import logger from '../logger.js';

const router = Router();

// Get production job
router.get('/jobs/:jobId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const job = await ProductionService.getProductionJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    logger.error('Get production job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// List production jobs (admin only)
router.get('/jobs', authMiddleware, roleMiddleware(['ADMIN', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId || (req.query.storeId as string);
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    const jobs = await ProductionService.listProductionJobs(storeId, {
      status: req.query.status as string,
      priority: req.query.priority as string,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      take: req.query.take ? parseInt(req.query.take as string) : 20,
    });

    res.json(jobs);
  } catch (error) {
    logger.error('List production jobs error:', error);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// Get production kanban
router.get('/kanban', authMiddleware, roleMiddleware(['ADMIN', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId || (req.query.storeId as string);
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    const kanban = await ProductionService.getProductionKanban(storeId);
    res.json(kanban);
  } catch (error) {
    logger.error('Get kanban error:', error);
    res.status(500).json({ error: 'Failed to get kanban' });
  }
});

// Update job status
router.patch('/jobs/:jobId/status', authMiddleware, roleMiddleware(['PRODUCTION_MANAGER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const job = await ProductionService.updateJobStatus(req.params.jobId, status);
    await NetworkRoutingService.syncRoutedOrderFromProductionStatus(job.orderId, status);
    res.json(job);
  } catch (error) {
    logger.error('Update job status error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Update production step
router.patch('/steps/:stepId', authMiddleware, roleMiddleware(['PRODUCTION_MANAGER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const step = await ProductionService.updateStepStatus(
      req.params.stepId,
      status,
      req.userId,
      notes
    );

    res.json(step);
  } catch (error) {
    logger.error('Update step error:', error);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

router.post('/jobs/:jobId/work-order', authMiddleware, roleMiddleware(['PRODUCTION_MANAGER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const result = await ProductionService.generateWorkOrder(req.params.jobId, req.userId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Generate work-order error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to generate work-order' });
  }
});

router.post('/jobs/:jobId/print-package', authMiddleware, roleMiddleware(['PRODUCTION_MANAGER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const result = await PrintPackageService.generateForProductionJob(req.params.jobId, req.userId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Generate print package error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to generate print package' });
  }
});

export default router;
