import { TaxProvider } from './TaxProvider.js';
import InternalTaxProvider from './internal/InternalTaxProvider.js';

export function getTaxProvider(): TaxProvider {
  const provider = String(process.env.TAX_PROVIDER || 'internal').toLowerCase();
  const resolvedProvider = provider === 'real'
    ? String(process.env.TAX_REAL_PROVIDER || 'avalara').toLowerCase()
    : provider;

  switch (resolvedProvider) {
    case 'avalara':
    case 'internal':
    default:
      return new InternalTaxProvider();
  }
}
