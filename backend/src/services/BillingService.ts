import crypto from 'crypto';
import prisma from '../lib/prisma.js';

type CheckoutPayload = {
  tenantId: string;
  planCode: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  userId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type BillingProviderAdapter = {
  provider: 'MOCK' | 'STRIPE';
  createCustomer(input: { tenantId: string; tenantName: string }): Promise<{ customerId: string }>;
  createCheckoutSession(input: CheckoutPayload): Promise<{ checkoutUrl: string; providerRef: string }>;
  getSubscription(input: { tenantId: string; providerSubId?: string | null }): Promise<{ status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' }>;
  cancelSubscription(input: { tenantId: string; providerSubId?: string | null }): Promise<{ canceled: boolean }>;
};

class MockBillingProvider implements BillingProviderAdapter {
  provider: 'MOCK' = 'MOCK';

  async createCustomer(input: { tenantId: string; tenantName: string }) {
    return { customerId: `mock_cus_${input.tenantId}` };
  }

  async createCheckoutSession(input: CheckoutPayload) {
    return {
      checkoutUrl: `${input.successUrl || '/app/settings/billing'}?mockCheckout=1&plan=${input.planCode}`,
      providerRef: `mock_checkout_${Date.now()}`,
    };
  }

  async getSubscription() {
    return { status: 'ACTIVE' as const };
  }

  async cancelSubscription() {
    return { canceled: true };
  }
}

class StripeBillingProvider implements BillingProviderAdapter {
  provider: 'STRIPE' = 'STRIPE';

  async createCustomer(input: { tenantId: string; tenantName: string }) {
    return { customerId: `stripe_stub_${input.tenantId}` };
  }

  async createCheckoutSession(input: CheckoutPayload) {
    return {
      checkoutUrl: `${input.successUrl || '/app/settings/billing'}?stripeStub=1&plan=${input.planCode}`,
      providerRef: `stripe_stub_checkout_${Date.now()}`,
    };
  }

  async getSubscription() {
    return { status: 'ACTIVE' as const };
  }

  async cancelSubscription() {
    return { canceled: true };
  }
}

function invoiceNumber() {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${stamp}-${rand}`;
}

export class BillingService {
  private resolveProvider(): BillingProviderAdapter {
    const provider = (process.env.BILLING_PROVIDER || 'MOCK').toUpperCase();
    if (provider === 'STRIPE') return new StripeBillingProvider();
    return new MockBillingProvider();
  }

  async ensureDefaultPlans() {
    const plans = [
      {
        code: 'FREE', name: 'Free', priceCents: null, interval: 'MONTH',
        features: { 'suppliers.enabled': false, 'teamStores.enabled': false, 'advancedPricing.enabled': false, 'webhooks.enabled': false, 'customizer.enabled': false },
        limits: { maxStores: 1, maxUsers: 2, maxMonthlyOrders: 50 },
      },
      {
        code: 'STARTER', name: 'Starter', priceCents: 4900, interval: 'MONTH',
        features: { 'suppliers.enabled': true, 'teamStores.enabled': true, 'advancedPricing.enabled': false, 'webhooks.enabled': false, 'customizer.enabled': false },
        limits: { maxStores: 2, maxUsers: 5, maxMonthlyOrders: 500 },
      },
      {
        code: 'PRO', name: 'Pro', priceCents: 12900, interval: 'MONTH',
        features: { 'suppliers.enabled': true, 'teamStores.enabled': true, 'advancedPricing.enabled': true, 'webhooks.enabled': true, 'customizer.enabled': true },
        limits: { maxStores: 10, maxUsers: 50, maxMonthlyOrders: 5000 },
      },
      {
        code: 'ENTERPRISE', name: 'Enterprise', priceCents: null, interval: 'MONTH',
        features: { 'suppliers.enabled': true, 'teamStores.enabled': true, 'advancedPricing.enabled': true, 'webhooks.enabled': true, 'customizer.enabled': true },
        limits: { maxStores: 9999, maxUsers: 9999, maxMonthlyOrders: 999999 },
      },
    ] as const;

    for (const plan of plans) {
      await (prisma as any).plan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          priceCents: plan.priceCents,
          interval: plan.interval,
          features: plan.features,
          limits: plan.limits,
          active: true,
        },
        create: {
          code: plan.code,
          name: plan.name,
          priceCents: plan.priceCents,
          interval: plan.interval,
          features: plan.features,
          limits: plan.limits,
          active: true,
        },
      });
    }
  }

  async ensureTenantSubscription(tenantId: string) {
    await this.ensureDefaultPlans();
    const existing = await (prisma as any).tenantSubscription.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    if (existing) return existing;

    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return (prisma as any).tenantSubscription.create({
      data: {
        tenantId,
        planCode: 'FREE',
        status: 'TRIALING',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        provider: 'MOCK',
      },
    });
  }

  async getTenantBillingSnapshot(tenantId: string) {
    const subscription = await this.ensureTenantSubscription(tenantId);
    const plan = await (prisma as any).plan.findUnique({ where: { code: subscription.planCode } });
    const invoices = await (prisma as any).billingInvoice.findMany({ where: { tenantId }, orderBy: { issuedAt: 'desc' }, take: 50 });

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
      subscription,
      plan,
      invoices,
      usage: {
        stores: storeCount,
        users: userCount,
        monthlyOrders,
      },
    };
  }

  async createCheckoutSession(input: CheckoutPayload) {
    const provider = this.resolveProvider();
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const customer = await provider.createCustomer({ tenantId: input.tenantId, tenantName: tenant.name });
    const checkout = await provider.createCheckoutSession(input);

    await (prisma as any).billingEvent.create({
      data: {
        tenantId: input.tenantId,
        type: 'billing.checkout.created',
        payload: {
          provider: provider.provider,
          planCode: input.planCode,
          providerCustomerId: customer.customerId,
          providerRef: checkout.providerRef,
        },
      },
    });

    if (provider.provider === 'MOCK' || String(process.env.BILLING_AUTO_APPLY_MOCK || 'true') === 'true') {
      await this.applyPlanChange({
        tenantId: input.tenantId,
        planCode: input.planCode,
        provider: provider.provider,
        providerCustomerId: customer.customerId,
        providerSubId: checkout.providerRef,
      });
    }

    return { checkoutUrl: checkout.checkoutUrl, provider: provider.provider };
  }

  async applyPlanChange(input: {
    tenantId: string;
    planCode: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    provider: 'MOCK' | 'STRIPE';
    providerCustomerId?: string;
    providerSubId?: string;
  }) {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const current = await this.ensureTenantSubscription(input.tenantId);
    const next = await (prisma as any).tenantSubscription.create({
      data: {
        tenantId: input.tenantId,
        planCode: input.planCode,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        provider: input.provider,
        providerCustomerId: input.providerCustomerId || current.providerCustomerId,
        providerSubId: input.providerSubId || current.providerSubId,
      },
    });

    const plan = await (prisma as any).plan.findUnique({ where: { code: input.planCode } });
    await (prisma as any).billingInvoice.create({
      data: {
        tenantId: input.tenantId,
        number: invoiceNumber(),
        status: 'PAID',
        amountCents: Number(plan?.priceCents || 0),
        currency: 'USD',
        issuedAt: now,
        paidAt: now,
        providerRef: input.providerSubId || null,
      },
    });

    await (prisma as any).billingEvent.create({
      data: {
        tenantId: input.tenantId,
        type: 'billing.subscription.changed',
        payload: {
          fromPlan: current.planCode,
          toPlan: input.planCode,
          provider: input.provider,
        },
      },
    });

    return next;
  }

  async cancelSubscription(tenantId: string) {
    const current = await this.ensureTenantSubscription(tenantId);
    const provider = this.resolveProvider();
    await provider.cancelSubscription({ tenantId, providerSubId: current.providerSubId });

    const updated = await (prisma as any).tenantSubscription.create({
      data: {
        tenantId,
        planCode: current.planCode,
        status: 'CANCELED',
        currentPeriodStart: current.currentPeriodStart,
        currentPeriodEnd: current.currentPeriodEnd,
        cancelAtPeriodEnd: true,
        provider: current.provider,
        providerCustomerId: current.providerCustomerId,
        providerSubId: current.providerSubId,
      },
    });

    await (prisma as any).billingEvent.create({
      data: {
        tenantId,
        type: 'billing.subscription.canceled',
        payload: { planCode: current.planCode, provider: current.provider },
      },
    });

    return updated;
  }

  async listBillingEvents(tenantId: string) {
    return (prisma as any).billingEvent.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
}

export default new BillingService();
