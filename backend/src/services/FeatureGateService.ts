import prisma from '../lib/prisma.js';
import BillingService from './BillingService.js';

const DEFAULT_FEATURES: Record<string, boolean> = {
  'suppliers.enabled': false,
  'teamStores.enabled': false,
  'advancedPricing.enabled': false,
  'webhooks.enabled': false,
  'customizer.enabled': false,
  'network.enabled': false,
  'fundraising.enabled': false,
};

const DEFAULT_LIMITS: Record<string, number> = {
  maxStores: 1,
  maxUsers: 2,
  maxMonthlyOrders: 50,
};

export class FeatureGateService {
  private async resolvePlanData(tenantId: string) {
    const sub = await BillingService.ensureTenantSubscription(tenantId);
    const plan = await (prisma as any).plan.findUnique({ where: { code: sub.planCode } });
    const overrides = await (prisma as any).featureOverride.findMany({ where: { tenantId } });

    const features = {
      ...DEFAULT_FEATURES,
      ...(plan?.features || {}),
    } as Record<string, boolean>;

    for (const override of overrides as Array<{ key: string; enabled: boolean }>) {
      features[override.key] = Boolean(override.enabled);
    }

    const limits = {
      ...DEFAULT_LIMITS,
      ...(plan?.limits || {}),
    } as Record<string, number>;

    return { sub, plan, features, limits };
  }

  async can(tenantId: string, featureKey: string) {
    const { features } = await this.resolvePlanData(tenantId);
    return Boolean(features[featureKey]);
  }

  async limit(tenantId: string, limitKey: string) {
    const { limits } = await this.resolvePlanData(tenantId);
    return Number(limits[limitKey] ?? 0);
  }

  async assertCan(tenantId: string, featureKey: string, message?: string) {
    const allowed = await this.can(tenantId, featureKey);
    if (!allowed) {
      throw new Error(message || `Feature '${featureKey}' is not available on current plan`);
    }
  }

  async assertWithinLimit(tenantId: string, limitKey: string, currentValue: number, message?: string) {
    const max = await this.limit(tenantId, limitKey);
    if (max > 0 && currentValue >= max) {
      throw new Error(message || `Limit '${limitKey}' exceeded (${currentValue}/${max})`);
    }
  }

  async snapshot(tenantId: string) {
    const data = await this.resolvePlanData(tenantId);

    const [storeCount, userCount, monthlyOrders] = await Promise.all([
      prisma.store.count({ where: { tenantId } }),
      (prisma as any).tenantUser.count({ where: { tenantId } }),
      prisma.order.count({
        where: {
          store: { tenantId },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        } as any,
      }),
    ]);

    return {
      subscription: data.sub,
      plan: data.plan,
      features: data.features,
      limits: data.limits,
      usage: {
        stores: storeCount,
        users: userCount,
        monthlyOrders,
      },
    };
  }
}

export default new FeatureGateService();
