import { SupplierName } from '@prisma/client';
import { SupplierAdapter } from '../types.js';
import { MockSupplierAdapter } from './mockSupplierAdapter.js';
import { SanMarSupplierAdapter } from './sanmarSupplierAdapter.js';
import { SSActivewearSupplierAdapter } from './ssActivewearSupplierAdapter.js';
import { AlphaBroderSupplierAdapter } from './alphaBroderSupplierAdapter.js';

const mockAdapter = new MockSupplierAdapter();
const sanMarAdapter = new SanMarSupplierAdapter();
const ssActivewearAdapter = new SSActivewearSupplierAdapter();
const alphaBroderAdapter = new AlphaBroderSupplierAdapter();

function realAdaptersEnabled() {
  return process.env.ENABLE_REAL_SUPPLIER_ADAPTERS === 'true';
}

export function getSupplierAdapter(supplier: SupplierName): SupplierAdapter {
  if (supplier === 'MOCK') {
    return mockAdapter;
  }

  if (!realAdaptersEnabled()) {
    return {
      async validateConnection() {
        return {
          ok: false,
          latencyMs: 0,
          authStatus: 'missing_credentials',
          sampleCounts: { products: 0, variants: 0, images: 0 },
          warnings: ['Real supplier adapters are disabled'],
          error: 'Set ENABLE_REAL_SUPPLIER_ADAPTERS=true to enable real supplier adapters',
        };
      },
      async fetchCatalog() {
        throw new Error('Real supplier adapters are disabled. Use MOCK for smoke tests or set ENABLE_REAL_SUPPLIER_ADAPTERS=true.');
      },
    };
  }

  if (supplier === 'SANMAR') {
    return sanMarAdapter;
  }
  if (supplier === 'SSACTIVEWEAR') {
    return ssActivewearAdapter;
  }
  if (supplier === 'ALPHABRODER') {
    return alphaBroderAdapter;
  }

  throw new Error(`Unsupported supplier: ${supplier}`);
}
