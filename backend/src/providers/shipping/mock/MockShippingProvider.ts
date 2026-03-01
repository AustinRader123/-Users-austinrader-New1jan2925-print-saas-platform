import {
  CreateShipmentInput,
  CreateShipmentResult,
  ShippingProvider,
  ShippingRate,
  ShippingRateInput,
} from '../ShippingProvider.js';

export class MockShippingProvider implements ShippingProvider {
  async healthcheck() {
    return { ok: true, provider: 'mock', message: 'Mock shipping provider ready' };
  }

  async getRates(_input: ShippingRateInput): Promise<ShippingRate[]> {
    return [
      {
        provider: 'mock',
        carrier: 'MOCK_CARRIER',
        serviceLevel: 'GROUND',
        amountCents: 1299,
        currency: 'USD',
        etaDays: 4,
      },
      {
        provider: 'mock',
        carrier: 'MOCK_CARRIER',
        serviceLevel: 'EXPRESS',
        amountCents: 2499,
        currency: 'USD',
        etaDays: 2,
      },
    ];
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const suffix = input.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase();
    const trackingNumber = `MOCKTRK${suffix}`;
    return {
      provider: 'mock',
      providerRef: `mock_shp_${Date.now()}`,
      trackingNumber,
      trackingUrl: `https://tracking.mock.local/${trackingNumber}`,
      labelUrl: `https://labels.mock.local/${trackingNumber}.pdf`,
      status: 'label_created',
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
