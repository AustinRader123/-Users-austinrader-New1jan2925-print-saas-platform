import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import ProductCatalogService from '../services/ProductCatalogService.js';
import logger from '../logger.js';

const router = Router();
router.use(authMiddleware);

const deleteSchema = z.object({
  storeId: z.string().min(1),
});

router.delete('/:id', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body?.storeId ? req.body : req.query;
    const body = deleteSchema.safeParse(payload);
    if (!body.success) {
      return res.status(400).json({ error: 'Invalid request payload', details: body.error.flatten() });
    }

    const result = await ProductCatalogService.deleteImageById(body.data.storeId, req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Delete image by id error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to delete image' });
  }
});

export default router;
