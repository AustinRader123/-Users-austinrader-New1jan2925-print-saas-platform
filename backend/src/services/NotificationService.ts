import prisma from '../lib/prisma.js';
import MockNotificationProvider from '../providers/notifications/mock/MockNotificationProvider.js';

type NotificationType =
  | 'PROOF_REQUESTED'
  | 'PROOF_APPROVED'
  | 'INVOICE_SENT'
  | 'PAYMENT_RECEIPT'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_DELIVERED'
  | 'PASSWORD_RESET';

type NotificationChannel = 'EMAIL' | 'SMS';

const DEFAULT_TEMPLATE_MAP: Record<NotificationType, { email?: string; sms?: string }> = {
  PROOF_REQUESTED: { email: 'proof_requested_email' },
  PROOF_APPROVED: { email: 'proof_approved_email' },
  INVOICE_SENT: { email: 'invoice_sent_email' },
  PAYMENT_RECEIPT: { email: 'payment_receipt_email' },
  SHIPMENT_CREATED: { email: 'shipment_created_email' },
  SHIPMENT_DELIVERED: { email: 'shipment_delivered_email' },
  PASSWORD_RESET: { email: 'password_reset_email' },
};

export class NotificationService {
  private provider = new MockNotificationProvider();

  async enqueue(storeId: string, type: NotificationType, channel: NotificationChannel, to: string, payload: Record<string, unknown>) {
    return (prisma as any).notificationOutbox.create({
      data: {
        storeId,
        type,
        channel,
        to,
        payloadJson: payload,
        status: 'PENDING',
      },
    });
  }

  async renderTemplate(storeId: string, templateKey: string, payload: Record<string, unknown>) {
    const template = await (prisma as any).notificationTemplate.findFirst({
      where: { storeId, key: templateKey, isActive: true },
    });

    const fallback = {
      subject: templateKey.replace(/_/g, ' '),
      body: JSON.stringify(payload),
    };

    const sourceSubject = String(template?.subject || fallback.subject);
    const sourceBody = String(template?.body || fallback.body);

    const render = (source: string) =>
      source.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, token) => {
        const value = payload[token];
        return value == null ? '' : String(value);
      });

    return {
      subject: render(sourceSubject),
      body: render(sourceBody),
    };
  }

  async processPending(input: { limit?: number } = {}) {
    const take = Math.max(1, Math.min(200, Number(input.limit || 50)));
    const rows = await (prisma as any).notificationOutbox.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take,
    });

    const results: Array<{ id: string; status: 'SENT' | 'FAILED' }> = [];

    for (const row of rows) {
      try {
        const payload = (row.payloadJson || {}) as Record<string, unknown>;
        const templateKeys = DEFAULT_TEMPLATE_MAP[row.type as NotificationType] || {};
        const templateKey = row.channel === 'EMAIL' ? templateKeys.email : templateKeys.sms;
        const rendered = templateKey
          ? await this.renderTemplate(row.storeId, templateKey, payload)
          : { subject: row.type, body: JSON.stringify(payload) };

        if (row.channel === 'EMAIL') {
          await this.provider.sendEmail({ to: row.to, subject: rendered.subject, body: rendered.body });
        } else {
          await this.provider.sendSms({ to: row.to, body: rendered.body });
        }

        await (prisma as any).notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: 'SENT',
            attempts: Number(row.attempts || 0) + 1,
            lastError: null,
            sentAt: new Date(),
          },
        });
        results.push({ id: row.id, status: 'SENT' });
      } catch (error: any) {
        await (prisma as any).notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            attempts: Number(row.attempts || 0) + 1,
            lastError: error?.message || 'notification send failed',
          },
        });
        results.push({ id: row.id, status: 'FAILED' });
      }
    }

    return { processed: rows.length, results };
  }
}

export default new NotificationService();
