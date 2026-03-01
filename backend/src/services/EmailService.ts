import { PrismaClient } from '@prisma/client';
import AuditService from './AuditService.js';

const prisma = new PrismaClient();

type EmailPayload = {
  tenantId: string;
  storeId?: string;
  type: 'PROOF_REQUEST' | 'QUOTE_SENT' | 'ORDER_CONFIRMATION' | 'STATUS_UPDATE';
  toEmail: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  meta?: Record<string, any>;
};

class MockEmailProvider {
  async send(message: { toEmail: string }) {
    return { providerMessageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, accepted: [message.toEmail] };
  }
}

export class EmailService {
  private mock = new MockEmailProvider();

  private encodeConfig(config: unknown): string {
    return Buffer.from(JSON.stringify(config || {}), 'utf8').toString('base64');
  }

  private decodeConfig(payload?: string | null): Record<string, any> {
    if (!payload) return {};
    try {
      return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    } catch {
      return {};
    }
  }

  async getProviderConfig(tenantId: string) {
    const existing = await (prisma as any).emailProviderConfig.findUnique({ where: { tenantId } });
    if (existing) {
      return {
        ...existing,
        config: this.decodeConfig(existing.configEncrypted),
      };
    }
    return {
      tenantId,
      provider: 'MOCK',
      fromName: 'SkuFlow',
      fromEmail: 'noreply@skuflow.local',
      replyTo: null,
      enabled: true,
      config: {},
    };
  }

  async upsertProviderConfig(input: {
    tenantId: string;
    provider: 'MOCK' | 'SMTP' | 'SENDGRID';
    fromName: string;
    fromEmail: string;
    replyTo?: string | null;
    enabled?: boolean;
    config?: Record<string, any>;
  }) {
    const updated = await (prisma as any).emailProviderConfig.upsert({
      where: { tenantId: input.tenantId },
      update: {
        provider: input.provider,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        replyTo: input.replyTo || null,
        enabled: input.enabled ?? true,
        configEncrypted: this.encodeConfig(input.config || {}),
      },
      create: {
        tenantId: input.tenantId,
        provider: input.provider,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        replyTo: input.replyTo || null,
        enabled: input.enabled ?? true,
        configEncrypted: this.encodeConfig(input.config || {}),
      },
    });

    await AuditService.log({
      tenantId: input.tenantId,
      actorType: 'Admin',
      action: 'email.provider_config.updated',
      entityType: 'EmailProviderConfig',
      entityId: updated.id,
      meta: { provider: input.provider, enabled: input.enabled ?? true },
    });

    return {
      ...updated,
      config: this.decodeConfig(updated.configEncrypted),
    };
  }

  private async createEvent(tenantId: string, emailMessageId: string, type: 'QUEUED' | 'SENT' | 'FAILED' | 'OPEN' | 'CLICK', meta?: Record<string, any>) {
    return (prisma as any).emailEvent.create({
      data: {
        tenantId,
        emailMessageId,
        type,
        meta: meta || {},
      },
    });
  }

  async queueAndSend(payload: EmailPayload) {
    const message = await (prisma as any).emailMessage.create({
      data: {
        tenantId: payload.tenantId,
        storeId: payload.storeId || null,
        type: payload.type,
        toEmail: payload.toEmail,
        subject: payload.subject,
        bodyText: payload.bodyText || null,
        bodyHtml: payload.bodyHtml || null,
        status: 'QUEUED',
        meta: payload.meta || {},
      },
    });

    await this.createEvent(payload.tenantId, message.id, 'QUEUED', payload.meta);

    const cfg = await this.getProviderConfig(payload.tenantId);
    if (!cfg.enabled) {
      const failed = await (prisma as any).emailMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', error: 'Email provider disabled' },
      });
      await this.createEvent(payload.tenantId, message.id, 'FAILED', { reason: 'provider_disabled' });
      return failed;
    }

    try {
      const sendResult = await this.mock.send({ toEmail: payload.toEmail });
      const sent = await (prisma as any).emailMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: sendResult.providerMessageId,
        },
      });

      await this.createEvent(payload.tenantId, message.id, 'SENT', { provider: cfg.provider, providerMessageId: sendResult.providerMessageId });
      await AuditService.log({
        tenantId: payload.tenantId,
        actorType: 'System',
        action: 'email.sent',
        entityType: 'EmailMessage',
        entityId: message.id,
        meta: { type: payload.type, toEmail: payload.toEmail, provider: cfg.provider },
      });

      return sent;
    } catch (error) {
      const failed = await (prisma as any).emailMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          error: (error as Error).message,
        },
      });
      await this.createEvent(payload.tenantId, message.id, 'FAILED', { error: (error as Error).message });
      await AuditService.log({
        tenantId: payload.tenantId,
        actorType: 'System',
        action: 'email.failed',
        entityType: 'EmailMessage',
        entityId: message.id,
        meta: { type: payload.type, toEmail: payload.toEmail, error: (error as Error).message },
      });
      return failed;
    }
  }

  async listMessages(tenantId: string, storeId?: string) {
    return (prisma as any).emailMessage.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
      },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getMessage(tenantId: string, messageId: string) {
    return (prisma as any).emailMessage.findFirst({
      where: { id: messageId, tenantId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }
}

export default new EmailService();
