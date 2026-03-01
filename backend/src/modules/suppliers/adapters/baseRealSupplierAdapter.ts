import axios, { AxiosError, AxiosInstance } from 'axios';
import http from 'http';
import https from 'https';
import { normalizeProduct } from './normalization.js';
import {
  ExternalSupplierProduct,
  SupplierAdapter,
  SupplierAdapterConnection,
  SupplierConnectionTestResult,
  SupplierSyncOptions,
} from '../types.js';

type PageResult = {
  items: any[];
  nextPageToken?: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export abstract class BaseRealSupplierAdapter implements SupplierAdapter {
  protected abstract supplierCode: string;

  protected buildClient(connection: SupplierAdapterConnection): AxiosInstance {
    if (!connection.baseUrl) {
      throw new Error('baseUrl is required for real supplier adapter');
    }

    return axios.create({
      baseURL: connection.baseUrl,
      timeout: 20000,
      headers: this.buildHeaders(connection),
      httpAgent: new http.Agent({ timeout: 3000 }),
      httpsAgent: new https.Agent({ timeout: 3000 }),
    });
  }

  protected buildHeaders(connection: SupplierAdapterConnection) {
    const apiKey = connection.credentials?.apiKey || connection.credentials?.token;
    return apiKey
      ? {
          Authorization: `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
        }
      : {};
  }

  protected isRetryable(error: unknown) {
    const status = (error as AxiosError)?.response?.status;
    if (!status) return true;
    return status === 429 || status >= 500;
  }

  protected async withRetry<T>(work: () => Promise<T>): Promise<T> {
    const maxAttempts = 3;
    let attempt = 0;
    let backoffMs = 400;
    while (attempt < maxAttempts) {
      try {
        return await work();
      } catch (error) {
        attempt += 1;
        if (attempt >= maxAttempts || !this.isRetryable(error)) {
          throw error;
        }
        await sleep(backoffMs);
        backoffMs *= 2;
      }
    }
    throw new Error('Unexpected retry loop state');
  }

  protected async fetchPageWithRetry(client: AxiosInstance, pageToken?: string): Promise<PageResult> {
    return this.withRetry(async () => {
      const tokenParam = pageToken?.startsWith('page:') ? { page: pageToken.replace('page:', '') } : { pageToken };
      const response = await client.get('/catalog', {
        timeout: 20000,
        params: {
          ...tokenParam,
          limit: 200,
        },
      });

      const payload = response.data || {};
      const nextPageToken = payload.nextPageToken || payload.nextCursor || (payload.nextPage ? `page:${payload.nextPage}` : null);
      return {
        items: Array.isArray(payload.items) ? payload.items : [],
        nextPageToken,
      };
    });
  }

  async validateConnection(connection: SupplierAdapterConnection): Promise<SupplierConnectionTestResult> {
    const startedAt = Date.now();

    if (!connection.baseUrl) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        authStatus: 'invalid_credentials',
        sampleCounts: { products: 0, variants: 0, images: 0 },
        warnings: ['Supplier baseUrl is missing'],
        error: 'Set baseUrl on this connection before testing',
      };
    }

    const hasCredentials = Boolean(connection.credentials?.apiKey || connection.credentials?.token || connection.credentials?.username);
    if (!hasCredentials) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        authStatus: 'missing_credentials',
        sampleCounts: { products: 0, variants: 0, images: 0 },
        warnings: ['No credentials found'],
        error: 'Set credentials.apiKey (or token/username) for this supplier connection',
      };
    }

    try {
      const client = this.buildClient(connection);
      const page = await this.fetchPageWithRetry(client);
      const normalized = page.items.slice(0, 3).map((item) => normalizeProduct(item, this.supplierCode));
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
        authStatus: 'ok',
        sampleCounts: {
          products: normalized.length,
          variants: normalized.reduce((sum, p) => sum + p.variants.length, 0),
          images: normalized.reduce((sum, p) => sum + p.images.length, 0),
        },
        warnings: normalized.length === 0 ? ['No sample products returned'] : [],
      };
    } catch (error: any) {
      const status = error?.response?.status;
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        authStatus: status === 401 || status === 403 ? 'invalid_credentials' : 'http_error',
        sampleCounts: { products: 0, variants: 0, images: 0 },
        warnings: [],
        error: status ? `HTTP ${status}: ${error?.response?.data?.message || error?.message}` : error?.message || 'Connection test failed',
      };
    }
  }

  async fetchCatalog(connection: SupplierAdapterConnection, options?: SupplierSyncOptions): Promise<ExternalSupplierProduct[]> {
    const client = this.buildClient(connection);
    const products: ExternalSupplierProduct[] = [];
    let pageToken: string | undefined;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    while (true) {
      try {
        const page = await this.fetchPageWithRetry(client, pageToken);
        consecutiveFailures = 0;

        const normalized = page.items.map((item) => normalizeProduct(item, this.supplierCode));
        products.push(...normalized);

        if (options?.limitProducts && products.length >= options.limitProducts) {
          return products.slice(0, options.limitProducts);
        }

        if (!page.nextPageToken) {
          break;
        }
        pageToken = page.nextPageToken;
      } catch (error: any) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          throw new Error(`Circuit breaker opened for ${this.supplierCode}: ${error?.message || 'fetch failed'}`);
        }
        await sleep(500 * consecutiveFailures);
      }
    }

    return products;
  }
}
