import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationStatusDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, status?: string, storeId?: string) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  enqueue(tenantId: string, body: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        storeId: body.storeId,
        userId: body.userId,
        channel: body.channel.trim().toUpperCase(),
        subject: body.subject.trim(),
        body: body.body,
        status: 'QUEUED',
      },
    });
  }

  async markStatus(tenantId: string, id: string, body: UpdateNotificationStatusDto) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException('notification not found');
    }

    const next = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.notification.update({
        where: { id },
        data: {
          status: body.status,
        },
      });

      await tx.activityLog.create({
        data: {
          tenantId,
          storeId: updated.storeId,
          actorUserId: updated.userId,
          entityType: 'NOTIFICATION',
          entityId: updated.id,
          action: `STATUS_${body.status}`,
          payload: {
            previousStatus: existing.status,
            nextStatus: body.status,
            reason: body.reason || null,
          },
        },
      });

      return updated;
    });

    return next;
  }

  async pullQueued(tenantId: string, storeId?: string, limit = 25) {
    const queued = await this.prisma.notification.findMany({
      where: {
        tenantId,
        status: 'QUEUED',
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    if (queued.length === 0) {
      return [];
    }

    const ids = queued.map((item: any) => item.id);
    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { status: 'PROCESSING' },
    });

    return this.prisma.notification.findMany({
      where: { id: { in: ids }, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
