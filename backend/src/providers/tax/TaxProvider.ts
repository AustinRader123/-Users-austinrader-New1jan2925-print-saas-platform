export type TaxQuoteInput = {
  storeId: string;
  orderId?: string;
  invoiceId?: string;
  subtotalCents: number;
  shippingCents?: number;
  destination?: {
    country?: string;
    state?: string;
    postalCode?: string;
  };
};

export type TaxQuoteResult = {
  provider: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  breakdown: Record<string, unknown>;
};

export interface TaxProvider {
  healthcheck(): Promise<{ ok: boolean; provider: string; message?: string }>;
  calculateTax(input: TaxQuoteInput): Promise<TaxQuoteResult>;
}
