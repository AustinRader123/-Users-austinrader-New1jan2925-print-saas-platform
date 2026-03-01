import { ShippingProvider } from './ShippingProvider.js';
import MockShippingProvider from './mock/MockShippingProvider.js';

export function getShippingProvider(): ShippingProvider {
  const provider = String(process.env.SHIPPING_PROVIDER || 'mock').toLowerCase();
  const resolvedProvider = provider === 'real'
    ? String(process.env.SHIPPING_REAL_PROVIDER || 'shippo').toLowerCase()
    : provider;

  switch (resolvedProvider) {
    case 'shippo':
    case 'easypost':
    case 'mock':
    default:
      return new MockShippingProvider();
  }
}
