import prisma from '../lib/prisma.js';

export class NetworkService {
  async createNetwork(input: { tenantId: string; name: string; ownerStoreId: string; actorUserId?: string }) {
    const store = await prisma.store.findFirst({ where: { id: input.ownerStoreId, tenantId: input.tenantId } as never });
    if (!store) throw new Error('Owner store not found for tenant');

    const network = await (prisma as any).network.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        enabled: true,
      },
    });

    await (prisma as any).networkStore.upsert({
      where: { networkId_storeId: { networkId: network.id, storeId: input.ownerStoreId } },
      update: { role: 'OWNER', status: 'ACTIVE' },
      create: { networkId: network.id, storeId: input.ownerStoreId, role: 'OWNER', status: 'ACTIVE' },
    });

    if (input.actorUserId) {
      await (prisma as any).networkUserRole.upsert({
        where: { networkId_userId_role: { networkId: network.id, userId: input.actorUserId, role: 'NETWORK_ADMIN' } },
        update: {},
        create: { networkId: network.id, userId: input.actorUserId, role: 'NETWORK_ADMIN' },
      });
    }

    return network;
  }

  async listNetworks(tenantId: string) {
    return (prisma as any).network.findMany({
      where: { tenantId },
      include: {
        stores: {
          include: { store: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addStore(input: { tenantId: string; networkId: string; storeId: string; role: 'OWNER' | 'HUB' | 'SPOKE'; status?: 'ACTIVE' | 'SUSPENDED' }) {
    const [network, store] = await Promise.all([
      (prisma as any).network.findFirst({ where: { id: input.networkId, tenantId: input.tenantId } }),
      prisma.store.findFirst({ where: { id: input.storeId, tenantId: input.tenantId } as never }),
    ]);
    if (!network) throw new Error('Network not found for tenant');
    if (!store) throw new Error('Store not found for tenant');

    return (prisma as any).networkStore.upsert({
      where: { networkId_storeId: { networkId: input.networkId, storeId: input.storeId } },
      update: {
        role: input.role,
        status: input.status || 'ACTIVE',
      },
      create: {
        networkId: input.networkId,
        storeId: input.storeId,
        role: input.role,
        status: input.status || 'ACTIVE',
      },
      include: { store: true },
    });
  }

  async createChildStore(input: { tenantId: string; networkId: string; name: string; slug: string; role: 'HUB' | 'SPOKE' }) {
    const network = await (prisma as any).network.findFirst({ where: { id: input.networkId, tenantId: input.tenantId } });
    if (!network) throw new Error('Network not found for tenant');

    const store = await prisma.store.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        slug: input.slug,
        status: 'ACTIVE',
        type: 'RETAIL',
      } as never,
    });

    const link = await this.addStore({
      tenantId: input.tenantId,
      networkId: input.networkId,
      storeId: store.id,
      role: input.role,
      status: 'ACTIVE',
    });

    return { store, link };
  }

  async listStores(tenantId: string, networkId: string) {
    return (prisma as any).networkStore.findMany({
      where: { networkId, network: { tenantId } },
      include: { store: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getNetworkByStoreId(storeId: string) {
    return (prisma as any).networkStore.findFirst({
      where: { storeId, status: 'ACTIVE', network: { enabled: true } },
      include: { network: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assertStoreInNetwork(networkId: string, storeId: string) {
    const row = await (prisma as any).networkStore.findFirst({ where: { networkId, storeId, status: 'ACTIVE' } });
    if (!row) throw new Error('Store is not active in this network');
    return row;
  }

  async overview(tenantId: string, networkId: string) {
    const [network, stores, routed, royalties] = await Promise.all([
      (prisma as any).network.findFirst({ where: { id: networkId, tenantId } }),
      (prisma as any).networkStore.findMany({ where: { networkId }, include: { store: true } }),
      (prisma as any).routedOrder.findMany({ where: { networkId }, orderBy: { createdAt: 'desc' }, take: 25 }),
      (prisma as any).royaltyLedgerEntry.findMany({ where: { networkId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);

    if (!network) throw new Error('Network not found for tenant');

    const routedCount = routed.length;
    const royaltyCents = royalties.reduce((sum: number, row: any) => sum + Number(row.royaltyCents || 0), 0);
    const revenueCents = royalties.reduce((sum: number, row: any) => sum + Number(row.revenueCents || 0), 0);

    return {
      network,
      stores,
      routedCount,
      royaltyCents,
      revenueCents,
      recentRoutedOrders: routed,
      recentRoyaltyLedger: royalties.slice(0, 50),
    };
  }
}

export default new NetworkService();
