import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import ProductCatalogService from '../services/ProductCatalogService.js';
import logger from '../logger.js';

const router = Router();
router.use(authMiddleware);

const updateVariantSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  inventoryQty: z.number().int().nonnegative().optional(),
  externalId: z.string().optional(),
});

const deleteSchema = z.object({
  storeId: z.string().min(1),
});

router.put('/:id', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = updateVariantSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: 'Invalid request payload', details: body.error.flatten() });
    }

    const variant = await ProductCatalogService.updateVariantById(body.data.storeId, req.params.id, body.data);
    res.json(variant);
  } catch (error) {
    logger.error('Update variant by id error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update variant' });
  }
});

router.delete('/:id', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body?.storeId ? req.body : req.query;
    const body = deleteSchema.safeParse(payload);
    if (!body.success) {
      return res.status(400).json({ error: 'Invalid request payload', details: body.error.flatten() });
    }

    const result = await ProductCatalogService.deleteVariantById(body.data.storeId, req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Delete variant by id error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to delete variant' });
  }
});

export default router;
