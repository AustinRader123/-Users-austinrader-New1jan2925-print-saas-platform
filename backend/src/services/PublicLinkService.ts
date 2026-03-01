import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function rawToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class PublicLinkService {
  async createQuoteToken(quoteId: string, expiresHours = 168, tenantIdOverride?: string) {
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { id: true, storeId: true } });
    if (!quote) throw new Error('Quote not found');
    const store = await prisma.store.findUnique({ where: { id: quote.storeId }, select: { tenantId: true } });
    const tenantId = tenantIdOverride || store?.tenantId;
    if (!tenantId) throw new Error('Store tenant not found');

    const token = rawToken(24);
    const tokenHash = hashToken(token);
    await (prisma as any).quotePublicToken.create({
      data: {
        tenantId,
        storeId: quote.storeId,
        quoteId: quote.id,
        tokenHash,
        expiresAt: new Date(Date.now() + Math.max(1, expiresHours) * 60 * 60 * 1000),
      },
    });
    return token;
  }

  async createInvoiceToken(orderId: string, expiresHours = 168, tenantIdOverride?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, storeId: true } });
    if (!order) throw new Error('Order not found');
    const store = await prisma.store.findUnique({ where: { id: order.storeId }, select: { tenantId: true } });
    const tenantId = tenantIdOverride || store?.tenantId;
    if (!tenantId) throw new Error('Store tenant not found');

    const token = rawToken(24);
    const tokenHash = hashToken(token);
    await (prisma as any).invoicePublicToken.create({
      data: {
        tenantId,
        storeId: order.storeId,
        orderId: order.id,
        tokenHash,
        expiresAt: new Date(Date.now() + Math.max(1, expiresHours) * 60 * 60 * 1000),
      },
    });
    return token;
  }

  async resolveQuoteByToken(token: string) {
    const tokenHash = hashToken(token);
    const row = await (prisma as any).quotePublicToken.findUnique({
      where: { tokenHash },
      include: {
        quote: {
          include: {
            lineItems: true,
            store: true,
          },
        },
      },
    });
    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    return row;
  }

  async resolveInvoiceByToken(token: string) {
    const tokenHash = hashToken(token);
    const row = await (prisma as any).invoicePublicToken.findUnique({
      where: { tokenHash },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
                productVariant: true,
              },
            },
            store: true,
          },
        },
      },
    });
    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    return row;
  }
}

export default new PublicLinkService();
