import {
  CreateLabelInput,
  CreateLabelResult,
  ShippingProvider,
  ShippingRate,
  ShippingRateInput,
  TrackingResult,
} from '../ShippingProvider.js';

export class MockShippingProvider implements ShippingProvider {
  async healthcheck() {
    return { ok: true, provider: 'mock', message: 'Mock shipping provider ready' };
  }

  async getRates(_input: ShippingRateInput): Promise<ShippingRate[]> {
    return [
      {
        id: 'mock_rate_ground',
        provider: 'mock',
        carrier: 'MOCK_CARRIER',
        serviceLevel: 'GROUND',
        amountCents: 1299,
        currency: 'USD',
        etaDays: 4,
      },
      {
        id: 'mock_rate_express',
        provider: 'mock',
        carrier: 'MOCK_CARRIER',
        serviceLevel: 'EXPRESS',
        amountCents: 2499,
        currency: 'USD',
        etaDays: 2,
      },
    ];
  }

  async createLabel(input: CreateLabelInput): Promise<CreateLabelResult> {
    const rateId = String(input.rateId || 'mock_rate_ground');
    const suffix = input.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase().padEnd(8, '0');
    const trackingNumber = `MOCKTRACK${suffix}`;
    return {
      provider: 'mock',
      providerRef: `mock_shp_${rateId}_${suffix}`,
      trackingNumber,
      trackingUrl: `https://tracking.mock.local/${trackingNumber}`,
      labelAsset: {
        fileName: `${trackingNumber}.pdf`,
        mimeType: 'application/pdf',
        url: `https://labels.mock.local/${trackingNumber}.pdf`,
      },
      status: 'label_created',
      events: [
        {
          eventType: 'LABEL_CREATED',
          status: 'label_created',
          message: `Mock label created with ${rateId}`,
        },
      ],
    };
  }

  async track(trackingNumber: string): Promise<TrackingResult> {
    return {
      provider: 'mock',
      trackingNumber,
      status: 'in_transit',
      events: [
        {
          eventType: 'TRACKING_UPDATE',
          status: 'in_transit',
          message: 'Mock package scanned at origin facility',
          occurredAt: new Date(),
        },
      ],
    };
  }

  async parseWebhookEvent(payload: unknown, headers: Record<string, string | undefined>) {
    const expectedSecret = process.env.SHIPPING_WEBHOOK_SECRET || '';
    if (expectedSecret) {
      const provided = headers['x-webhook-secret'];
      if (!provided || provided !== expectedSecret) {
        return { accepted: false, reason: 'Invalid webhook secret', raw: payload };
      }
    }

    const body = (payload || {}) as any;
    if (!body?.trackingNumber) {
      return { accepted: false, reason: 'trackingNumber required', raw: payload };
    }

    return {
      accepted: true,
      eventType: String(body.eventType || 'TRACKING_UPDATE'),
      providerRef: body.providerRef ? String(body.providerRef) : undefined,
      trackingNumber: String(body.trackingNumber),
      status: body.status ? String(body.status) : undefined,
      raw: payload,
    };
  }
}

export default MockShippingProvider;
