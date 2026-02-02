import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

export interface PricingInput {
  storeId: string;
  productVariantId?: string;
  vendorVariantId?: string;
  sku?: string;
  quantity: number;
  decoration?: {
    method: 'SCREEN_PRINT' | 'EMBROIDERY';
    locations: number;
    colors?: number;
  };
}

export interface PricingResult {
  basePrice: number;
  colorSurcharge: number;
  quantityDiscount: number;
  decorationCost: number;
  total: number;
  breakdown: Record<string, any>;
}

export class PricingEngine {
  async calculate(input: PricingInput): Promise<PricingResult> {
    // Resolve variant
    let variant = null as any;
    if (input.productVariantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: input.productVariantId },
        include: { product: { include: { pricingRules: { where: { active: true } } } } },
      });
    } else if (input.sku) {
      variant = await prisma.productVariant.findUnique({
        where: { sku: input.sku },
        include: { product: { include: { pricingRules: { where: { active: true } } } } },
      });
    } else if (input.vendorVariantId) {
      const vv = await prisma.vendorProductVariant.findUnique({ where: { id: input.vendorVariantId } });
      if (vv?.productVariantId) {
        variant = await prisma.productVariant.findUnique({
          where: { id: vv.productVariantId },
          include: { product: { include: { pricingRules: { where: { active: true } } } } },
        });
      }
    }
    if (!variant) throw new Error('Variant not found');

    const blankCost = (variant.supplierCost || variant.product.basePrice || 0);
    let markup = 0;
    let discount = 0;
    let decorationCost = 0;
    let setupFee = 0;

    // Apply quantity breaks
    const applicableRule = (variant.product.pricingRules as any[]).find((rule: any) => {
      return input.quantity >= rule.minQuantity && (!rule.maxQuantity || input.quantity <= rule.maxQuantity);
    });

    if (applicableRule) {
      const q = applicableRule.quantityBreaklist as any;
      const cfg = Array.isArray(q) ? { breaks: q } : (q || {});
      const baseMarkupPercent = Number(cfg.baseMarkupPercent ?? 0);
      const breaks: any[] = Array.isArray(cfg.breaks) ? cfg.breaks : [];
      const matchingBreak = breaks.sort((a, b) => (b.minQty || b.qty) - (a.minQty || a.qty))
        .find((b) => input.quantity >= (b.minQty ?? b.qty ?? 1));
      markup = blankCost * (baseMarkupPercent / 100);
      if (matchingBreak) {
        if (matchingBreak.unitMarkupDeltaPercent != null) {
          markup = blankCost * ((baseMarkupPercent + matchingBreak.unitMarkupDeltaPercent) / 100);
        }
        if (matchingBreak.fixedUnitDiscount != null) {
          discount = matchingBreak.fixedUnitDiscount;
        }
      }
      const decoCfg = (cfg.decorationCosts || {})[input.decoration?.method || 'SCREEN_PRINT'] || {};
      const perLocationFee = Number(decoCfg.perLocationFee || 0);
      const perColorFee = Number(decoCfg.perColorFee || 0);
      const setup = Number(decoCfg.setupFee || 0);
      const locations = Number(input.decoration?.locations || 0);
      const colors = Number(input.decoration?.colors || 0);
      decorationCost = perLocationFee * locations + perColorFee * colors;
      setupFee = setup;
    }

    // Rounding to nearest cent
    const unitPriceRaw = blankCost + markup - discount + decorationCost;
    const unitPrice = Math.round(unitPriceRaw * 100) / 100;
    const lineTotal = Math.round((unitPrice * input.quantity + setupFee) * 100) / 100;

    return {
      basePrice: blankCost,
      colorSurcharge: 0,
      quantityDiscount: discount,
      decorationCost,
      total: lineTotal,
      breakdown: {
        currency: 'USD',
        unitPrice,
        lineTotal,
        blankCost: blankCost,
        decorationCost,
        setupFee,
        markup,
        discount,
        ruleId: applicableRule?.id || null,
        quantity: input.quantity,
      },
    };
  }
}

export default new PricingEngine();
