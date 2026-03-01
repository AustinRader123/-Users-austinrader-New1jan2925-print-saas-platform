import { PaymentsProvider } from './PaymentsProvider.js';
import MockPaymentsProvider from './mock/MockPaymentsProvider.js';
import StripePaymentsProvider from './stripe/StripePaymentsProvider.js';

export function getPaymentsProvider(): PaymentsProvider {
  const provider = String(process.env.PAYMENTS_PROVIDER || 'mock').toLowerCase();
  const resolvedProvider = provider === 'real'
    ? String(process.env.PAYMENTS_REAL_PROVIDER || 'stripe').toLowerCase()
    : provider;

  if (resolvedProvider === 'stripe') {
    return new StripePaymentsProvider();
  }
  return new MockPaymentsProvider();
}
