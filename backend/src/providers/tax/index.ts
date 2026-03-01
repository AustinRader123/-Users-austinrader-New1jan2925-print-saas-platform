import { TaxProvider } from './TaxProvider.js';
import InternalTaxProvider from './internal/InternalTaxProvider.js';

export function getTaxProvider(): TaxProvider {
  const provider = String(process.env.TAX_PROVIDER || 'internal').toLowerCase();

  switch (provider) {
    case 'avalara':
    case 'internal':
    default:
      return new InternalTaxProvider();
  }
}
