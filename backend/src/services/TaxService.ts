import { getTaxProvider } from '../providers/tax/index.js';
import { TaxQuoteInput } from '../providers/tax/TaxProvider.js';
import prisma from '../lib/prisma.js';

export class TaxService {
  private provider = getTaxProvider();

  async healthcheck() {
    return this.provider.healthcheck();
  }

  async quote(input: TaxQuoteInput) {
    if (input.subtotalCents < 0) {
      throw new Error('subtotalCents cannot be negative');
    }

    const quote = await this.provider.calculateTax(input);
    const row = await (prisma as any).taxQuote.create({
      data: {
        storeId: input.storeId,
        orderId: input.orderId,
        invoiceId: input.invoiceId,
        provider: quote.provider,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        breakdownJson: quote.breakdown,
      },
    });

    return {
      ...quote,
      id: row.id,
    };
  }

  async quoteTax(input: TaxQuoteInput) {
    return this.quote(input);
  }
}

export default new TaxService();
