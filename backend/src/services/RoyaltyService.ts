import prisma from '../lib/prisma.js';

export class RoyaltyService {
  private cents(amount: number) {
    return Math.round((Number.isFinite(amount) ? amount : 0) * 100);
  }

  private async getActiveRule(networkId: string) {
    return (prisma as any).royaltyRule.findFirst({
      where: { networkId, enabled: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async computeForOrder(input: { networkId: string; orderId: string; fromStoreId: string; toStoreId: string }) {
    const [order, rule] = await Promise.all([
      prisma.order.findUnique({ where: { id: input.orderId }, include: { items: true } }),
      this.getActiveRule(input.networkId),
    ]);

    if (!order) throw new Error('Order not found');
    if (!rule) return null;

    const revenueCents = this.cents(Number(order.totalAmount || 0));

    let costValue = 0;
    let decorationOnlyValue = 0;
    for (const item of order.items) {
      const snapshot = (item.pricingSnapshot || {}) as any;
      const lineCost = Number(snapshot.total || item.totalPrice || 0);
      const decorationSubtotal = Number(snapshot.decorationSubtotal || 0);
      costValue += lineCost;
      decorationOnlyValue += decorationSubtotal;
    }

    const costCents = this.cents(costValue);

    let basisAmountCents = revenueCents;
    if (rule.basis === 'PROFIT') {
      basisAmountCents = Math.max(0, revenueCents - costCents);
    }
    if (rule.basis === 'DECORATION_ONLY') {
      basisAmountCents = this.cents(decorationOnlyValue);
    }

    const percent = Number(rule.ratePercent || 0);
    const flat = Number(rule.flatCents || 0);
    const royaltyCents = Math.max(0, Math.round((basisAmountCents * percent) / 100) + flat);

    const existing = await (prisma as any).royaltyLedgerEntry.findFirst({ where: { networkId: input.networkId, orderId: input.orderId } });
    if (existing) {
      return (prisma as any).royaltyLedgerEntry.update({
        where: { id: existing.id },
        data: {
          fromStoreId: input.fromStoreId,
          toStoreId: input.toStoreId,
          revenueCents,
          costCents,
          royaltyCents,
          status: existing.status || 'ACCRUED',
        },
      });
    }

    return (prisma as any).royaltyLedgerEntry.create({
      data: {
        networkId: input.networkId,
        orderId: input.orderId,
        fromStoreId: input.fromStoreId,
        toStoreId: input.toStoreId,
        revenueCents,
        costCents,
        royaltyCents,
        currency: 'USD',
        status: 'ACCRUED',
      },
    });
  }

  async upsertRule(input: {
    networkId: string;
    id?: string;
    name: string;
    enabled?: boolean;
    basis?: 'REVENUE' | 'PROFIT' | 'DECORATION_ONLY';
    ratePercent?: number | null;
    flatCents?: number | null;
    appliesTo?: any;
  }) {
    if (input.id) {
      return (prisma as any).royaltyRule.update({
        where: { id: input.id },
        data: {
          name: input.name,
          enabled: input.enabled ?? true,
          basis: input.basis || 'REVENUE',
          ratePercent: input.ratePercent ?? null,
          flatCents: input.flatCents ?? null,
          appliesTo: input.appliesTo ?? null,
        },
      });
    }

    return (prisma as any).royaltyRule.create({
      data: {
        networkId: input.networkId,
        name: input.name,
        enabled: input.enabled ?? true,
        basis: input.basis || 'REVENUE',
        ratePercent: input.ratePercent ?? null,
        flatCents: input.flatCents ?? null,
        appliesTo: input.appliesTo ?? null,
      },
    });
  }

  async listRules(networkId: string) {
    return (prisma as any).royaltyRule.findMany({ where: { networkId }, orderBy: { createdAt: 'asc' } });
  }

  async report(networkId: string, from?: Date, to?: Date) {
    const start = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to || new Date();

    const rows = await (prisma as any).royaltyLedgerEntry.findMany({
      where: {
        networkId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        order: { select: { id: true, orderNumber: true, totalAmount: true, createdAt: true } },
        fromStore: { select: { id: true, name: true, slug: true } },
        toStore: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totals = rows.reduce((acc: any, row: any) => {
      acc.revenueCents += Number(row.revenueCents || 0);
      acc.costCents += Number(row.costCents || 0);
      acc.royaltyCents += Number(row.royaltyCents || 0);
      return acc;
    }, { revenueCents: 0, costCents: 0, royaltyCents: 0 });

    return {
      from: start,
      to: end,
      totals,
      rows,
    };
  }

  async toCsv(networkId: string, from?: Date, to?: Date) {
    const report = await this.report(networkId, from, to);
    const header = [
      'createdAt',
      'orderId',
      'orderNumber',
      'fromStoreId',
      'fromStoreName',
      'toStoreId',
      'toStoreName',
      'revenueCents',
      'costCents',
      'royaltyCents',
      'currency',
      'status',
    ];

    const lines = [header.join(',')];
    for (const row of report.rows as any[]) {
      const safe = (value: any) => {
        const text = String(value ?? '').replace(/"/g, '""');
        return /[",\n]/.test(text) ? `"${text}"` : text;
      };

      lines.push([
        safe(row.createdAt?.toISOString?.() || row.createdAt),
        safe(row.orderId),
        safe(row.order?.orderNumber || ''),
        safe(row.fromStoreId),
        safe(row.fromStore?.name || ''),
        safe(row.toStoreId),
        safe(row.toStore?.name || ''),
        safe(row.revenueCents),
        safe(row.costCents),
        safe(row.royaltyCents),
        safe(row.currency),
        safe(row.status),
      ].join(','));
    }

    return lines.join('\n');
  }
}

export default new RoyaltyService();
