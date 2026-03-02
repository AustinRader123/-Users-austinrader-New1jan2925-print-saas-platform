import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditEntriesQueryDto, AuditSummaryQueryDto } from './audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  entries(tenantId: string, query: AuditEntriesQueryDto) {
    const where: any = {
      tenantId,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 100,
    });
  }

  async summary(tenantId: string, query: AuditSummaryQueryDto) {
    const where: any = {
      tenantId,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [total, byAction, byEntityType, recent] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 25,
      }),
      this.prisma.activityLog.groupBy({
        by: ['entityType'],
        where,
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } },
        take: 25,
      }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          actorUserId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      total,
      byAction: byAction.map((row: any) => ({ action: row.action, count: row._count.action ?? 0 })),
      byEntityType: byEntityType.map((row: any) => ({ entityType: row.entityType, count: row._count.entityType ?? 0 })),
      recent,
    };
  }
}
