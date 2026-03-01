import { PrismaClient } from '@prisma/client';
import ShippingAdapterService from './ShippingAdapterService.js';

const prisma = new PrismaClient();

type JsonObject = Record<string, unknown>;

type ShipmentRecord = {
  id: string;
  orderId: string;
  trackingNumber?: string | null;
  labelAssetId?: string | null;
  metadata?: JsonObject | null;
  weight?: number | null;
  cost?: number | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
};

type ShippingDbClient = {
  order: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
  shipment: {
    findMany(args: unknown): Promise<unknown[]>;
    findFirst(args: unknown): Promise<ShipmentRecord | null>;
    create(args: unknown): Promise<ShipmentRecord>;
    update(args: unknown): Promise<ShipmentRecord>;
  };
  shipmentEvent: {
    create(args: unknown): Promise<unknown>;
  };
  fileAsset: {
    create(args: unknown): Promise<{ id: string }>;
  };
};

const shippingDb = prisma as unknown as ShippingDbClient;

export class ShippingService {
  async listShipments(storeId: string) {
    return shippingDb.shipment.findMany({
      where: { order: { storeId } },
      include: {
        order: true,
        events: { orderBy: { occurredAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShipment(storeId: string, shipmentId: string) {
    return shippingDb.shipment.findFirst({
      where: { id: shipmentId, order: { storeId } },
      include: {
        order: true,
        events: { orderBy: { occurredAt: 'desc' } },
      },
    });
  }

  async ensureShipmentForOrder(orderId: string) {
    const existing = await shippingDb.shipment.findFirst({ where: { orderId }, orderBy: { createdAt: 'asc' } });
    if (existing) return existing;

    return shippingDb.shipment.create({
      data: {
        orderId,
        status: 'pending',
        labelStatus: 'pending',
      },
    });
  }

  async createLabel(input: {
    storeId: string;
    orderId: string;
    carrier?: string;
    serviceLevel?: string;
    weight?: number;
    cost?: number;
  }) {
    const order = await shippingDb.order.findFirst({ where: { id: input.orderId, storeId: input.storeId } });
    if (!order) throw new Error('Order not found');

    const shipment = await this.ensureShipmentForOrder(order.id);
    if (shipment.trackingNumber && shipment.labelAssetId) {
      return this.getShipment(input.storeId, shipment.id);
    }

    const adapter = ShippingAdapterService.getAdapter();
    const label = await adapter.createLabel({
      shipmentId: shipment.id,
      orderId: order.id,
      carrier: input.carrier,
      serviceLevel: input.serviceLevel,
    });

    return prisma.$transaction(async (tx) => {
      const txDb = tx as unknown as ShippingDbClient;
      const file = await txDb.fileAsset.create({
        data: {
          storeId: input.storeId,
          orderId: order.id,
          kind: 'SHIPPING_LABEL_PDF',
          fileName: `${label.trackingNumber}.pdf`,
          mimeType: 'application/pdf',
          url: label.labelUrl,
          metadata: {
            provider: label.provider,
            carrier: label.carrier,
            trackingNumber: label.trackingNumber,
          },
        },
      });

      const updated = await txDb.shipment.update({
        where: { id: shipment.id },
        data: {
          carrier: label.carrier,
          provider: label.provider,
          serviceLevel: input.serviceLevel,
          trackingNumber: label.trackingNumber,
          trackingUrl: label.trackingUrl,
          labelAssetId: file.id,
          labelStatus: label.labelStatus,
          status: label.status,
          weight: input.weight ?? shipment.weight,
          cost: input.cost ?? shipment.cost,
          metadata: {
            ...(shipment.metadata || {}),
            ...(label.metadata || {}),
          },
        },
      });

      await txDb.shipmentEvent.create({
        data: {
          storeId: input.storeId,
          shipmentId: shipment.id,
          eventType: 'LABEL_CREATED',
          status: 'label_created',
          message: `Label created (${label.provider})`,
          payload: {
            trackingNumber: label.trackingNumber,
            trackingUrl: label.trackingUrl,
          },
        },
      });

      return updated;
    });
  }

  async addEvent(input: {
    storeId: string;
    shipmentId: string;
    eventType: string;
    status?: string;
    message?: string;
    payload?: JsonObject;
    occurredAt?: Date;
  }) {
    const shipment = await prisma.shipment.findFirst({
      where: { id: input.shipmentId, order: { storeId: input.storeId } },
    });
    if (!shipment) throw new Error('Shipment not found');

    const shippingDb = prisma as unknown as ShippingDbClient;
    const event = await shippingDb.shipmentEvent.create({
      data: {
        storeId: input.storeId,
        shipmentId: input.shipmentId,
        eventType: input.eventType,
        status: input.status,
        message: input.message,
        payload: input.payload,
        occurredAt: input.occurredAt || new Date(),
      },
    });

    if (input.status) {
      await shippingDb.shipment.update({
        where: { id: input.shipmentId },
        data: {
          status: input.status,
          shippedAt: input.status === 'shipped' ? new Date() : shipment.shippedAt,
          deliveredAt: input.status === 'delivered' ? new Date() : shipment.deliveredAt,
        },
      });
    }

    return event;
  }

  async syncTracking(input: { storeId: string; shipmentId: string }) {
    const shipment = await shippingDb.shipment.findFirst({
      where: { id: input.shipmentId, order: { storeId: input.storeId } },
      include: { order: true },
    });
    if (!shipment) throw new Error('Shipment not found');
    if (!shipment.trackingNumber) throw new Error('Shipment has no tracking number');

    const adapter = ShippingAdapterService.getAdapter();
    const tracking = await adapter.track(shipment.trackingNumber);

    await prisma.$transaction(async (tx) => {
      const txDb = tx as unknown as ShippingDbClient;
      for (const row of tracking.events || []) {
        await txDb.shipmentEvent.create({
          data: {
            storeId: input.storeId,
            shipmentId: shipment.id,
            eventType: row.eventType,
            status: row.status,
            message: row.message,
            payload: row.payload,
            occurredAt: row.occurredAt || new Date(),
          },
        });
      }

      await txDb.shipment.update({
        where: { id: shipment.id },
        data: {
          status: tracking.status,
          metadata: {
            ...(shipment.metadata || {}),
            trackingProvider: tracking.provider,
          },
        },
      });
    });

    return this.getShipment(input.storeId, shipment.id);
  }
}

export default new ShippingService();
