export type ShippingRateInput = {
  storeId: string;
  orderId: string;
  destination?: Record<string, unknown>;
  weightOz?: number;
};

export type ShippingRate = {
  provider: string;
  carrier: string;
  serviceLevel: string;
  amountCents: number;
  currency: string;
  etaDays?: number;
};

export type CreateShipmentInput = {
  storeId: string;
  orderId: string;
  rate: ShippingRate;
  metadata?: Record<string, unknown>;
};

export type CreateShipmentResult = {
  provider: string;
  providerRef: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  status: string;
};

export interface ShippingProvider {
  healthcheck(): Promise<{ ok: boolean; provider: string; message?: string }>;
  getRates(input: ShippingRateInput): Promise<ShippingRate[]>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  parseWebhookEvent(payload: unknown, headers: Record<string, string | undefined>): Promise<{
    accepted: boolean;
    eventType?: string;
    providerRef?: string;
    trackingNumber?: string;
    status?: string;
    reason?: string;
    raw?: unknown;
  }>;
}
