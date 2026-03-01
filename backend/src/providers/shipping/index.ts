import { ShippingProvider } from './ShippingProvider.js';
import MockShippingProvider from './mock/MockShippingProvider.js';

export function getShippingProvider(): ShippingProvider {
  const provider = String(process.env.SHIPPING_PROVIDER || 'mock').toLowerCase();

  switch (provider) {
    case 'shippo':
    case 'easypost':
    case 'mock':
    default:
      return new MockShippingProvider();
  }
}
