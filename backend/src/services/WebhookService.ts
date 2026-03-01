import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import axios from 'axios';
import QueueManager from './QueueManager.js';

const prisma = new PrismaClient();

export class WebhookService {
  private initialized = false;

  ensureProcessor() {
    if (this.initialized) return;
    this.initialized = true;

    QueueManager.processQueue('webhook-delivery', async (job) => {
      const deliveryId = job.data.deliveryId as string;
      const delivery = await (prisma as any).webhookDelivery.findUnique({
        where: { id: deliveryId },
        include: { webhookEndpoint: true },
      });
      if (!delivery) return;
      if (!delivery.webhookEndpoint?.enabled) return;

      try {
        const body = JSON.stringify(delivery.payload || {});
        const signature = crypto
          .createHmac('sha256', delivery.webhookEndpoint.secret)
          .update(body)
          .digest('hex');

        await axios.post(delivery.webhookEndpoint.url, delivery.payload, {
          timeout: 5000,
          headers: {
            'x-webhook-event': delivery.eventType,
            'x-webhook-signature': signature,
            'content-type': 'application/json',
          },
        });

        await (prisma as any).webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SENT', attempts: delivery.attempts + 1, lastError: null, nextAttemptAt: null },
        });
      } catch (error: any) {
        const attempts = delivery.attempts + 1;
        const delayMinutes = Math.min(60, Math.pow(2, attempts));
        const nextAttemptAt = new Date(Date.now() + delayMinutes * 60 * 1000);

        await (prisma as any).webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: attempts >= 5 ? 'FAILED' : 'QUEUED',
            attempts,
            lastError: error?.message || 'delivery failed',
            nextAttemptAt: attempts >= 5 ? null : nextAttemptAt,
          },
        });

        if (attempts < 5) {
          await QueueManager.enqueueJob('webhook-delivery', { deliveryId: delivery.id }, { delay: delayMinutes * 60 * 1000 });
        }
      }
    });
  }

  async publish(input: { storeId: string; eventType: string; payload: any }) {
    this.ensureProcessor();

    const endpoints = await (prisma as any).webhookEndpoint.findMany({
      where: {
        storeId: input.storeId,
        enabled: true,
      },
    });

    const deliveries: any[] = [];
    for (const endpoint of endpoints) {
      const eventTypes = Array.isArray(endpoint.eventTypes) ? endpoint.eventTypes : [];
      if (eventTypes.length > 0 && !eventTypes.includes(input.eventType)) continue;

      const delivery = await (prisma as any).webhookDelivery.create({
        data: {
          storeId: input.storeId,
          webhookEndpointId: endpoint.id,
          eventType: input.eventType,
          payload: input.payload,
          status: 'QUEUED',
          attempts: 0,
        },
      });
      deliveries.push(delivery);
      await QueueManager.enqueueJob('webhook-delivery', { deliveryId: delivery.id }, { attempts: 1 });
    }

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
