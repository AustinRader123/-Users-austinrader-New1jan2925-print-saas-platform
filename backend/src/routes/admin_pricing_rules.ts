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
    logger.error('List pricing rules error:', (error as any)?.stack || error);
    const details = process.env.NODE_ENV === 'development' ? { details: (error as any)?.message, stack: (error as any)?.stack } : {};
    res.status(500).json({ error: 'Failed to list pricing rules', ...details });
  }
});

// Validation helpers for canonical payload
function validateCanonicalPayload(body: any) {
  const errors: string[] = [];
  const storeId = String(body.storeId || '').trim();
  const name = String(body.name || '').trim();
  const method = body.method as 'SCREEN_PRINT' | 'EMBROIDERY' | undefined;
  const breaks = body.breaks as Array<{ minQty: number; unitPrice: number }> | undefined;
  if (!storeId) errors.push('storeId is required');
  if (!name) errors.push('name is required');
  if (!method || !['SCREEN_PRINT', 'EMBROIDERY'].includes(method)) errors.push('method must be SCREEN_PRINT or EMBROIDERY');
  if (!Array.isArray(breaks) || breaks.length < 1) errors.push('breaks must be a non-empty array');
  if (Array.isArray(breaks)) {
    breaks.forEach((b, idx) => {
      if (!b || typeof b.minQty !== 'number' || b.minQty < 1) errors.push(`breaks[${idx}].minQty must be >= 1`);
      if (!b || typeof b.unitPrice !== 'number' || b.unitPrice <= 0) errors.push(`breaks[${idx}].unitPrice must be > 0`);
    });
  }
  return { errors, storeId, name, method, breaks: (breaks || []).slice().sort((a, b) => a.minQty - b.minQty) };
}

// Create pricing rule (supports canonical payload or legacy payload)
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Prefer canonical schema if present
    if (req.body && req.body.storeId && req.body.breaks) {
      const { errors, storeId, name, method, breaks } = validateCanonicalPayload(req.body);
      if (errors.length) return res.status(400).json({ error: 'Validation failed', errors });
      // Resolve productId: prefer explicit productId if provided, else first product in store (any status). If none, create placeholder.
      let resolvedProductId = String(req.body.productId || '');
      if (!resolvedProductId) {
        const prod = await prisma.product.findFirst({ where: { storeId }, orderBy: { createdAt: 'asc' } });
        if (!prod) {
          const slug = `pricing-rule-${Date.now()}`;
          const placeholder = await prisma.product.create({
            data: {
              storeId,
              name: 'Pricing Rule Placeholder',
              description: 'Auto-created to attach pricing rules',
              slug,
              status: 'ACTIVE',
              type: 'BLANK',
              basePrice: 0,
              category: 'Pricing',
              tags: [],
            },
          });
          resolvedProductId = placeholder.id;
        } else {
          resolvedProductId = prod.id;
        }
      }
      const rule = await prisma.pricingRule.create({
        data: {
          productId: resolvedProductId,
          name,
          printMethod: method,
          minQuantity: breaks[0].minQty,
          maxQuantity: undefined,
          basePrice: 0,
          colorSurcharge: 0,
          perPlacementCost: 0,
          quantityBreaklist: {
            breaks: breaks.map((b) => ({ minQty: b.minQty, unitPrice: b.unitPrice })),
            roundingStrategy: 'nearest_cent',
          },
          active: true,
        },
      });
      return res.status(201).json(rule);
    }

    // Legacy payload
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
      if (productVariantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: String(productVariantId) } });
        resolvedProductId = variant?.productId;
      }
      if (!resolvedProductId && sku) {
        const variantBySku = await prisma.productVariant.findFirst({ where: { sku: String(sku) } });
        resolvedProductId = variantBySku?.productId;
      }
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
        basePrice: 0,
        colorSurcharge: 0,
        perPlacementCost: 0,
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
    logger.error('Create pricing rule error:', (error as any)?.stack || error);
    const details = process.env.NODE_ENV === 'development' ? { details: (error as any)?.message, stack: (error as any)?.stack } : {};
    res.status(500).json({ error: 'Failed to create pricing rule', ...details });
  }
});

// Update pricing rule (supports canonical payload or legacy payload). If breaks omitted, preserve existing.
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    // Canonical update
    if (req.body && (req.body.storeId || req.body.method || req.body.breaks)) {
      const existing = await prisma.pricingRule.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Pricing rule not found' });
      const data: any = {};
      if (req.body.name != null) data.name = String(req.body.name);
      if (req.body.method) data.printMethod = req.body.method;
      if (Array.isArray(req.body.breaks)) {
        const { errors, breaks } = validateCanonicalPayload({
          storeId: existing.productId, // dummy for validation
          name: data.name || existing.name,
          method: data.printMethod || existing.printMethod || 'SCREEN_PRINT',
          breaks: req.body.breaks,
        });
        if (errors.length) return res.status(400).json({ error: 'Validation failed', errors });
        data.minQuantity = breaks[0].minQty;
        data.maxQuantity = undefined;
        data.quantityBreaklist = {
          breaks: breaks.map((b) => ({ minQty: b.minQty, unitPrice: b.unitPrice })),
          roundingStrategy: 'nearest_cent',
        };
      }
      const rule = await prisma.pricingRule.update({ where: { id }, data });
      return res.json(rule);
    }

    // Legacy update
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
    if (
      baseMarkupPercent != null ||
      quantityBreaks != null ||
      decorationCosts != null ||
      roundingStrategy != null
    ) {
      data.quantityBreaklist = {
        baseMarkupPercent: baseMarkupPercent ?? 0,
        breaks: quantityBreaks ?? [],
        decorationCosts: decorationCosts ?? {},
        roundingStrategy: roundingStrategy ?? 'nearest_cent',
      };
    }
    const rule = await prisma.pricingRule.update({ where: { id }, data });
    res.json(rule);
  } catch (error) {
    logger.error('Update pricing rule error:', (error as any)?.stack || error);
    const details = process.env.NODE_ENV === 'development' ? { details: (error as any)?.message, stack: (error as any)?.stack } : {};
    res.status(500).json({ error: 'Failed to update pricing rule', ...details });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await prisma.pricingRule.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Delete pricing rule error:', (error as any)?.stack || error);
    const details = process.env.NODE_ENV === 'development' ? { details: (error as any)?.message, stack: (error as any)?.stack } : {};
    res.status(500).json({ error: 'Failed to delete pricing rule', ...details });
  }
});

export default router;