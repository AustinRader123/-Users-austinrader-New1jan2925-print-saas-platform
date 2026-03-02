import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWebhookDto,
  DispatchWebhookRetriesDto,
  QueueWebhookRetryDto,
  RecordWebhookDeliveryDto,
  UpdateWebhookDto,
} from './webhooks.dto';

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
      idempotencyKey: dto.idempotencyKey || null,
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

  async retries(tenantId: string, webhookId?: string, status?: string, action?: string, limit = 100) {
    const rows = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        entityType: 'WEBHOOK_RETRY',
        ...(webhookId ? { entityId: webhookId } : {}),
        ...(action ? { action: action.trim().toUpperCase() } : {}),
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

  async retriesSummary(tenantId: string, webhookId?: string, hours = 24) {
    const safeHours = Math.min(Math.max(hours, 1), 24 * 30);
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);

    const rows = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        entityType: 'WEBHOOK_RETRY',
        ...(webhookId ? { entityId: webhookId } : {}),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const actionCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let oldestQueuedAt: Date | null = null;
    let maxAttempt = 0;

    for (const row of rows as any[]) {
      actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
      const payload = (row.payload || {}) as Record<string, unknown>;
      const status = typeof payload.status === 'string' ? payload.status : undefined;
      if (status) {
        const normalized = status.toUpperCase();
        statusCounts[normalized] = (statusCounts[normalized] || 0) + 1;
        if (normalized === 'QUEUED') {
          if (!oldestQueuedAt || row.createdAt < oldestQueuedAt) {
            oldestQueuedAt = row.createdAt;
          }
        }
      }

      const attempt = Number(payload.attempt || 0);
      if (Number.isFinite(attempt) && attempt > maxAttempt) {
        maxAttempt = attempt;
      }
    }

    return {
      windowHours: safeHours,
      since: since.toISOString(),
      total: rows.length,
      actionCounts,
      statusCounts,
      queuedCount: statusCounts.QUEUED || 0,
      sentCount: statusCounts.SENT || 0,
      failedCount: statusCounts.FAILED || 0,
      processingCount: statusCounts.PROCESSING || 0,
      maxAttempt,
      oldestQueuedAt: oldestQueuedAt ? oldestQueuedAt.toISOString() : null,
      oldestQueuedAgeSeconds: oldestQueuedAt ? Math.floor((Date.now() - oldestQueuedAt.getTime()) / 1000) : null,
    };
  }

  async receiveInbound(
    webhookId: string,
    input: {
      providedSecret?: string;
      eventId?: string;
      signature?: string;
      signatureTimestamp?: string;
      idempotencyKey?: string;
      body: Record<string, unknown>;
    }
  ) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, isActive: true, deletedAt: null },
      select: { id: true, tenantId: true, storeId: true, eventType: true, secretHash: true },
    });
    if (!webhook) {
      throw new NotFoundException('webhook not found');
    }

    const eventId = input.eventId;
    const idempotencyKey = input.idempotencyKey || this.computeIdempotencyKey(webhook.id, eventId, input.body);
    const bodyText = this.jsonString(input.body);

    if (webhook.secretHash && !this.secretMatches(webhook.secretHash, input.providedSecret)) {
      await this.prisma.activityLog.create({
        data: {
          tenantId: webhook.tenantId,
          storeId: webhook.storeId,
          entityType: 'WEBHOOK_INBOUND',
          entityId: webhook.id,
          action: 'REJECTED_SIGNATURE',
          payload: {
            eventId: eventId || null,
            idempotencyKey,
          },
        },
      });
      throw new UnauthorizedException('invalid webhook secret');
    }

    if (webhook.secretHash && input.signature && input.signatureTimestamp && input.providedSecret) {
      if (!this.isTimestampWithinWindow(input.signatureTimestamp)) {
        await this.prisma.activityLog.create({
          data: {
            tenantId: webhook.tenantId,
            storeId: webhook.storeId,
            entityType: 'WEBHOOK_INBOUND',
            entityId: webhook.id,
            action: 'REJECTED_SIGNATURE',
            payload: {
              eventId: eventId || null,
              idempotencyKey,
              reason: 'signature timestamp outside allowed window',
              signatureTimestamp: input.signatureTimestamp,
            },
          },
        });
        throw new UnauthorizedException('webhook signature expired');
      }

      const expectedSignature = this.computeSecretSignature(
        input.providedSecret,
        input.signatureTimestamp,
        eventId,
        idempotencyKey,
        bodyText
      );
      if (!this.tokenMatches(expectedSignature, input.signature)) {
        await this.prisma.activityLog.create({
          data: {
            tenantId: webhook.tenantId,
            storeId: webhook.storeId,
            entityType: 'WEBHOOK_INBOUND',
            entityId: webhook.id,
            action: 'REJECTED_SIGNATURE',
            payload: {
              eventId: eventId || null,
              idempotencyKey,
              reason: 'signature mismatch',
            },
          },
        });
        throw new UnauthorizedException('invalid webhook signature');
      }
    }

    const recentInbound = await this.prisma.activityLog.findMany({
      where: {
        tenantId: webhook.tenantId,
        entityType: 'WEBHOOK_INBOUND',
        entityId: webhook.id,
        action: 'RECEIVED',
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const duplicate = recentInbound.find((entry: any) => {
      const payload = entry.payload as Record<string, unknown> | null;
      return payload?.idempotencyKey === idempotencyKey;
    });

    if (duplicate) {
      return {
        accepted: true,
        duplicate: true,
        webhookId: webhook.id,
        eventType: webhook.eventType,
        activityId: duplicate.id,
        idempotencyKey,
      };
    }

    const activity = await this.prisma.activityLog.create({
      data: {
        tenantId: webhook.tenantId,
        storeId: webhook.storeId,
        entityType: 'WEBHOOK_INBOUND',
        entityId: webhook.id,
        action: 'RECEIVED',
        payload: {
          eventId: eventId || null,
          idempotencyKey,
          eventType: webhook.eventType,
          body: input.body,
        },
      },
    });

    return {
      accepted: true,
      webhookId: webhook.id,
      eventType: webhook.eventType,
      activityId: activity.id,
      idempotencyKey,
    };
  }

  async queueRetry(tenantId: string, webhookId: string, dto: QueueWebhookRetryDto) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, tenantId, deletedAt: null },
      select: { id: true, storeId: true, eventType: true },
    });
    if (!webhook) {
      throw new NotFoundException('webhook not found');
    }

    const idempotencyKey = dto.idempotencyKey || this.computeIdempotencyKey(webhook.id, dto.eventId, dto.body);
    const recentRetries = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        entityType: 'WEBHOOK_RETRY',
        entityId: webhook.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const existing = recentRetries.find((entry: any) => {
      const payload = entry.payload as Record<string, unknown> | null;
      if (payload?.idempotencyKey !== idempotencyKey) {
        return false;
      }
      return ['RETRY_QUEUED', 'RETRY_PROCESSING', 'RETRY_SENT'].includes(entry.action);
    });

    if (existing) {
      return {
        retryId: existing.id,
        webhookId,
        status: existing.action,
        duplicate: true,
        idempotencyKey,
      };
    }

    const retryLog = await this.prisma.activityLog.create({
      data: {
        tenantId,
        storeId: webhook.storeId,
        entityType: 'WEBHOOK_RETRY',
        entityId: webhook.id,
        action: 'RETRY_QUEUED',
        payload: {
          status: 'QUEUED',
          eventId: dto.eventId || null,
          idempotencyKey,
          eventType: dto.eventType || webhook.eventType,
          body: dto.body,
          attempt: dto.attempt ?? 0,
          maxAttempts: dto.maxAttempts ?? 5,
          nextAttemptAt: new Date().toISOString(),
          queuedAt: new Date().toISOString(),
        },
      },
    });

    return {
      retryId: retryLog.id,
      webhookId,
      status: 'QUEUED',
      idempotencyKey,
    };
  }

  async dispatchRetries(tenantId: string, dto: DispatchWebhookRetriesDto) {
    const limit = Math.min(Math.max(dto.limit ?? 25, 1), 100);
    const now = Date.now();
    const queued = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        entityType: 'WEBHOOK_RETRY',
        action: 'RETRY_QUEUED',
        ...(dto.webhookId ? { entityId: dto.webhookId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const results: Array<Record<string, unknown>> = [];

    for (const item of queued) {
      const payload = (item.payload || {}) as Record<string, any>;
      const nextAttemptAt = payload.nextAttemptAt ? Date.parse(String(payload.nextAttemptAt)) : now;
      if (Number.isFinite(nextAttemptAt) && nextAttemptAt > now) {
        results.push({ retryId: item.id, status: 'SKIPPED', reason: 'backoff active' });
        continue;
      }

      const attempt = Number(payload.attempt || 0) + 1;
      const maxAttempts = Number(payload.maxAttempts || 5);

      await this.prisma.activityLog.update({
        where: { id: item.id },
        data: {
          action: 'RETRY_PROCESSING',
          payload: {
            ...payload,
            status: 'PROCESSING',
            attempt,
            processingAt: new Date().toISOString(),
          },
        },
      });

      const webhook = await this.prisma.webhook.findFirst({
        where: { id: item.entityId, tenantId, isActive: true, deletedAt: null },
        select: { id: true, endpoint: true, eventType: true, secretHash: true },
      });

      if (!webhook) {
        await this.prisma.activityLog.update({
          where: { id: item.id },
          data: {
            action: 'RETRY_FAILED',
            payload: {
              ...payload,
              status: 'FAILED',
              attempt,
              error: 'webhook missing or inactive',
            },
          },
        });
        results.push({ retryId: item.id, status: 'FAILED', reason: 'webhook missing or inactive' });
        continue;
      }

      try {
        const startedAt = Date.now();
        const eventId = payload.eventId ? String(payload.eventId) : undefined;
        const idempotencyKey = payload.idempotencyKey
          ? String(payload.idempotencyKey)
          : this.computeIdempotencyKey(webhook.id, eventId, payload.body || {});
        const signatureTimestamp = new Date().toISOString();
        const bodyText = this.jsonString(payload.body || {});
        const signature = webhook.secretHash
          ? this.computeHashedSecretSignature(webhook.secretHash, signatureTimestamp, eventId, idempotencyKey, bodyText)
          : undefined;

        const response = await fetch(webhook.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-webhook-id': webhook.id,
            'x-webhook-event': String(payload.eventType || webhook.eventType),
            'x-webhook-attempt': String(attempt),
            ...(eventId ? { 'x-webhook-event-id': eventId } : {}),
            'x-webhook-idempotency-key': idempotencyKey,
            'x-webhook-signature-ts': signatureTimestamp,
            ...(signature ? { 'x-webhook-signature': signature } : {}),
          },
          body: bodyText,
        });
        const latencyMs = Date.now() - startedAt;
        const responseText = (await response.text()).slice(0, 4000);
        const ok = response.status >= 200 && response.status < 300;

        if (ok) {
          await this.recordDelivery(tenantId, webhook.id, {
            status: 'SUCCESS',
            eventId,
            idempotencyKey,
            attempt,
            responseCode: response.status,
            latencyMs,
            responseBody: { text: responseText },
          });

          await this.prisma.activityLog.update({
            where: { id: item.id },
            data: {
              action: 'RETRY_SENT',
              payload: {
                ...payload,
                status: 'SENT',
                attempt,
                idempotencyKey,
                responseCode: response.status,
                sentAt: new Date().toISOString(),
              },
            },
          });

          results.push({ retryId: item.id, status: 'SENT', attempt, responseCode: response.status });
          continue;
        }

        const canRetry = attempt < maxAttempts;
        await this.recordDelivery(tenantId, webhook.id, {
          status: canRetry ? 'RETRY' : 'FAILED',
          eventId,
          idempotencyKey,
          attempt,
          responseCode: response.status,
          latencyMs,
          error: `HTTP ${response.status}`,
          responseBody: { text: responseText },
        });

        await this.prisma.activityLog.update({
          where: { id: item.id },
          data: {
            action: canRetry ? 'RETRY_QUEUED' : 'RETRY_FAILED',
            payload: {
              ...payload,
              status: canRetry ? 'QUEUED' : 'FAILED',
              attempt,
              idempotencyKey,
              responseCode: response.status,
              error: `HTTP ${response.status}`,
              nextAttemptAt: canRetry ? new Date(Date.now() + this.retryBackoffMs(attempt)).toISOString() : null,
            },
          },
        });

        results.push({
          retryId: item.id,
          status: canRetry ? 'REQUEUED' : 'FAILED',
          attempt,
          responseCode: response.status,
        });
      } catch (error: any) {
        const canRetry = attempt < maxAttempts;
        await this.recordDelivery(tenantId, webhook.id, {
          status: canRetry ? 'RETRY' : 'FAILED',
          eventId: payload.eventId,
          idempotencyKey: payload.idempotencyKey,
          attempt,
          error: error?.message || 'dispatch error',
        });

        await this.prisma.activityLog.update({
          where: { id: item.id },
          data: {
            action: canRetry ? 'RETRY_QUEUED' : 'RETRY_FAILED',
            payload: {
              ...payload,
              status: canRetry ? 'QUEUED' : 'FAILED',
              attempt,
              idempotencyKey: payload.idempotencyKey,
              error: error?.message || 'dispatch error',
              nextAttemptAt: canRetry ? new Date(Date.now() + this.retryBackoffMs(attempt)).toISOString() : null,
            },
          },
        });

        results.push({ retryId: item.id, status: canRetry ? 'REQUEUED' : 'FAILED', attempt, error: error?.message });
      }
    }

    return {
      queued: queued.length,
      processed: results.length,
      results,
    };
  }

  private hashSecret(secret: string) {
    return createHash('sha256').update(secret).digest('hex');
  }

  private secretMatches(expectedHash: string, providedSecret: string | undefined) {
    if (!providedSecret) {
      return false;
    }

    const providedHash = this.hashSecret(providedSecret);
    const left = Buffer.from(expectedHash, 'utf8');
    const right = Buffer.from(providedHash, 'utf8');
    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  }

  private retryBackoffMs(attempt: number) {
    return Math.min(30000 * Math.max(attempt, 1), 15 * 60 * 1000);
  }

  private computeIdempotencyKey(webhookId: string, eventId: string | undefined, body: Record<string, unknown>) {
    const bodyHash = createHash('sha256').update(this.jsonString(body)).digest('hex').slice(0, 24);
    return `${webhookId}:${eventId || 'no-event'}:${bodyHash}`;
  }

  private jsonString(body: Record<string, unknown>) {
    return JSON.stringify(body || {});
  }

  private computeSecretSignature(
    secret: string,
    timestamp: string,
    eventId: string | undefined,
    idempotencyKey: string,
    bodyText: string
  ) {
    const canonical = `${timestamp}.${eventId || ''}.${idempotencyKey}.${bodyText}`;
    return createHmac('sha256', secret).update(canonical).digest('hex');
  }

  private computeHashedSecretSignature(
    secretHash: string,
    timestamp: string,
    eventId: string | undefined,
    idempotencyKey: string,
    bodyText: string
  ) {
    const canonical = `${timestamp}.${eventId || ''}.${idempotencyKey}.${bodyText}`;
    return createHmac('sha256', secretHash).update(canonical).digest('hex');
  }

  private tokenMatches(expected: string, provided: string) {
    const left = Buffer.from(expected, 'utf8');
    const right = Buffer.from(provided, 'utf8');
    if (left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  }

  private isTimestampWithinWindow(signatureTimestamp: string) {
    const parsed = Date.parse(signatureTimestamp);
    if (!Number.isFinite(parsed)) {
      return false;
    }

    const maxSkewSeconds = Number(process.env.WEBHOOK_SIGNATURE_MAX_SKEW_SECONDS || 300);
    const deltaSeconds = Math.abs(Date.now() - parsed) / 1000;
    return deltaSeconds <= Math.max(maxSkewSeconds, 1);
  }
}
