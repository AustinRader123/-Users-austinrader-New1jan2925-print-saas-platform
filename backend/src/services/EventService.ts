import prisma from '../lib/prisma.js';
import WebhookService from './WebhookService.js';
import NotificationService from './NotificationService.js';

type EmitInput = {
  actorType?: 'PUBLIC' | 'USER' | 'SYSTEM';
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
};

const notificationEventMap: Record<string, { type: any; channel: 'EMAIL' | 'SMS' }> = {
  'proof.requested': { type: 'PROOF_REQUESTED', channel: 'EMAIL' },
  'proof.approved': { type: 'PROOF_APPROVED', channel: 'EMAIL' },
  'invoice.sent': { type: 'INVOICE_SENT', channel: 'EMAIL' },
  'payment.receipt': { type: 'PAYMENT_RECEIPT', channel: 'EMAIL' },
  'shipment.created': { type: 'SHIPMENT_CREATED', channel: 'EMAIL' },
  'shipment.delivered': { type: 'SHIPMENT_DELIVERED', channel: 'EMAIL' },
};

export class EventService {
  async emit(storeId: string, eventType: string, input: EmitInput = {}) {
    const row = await (prisma as any).eventLog.create({
      data: {
        storeId,
        actorType: input.actorType || 'SYSTEM',
        actorId: input.actorId || null,
        eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        propertiesJson: input.properties || {},
      },
    });

    await WebhookService.enqueueDeliveries(storeId, eventType, {
      eventId: row.id,
      eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      properties: input.properties || {},
      createdAt: row.createdAt,
    });

    const mapped = notificationEventMap[eventType];
    const recipient = String(input.properties?.toEmail || input.properties?.customerEmail || '');
    if (mapped && recipient) {
      await NotificationService.enqueue(storeId, mapped.type, mapped.channel, recipient, {
        eventType,
        ...(input.properties || {}),
      });
    }

    return row;
  }
}

export default new EventService();
