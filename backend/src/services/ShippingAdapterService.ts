export type CreateLabelInput = {
  shipmentId: string;
  orderId: string;
  carrier?: string;
  serviceLevel?: string;
};

export type CreateLabelOutput = {
  provider: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  labelStatus: 'created' | 'pending' | 'failed';
  status: string;
  metadata?: Record<string, any>;
};

export type TrackingOutput = {
  provider: string;
  trackingNumber: string;
  status: string;
  events: Array<{
    eventType: string;
    status?: string;
    message?: string;
    occurredAt?: Date;
    payload?: Record<string, any>;
  }>;
};

export interface ShippingAdapter {
  createLabel(input: CreateLabelInput): Promise<CreateLabelOutput>;
  track(trackingNumber: string): Promise<TrackingOutput>;
}

class MockShippingAdapter implements ShippingAdapter {
  async createLabel(input: CreateLabelInput): Promise<CreateLabelOutput> {
    const suffix = input.shipmentId.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase();
    const trackingNumber = `MOCK${suffix}`;
    const carrier = input.carrier || 'MOCK_CARRIER';

    return {
      provider: 'MOCK',
      carrier,
      trackingNumber,
      trackingUrl: `https://tracking.mock.local/${trackingNumber}`,
      labelUrl: `https://labels.mock.local/${input.shipmentId}.pdf`,
      labelStatus: 'created',
      status: 'label_created',
      metadata: {
        serviceLevel: input.serviceLevel || 'GROUND',
      },
    };
  }

  async track(trackingNumber: string): Promise<TrackingOutput> {
    return {
      provider: 'MOCK',
      trackingNumber,
      status: 'in_transit',
      events: [
        {
          eventType: 'TRACKING_UPDATE',
          status: 'in_transit',
          message: 'Shipment accepted by carrier',
          occurredAt: new Date(),
        },
      ],
    };
  }
}

export class ShippingAdapterService {
  private adapter: ShippingAdapter;

  constructor() {
    const configured = String(process.env.SHIPPING_ADAPTER || 'MOCK').toUpperCase();

    switch (configured) {
      case 'MOCK':
      default:
        this.adapter = new MockShippingAdapter();
        break;
    }
  }

  getAdapter() {
    return this.adapter;
  }
}

export default new ShippingAdapterService();
