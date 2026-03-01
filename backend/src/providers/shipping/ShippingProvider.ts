export type ShippingRateInput = {
  storeId: string;
  orderId: string;
  to?: Record<string, unknown>;
  from?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
};

export type ShippingRate = {
  id: string;
  provider: string;
  carrier: string;
  serviceLevel: string;
  amountCents: number;
  currency: string;
  etaDays?: number;
};

export type CreateLabelInput = {
  storeId: string;
  orderId: string;
  rateId: string;
  metadata?: Record<string, unknown>;
};

export type CreateLabelResult = {
  provider: string;
  providerRef: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelAsset?: {
    fileName: string;
    mimeType: string;
    url: string;
  };
  status: string;
  events: Array<{
    eventType: string;
    status: string;
    message?: string;
  }>;
};

export type TrackingResult = {
  provider: string;
  trackingNumber: string;
  status: string;
  events: Array<{
    eventType: string;
    status?: string;
    message?: string;
    occurredAt?: Date;
    payload?: Record<string, unknown>;
  }>;
};

export interface ShippingProvider {
  healthcheck(): Promise<{ ok: boolean; provider: string; message?: string }>;
  getRates(input: ShippingRateInput): Promise<ShippingRate[]>;
  createLabel(input: CreateLabelInput): Promise<CreateLabelResult>;
  track(trackingNumber: string): Promise<TrackingResult>;
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
