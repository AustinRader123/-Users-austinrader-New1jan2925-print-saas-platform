import prisma from '../lib/prisma.js';
import RoyaltyService from './RoyaltyService.js';
import NetworkService from './NetworkService.js';

function toOrderFulfillmentStatus(routedStatus: string) {
  if (routedStatus === 'IN_PRODUCTION') return 'in_production';
  if (routedStatus === 'SHIPPED') return 'shipped';
  if (routedStatus === 'COMPLETED') return 'completed';
  if (routedStatus === 'ACCEPTED') return 'accepted';
  return 'routed';
}

export class NetworkRoutingService {
  private fromOrderStatus(status: string) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'IN_PRODUCTION') return 'IN_PRODUCTION' as const;
    if (normalized === 'SHIPPED') return 'SHIPPED' as const;
    if (normalized === 'DELIVERED' || normalized === 'COMPLETED') return 'COMPLETED' as const;
    if (normalized === 'CONFIRMED') return 'ACCEPTED' as const;
    return null;
  }

  async syncRoutedOrderFromOrderStatus(orderId: string, orderStatus: string) {
    const mapped = this.fromOrderStatus(orderStatus);
    if (!mapped) return null;

    const routedOrder = await (prisma as any).routedOrder.findFirst({ where: { orderId } });
    if (!routedOrder) return null;
    return this.updateRoutedOrderStatus(routedOrder.id, mapped);
  }

  async syncRoutedOrderFromProductionStatus(orderId: string, productionStatus: string) {
    const normalized = String(productionStatus || '').toUpperCase();
    const mapped = normalized === 'IN_PRODUCTION' ? 'IN_PRODUCTION' : normalized === 'COMPLETED' ? 'COMPLETED' : null;
    if (!mapped) return null;
    const routedOrder = await (prisma as any).routedOrder.findFirst({ where: { orderId } });
    if (!routedOrder) return null;
    return this.updateRoutedOrderStatus(routedOrder.id, mapped);
  }

  private async pickTargetStore(networkId: string, fromStoreId: string, strategy: string, config: any) {
    const members = await (prisma as any).networkStore.findMany({
      where: { networkId, status: 'ACTIVE' },
      include: { store: true },
      orderBy: { createdAt: 'asc' },
    });

    const candidates = members.filter((row: any) => row.storeId !== fromStoreId);
    if (candidates.length === 0) return null;

    const c = config && typeof config === 'object' ? config : {};

    const manualToStoreId = typeof c.manualToStoreId === 'string' ? c.manualToStoreId : null;
    if (manualToStoreId) {
      const manual = candidates.find((row: any) => row.storeId === manualToStoreId);
      if (manual) return manual.storeId;
    }

    if (strategy === 'PRIORITY' && Array.isArray(c.storePriority)) {
      for (const preferred of c.storePriority) {
        const found = candidates.find((row: any) => row.storeId === preferred);
        if (found) return found.storeId;
      }
    }

    if (strategy === 'CAPACITY' && Array.isArray(c.capacityOrder)) {
      for (const preferred of c.capacityOrder) {
        const found = candidates.find((row: any) => row.storeId === preferred);
        if (found) return found.storeId;
      }
    }

    if (strategy === 'GEO' && Array.isArray(c.geoFallbackOrder)) {
      for (const preferred of c.geoFallbackOrder) {
        const found = candidates.find((row: any) => row.storeId === preferred);
        if (found) return found.storeId;
      }
    }

    const hub = candidates.find((row: any) => row.role === 'HUB' || row.role === 'OWNER');
    if (hub) return hub.storeId;

    return candidates[0]?.storeId || null;
  }

  async routeOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const networkStore = await NetworkService.getNetworkByStoreId(order.storeId);
    if (!networkStore?.network?.enabled) {
      return { routed: false, reason: 'network-disabled-or-missing' };
    }

    if (!['SPOKE'].includes(String(networkStore.role || ''))) {
      return { routed: false, reason: 'source-store-not-spoke' };
    }

    const rules = await (prisma as any).fulfillmentRoutingRule.findMany({
      where: { networkId: networkStore.networkId, enabled: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!rules.length) {
      return { routed: false, reason: 'no-routing-rules' };
    }

    const selectedRule = rules[0];
    const targetStoreId = await this.pickTargetStore(networkStore.networkId, order.storeId, selectedRule.strategy, selectedRule.config);
    if (!targetStoreId || targetStoreId === order.storeId) {
      return { routed: false, reason: 'no-eligible-target-store' };
    }

    const existing = await (prisma as any).routedOrder.findFirst({ where: { orderId: order.id } });
    const routedOrder = existing
      ? await (prisma as any).routedOrder.update({
          where: { id: existing.id },
          data: {
            toStoreId: targetStoreId,
            routingReason: `rule:${selectedRule.name}`,
            status: existing.status || 'PROPOSED',
          },
        })
      : await (prisma as any).routedOrder.create({
          data: {
            networkId: networkStore.networkId,
            orderId: order.id,
            fromStoreId: order.storeId,
            toStoreId: targetStoreId,
            status: 'PROPOSED',
            routingReason: `rule:${selectedRule.name}`,
          },
        });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStoreId: targetStoreId,
        fulfillmentStatus: 'routed',
      },
    });

    return {
      routed: true,
      routedOrder,
    };
  }

  async listRoutedOrders(input: { networkId: string; storeId?: string }) {
    return (prisma as any).routedOrder.findMany({
      where: {
        networkId: input.networkId,
        ...(input.storeId
          ? {
              OR: [
                { fromStoreId: input.storeId },
                { toStoreId: input.storeId },
              ],
            }
          : {}),
      },
      include: {
        order: true,
        fromStore: true,
        toStore: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRoutedOrderStatus(routedOrderId: string, status: 'PROPOSED' | 'ACCEPTED' | 'IN_PRODUCTION' | 'SHIPPED' | 'COMPLETED') {
    const routedOrder = await (prisma as any).routedOrder.update({
      where: { id: routedOrderId },
      data: { status },
      include: { order: true },
    });

    await prisma.order.update({
      where: { id: routedOrder.orderId },
      data: {
        fulfillmentStatus: toOrderFulfillmentStatus(status),
        ...(status === 'SHIPPED' ? { status: 'SHIPPED' as any } : {}),
        ...(status === 'COMPLETED' ? { status: 'DELIVERED' as any } : {}),
      },
    });

    if (status === 'COMPLETED') {
      await RoyaltyService.computeForOrder({
        networkId: routedOrder.networkId,
        orderId: routedOrder.orderId,
        fromStoreId: routedOrder.fromStoreId,
        toStoreId: routedOrder.toStoreId,
      });
    }

    return routedOrder;
  }

  async upsertRule(input: {
    networkId: string;
    id?: string;
    name: string;
    enabled?: boolean;
    strategy?: 'MANUAL' | 'GEO' | 'CAPACITY' | 'PRIORITY';
    config?: any;
  }) {
    if (input.id) {
      return (prisma as any).fulfillmentRoutingRule.update({
        where: { id: input.id },
        data: {
          name: input.name,
          enabled: input.enabled ?? true,
          strategy: input.strategy || 'MANUAL',
          config: input.config || null,
        },
      });
    }

    return (prisma as any).fulfillmentRoutingRule.create({
      data: {
        networkId: input.networkId,
        name: input.name,
        enabled: input.enabled ?? true,
        strategy: input.strategy || 'MANUAL',
        config: input.config || null,
      },
    });
  }

  async listRules(networkId: string) {
    return (prisma as any).fulfillmentRoutingRule.findMany({ where: { networkId }, orderBy: { createdAt: 'asc' } });
  }
}

export default new NetworkRoutingService();
