import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import PricingEngine from '../services/PricingEngine.js';
import logger from '../logger.js';

const router = Router();

// Calculate pricing preview
router.post('/preview', async (req: AuthRequest, res: Response) => {
  try {
    const {
      storeId,
      vendorVariantId,
      productVariantId,
      sku,
      quantity,
      decoration,
    } = req.body || {};

    if (!storeId || !quantity || (!vendorVariantId && !productVariantId && !sku)) {
      return res.status(400).json({ error: 'storeId, quantity, and one of vendorVariantId/productVariantId/sku required' });
    }

    const pricing = await PricingEngine.calculate({
      storeId,
      vendorVariantId,
      productVariantId,
      sku,
      quantity,
      decoration,
    });

    const out = {
      currency: 'USD',
      unitPrice: pricing.breakdown.unitPrice,
      lineTotal: pricing.breakdown.lineTotal,
      breakdown: {
        blankCost: pricing.breakdown.blankCost,
        decorationCost: pricing.breakdown.decorationCost,
        setupFee: pricing.breakdown.setupFee,
        markup: pricing.breakdown.markup,
        discount: pricing.breakdown.discount,
        ruleId: pricing.breakdown.ruleId,
        appliedBreak: undefined,
      },
    };
    res.json(out);
  } catch (error) {
    logger.error('Pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});

export default router;
