import { TaxProvider, TaxQuoteInput, TaxQuoteResult } from '../TaxProvider.js';

const DEFAULT_TAX_RATE = Number(process.env.INTERNAL_TAX_RATE || '0.0825');

export class InternalTaxProvider implements TaxProvider {
  async healthcheck() {
    return { ok: true, provider: 'internal', message: 'Internal deterministic tax provider ready' };
  }

  async calculateTax(input: TaxQuoteInput): Promise<TaxQuoteResult> {
    const subtotalCents = Math.max(0, Math.round(input.subtotalCents || 0));
    const shippingCents = Math.max(0, Math.round(input.shippingCents || 0));
    const taxableBase = subtotalCents + shippingCents;
    const taxCents = Math.round(taxableBase * DEFAULT_TAX_RATE);

    return {
      provider: 'internal',
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents: taxableBase + taxCents,
      breakdown: {
        taxRate: DEFAULT_TAX_RATE,
        taxableBase,
      },
    };
  }
}

export default InternalTaxProvider;
