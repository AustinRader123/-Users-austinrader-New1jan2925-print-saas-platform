import prisma from '../lib/prisma.js';
import FeatureGateService from './FeatureGateService.js';
import ProductionV2Service from './ProductionV2Service.js';

function toCents(amount: number) {
  return Math.max(0, Math.round(Number(amount || 0)));
}

function csvEscape(value: unknown) {
  const raw = value == null ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export class FundraisingService {
  async listCampaigns(tenantId: string, storeId?: string) {
    return (prisma as any).fundraiserCampaign.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
      },
      include: {
        _count: {
          select: {
            members: true,
            orders: true,
            payoutLedgerEntries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaign(tenantId: string, campaignId: string) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({
      where: { id: campaignId, tenantId },
      include: {
        productOverrides: { include: { product: true }, orderBy: { createdAt: 'desc' } },
        teamStoreLinks: { include: { teamStore: true }, orderBy: { createdAt: 'desc' } },
        members: { include: { teamStore: true, rosterEntry: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!campaign) throw new Error('Campaign not found for tenant');

    const [totals, leaderboard] = await Promise.all([
      this.summary(tenantId, campaignId),
      this.getLeaderboard(campaignId),
    ]);

    return { campaign, totals, leaderboard: leaderboard.slice(0, 20) };
  }

  async createCampaign(input: {
    tenantId: string;
    storeId: string;
    networkId?: string;
    slug: string;
    name: string;
    description?: string;
    status?: string;
    startsAt?: Date;
    endsAt?: Date;
    fundraisingGoalCents?: number;
    defaultFundraiserPercent?: number;
    shippingMode?: 'DIRECT' | 'CONSOLIDATED';
    allowSplitShip?: boolean;
    metadata?: any;
  }) {
    const store = await prisma.store.findFirst({ where: { id: input.storeId, tenantId: input.tenantId } as never });
    if (!store) throw new Error('Store not found for tenant');

    if (input.networkId) {
      const network = await (prisma as any).network.findFirst({ where: { id: input.networkId, tenantId: input.tenantId } });
      if (!network) throw new Error('Network not found for tenant');
    }

    return (prisma as any).fundraiserCampaign.create({
      data: {
        tenantId: input.tenantId,
        storeId: input.storeId,
        networkId: input.networkId || null,
        slug: input.slug,
        name: input.name,
        description: input.description || null,
        status: (input.status || 'DRAFT').toUpperCase(),
        startsAt: input.startsAt || null,
        endsAt: input.endsAt || null,
        fundraisingGoalCents: input.fundraisingGoalCents ?? null,
        defaultFundraiserPercent: input.defaultFundraiserPercent ?? null,
        shippingMode: input.shippingMode || 'DIRECT',
        allowSplitShip: input.allowSplitShip != null ? Boolean(input.allowSplitShip) : true,
        metadata: input.metadata || null,
      },
    });
  }

  async updateCampaign(tenantId: string, campaignId: string, patch: Record<string, unknown>) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    return (prisma as any).fundraiserCampaign.update({
      where: { id: campaign.id },
      data: {
        ...(patch.slug != null ? { slug: String(patch.slug) } : {}),
        ...(patch.name != null ? { name: String(patch.name) } : {}),
        ...(patch.description !== undefined ? { description: patch.description == null ? null : String(patch.description) } : {}),
        ...(patch.status != null ? { status: String(patch.status).toUpperCase() } : {}),
        ...(patch.startsAt !== undefined ? { startsAt: patch.startsAt ? new Date(String(patch.startsAt)) : null } : {}),
        ...(patch.endsAt !== undefined ? { endsAt: patch.endsAt ? new Date(String(patch.endsAt)) : null } : {}),
        ...(patch.fundraisingGoalCents !== undefined ? { fundraisingGoalCents: patch.fundraisingGoalCents == null ? null : Number(patch.fundraisingGoalCents) } : {}),
        ...(patch.defaultFundraiserPercent !== undefined ? { defaultFundraiserPercent: patch.defaultFundraiserPercent == null ? null : Number(patch.defaultFundraiserPercent) } : {}),
        ...(patch.shippingMode != null ? { shippingMode: String(patch.shippingMode).toUpperCase() } : {}),
        ...(patch.allowSplitShip !== undefined ? { allowSplitShip: Boolean(patch.allowSplitShip) } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata || null } : {}),
      },
    });
  }

  async saveCatalogOverride(tenantId: string, campaignId: string, input: {
    productId: string;
    overridePrice?: number;
    overrideFundraiserPercent?: number;
    active?: boolean;
    metadata?: any;
  }) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    const product = await prisma.product.findFirst({ where: { id: input.productId, storeId: campaign.storeId } });
    if (!product) throw new Error('Product not found for campaign store');

    return (prisma as any).fundraiserCampaignProduct.upsert({
      where: {
        campaignId_productId: {
          campaignId,
          productId: input.productId,
        },
      },
      update: {
        overridePrice: input.overridePrice ?? null,
        overrideFundraiserPercent: input.overrideFundraiserPercent ?? null,
        active: input.active != null ? Boolean(input.active) : true,
        metadata: input.metadata || null,
      },
      create: {
        campaignId,
        productId: input.productId,
        overridePrice: input.overridePrice ?? null,
        overrideFundraiserPercent: input.overrideFundraiserPercent ?? null,
        active: input.active != null ? Boolean(input.active) : true,
        metadata: input.metadata || null,
      },
      include: { product: true },
    });
  }

  async linkTeamStore(tenantId: string, campaignId: string, teamStoreId: string) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    const teamStore = await (prisma as any).teamStore.findFirst({ where: { id: teamStoreId, storeId: campaign.storeId } });
    if (!teamStore) throw new Error('Team store not found for campaign store');

    return (prisma as any).fundraiserCampaignTeamStore.upsert({
      where: {
        campaignId_teamStoreId: { campaignId, teamStoreId },
      },
      update: {},
      create: { campaignId, teamStoreId },
      include: { teamStore: true },
    });
  }

  async upsertMember(tenantId: string, campaignId: string, input: {
    id?: string;
    teamStoreId?: string;
    rosterEntryId?: string;
    displayName: string;
    publicCode?: string;
    isActive?: boolean;
    goalCents?: number;
    metadata?: any;
  }) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    if (input.teamStoreId) {
      const link = await (prisma as any).fundraiserCampaignTeamStore.findFirst({
        where: { campaignId, teamStoreId: input.teamStoreId },
      });
      if (!link) throw new Error('Team store is not linked to campaign');
    }

    if (input.rosterEntryId) {
      const roster = await (prisma as any).roster.findFirst({ where: { id: input.rosterEntryId, storeId: campaign.storeId } });
      if (!roster) throw new Error('Roster entry not found for campaign store');
    }

    if (input.id) {
      return (prisma as any).fundraiserCampaignMember.update({
        where: { id: input.id },
        data: {
          teamStoreId: input.teamStoreId || null,
          rosterEntryId: input.rosterEntryId || null,
          displayName: input.displayName,
          publicCode: input.publicCode || null,
          isActive: input.isActive != null ? Boolean(input.isActive) : true,
          goalCents: input.goalCents ?? null,
          metadata: input.metadata || null,
        },
        include: { teamStore: true, rosterEntry: true },
      });
    }

    return (prisma as any).fundraiserCampaignMember.create({
      data: {
        campaignId,
        storeId: campaign.storeId,
        teamStoreId: input.teamStoreId || null,
        rosterEntryId: input.rosterEntryId || null,
        displayName: input.displayName,
        publicCode: input.publicCode || null,
        isActive: input.isActive != null ? Boolean(input.isActive) : true,
        goalCents: input.goalCents ?? null,
        metadata: input.metadata || null,
      },
      include: { teamStore: true, rosterEntry: true },
    });
  }

  async getLeaderboard(campaignId: string) {
    const rows = await (prisma as any).order.findMany({
      where: {
        fundraiserCampaignId: campaignId,
        fundraiserMemberId: { not: null },
      },
      select: {
        fundraiserMemberId: true,
        fundraiserAmountCents: true,
      },
    });

    const memberMap = new Map<string, { amountCents: number; orders: number }>();
    for (const row of rows) {
      const memberId = String(row.fundraiserMemberId || '');
      if (!memberId) continue;
      const prev = memberMap.get(memberId) || { amountCents: 0, orders: 0 };
      prev.amountCents += Number(row.fundraiserAmountCents || 0);
      prev.orders += 1;
      memberMap.set(memberId, prev);
    }

    const members = await (prisma as any).fundraiserCampaignMember.findMany({
      where: { id: { in: Array.from(memberMap.keys()) } },
      select: {
        id: true,
        displayName: true,
        publicCode: true,
        goalCents: true,
      },
    });

    return members
      .map((member: any) => {
        const totals = memberMap.get(member.id) || { amountCents: 0, orders: 0 };
        return {
          memberId: member.id,
          displayName: member.displayName,
          publicCode: member.publicCode,
          goalCents: member.goalCents,
          raisedCents: totals.amountCents,
          orderCount: totals.orders,
        };
      })
      .sort((a: any, b: any) => b.raisedCents - a.raisedCents || b.orderCount - a.orderCount);
  }

  async summary(tenantId: string, campaignId: string) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    const [orders, ledger] = await Promise.all([
      (prisma as any).order.findMany({
        where: { fundraiserCampaignId: campaignId },
        select: { id: true, totalAmount: true, fundraiserAmountCents: true },
      }),
      (prisma as any).fundraiserPayoutLedgerEntry.findMany({
        where: { campaignId },
        select: { id: true, amountCents: true, direction: true, status: true, kind: true },
      }),
    ]);

    const grossSalesCents = toCents(orders.reduce((sum: number, row: any) => sum + Number(row.totalAmount || 0) * 100, 0));
    const raisedCents = toCents(orders.reduce((sum: number, row: any) => sum + Number(row.fundraiserAmountCents || 0), 0));
    const creditedCents = toCents(
      ledger.filter((x: any) => x.direction === 'CREDIT').reduce((sum: number, row: any) => sum + Number(row.amountCents || 0), 0)
    );
    const paidCents = toCents(
      ledger
        .filter((x: any) => x.direction === 'CREDIT' && x.status === 'PAID')
        .reduce((sum: number, row: any) => sum + Number(row.amountCents || 0), 0)
    );

    return {
      orderCount: orders.length,
      grossSalesCents,
      raisedCents,
      creditedCents,
      paidCents,
      unpaidCents: Math.max(0, creditedCents - paidCents),
      progressPct: campaign.fundraisingGoalCents ? Math.round((raisedCents / campaign.fundraisingGoalCents) * 10000) / 100 : null,
    };
  }

  async consolidateOrders(input: { tenantId: string; campaignId: string; idempotencyKey?: string; actorUserId?: string }) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: input.campaignId, tenantId: input.tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    if (input.idempotencyKey) {
      const existing = await (prisma as any).fundraiserConsolidationRun.findFirst({
        where: { idempotencyKey: input.idempotencyKey },
        include: { lines: true },
      });
      if (existing) return existing;
    }

    const openOrders = await (prisma as any).order.findMany({
      where: {
        fundraiserCampaignId: input.campaignId,
        fundraiserAmountCents: { gt: 0 },
        fundraiserConsolidationLines: { none: {} },
        status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const run = await (prisma as any).fundraiserConsolidationRun.create({
      data: {
        campaignId: input.campaignId,
        storeId: campaign.storeId,
        status: 'CREATED',
        idempotencyKey: input.idempotencyKey || null,
        createdById: input.actorUserId || null,
        metadata: { generatedAt: new Date().toISOString(), orderCount: openOrders.length },
      },
    });

    if (openOrders.length) {
      await (prisma as any).fundraiserConsolidationOrderLine.createMany({
        data: openOrders.map((order: any) => ({
          runId: run.id,
          orderId: order.id,
          shippingMode: campaign.shippingMode,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });

      if (campaign.shippingMode === 'CONSOLIDATED') {
        await prisma.order.updateMany({
          where: { id: { in: openOrders.map((o: any) => o.id) } },
          data: { fulfillmentStatus: 'hold_consolidation' },
        });
      }
    }

    const createdRun = await (prisma as any).fundraiserConsolidationRun.findUnique({
      where: { id: run.id },
      include: { lines: true },
    });

    if (createdRun) {
      const useProductionV2 = await FeatureGateService.can(input.tenantId, 'production_v2.enabled');
      if (useProductionV2) {
        await ProductionV2Service.createBatchesFromCampaignBulkOrder(createdRun.id, input.actorUserId || null);
      }
    }

    return createdRun;
  }

  async listConsolidationRuns(tenantId: string, campaignId: string) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    return (prisma as any).fundraiserConsolidationRun.findMany({
      where: { campaignId },
      include: {
        lines: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                fundraiserAmountCents: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listLedger(tenantId: string, campaignId: string) {
    const campaign = await (prisma as any).fundraiserCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new Error('Campaign not found for tenant');

    return (prisma as any).fundraiserPayoutLedgerEntry.findMany({
      where: { campaignId },
      include: {
        member: { select: { id: true, displayName: true, publicCode: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async exportLedgerCsv(tenantId: string, campaignId: string) {
    const rows = await this.listLedger(tenantId, campaignId);
    const header = [
      'entryId',
      'createdAt',
      'status',
      'direction',
      'kind',
      'amountCents',
      'currency',
      'memberId',
      'memberName',
      'publicCode',
      'orderId',
      'orderNumber',
      'idempotencyKey',
      'notes',
    ];

    const lines = [
      header.join(','),
      ...rows.map((row: any) =>
        [
          row.id,
          row.createdAt?.toISOString?.() || '',
          row.status,
          row.direction,
          row.kind,
          row.amountCents,
          row.currency,
          row.member?.id || row.memberId || '',
          row.member?.displayName || '',
          row.member?.publicCode || '',
          row.order?.id || row.orderId || '',
          row.order?.orderNumber || '',
          row.idempotencyKey || '',
          row.notes || '',
        ]
          .map(csvEscape)
          .join(',')
      ),
    ];

    return lines.join('\n');
  }

  async approvePayoutEntry(tenantId: string, entryId: string, notes?: string) {
    const entry = await (prisma as any).fundraiserPayoutLedgerEntry.findFirst({
      where: { id: entryId, campaign: { tenantId } },
    });
    if (!entry) throw new Error('Ledger entry not found for tenant');

    return (prisma as any).fundraiserPayoutLedgerEntry.update({
      where: { id: entry.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        ...(notes ? { notes } : {}),
      },
    });
  }

  async markPayoutEntryPaid(tenantId: string, entryId: string, notes?: string) {
    const entry = await (prisma as any).fundraiserPayoutLedgerEntry.findFirst({
      where: { id: entryId, campaign: { tenantId } },
    });
    if (!entry) throw new Error('Ledger entry not found for tenant');

    return (prisma as any).fundraiserPayoutLedgerEntry.update({
      where: { id: entry.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(notes ? { notes } : {}),
      },
    });
  }

  async createContributionLedgerEntryFromOrder(orderId: string, campaignId: string, memberId?: string | null, amountCents?: number) {
    const cents = Math.max(0, Number(amountCents || 0));
    if (!cents) return null;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    const idempotencyKey = `order:${orderId}:fundraiser_contribution`;

    return (prisma as any).fundraiserPayoutLedgerEntry.upsert({
      where: { idempotencyKey },
      update: {
        amountCents: cents,
        memberId: memberId || null,
      },
      create: {
        campaignId,
        storeId: order.storeId,
        orderId,
        memberId: memberId || null,
        direction: 'CREDIT',
        amountCents: cents,
        kind: 'ORDER_CONTRIBUTION',
        status: 'PENDING',
        idempotencyKey,
      },
    });
  }

  async resolvePublicCampaign(input: { campaignId?: string; slug?: string; storeSlug?: string }) {
    if (input.campaignId) {
      const byId = await (prisma as any).fundraiserCampaign.findFirst({
        where: { id: input.campaignId, status: { in: ['ACTIVE', 'PAUSED'] } },
        include: { store: { select: { id: true, slug: true, name: true } } },
      });
      if (byId) return byId;
    }

    if (input.slug) {
      const bySlug = await (prisma as any).fundraiserCampaign.findFirst({
        where: {
          slug: input.slug,
          status: { in: ['ACTIVE', 'PAUSED'] },
          ...(input.storeSlug ? { store: { slug: input.storeSlug } } : {}),
        },
        include: { store: { select: { id: true, slug: true, name: true } } },
      });
      if (bySlug) return bySlug;
    }

    throw new Error('Campaign not found');
  }
}

export default new FundraisingService();
