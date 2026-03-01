import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditService {
  async log(input: {
    tenantId?: string | null;
    actorUserId?: string | null;
    actorType: 'Admin' | 'Customer' | 'System';
    action: string;
    entityType?: string;
    entityId?: string;
    meta?: any;
  }) {
    const tenantId = input.tenantId || (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id;
    if (!tenantId) return null;

    return prisma.auditLog.create({
      data: {
        tenantId,
        userId: input.actorUserId || null,
        actorUserId: input.actorUserId || null,
        actorType: input.actorType,
        action: input.action,
        resourceType: input.entityType,
        resourceId: input.entityId,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.meta,
        meta: input.meta,
      },
    });
  }
}

export default new AuditService();
