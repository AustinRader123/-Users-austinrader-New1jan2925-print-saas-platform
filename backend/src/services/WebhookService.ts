import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import MockWebhookClient from '../providers/webhooks/mock/MockWebhookClient.js';

const prisma = new PrismaClient();

export class WebhookService {
  private client = new MockWebhookClient();

  async enqueueDeliveries(storeId: string, eventType: string, payload: any) {
    const endpoints = await (prisma as any).webhookEndpoint.findMany({
      where: {
        storeId,
        OR: [
          { enabled: true },
          { isActive: true },
        ],
      },
    });

    const deliveries: any[] = [];
    for (const endpoint of endpoints) {
      const eventTypes = Array.isArray(endpoint.eventTypes) ? endpoint.eventTypes : [];
      if (eventTypes.length > 0 && !eventTypes.includes(eventType)) continue;

      const delivery = await (prisma as any).webhookDelivery.create({
        data: {
          storeId,
          webhookEndpointId: endpoint.id,
          eventType,
          payload,
          status: 'PENDING',
          attempts: 0,
        },
      });
      deliveries.push(delivery);
    }

    return deliveries;
  }

  async processPending(input: { limit?: number } = {}) {
    const take = Math.max(1, Math.min(200, Number(input.limit || 50)));
    const rows = await (prisma as any).webhookDelivery.findMany({
      where: { status: { in: ['PENDING', 'QUEUED'] } },
      include: { webhookEndpoint: true },
      orderBy: { createdAt: 'asc' },
      take,
    });

    const results: Array<{ id: string; status: 'SENT' | 'FAILED' }> = [];

    for (const row of rows) {
      try {
        const endpoint = row.webhookEndpoint;
        if (!endpoint || (!endpoint.enabled && !endpoint.isActive)) {
          await (prisma as any).webhookDelivery.update({
            where: { id: row.id },
            data: { status: 'FAILED', attempts: Number(row.attempts || 0) + 1, lastError: 'endpoint inactive' },
          });
          results.push({ id: row.id, status: 'FAILED' });
          continue;
        }

        const payloadJson = JSON.stringify(row.payload || {});
        const signature = crypto.createHmac('sha256', endpoint.secret).update(payloadJson).digest('hex');
        await this.client.post(endpoint.url, {
          'content-type': 'application/json',
          'x-webhook-event': row.eventType,
          'x-webhook-signature': signature,
        }, row.payload || {});

        await (prisma as any).webhookDelivery.update({
          where: { id: row.id },
          data: {
            status: 'SENT',
            attempts: Number(row.attempts || 0) + 1,
            lastError: null,
            deliveredAt: new Date(),
            nextAttemptAt: null,
          },
        });
        results.push({ id: row.id, status: 'SENT' });
      } catch (error: any) {
        await (prisma as any).webhookDelivery.update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            attempts: Number(row.attempts || 0) + 1,
            lastError: error?.message || 'delivery failed',
          },
        });
        results.push({ id: row.id, status: 'FAILED' });
      }
    }

    return { processed: rows.length, results };
  }

  async retryDelivery(deliveryId: string) {
    await (prisma as any).webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', nextAttemptAt: null },
    });

    return this.processPending({ limit: 1 });
  }

  async publish(input: { storeId: string; eventType: string; payload: any }) {
    const deliveries = await this.enqueueDeliveries(input.storeId, input.eventType, input.payload);
    await this.processPending({ limit: deliveries.length || 1 });
    return deliveries;
  }

  async testEndpoint(storeId: string, endpointId: string) {
    const endpoint = await (prisma as any).webhookEndpoint.findFirst({ where: { id: endpointId, storeId } });
    if (!endpoint) throw new Error('Webhook endpoint not found');

    const [delivery] = await this.publish({
      storeId,
      eventType: 'webhook.test',
      payload: { ok: true, timestamp: new Date().toISOString() },
    });

    return delivery;
  }
}

export default new WebhookService();
