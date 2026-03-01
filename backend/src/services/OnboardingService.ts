import { PrismaClient } from '@prisma/client';
import AuditService from './AuditService.js';

const prisma = new PrismaClient();

const DEFAULT_DATA = {
  business: { name: '', email: '', phone: '' },
  catalog: { supplierConnected: false, productsImported: false },
  pricing: { rulesConfigured: false },
  storefront: { slug: '', draftReady: false },
  payments: { provider: 'NONE', configured: false },
  notifications: { enabled: true },
};

export class OnboardingService {
  async getState(tenantId: string, storeId?: string) {
    const existing = await (prisma as any).onboardingState.findFirst({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return (prisma as any).onboardingState.create({
      data: {
        tenantId,
        storeId: storeId || null,
        step: 1,
        data: DEFAULT_DATA,
        completed: false,
      },
    });
  }

  async upsertState(input: {
    tenantId: string;
    storeId?: string;
    step?: number;
    data?: Record<string, any>;
    completed?: boolean;
  }) {
    const existing = await (prisma as any).onboardingState.findFirst({
      where: {
        tenantId: input.tenantId,
        ...(input.storeId ? { storeId: input.storeId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    const payload = {
      step: Math.max(1, Math.min(7, Number(input.step || existing?.step || 1))),
      data: input.data || existing?.data || DEFAULT_DATA,
      completed: input.completed ?? existing?.completed ?? false,
      completedAt: (input.completed ?? existing?.completed) ? new Date() : null,
    };

    const state = existing
      ? await (prisma as any).onboardingState.update({
          where: { id: existing.id },
          data: payload,
        })
      : await (prisma as any).onboardingState.create({
          data: {
            tenantId: input.tenantId,
            storeId: input.storeId || null,
            ...payload,
          },
        });

    await AuditService.log({
      tenantId: input.tenantId,
      actorType: 'Admin',
      action: 'onboarding.state.updated',
      entityType: 'OnboardingState',
      entityId: state.id,
      meta: { step: state.step, completed: state.completed },
    });

    return state;
  }

  async complete(tenantId: string, storeId?: string) {
    return this.upsertState({
      tenantId,
      storeId,
      step: 7,
      completed: true,
    });
  }
}

export default new OnboardingService();
