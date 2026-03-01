import axios from 'axios';
import { ExternalSupplierProduct, SupplierAdapter, SupplierAdapterConnection, SupplierSyncOptions } from '../types.js';

export class HttpJsonSupplierAdapter implements SupplierAdapter {
  async validateConnection(connection: SupplierAdapterConnection) {
    const startedAt = Date.now();
    if (!connection.baseUrl) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        authStatus: 'invalid_credentials' as const,
        sampleCounts: { products: 0, variants: 0, images: 0 },
        warnings: ['baseUrl is required'],
        error: 'baseUrl is required',
      };
    }
    try {
      const healthPath = (connection.credentials?.healthPath as string | undefined) || '/health';
      const response = await axios.get(`${connection.baseUrl}${healthPath}`, { timeout: 8000 });
      return {
        ok: response.status >= 200 && response.status < 300,
        latencyMs: Date.now() - startedAt,
        authStatus: 'ok' as const,
        sampleCounts: { products: 0, variants: 0, images: 0 },
        warnings: [],
      };
    } catch (error: any) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        authStatus: 'http_error' as const,
        sampleCounts: { products: 0, variants: 0, images: 0 },
        warnings: [],
        error: error?.message || 'Connection test failed',
      };
    }
  }

  async fetchCatalog(_connection: SupplierAdapterConnection, _options?: SupplierSyncOptions): Promise<ExternalSupplierProduct[]> {
    throw new Error('Live supplier adapters are not enabled in this environment. Use MOCK for smoke tests.');
  }
}
