import { getTaxProvider } from '../providers/tax/index.js';
import { TaxQuoteInput } from '../providers/tax/TaxProvider.js';

export class TaxService {
  private provider = getTaxProvider();

  async healthcheck() {
    return this.provider.healthcheck();
  }

  async quote(input: TaxQuoteInput) {
    if (input.subtotalCents < 0) {
      throw new Error('subtotalCents cannot be negative');
    }

    return this.provider.calculateTax(input);
  }
}

export default new TaxService();
