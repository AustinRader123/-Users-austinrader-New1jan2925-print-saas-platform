import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();
const router = Router();

// List pricing rules (filter by storeId or productId)
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { productId, storeId } = req.query as any;
    const where: any = {};
    if (productId) where.productId = String(productId);
    if (storeId) where.product = { storeId: String(storeId) };
    const rules = await prisma.pricingRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (error) {
    logger.error('List pricing rules error:', error);
    res.status(500).json({ error: 'Failed to list pricing rules' });
  }
});

// Create pricing rule (MVP fields mapped into existing schema)
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      productId,
      productVariantId,
      sku,
      vendorVariantId,
      name,
      baseMarkupPercent,
      quantityBreaks,
      decorationCosts,
      roundingStrategy,
      minQuantity,
      maxQuantity,
      active,
    } = req.body;
    let resolvedProductId = productId as string | undefined;
    if (!resolvedProductId) {
      // Try resolving via productVariantId
      if (productVariantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: String(productVariantId) } });
        resolvedProductId = variant?.productId;
      }
      // Try resolving via sku
      if (!resolvedProductId && sku) {
        const variantBySku = await prisma.productVariant.findFirst({ where: { sku: String(sku) } });
        resolvedProductId = variantBySku?.productId;
      }
      // Try resolving via vendorVariantId
      if (!resolvedProductId && vendorVariantId) {
        const vv = await prisma.vendorProductVariant.findUnique({ where: { id: String(vendorVariantId) } });
        if (vv?.productVariantId) {
          const variant = await prisma.productVariant.findUnique({ where: { id: vv.productVariantId } });
          resolvedProductId = variant?.productId;
        }
      }
    }
    if (!resolvedProductId || !name) {
      return res.status(400).json({ error: 'name and one of productId/productVariantId/sku/vendorVariantId required' });
    }
    const rule = await prisma.pricingRule.create({
      data: {
        productId: resolvedProductId,
        name,
        minQuantity: minQuantity ?? 1,
        maxQuantity,
        basePrice: 0, // calculated at runtime from blank cost + markup
        colorSurcharge: 0, // decorationCosts will handle perColor
        perPlacementCost: 0, // decorationCosts will handle perLocation
        quantityBreaklist: {
          baseMarkupPercent: baseMarkupPercent ?? 0,
          breaks: quantityBreaks ?? [],
          decorationCosts: decorationCosts ?? {},
          roundingStrategy: roundingStrategy ?? 'nearest_cent',
        },
        active: active ?? true,
      },
    });
    res.status(201).json(rule);
  } catch (error) {
    logger.error('Create pricing rule error:', error);
    res.status(500).json({ error: 'Failed to create pricing rule' });
  }
});

// Update pricing rule
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const {
      name,
      baseMarkupPercent,
      quantityBreaks,
      decorationCosts,
      roundingStrategy,
      minQuantity,
      maxQuantity,
      active,
    } = req.body;
    const data: any = {};
    if (name != null) data.name = name;
    if (minQuantity != null) data.minQuantity = minQuantity;
    if (maxQuantity != null) data.maxQuantity = maxQuantity;
    if (active != null) data.active = active;
    data.quantityBreaklist = {
      baseMarkupPercent: baseMarkupPercent ?? 0,
      breaks: quantityBreaks ?? [],
      decorationCosts: decorationCosts ?? {},
      roundingStrategy: roundingStrategy ?? 'nearest_cent',
    };
    const rule = await prisma.pricingRule.update({ where: { id }, data });
    res.json(rule);
  } catch (error) {
    logger.error('Update pricing rule error:', error);
    res.status(500).json({ error: 'Failed to update pricing rule' });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await prisma.pricingRule.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Delete pricing rule error:', error);
    res.status(500).json({ error: 'Failed to delete pricing rule' });
  }
});

export default router;