import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookDto, RecordWebhookDeliveryDto, UpdateWebhookDto } from './webhooks.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, storeId?: string, eventType?: string, provider?: string) {
    return this.prisma.webhook.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(storeId ? { storeId } : {}),
        ...(eventType ? { eventType } : {}),
        ...(provider ? { provider: provider.trim().toUpperCase() as any } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  create(tenantId: string, dto: CreateWebhookDto) {
    return this.prisma.webhook.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        provider: (dto.provider || 'MOCK').trim().toUpperCase() as any,
        eventType: dto.eventType.trim(),
        endpoint: dto.endpoint.trim(),
        secretHash: dto.secret ? this.hashSecret(dto.secret) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateWebhookDto) {
    const existing = await this.prisma.webhook.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('webhook not found');
    }

    return this.prisma.webhook.update({
      where: { id },
      data: {
        storeId: dto.storeId,
        provider: dto.provider ? (dto.provider.trim().toUpperCase() as any) : undefined,
        eventType: dto.eventType?.trim(),
        endpoint: dto.endpoint?.trim(),
        secretHash: dto.secret ? this.hashSecret(dto.secret) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.webhook.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('webhook not found');
    }

    return this.prisma.webhook.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async recordDelivery(tenantId: string, webhookId: string, dto: RecordWebhookDeliveryDto) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, tenantId, deletedAt: null },
      select: { id: true, storeId: true, endpoint: true, eventType: true },
    });
    if (!webhook) {
      throw new NotFoundException('webhook not found');
    }

    const payload = {
      status: dto.status,
      eventId: dto.eventId || null,
      responseCode: dto.responseCode || null,
      latencyMs: dto.latencyMs || null,
      attempt: dto.attempt || 1,
      error: dto.error || null,
      endpoint: webhook.endpoint,
      eventType: webhook.eventType,
      responseBody: dto.responseBody || null,
    };

    const result = await this.prisma.$transaction(async (tx: any) => {
      if (dto.eventId) {
        await tx.webhook.update({
          where: { id: webhookId },
          data: { lastEventId: dto.eventId },
        });
      }

      return tx.activityLog.create({
        data: {
          tenantId,
          storeId: webhook.storeId,
          entityType: 'WEBHOOK_DELIVERY',
          entityId: webhook.id,
          action: `DELIVERY_${dto.status}`,
          payload,
        },
      });
    });

    return {
      webhookId,
      deliveryId: result.id,
      status: dto.status,
    };
  }

  async deliveries(tenantId: string, webhookId?: string, status?: string, limit = 100) {
    const rows = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        entityType: 'WEBHOOK_DELIVERY',
        ...(webhookId ? { entityId: webhookId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
    });

    if (!status) {
      return rows;
    }

    const normalizedStatus = status.trim().toUpperCase();
    return rows.filter((entry: any) => {
      const payload = entry.payload as Record<string, unknown> | null;
      return payload?.status === normalizedStatus;
    });
  }

  private hashSecret(secret: string) {
    return createHash('sha256').update(secret).digest('hex');
  }
}
