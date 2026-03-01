import { PrismaClient, Prisma } from '@prisma/client';
import PricingEngineV2 from './PricingEngineV2.js';

const prisma = new PrismaClient();

type PricingEvaluateInput = {
  storeId: string;
  productId: string;
  variantId?: string;
  qty: number;
  decorationMethod?: string;
  locations?: string[];
  printSizeTier?: 'SMALL' | 'MEDIUM' | 'LARGE';
  colorCount?: number;
  stitchCount?: number;
  rush?: boolean;
  weightOz?: number;
  userId?: string;
  includeMargin?: boolean;
  personalizationFees?: Array<{ name: string; amount: number }>;
};

export class PricingRuleService {
  async listRuleSets(storeId: string) {
    return prisma.pricingRuleSet.findMany({
      where: { storeId },
      include: {
        rules: {
          where: { storeId },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createRuleSet(storeId: string, payload: { name: string; active?: boolean; description?: string; isDefault?: boolean; metadata?: Prisma.JsonValue }) {
    return prisma.pricingRuleSet.create({
      data: {
        storeId,
        name: payload.name,
        active: payload.active ?? true,
        description: payload.description,
        isDefault: payload.isDefault ?? false,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
      },
      include: { rules: true },
    });
  }

  async updateRuleSet(storeId: string, id: string, payload: { name?: string; active?: boolean; description?: string; isDefault?: boolean; metadata?: Prisma.JsonValue }) {
    await this.assertRuleSetOwnership(storeId, id);
    const data: Prisma.PricingRuleSetUpdateInput = {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.active !== undefined ? { active: payload.active } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata as Prisma.InputJsonValue } : {}),
    };

    return prisma.pricingRuleSet.update({
      where: { id },
      data,
      include: { rules: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] } },
    });
  }

  async createRule(storeId: string, ruleSetId: string, payload: {
    name: string;
    method: string;
    priority?: number;
    conditions?: Prisma.JsonValue;
    effects?: Prisma.JsonValue;
    active?: boolean;
  }) {
    await this.assertRuleSetOwnership(storeId, ruleSetId);

    const firstProduct = await prisma.product.findFirst({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!firstProduct) {
      throw new Error('At least one product is required before creating pricing rules');
    }

    return prisma.pricingRule.create({
      data: {
        storeId,
        ruleSetId,
        productId: firstProduct.id,
        name: payload.name,
        method: payload.method,
        priority: payload.priority ?? 100,
        conditions: payload.conditions as Prisma.InputJsonValue | undefined,
        effects: payload.effects as Prisma.InputJsonValue | undefined,
        active: payload.active ?? true,
        printMethod: null,
        minQuantity: 1,
        maxQuantity: null,
        basePrice: 0,
        colorSurcharge: 0,
        perPlacementCost: 0,
        quantityBreaklist: { breaks: [] },
      },
    });
  }

  async updateRule(storeId: string, ruleId: string, payload: {
    name?: string;
    method?: string;
    priority?: number;
    conditions?: Prisma.JsonValue;
    effects?: Prisma.JsonValue;
    active?: boolean;
  }) {
    const rule = await prisma.pricingRule.findFirst({ where: { id: ruleId, storeId }, select: { id: true } });
    if (!rule) {
      throw new Error('Pricing rule not found');
    }

    const data: Prisma.PricingRuleUpdateInput = {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.method !== undefined ? { method: payload.method } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.conditions !== undefined ? { conditions: payload.conditions as Prisma.InputJsonValue } : {}),
      ...(payload.effects !== undefined ? { effects: payload.effects as Prisma.InputJsonValue } : {}),
      ...(payload.active !== undefined ? { active: payload.active } : {}),
    };

    return prisma.pricingRule.update({
      where: { id: ruleId },
      data,
    });
  }

  async deleteRule(storeId: string, ruleId: string) {
    const rule = await prisma.pricingRule.findFirst({ where: { id: ruleId, storeId }, select: { id: true } });
    if (!rule) {
      throw new Error('Pricing rule not found');
    }
    await prisma.pricingRule.delete({ where: { id: ruleId } });
    return { ok: true };
  }

  async listShippingRates(storeId: string) {
    return prisma.shippingRate.findMany({
      where: { storeId },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async upsertShippingRates(storeId: string, rates: Array<{
    id?: string;
    name: string;
    active?: boolean;
    minSubtotal?: number | null;
    maxSubtotal?: number | null;
    baseCharge?: number;
    perItemCharge?: number;
    perOzCharge?: number;
    rushMultiplier?: number;
    metadata?: Prisma.JsonValue;
  }>) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.shippingRate.findMany({ where: { storeId }, select: { id: true } });
      const keepIds = rates.map((rate) => rate.id).filter((id): id is string => Boolean(id));
      const removeIds = existing.map((row) => row.id).filter((id) => !keepIds.includes(id));
      if (removeIds.length > 0) {
        await tx.shippingRate.deleteMany({ where: { id: { in: removeIds }, storeId } });
      }

      for (const rate of rates) {
        if (rate.id) {
          await tx.shippingRate.update({
            where: { id: rate.id },
            data: {
              name: rate.name,
              active: rate.active ?? true,
              minSubtotal: rate.minSubtotal ?? null,
              maxSubtotal: rate.maxSubtotal ?? null,
              baseCharge: rate.baseCharge ?? 0,
              perItemCharge: rate.perItemCharge ?? 0,
              perOzCharge: rate.perOzCharge ?? 0,
              rushMultiplier: rate.rushMultiplier ?? 1.25,
              metadata: rate.metadata as Prisma.InputJsonValue | undefined,
            },
          });
        } else {
          await tx.shippingRate.create({
            data: {
              storeId,
              name: rate.name,
              active: rate.active ?? true,
              minSubtotal: rate.minSubtotal ?? null,
              maxSubtotal: rate.maxSubtotal ?? null,
              baseCharge: rate.baseCharge ?? 0,
              perItemCharge: rate.perItemCharge ?? 0,
              perOzCharge: rate.perOzCharge ?? 0,
              rushMultiplier: rate.rushMultiplier ?? 1.25,
              metadata: rate.metadata as Prisma.InputJsonValue | undefined,
            },
          });
        }
      }

      return tx.shippingRate.findMany({ where: { storeId }, orderBy: [{ active: 'desc' }, { createdAt: 'asc' }] });
    });
  }

  async listTaxRates(storeId: string) {
    return prisma.taxRate.findMany({
      where: { storeId },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async upsertTaxRates(storeId: string, rates: Array<{
    id?: string;
    name: string;
    jurisdiction?: string;
    active?: boolean;
    rate: number;
    appliesShipping?: boolean;
    metadata?: Prisma.JsonValue;
  }>) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.taxRate.findMany({ where: { storeId }, select: { id: true } });
      const keepIds = rates.map((rate) => rate.id).filter((id): id is string => Boolean(id));
      const removeIds = existing.map((row) => row.id).filter((id) => !keepIds.includes(id));
      if (removeIds.length > 0) {
        await tx.taxRate.deleteMany({ where: { id: { in: removeIds }, storeId } });
      }

      for (const rate of rates) {
        if (rate.id) {
          await tx.taxRate.update({
            where: { id: rate.id },
            data: {
              name: rate.name,
              jurisdiction: rate.jurisdiction,
              active: rate.active ?? true,
              rate: rate.rate,
              appliesShipping: rate.appliesShipping ?? true,
              metadata: rate.metadata as Prisma.InputJsonValue | undefined,
            },
          });
        } else {
          await tx.taxRate.create({
            data: {
              storeId,
              name: rate.name,
              jurisdiction: rate.jurisdiction,
              active: rate.active ?? true,
              rate: rate.rate,
              appliesShipping: rate.appliesShipping ?? true,
              metadata: rate.metadata as Prisma.InputJsonValue | undefined,
            },
          });
        }
      }

      return tx.taxRate.findMany({ where: { storeId }, orderBy: [{ active: 'desc' }, { createdAt: 'asc' }] });
    });
  }

  async evaluate(input: PricingEvaluateInput) {
    const qty = Math.max(1, Number(input.qty || 1));
    const locations = Array.isArray(input.locations) ? input.locations : ['front'];

    const product = await prisma.product.findFirst({
      where: { id: input.productId, storeId: input.storeId },
      include: {
        variants: true,
      },
    });
    if (!product) {
      throw new Error('Product not found for store');
    }

    const variant = input.variantId
      ? product.variants.find((v) => v.id === input.variantId)
      : product.variants[0];
    if (!variant) {
      throw new Error('Variant not found for product/store');
    }

    const activeRuleSet = await prisma.pricingRuleSet.findFirst({
      where: { storeId: input.storeId, active: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: {
        rules: {
          where: { storeId: input.storeId, active: true },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    const blankUnit = Number(variant.price || product.basePrice || variant.supplierCost || 0);

    const shippingRates = await prisma.shippingRate.findMany({ where: { storeId: input.storeId, active: true } });
    const taxRates = await prisma.taxRate.findMany({ where: { storeId: input.storeId, active: true } });
    const customer = input.userId
      ? await prisma.user.findFirst({ where: { id: input.userId }, select: { taxExempt: true } })
      : null;

    const v2 = PricingEngineV2.evaluate({
      qty,
      blankUnitCost: blankUnit,
      method: input.decorationMethod,
      decorationInput: {
        printSizeTier: input.printSizeTier,
        colorCount: input.colorCount,
        stitchCount: input.stitchCount,
        rush: input.rush,
        weightOz: input.weightOz,
        locations,
      },
      shippingRates: shippingRates.map((rate) => ({
        active: rate.active,
        minSubtotal: rate.minSubtotal,
        maxSubtotal: rate.maxSubtotal,
        baseCharge: rate.baseCharge,
        perItemCharge: rate.perItemCharge,
        perOzCharge: rate.perOzCharge,
        rushMultiplier: rate.rushMultiplier,
      })),
      taxRates: taxRates.map((rate) => ({
        active: rate.active,
        rate: rate.rate,
        appliesShipping: rate.appliesShipping,
      })),
      taxExempt: customer?.taxExempt || false,
      rules: (activeRuleSet?.rules || []).map((rule) => ({
        method: rule.method,
        conditions: rule.conditions,
        effects: rule.effects,
        active: rule.active,
      })),
    });

    const personalizationFees = Array.isArray(input.personalizationFees)
      ? input.personalizationFees
          .map((fee) => ({
            name: String(fee?.name || 'personalization'),
            amount: Number(Number(fee?.amount || 0).toFixed(2)),
          }))
          .filter((fee) => fee.amount > 0)
      : [];
    const personalizationTotal = personalizationFees.reduce((sum, fee) => sum + fee.amount, 0);

    const fees = [...v2.setupFees, ...personalizationFees];
    const decorationSubtotal = Number((v2.decorationSubtotal + personalizationTotal).toFixed(2));
    const subtotal = Number((v2.subtotal + personalizationTotal).toFixed(2));
    const total = Number((v2.total + personalizationTotal).toFixed(2));

    return {
      storeId: input.storeId,
      productId: input.productId,
      variantId: variant.id,
      ruleSetId: activeRuleSet?.id || null,
      qty,
      decorationMethod: v2.method,
      locations,
      blanksSubtotal: v2.blanksSubtotal,
      decorationSubtotal,
      fees,
      shipping: v2.shipping,
      tax: v2.tax,
      subtotal,
      total,
      effectiveMarginPct: v2.effectiveMarginPct,
      suggestedUnitPrice: v2.suggestedUnitPrice,
      suggestedLinePrice: v2.suggestedLinePrice,
      projectedProfit: v2.projectedProfit,
      decorationInput: {
        printSizeTier: input.printSizeTier || null,
        colorCount: input.colorCount || null,
        stitchCount: input.stitchCount || null,
        rush: Boolean(input.rush),
        weightOz: input.weightOz || null,
      },
      notes: [
        ...(v2.notes || []),
        ...(personalizationTotal > 0 ? [`Personalization fees applied: ${personalizationTotal.toFixed(2)}`] : []),
      ],
    };
  }

  private async assertRuleSetOwnership(storeId: string, ruleSetId: string) {
    const ruleSet = await prisma.pricingRuleSet.findFirst({ where: { id: ruleSetId, storeId }, select: { id: true } });
    if (!ruleSet) {
      throw new Error('Pricing rule set not found for store');
    }
  }
}

export default new PricingRuleService();
