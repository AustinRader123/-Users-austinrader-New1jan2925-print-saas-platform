import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { notify } from '../stores/notifyStore';

// Prefer relative '/api' in production when VITE_API_URL is not provided.
// This avoids hard-coding localhost in deployed environments and reduces CORS issues
// when an edge proxy or rewrite forwards /api to the backend.
const RAW_API = import.meta.env.VITE_API_URL as string | undefined;
const API_URL = (() => {
  // Prefer same-origin relative '/api' whenever RAW_API points to a different origin.
  // This lets platform rewrites (e.g., Vercel) proxy to the backend and avoids CORS.
  if (typeof window !== 'undefined') {
    const currentOrigin = `${window.location.protocol}//${window.location.host}`;
    if (!RAW_API || RAW_API.startsWith('/')) return '/api';
    try {
      const u = new URL(RAW_API);
      const apiOrigin = `${u.protocol}//${u.host}`;
      if (apiOrigin !== currentOrigin) {
        return '/api';
      }
    } catch {
      // Malformed RAW_API; use relative proxy
      return '/api';
    }
    return RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`;
  }
  // SSR or non-browser: use RAW_API if provided, else relative '/api'
  if (RAW_API && RAW_API.length > 0) {
    return RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`;
  }
  return '/api';
})();
// Root base for health checks (strip trailing '/api' if present) or use relative '/api'
const API_ROOT = (() => {
  // If we ended up with relative '/api', use relative root
  if (API_URL === '/api') return '';
  if (RAW_API && RAW_API.length > 0) {
    return RAW_API.endsWith('/api') ? RAW_API.replace(/\/api$/, '') : RAW_API;
  }
  return '';
})();

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.token = localStorage.getItem('token');

    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      // Add Request ID for tracing across services
      if (!config.headers['X-Request-ID']) {
        config.headers['X-Request-ID'] = uuidv4();
      }
      if (!config.headers['X-Correlation-ID']) {
        config.headers['X-Correlation-ID'] = config.headers['X-Request-ID'] as string;
      }
      return config;
    });
    // Avoid hanging requests; fail fast for diagnostics
    this.client.defaults.timeout = 10000; // 10s

    // Basic response interceptor to unify network/CORS errors
    this.client.interceptors.response.use(
      (resp) => resp,
      (error) => {
        // Axios uses 'Network Error' for CORS/mixed-content or DNS failures
        if (error && !error.response) {
          error.message = 'Network error. Check API URL, HTTPS, and CORS settings.';
          notify('Network error / API unreachable', 'danger');
        }
        // Auto-logout on 401 and redirect to login
        const status = error?.response?.status;
        if (status === 401) {
          try {
            this.clearToken();
          } catch {}
          if (typeof window !== 'undefined') {
            // Preserve current path to return after auth
            const path = window.location.pathname;
            const redirect = path && path !== '/login' ? `?next=${encodeURIComponent(path)}` : '';
            window.location.href = `/login${redirect}`;
          }
        }
        if (status === 403) {
          notify('Access denied', 'warning');
        }
        if (status >= 500) {
          notify('Server error — please try again later', 'danger');
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Auth
  async register(email: string, password: string, name: string) {
    const { data } = await this.client.post('/auth/register', { email, password, name });
    return data;
  }

  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    return data;
  }

  async getMe() {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  // Products
  async getProduct(productId: string, storeId: string = 'default') {
    const { data } = await this.client.get(`/products/${productId}?storeId=${storeId}`);
    return data;
  }

  async listProducts(storeId: string, skip = 0, take = 20, status?: string) {
    const { data } = await this.client.get('/products', {
      params: { storeId, skip, take, ...(status ? { status } : {}) },
    });
    return data;
  }

  async createProduct(payload: {
    storeId: string;
    name: string;
    slug?: string;
    description?: string;
    category?: string;
    basePrice?: number;
  }) {
    const { data } = await this.client.post('/products', payload);
    return data;
  }

  async updateProduct(productId: string, payload: {
    storeId: string;
    name?: string;
    slug?: string;
    description?: string;
    category?: string;
    basePrice?: number;
    status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  }) {
    const { data } = await this.client.put(`/products/${productId}`, payload);
    return data;
  }

  async deleteProduct(productId: string, storeId: string) {
    const { data } = await this.client.delete(`/products/${productId}`, { data: { storeId } });
    return data;
  }

  async listVariants(productId: string, storeId: string) {
    const { data } = await this.client.get(`/products/${productId}/variants`, { params: { storeId } });
    return data;
  }

  async createVariant(productId: string, payload: {
    storeId: string;
    name: string;
    sku: string;
    size?: string;
    color?: string;
    supplierCost?: number;
    inventoryCount?: number;
  }) {
    const { data } = await this.client.post(`/products/${productId}/variants`, payload);
    return data;
  }

  async updateVariant(productId: string, variantId: string, payload: {
    storeId: string;
    name?: string;
    sku?: string;
    size?: string;
    color?: string;
    cost?: number;
    price?: number;
    inventoryQty?: number;
  }) {
    const { data } = await this.client.put(`/variants/${variantId}`, payload);
    return data;
  }

  async deleteVariant(productId: string, variantId: string, storeId: string) {
    const { data } = await this.client.delete(`/variants/${variantId}`, { data: { storeId } });
    return data;
  }

  async listProductImages(productId: string, storeId: string) {
    const { data } = await this.client.get(`/products/${productId}/images`, { params: { storeId } });
    return data;
  }

  async createProductImage(productId: string, payload: { storeId: string; url: string; altText?: string; position?: number }) {
    const { data } = await this.client.post(`/products/${productId}/images`, payload);
    return data;
  }

  async updateProductImage(productId: string, imageId: string, payload: { storeId: string; sortOrder?: number; color?: string; altText?: string }) {
    const { data } = await this.client.put(`/products/${productId}/images/${imageId}`, payload);
    return data;
  }

  async deleteProductImage(productId: string, imageId: string, storeId: string) {
    const { data } = await this.client.delete(`/images/${imageId}`, { data: { storeId } });
    return data;
  }

  // Designs
  async createDesign(data: { name: string; description?: string; content?: any }) {
    const response = await this.client.post('/designs', data);
    return response.data;
  }

  async getDesign(designId: string) {
    const { data } = await this.client.get(`/designs/${designId}`);
    return data;
  }

  async updateDesign(designId: string, content: any, name?: string) {
    const { data } = await this.client.put(`/designs/${designId}`, { content, name });
    return data;
  }

  async listDesigns(skip = 0, take = 20) {
    const { data } = await this.client.get('/designs', { params: { skip, take } });
    return data;
  }

  async validateDesign(designId: string, decorationAreaId: string) {
    const { data } = await this.client.post(`/designs/${designId}/validate`, {
      decorationAreaId,
    });
    return data;
  }

  async generateMockups(designId: string, variantIds: string[]) {
    const { data } = await this.client.post(`/designs/${designId}/generate-mockups`, {
      variantIds,
    });
    return data;
  }

  async generateMockup(designId: string, variantId: string) {
    const { data } = await this.client.post(`/designs/${designId}/generate-mockups`, {
      variantIds: [variantId],
    });
    return data?.[0] || data;
  }

  async getMockupsForDesign(designId: string) {
    const { data } = await this.client.get(`/designs/${designId}/mockups`);
    return data;
  }

  async uploadDesignAsset(designId: string, storeId: string, file: File) {
    const form = new FormData();
    form.append('storeId', storeId);
    form.append('file', file);
    const { data } = await this.client.post(`/designs/${designId}/assets/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async listDesignAssets(designId: string) {
    const { data } = await this.client.get(`/designs/${designId}/assets`);
    return data;
  }

  async renderDesignMockup(designId: string, variantId: string) {
    const { data } = await this.client.post(`/designs/${designId}/mockups/render`, { variantId });
    return data;
  }

  async getMockupStatus(mockupId: string) {
    const { data } = await this.client.get(`/designs/mockups/${mockupId}/status`);
    return data;
  }

  // Cart
  async getCart(sessionId?: string) {
    const { data } = await this.client.get('/cart', {
      params: sessionId ? { sessionId } : {},
    });
    return data;
  }

  async addToCart(
    cartId: string,
    productId: string,
    variantId: string,
    quantity: number,
    designId?: string,
    mockupUrl?: string
  ) {
    const { data } = await this.client.post('/cart/items', {
      cartId,
      productId,
      variantId,
      quantity,
      designId,
      mockupUrl,
    });
    return data;
  }

  async updateCartItem(itemId: string, quantity: number) {
    const { data } = await this.client.put(`/cart/items/${itemId}`, { quantity });
    return data;
  }

  async removeFromCart(itemId: string) {
    const { data } = await this.client.delete(`/cart/items/${itemId}`);
    return data;
  }

  // Pricing
  async calculatePrice(
    productVariantId: string,
    quantity: number,
    decorationAreaId?: string,
    colorCount?: number
  ) {
    const { data } = await this.client.post('/pricing/preview', {
      productVariantId,
      quantity,
      decorationAreaId,
      colorCount,
    });
    return data;
  }

  // Orders
  async checkout(storeId: string, cartId: string, shipping: { name: string; email: string; address: any }) {
    const { data } = await this.client.post('/checkout', { storeId, cartId, shipping });
    return data;
  }

  async createOrder(storeId: string, cartId: string, shippingData: any) {
    const { data } = await this.client.post('/orders', {
      storeId,
      cartId,
      shippingData,
    });
    return data;
  }

  async getOrder(orderId: string) {
    const { data } = await this.client.get(`/orders/${orderId}`);
    return data;
  }

  async listOrders() {
    const { data } = await this.client.get('/orders');
    return data;
  }

  // Production
  async getProductionJob(jobId: string) {
    const { data } = await this.client.get(`/production/jobs/${jobId}`);
    return data;
  }

  async listProductionJobs(storeId: string, status?: string) {
    const { data } = await this.client.get('/production/jobs', {
      params: { storeId, status },
    });
    return data;
  }

  async getProductionKanban() {
    const { data } = await this.client.get('/production/kanban');
    return data;
  }

  // Admin - Production
  async adminListProductionJobs(params: { status?: string; priority?: string; skip?: number; take?: number } = {}) {
    const { data } = await this.client.get('/admin/production-jobs', { params });
    return data;
  }

  async adminUpdateProductionJob(jobId: string, status: string) {
    const { data } = await this.client.patch(`/admin/production-jobs/${jobId}`, { status });
    return data;
  }

  async adminGetProductionDownloads(jobId: string) {
    const { data } = await this.client.get(`/admin/production-jobs/${jobId}/downloads`);
    return data;
  }

  // Admin - Vendor Import
  async adminImportVendorCsv(
    vendorId: string,
    params: { storeId: string; file: File; mapping?: any } | { storeId: string; csv: string; mapping?: any }
  ) {
    // Support both multipart file upload and raw CSV string body
    if ((params as any).file) {
      const p = params as { storeId: string; file: File; mapping?: any };
      const form = new FormData();
      form.append('storeId', p.storeId);
      form.append('file', p.file);
      if (p.mapping) form.append('mapping', JSON.stringify(p.mapping));
      const { data } = await this.client.post(`/vendors/${vendorId}/import-csv`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } else {
      const p = params as { storeId: string; csv: string; mapping?: any };
      const { data } = await this.client.post(`/vendors/${vendorId}/import-csv`, {
        storeId: p.storeId,
        csv: p.csv,
        mapping: p.mapping,
      });
      return data;
    }
  }

  // Admin - Production pack (fallback stub)
  async adminGenerateProductionPack(jobId: string): Promise<{ url: string }> {
    // Backend may generate a downloadable pack via a specific route.
    // Fallback returns the expected pack download path used in UI.
    return { url: `/api/admin/production/jobs/${jobId}/pack/download` };
  }

  async adminListVendorCatalog(vendorId: string) {
    const { data } = await this.client.get(`/vendors/${vendorId}/products`);
    return data;
  }

  async adminListVendors() {
    const { data } = await this.client.get('/vendors');
    return data;
  }

  async adminCreateVendor(payload: { name: string; email: string; connectorType?: string }) {
    const { data } = await this.client.post('/vendors', payload);
    return data;
  }

  // Removed deprecated multipart route; canonicalized to /import-csv above

  async adminListVendorImportJobs(vendorId: string, limit = 20) {
    const { data } = await this.client.get(`/vendors/${vendorId}/import-jobs`, { params: { limit } });
    return data;
  }

  async adminGetImportJob(jobId: string) {
    const { data } = await this.client.get(`/import-jobs/${jobId}`);
    return data;
  }

  async adminListImportJobErrors(jobId: string, cursor?: string, limit = 20) {
    const { data } = await this.client.get(`/import-jobs/${jobId}/errors`, { params: { cursor, limit } });
    return data;
  }

  async adminRetryImportJob(jobId: string) {
    const { data } = await this.client.post(`/import-jobs/${jobId}/retry`);
    return data;
  }

  // Admin - Supplier Sync
  async adminListSupplierConnections(storeId?: string) {
    const { data } = await this.client.get('/suppliers/connections', {
      params: storeId ? { storeId } : {},
    });
    return data;
  }

  async adminCreateSupplierConnection(payload: {
    storeId?: string;
    supplier: 'MOCK' | 'SANMAR' | 'SSACTIVEWEAR' | 'ALPHABRODER';
    name: string;
    authType: string;
    baseUrl?: string;
    credentials?: Record<string, any>;
    enabled?: boolean;
  }) {
    const { data } = await this.client.post('/suppliers/connections', payload);
    return data;
  }

  async adminUpdateSupplierConnection(connectionId: string, payload: any) {
    const { data } = await this.client.patch(`/suppliers/connections/${connectionId}`, payload);
    return data;
  }

  async adminDeleteSupplierConnection(connectionId: string, storeId?: string) {
    const { data } = await this.client.delete(`/suppliers/connections/${connectionId}`, {
      data: storeId ? { storeId } : {},
    });
    return data;
  }

  async adminTestSupplierConnection(connectionId: string, storeId?: string) {
    const { data } = await this.client.post(`/suppliers/connections/${connectionId}/test`, {
      ...(storeId ? { storeId } : {}),
    });
    return data;
  }

  async adminRunSupplierSync(
    connectionId: string,
    payload: { storeId?: string; queue?: boolean; includeImages?: boolean; limitProducts?: number } = {}
  ) {
    const { data } = await this.client.post(`/suppliers/connections/${connectionId}/sync`, payload);
    return data;
  }

  async adminListSupplierRuns(storeId?: string, take = 50) {
    const { data } = await this.client.get('/suppliers/runs', {
      params: { take, ...(storeId ? { storeId } : {}) },
    });
    return data;
  }

  async adminGetSupplierRun(runId: string, storeId?: string) {
    const { data } = await this.client.get(`/suppliers/runs/${runId}`, {
      params: storeId ? { storeId } : {},
    });
    return data;
  }

  async downloadSupplierRunLog(runId: string, storeId?: string) {
    const response = await this.client.get(`/suppliers/sync-runs/${runId}/log`, {
      params: storeId ? { storeId } : {},
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supplier-sync-${runId}.log`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async downloadSupplierCatalogCsv(connectionId: string, storeId?: string) {
    const response = await this.client.get('/suppliers/export/catalog.csv', {
      params: { connectionId, ...(storeId ? { storeId } : {}) },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supplier-catalog-${connectionId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  // Admin - Pricing Rules
  async adminListPricingRules(productId?: string) {
    const { data } = await this.client.get('/admin/pricing-rules', { params: productId ? { productId } : {} });
    return data;
  }

  async adminCreatePricingRule(rule: {
    productId: string;
    name: string;
    printMethod?: string;
    minQuantity?: number;
    maxQuantity?: number;
    basePrice: number;
    colorSurcharge?: number;
    perPlacementCost?: number;
    quantityBreaklist?: Array<{ qty: number; price: number }>;
    active?: boolean;
  }) {
    const { data } = await this.client.post('/admin/pricing-rules', rule);
    return data;
  }

  async adminUpdatePricingRule(id: string, patch: any) {
    const { data } = await this.client.put(`/admin/pricing-rules/${id}`, patch);
    return data;
  }

  async adminDeletePricingRule(id: string) {
    const { data } = await this.client.delete(`/admin/pricing-rules/${id}`);
    return data;
  }

  async adminPricingPreview(payload: {
    storeId: string;
    productVariantId?: string;
    vendorVariantId?: string;
    sku?: string;
    quantity: number;
    decoration?: {
      method: 'SCREEN_PRINT' | 'EMBROIDERY';
      locations?: number;
      colors?: number;
    };
  }) {
    const { data } = await this.client.post('/pricing/preview', payload);
    return data;
  }

  async listPricingRuleSets(storeId: string) {
    const { data } = await this.client.get('/pricing/rulesets', { params: { storeId } });
    return data;
  }

  async createPricingRuleSet(payload: { storeId: string; name: string; description?: string; isDefault?: boolean; active?: boolean }) {
    const { data } = await this.client.post('/pricing/rulesets', payload);
    return data;
  }

  async updatePricingRuleSet(ruleSetId: string, payload: { storeId: string; name?: string; description?: string; isDefault?: boolean; active?: boolean }) {
    const { data } = await this.client.put(`/pricing/rulesets/${ruleSetId}`, payload);
    return data;
  }

  async createPricingRule(ruleSetId: string, payload: {
    storeId: string;
    name: string;
    method: string;
    priority?: number;
    conditions?: any;
    effects?: any;
    active?: boolean;
  }) {
    const { data } = await this.client.post(`/pricing/rulesets/${ruleSetId}/rules`, payload);
    return data;
  }

  async updatePricingRule(ruleId: string, payload: {
    storeId: string;
    name?: string;
    method?: string;
    priority?: number;
    conditions?: any;
    effects?: any;
    active?: boolean;
  }) {
    const { data } = await this.client.put(`/pricing/rules/${ruleId}`, payload);
    return data;
  }

  async deletePricingRule(ruleId: string, storeId: string) {
    const { data } = await this.client.delete(`/pricing/rules/${ruleId}`, { data: { storeId } });
    return data;
  }

  async evaluatePricing(payload: {
    storeId: string;
    productId: string;
    variantId?: string;
    qty: number;
    decorationMethod?: string;
    locations?: string[];
    printSizeTier?: 'SMALL' | 'MEDIUM' | 'LARGE';
    colorCount?: number;
    stitchCount?: number;
    rush?: boolean;
    weightOz?: number;
    userId?: string;
    includeMargin?: boolean;
  }) {
    const { data } = await this.client.post('/pricing/evaluate', payload);
    return data;
  }

  async listShippingRates(storeId: string) {
    const { data } = await this.client.get('/pricing/shipping-rates', { params: { storeId } });
    return data;
  }

  async updateShippingRates(payload: {
    storeId: string;
    rates: Array<{
      id?: string;
      name: string;
      active?: boolean;
      minSubtotal?: number | null;
      maxSubtotal?: number | null;
      baseCharge?: number;
      perItemCharge?: number;
      perOzCharge?: number;
      rushMultiplier?: number;
      metadata?: any;
    }>;
  }) {
    const { data } = await this.client.put('/pricing/shipping-rates', payload);
    return data;
  }

  async listTaxRates(storeId: string) {
    const { data } = await this.client.get('/pricing/tax-rates', { params: { storeId } });
    return data;
  }

  async updateTaxRates(payload: {
    storeId: string;
    rates: Array<{
      id?: string;
      name: string;
      jurisdiction?: string;
      active?: boolean;
      rate: number;
      appliesShipping?: boolean;
      metadata?: any;
    }>;
  }) {
    const { data } = await this.client.put('/pricing/tax-rates', payload);
    return data;
  }

  async listQuotes(storeId: string) {
    const { data } = await this.client.get('/quotes', { params: { storeId } });
    return data;
  }

  async createQuote(payload: { storeId: string; customerId?: string; customerName?: string; customerEmail?: string; notes?: string }) {
    const { data } = await this.client.post('/quotes', payload);
    return data;
  }

  async getQuote(quoteId: string, storeId: string) {
    const { data } = await this.client.get(`/quotes/${quoteId}`, { params: { storeId } });
    return data;
  }

  async updateQuote(quoteId: string, payload: { storeId: string; customerId?: string; customerName?: string; customerEmail?: string; notes?: string }) {
    const { data } = await this.client.put(`/quotes/${quoteId}`, payload);
    return data;
  }

  async updateQuoteStatus(quoteId: string, payload: { storeId: string; status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED' }) {
    const { data } = await this.client.put(`/quotes/${quoteId}/status`, payload);
    return data;
  }

  async addQuoteItem(
    quoteId: string,
    payload: {
      storeId: string;
      productId: string;
      variantId?: string;
      qty: { units: number; [key: string]: any };
      decorationMethod?: string;
      decorationLocations?: string[];
      decorationInput?: any;
      printSizeTier?: 'SMALL' | 'MEDIUM' | 'LARGE';
      colorCount?: number;
      stitchCount?: number;
      rush?: boolean;
      weightOz?: number;
      description?: string;
    }
  ) {
    const { data } = await this.client.post(`/quotes/${quoteId}/items`, payload);
    return data;
  }

  async convertQuoteToOrder(quoteId: string, storeId: string) {
    const { data } = await this.client.post(`/quotes/${quoteId}/convert`, { storeId });
    return data;
  }

  async repriceQuote(quoteId: string, storeId: string) {
    const { data } = await this.client.post(`/quotes/${quoteId}/reprice`, { storeId });
    return data;
  }

  async repriceOrder(orderId: string, storeId: string) {
    const { data } = await this.client.post(`/orders/${orderId}/reprice`, { storeId });
    return data;
  }

  async getReportsSummary(storeId: string, from?: string, to?: string) {
    const { data } = await this.client.get('/reports/summary', { params: { storeId, ...(from ? { from } : {}), ...(to ? { to } : {}) } });
    return data;
  }

  async getReportsProducts(storeId: string, from?: string, to?: string) {
    const { data } = await this.client.get('/reports/products', { params: { storeId, ...(from ? { from } : {}), ...(to ? { to } : {}) } });
    return data;
  }

  async downloadOrdersReportCsv(storeId: string, from?: string, to?: string) {
    const response = await this.client.get('/reports/export/orders.csv', {
      params: { storeId, ...(from ? { from } : {}), ...(to ? { to } : {}) },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async downloadQuotesReportCsv(storeId: string, from?: string, to?: string) {
    const response = await this.client.get('/reports/export/quotes.csv', {
      params: { storeId, ...(from ? { from } : {}), ...(to ? { to } : {}) },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async listProofRequests(storeId: string, status?: string) {
    const { data } = await this.client.get('/proofs', { params: { storeId, ...(status ? { status } : {}) } });
    return data;
  }

  async createProofRequest(payload: {
    storeId: string;
    orderId: string;
    designId?: string;
    mockupId?: string;
    recipientEmail?: string;
    message?: string;
    expiresHours?: number;
  }) {
    const { data } = await this.client.post('/proofs/request', payload);
    return data;
  }

  async respondProofRequest(approvalId: string, status: 'APPROVED' | 'REJECTED', comment?: string) {
    const { data } = await this.client.post(`/proofs/${approvalId}/respond`, { status, comment });
    return data;
  }

  async getPublicProof(token: string) {
    const { data } = await this.client.get(`/proofs/public/${token}`);
    return data;
  }

  async approvePublicProof(token: string, comment?: string) {
    const { data } = await this.client.post(`/proofs/public/${token}/approve`, { comment });
    return data;
  }

  async rejectPublicProof(token: string, comment?: string) {
    const { data } = await this.client.post(`/proofs/public/${token}/reject`, { comment });
    return data;
  }

  async generateWorkOrder(jobId: string) {
    const { data } = await this.client.post(`/production/jobs/${jobId}/work-order`);
    return data;
  }

  async generatePrintPackage(jobId: string) {
    const { data } = await this.client.post(`/production/jobs/${jobId}/print-package`);
    return data;
  }

  async getProductCustomizerConfig(storeId: string, productId: string) {
    const { data } = await this.client.get(`/customizer/products/${productId}`, { params: { storeId } });
    return data;
  }

  async saveProductCustomizerProfile(productId: string, payload: {
    storeId: string;
    enabled?: boolean;
    locations: any[];
    rules?: any;
  }) {
    const { data } = await this.client.put(`/customizer/products/${productId}/profile`, payload);
    return data;
  }

  async saveProductPersonalizationSchemas(productId: string, payload: {
    storeId: string;
    schemas: any[];
  }) {
    const { data } = await this.client.put(`/customizer/products/${productId}/personalization-schemas`, payload);
    return data;
  }

  async listCustomizerArtworkCategories(storeId: string, profileId?: string) {
    const { data } = await this.client.get('/customizer/artwork-categories', {
      params: { storeId, ...(profileId ? { profileId } : {}) },
    });
    return data;
  }

  async saveCustomizerArtworkCategory(payload: {
    storeId: string;
    profileId?: string;
    id?: string;
    name: string;
    slug: string;
    sortOrder?: number;
    active?: boolean;
  }) {
    const { data } = await this.client.post('/customizer/artwork-categories', payload);
    return data;
  }

  async uploadCustomizerArtworkAsset(payload: { storeId: string; categoryId?: string; name?: string; tags?: string; file: File }) {
    const form = new FormData();
    form.append('storeId', payload.storeId);
    if (payload.categoryId) form.append('categoryId', payload.categoryId);
    if (payload.name) form.append('name', payload.name);
    if (payload.tags) form.append('tags', payload.tags);
    form.append('file', payload.file);

    const { data } = await this.client.post('/customizer/artwork-assets/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async publicGetStorefront(storeSlug: string) {
    const { data } = await this.client.get(`/public/storefront/${storeSlug}`);
    return data;
  }

  async publicListProducts(storeSlug: string, collection?: string) {
    const { data } = await this.client.get('/public/products', {
      params: { storeSlug, ...(collection ? { collection } : {}) },
    });
    return data;
  }

  async publicGetProduct(storeSlug: string, idOrSlug: string) {
    const { data } = await this.client.get(`/public/products/${idOrSlug}`, { params: { storeSlug } });
    return data;
  }

  async publicGetCustomizerConfig(payload: { storeSlug?: string; storeId?: string; productId: string }) {
    const { data } = await this.client.get(`/public/customizer/products/${payload.productId}/config`, {
      params: {
        ...(payload.storeSlug ? { storeSlug: payload.storeSlug } : {}),
        ...(payload.storeId ? { storeId: payload.storeId } : {}),
      },
    });
    return data;
  }

  async publicUploadCustomizerFile(payload: { storeSlug?: string; storeId?: string; file: File }) {
    const form = new FormData();
    if (payload.storeSlug) form.append('storeSlug', payload.storeSlug);
    if (payload.storeId) form.append('storeId', payload.storeId);
    form.append('file', payload.file);
    const { data } = await this.client.post('/public/customizer/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async publicPreviewCustomization(payload: {
    storeSlug?: string;
    storeId?: string;
    productId: string;
    variantId: string;
    customization: any;
  }) {
    const { data } = await this.client.post('/public/customizer/preview', payload);
    return data;
  }

  async publicCustomizeAndAddToCart(token: string, payload: {
    productId: string;
    variantId: string;
    quantity?: number;
    customization: any;
    previewFileId?: string;
  }) {
    const { data } = await this.client.post(`/public/customizer/cart/${token}/customize-add`, payload);
    return data;
  }

  async publicCreateCart(storeSlug: string) {
    const { data } = await this.client.post('/public/cart', { storeSlug });
    return data;
  }

  async publicCreateFundraiserCart(payload: {
    storeSlug?: string;
    storeId?: string;
    fundraiser: {
      campaignId?: string;
      campaignSlug?: string;
      memberId?: string;
      memberCode?: string;
      teamStoreId?: string;
    };
  }) {
    const { data } = await this.client.post('/public/cart', payload);
    return data;
  }

  async publicGetCampaign(slug: string, storeSlug?: string) {
    const { data } = await this.client.get(`/public/campaigns/${slug}`, {
      params: storeSlug ? { storeSlug } : {},
    });
    return data;
  }

  async publicGetCampaignLeaderboard(campaignId: string) {
    const { data } = await this.client.get(`/public/campaigns/${campaignId}/leaderboard`);
    return data;
  }

  async publicGetCart(token: string) {
    const { data } = await this.client.get(`/public/cart/${token}`);
    return data;
  }

  async publicAddCartItem(token: string, payload: {
    productId: string;
    variantId?: string;
    quantity?: number;
    decorationMethod?: string;
    decorationLocations?: string[];
    designId?: string;
  }) {
    const { data } = await this.client.post(`/public/cart/${token}/items`, payload);
    return data;
  }

  async publicUpdateCartItem(token: string, itemId: string, payload: { quantity?: number; variantId?: string }) {
    const { data } = await this.client.put(`/public/cart/${token}/items/${itemId}`, payload);
    return data;
  }

  async publicRemoveCartItem(token: string, itemId: string) {
    const { data } = await this.client.delete(`/public/cart/${token}/items/${itemId}`);
    return data;
  }

  async publicCheckout(cartToken: string, payload: {
    customerEmail: string;
    customerName: string;
    shippingAddress: any;
    billingAddress?: any;
    paymentProvider?: 'NONE' | 'STRIPE';
    teamStoreMeta?: {
      teamStoreId: string;
      rosterEntryId?: string;
      personalization?: any;
      groupShipping?: boolean;
    };
  }) {
    const { data } = await this.client.post(`/public/checkout/${cartToken}`, payload);
    return data;
  }

  async publicGetOrder(token: string) {
    const { data } = await this.client.get(`/public/order/${token}`);
    return data;
  }

  async listTeamStores(storeId: string) {
    const { data } = await this.client.get('/team-stores', { params: { storeId } });
    return data;
  }

  async createTeamStore(payload: {
    storeId: string;
    slug: string;
    name: string;
    status?: string;
    closeAt?: string;
    minOrderQty?: number;
    fundraiserPercent?: number;
    groupShipping?: boolean;
    theme?: any;
  }) {
    const { data } = await this.client.post('/team-stores', payload);
    return data;
  }

  async listFundraisingCampaigns(params: { tenantId: string; storeId?: string }) {
    const { data } = await this.client.get('/fundraising/campaigns', { params });
    return data;
  }

  async createFundraisingCampaign(payload: {
    tenantId: string;
    storeId: string;
    networkId?: string;
    slug: string;
    name: string;
    description?: string;
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
    startsAt?: string;
    endsAt?: string;
    fundraisingGoalCents?: number;
    defaultFundraiserPercent?: number;
    shippingMode?: 'DIRECT' | 'CONSOLIDATED';
    allowSplitShip?: boolean;
    metadata?: any;
  }) {
    const { data } = await this.client.post('/fundraising/campaigns', payload, {
      params: { tenantId: payload.tenantId },
    });
    return data;
  }

  async getFundraisingCampaign(campaignId: string, tenantId: string) {
    const { data } = await this.client.get(`/fundraising/campaigns/${campaignId}`, {
      params: { tenantId },
    });
    return data;
  }

  async updateFundraisingCampaign(campaignId: string, tenantId: string, patch: any) {
    const { data } = await this.client.put(`/fundraising/campaigns/${campaignId}`, patch, {
      params: { tenantId },
    });
    return data;
  }

  async saveFundraisingCatalogOverride(campaignId: string, tenantId: string, payload: {
    productId: string;
    overridePrice?: number;
    overrideFundraiserPercent?: number;
    active?: boolean;
    metadata?: any;
  }) {
    const { data } = await this.client.post(`/fundraising/campaigns/${campaignId}/catalog-overrides`, payload, {
      params: { tenantId },
    });
    return data;
  }

  async linkFundraisingTeamStore(campaignId: string, tenantId: string, teamStoreId: string) {
    const { data } = await this.client.post(`/fundraising/campaigns/${campaignId}/team-stores`, { teamStoreId }, {
      params: { tenantId },
    });
    return data;
  }

  async saveFundraisingMember(campaignId: string, tenantId: string, payload: {
    id?: string;
    teamStoreId?: string;
    rosterEntryId?: string;
    displayName: string;
    publicCode?: string;
    isActive?: boolean;
    goalCents?: number;
    metadata?: any;
  }) {
    const { data } = await this.client.post(`/fundraising/campaigns/${campaignId}/members`, payload, {
      params: { tenantId },
    });
    return data;
  }

  async getFundraisingSummary(campaignId: string, tenantId: string) {
    const { data } = await this.client.get(`/fundraising/campaigns/${campaignId}/summary`, {
      params: { tenantId },
    });
    return data;
  }

  async getFundraisingLeaderboard(campaignId: string, tenantId: string) {
    const { data } = await this.client.get(`/fundraising/campaigns/${campaignId}/leaderboard`, {
      params: { tenantId },
    });
    return data;
  }

  async createFundraisingConsolidationRun(campaignId: string, tenantId: string, idempotencyKey?: string) {
    const { data } = await this.client.post(
      `/fundraising/campaigns/${campaignId}/consolidate`,
      idempotencyKey ? { idempotencyKey } : {},
      { params: { tenantId } }
    );
    return data;
  }

  async listFundraisingConsolidationRuns(campaignId: string, tenantId: string) {
    const { data } = await this.client.get(`/fundraising/campaigns/${campaignId}/consolidation-runs`, {
      params: { tenantId },
    });
    return data;
  }

  async listFundraisingLedger(campaignId: string, tenantId: string) {
    const { data } = await this.client.get(`/fundraising/campaigns/${campaignId}/ledger`, {
      params: { tenantId },
    });
    return data;
  }

  async downloadFundraisingLedgerCsv(campaignId: string, tenantId: string) {
    const { data } = await this.client.get(`/fundraising/campaigns/${campaignId}/ledger.csv`, {
      params: { tenantId },
      responseType: 'blob',
    });
    return data as Blob;
  }

  async approveFundraisingLedgerEntry(entryId: string, tenantId: string, notes?: string) {
    const { data } = await this.client.post(`/fundraising/ledger/${entryId}/approve`, notes ? { notes } : {}, {
      params: { tenantId },
    });
    return data;
  }

  async payFundraisingLedgerEntry(entryId: string, tenantId: string, notes?: string) {
    const { data } = await this.client.post(`/fundraising/ledger/${entryId}/pay`, notes ? { notes } : {}, {
      params: { tenantId },
    });
    return data;
  }

  async importTeamStoreRoster(teamStoreId: string, storeId: string, file: File) {
    const form = new FormData();
    form.append('storeId', storeId);
    form.append('file', file);
    const { data } = await this.client.post(`/team-stores/${teamStoreId}/roster/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async listInventory(storeId: string, params: { productId?: string; variantId?: string } = {}) {
    const { data } = await this.client.get('/inventory', { params: { storeId, ...params } });
    return data;
  }

  async adjustInventory(payload: { storeId: string; variantId: string; qty: number; note?: string }) {
    const { data } = await this.client.post('/inventory/adjust', payload);
    return data;
  }

  async listPurchaseOrders(storeId: string) {
    const { data } = await this.client.get('/purchase-orders', { params: { storeId } });
    return data;
  }

  async getPurchaseOrder(storeId: string, id: string) {
    const { data } = await this.client.get(`/purchase-orders/${id}`, { params: { storeId } });
    return data;
  }

  async createPurchaseOrder(payload: { storeId: string; supplierName: string; expectedAt?: string }) {
    const { data } = await this.client.post('/purchase-orders', payload);
    return data;
  }

  async addPurchaseOrderLine(id: string, payload: { storeId: string; variantId: string; qtyOrdered: number; costEach?: number }) {
    const { data } = await this.client.post(`/purchase-orders/${id}/lines`, payload);
    return data;
  }

  async receivePurchaseOrder(id: string, payload: { storeId: string; lines: Array<{ lineId: string; qtyReceived: number }> }) {
    const { data } = await this.client.post(`/purchase-orders/${id}/receive`, payload);
    return data;
  }

  async listWebhookEndpoints(storeId: string) {
    const { data } = await this.client.get('/webhooks/endpoints', { params: { storeId } });
    return data;
  }

  async createWebhookEndpoint(payload: { storeId: string; url: string; secret: string; enabled?: boolean; eventTypes?: string[] }) {
    const { data } = await this.client.post('/webhooks/endpoints', payload);
    return data;
  }

  async testWebhookEndpoint(id: string, storeId: string) {
    const { data } = await this.client.post(`/webhooks/endpoints/${id}/test`, { storeId });
    return data;
  }

  async listWebhookDeliveries(storeId: string) {
    const { data } = await this.client.get('/webhooks/deliveries', { params: { storeId } });
    return data;
  }

  async getBillingSnapshot() {
    const { data } = await this.client.get('/billing/snapshot');
    return data;
  }

  async createBillingCheckout(planCode: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE', successUrl?: string, cancelUrl?: string) {
    const { data } = await this.client.post('/billing/checkout', { planCode, successUrl, cancelUrl });
    return data;
  }

  async cancelBillingSubscription() {
    const { data } = await this.client.post('/billing/cancel');
    return data;
  }

  async listBillingEvents() {
    const { data } = await this.client.get('/billing/events');
    return data;
  }

  async listStoreDomains(storeId?: string) {
    const { data } = await this.client.get('/domains', { params: storeId ? { storeId } : {} });
    return data;
  }

  async createStoreDomain(payload: { hostname: string; storeId?: string }) {
    const { data } = await this.client.post('/domains', payload);
    return data;
  }

  async verifyStoreDomain(id: string, token?: string, manualActivate = true) {
    const { data } = await this.client.post(`/domains/${id}/verify`, {
      ...(token ? { token } : {}),
      manualActivate,
    });
    return data;
  }

  async disableStoreDomain(id: string) {
    const { data } = await this.client.post(`/domains/${id}/disable`);
    return data;
  }

  async listRbacPermissions() {
    const { data } = await this.client.get('/rbac/permissions');
    return data;
  }

  async listRbacRoles() {
    const { data } = await this.client.get('/rbac/roles');
    return data;
  }

  async createRbacRole(payload: { name: string; description?: string; permissionKeys?: string[] }) {
    const { data } = await this.client.post('/rbac/roles', payload);
    return data;
  }

  async updateRbacRole(id: string, payload: { name: string; description?: string; permissionKeys?: string[] }) {
    const { data } = await this.client.put(`/rbac/roles/${id}`, payload);
    return data;
  }

  async listRbacUsers() {
    const { data } = await this.client.get('/rbac/users');
    return data;
  }

  async assignRbacRole(userId: string, roleId: string) {
    const { data } = await this.client.post('/rbac/assign', { userId, roleId });
    return data;
  }

  async getOnboarding(storeId?: string) {
    const { data } = await this.client.get('/onboarding', { params: storeId ? { storeId } : {} });
    return data;
  }

  async updateOnboarding(payload: { storeId?: string; step?: number; data?: Record<string, any>; completed?: boolean }) {
    const { data } = await this.client.put('/onboarding', payload);
    return data;
  }

  async completeOnboarding(storeId?: string) {
    const { data } = await this.client.post('/onboarding/complete', storeId ? { storeId } : {});
    return data;
  }

  async getOnboardingNextSteps(storeId?: string) {
    const { data } = await this.client.get('/onboarding/next-steps', { params: storeId ? { storeId } : {} });
    return data;
  }

  async getTheme(storeId: string) {
    const { data } = await this.client.get('/theme', { params: { storeId } });
    return data;
  }

  async saveThemeDraft(payload: { storeId: string; storefrontId?: string; config: any }) {
    const { data } = await this.client.put('/theme', payload);
    return data;
  }

  async publishTheme(storeId: string) {
    const { data } = await this.client.post('/theme/publish', { storeId });
    return data;
  }

  async createThemePreviewToken(storeId: string, expiresMinutes = 15) {
    const { data } = await this.client.post('/theme/preview-token', { storeId, expiresMinutes });
    return data;
  }

  async getThemePreview(token: string) {
    const { data } = await this.client.get('/theme/preview', { params: { token } });
    return data;
  }

  async getEmailConfig() {
    const { data } = await this.client.get('/communications/email-config');
    return data;
  }

  async updateEmailConfig(payload: {
    provider: 'MOCK' | 'SMTP' | 'SENDGRID';
    fromName: string;
    fromEmail: string;
    replyTo?: string | null;
    enabled?: boolean;
    config?: Record<string, any>;
  }) {
    const { data } = await this.client.put('/communications/email-config', payload);
    return data;
  }

  async getCommunicationLogs(storeId?: string) {
    const { data } = await this.client.get('/communications/logs', { params: storeId ? { storeId } : {} });
    return data;
  }

  async listDocumentTemplates(storeId: string) {
    const { data } = await this.client.get('/documents/templates', { params: { storeId } });
    return data;
  }

  async upsertDocumentTemplate(type: 'QUOTE' | 'INVOICE' | 'PROOF' | 'WORK_ORDER', payload: {
    storeId: string;
    name: string;
    active?: boolean;
    template: Record<string, any>;
  }) {
    const { data } = await this.client.put(`/documents/templates/${type}`, payload);
    return data;
  }

  async generateQuotePdf(quoteId: string, storeId: string) {
    const { data } = await this.client.get(`/quotes/${quoteId}/pdf`, { params: { storeId } });
    return data;
  }

  async sendQuote(quoteId: string, payload: { storeId: string; expiresHours?: number }) {
    const { data } = await this.client.post(`/quotes/${quoteId}/send`, payload);
    return data;
  }

  async generateInvoicePdf(orderId: string) {
    const { data } = await this.client.get(`/orders/${orderId}/invoice.pdf`);
    return data;
  }

  async sendInvoice(orderId: string, expiresHours?: number) {
    const { data } = await this.client.post(`/orders/${orderId}/send-invoice`, { expiresHours });
    return data;
  }

  async generateProofPdf(approvalId: string) {
    const { data } = await this.client.get(`/proofs/${approvalId}/pdf`);
    return data;
  }

  async listGeneratedDocuments(type: 'QUOTE' | 'INVOICE' | 'PROOF' | 'WORK_ORDER', storeId: string) {
    const { data } = await this.client.get('/documents', { params: { type, storeId } });
    return data;
  }

  async getNavigationMenu() {
    const { data } = await this.client.get('/navigation/menu');
    return data;
  }

  async getPublicQuote(token: string) {
    const { data } = await this.client.get(`/public/quote/${token}`);
    return data;
  }

  async getPublicInvoice(token: string) {
    const { data } = await this.client.get(`/public/invoice/${token}`);
    return data;
  }

  async listNetworks(tenantId?: string) {
    const { data } = await this.client.get('/network/networks', { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async createNetwork(payload: { tenantId?: string; name: string; ownerStoreId: string }) {
    const { data } = await this.client.post('/network/networks', payload, { params: payload.tenantId ? { tenantId: payload.tenantId } : {} });
    return data;
  }

  async getNetworkOverview(networkId: string, tenantId?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/overview`, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async listNetworkStores(networkId: string, tenantId?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/stores`, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async addNetworkStore(networkId: string, payload: { tenantId?: string; storeId: string; role: 'OWNER' | 'HUB' | 'SPOKE'; status?: 'ACTIVE' | 'SUSPENDED' }) {
    const { data } = await this.client.post(`/network/networks/${networkId}/stores`, payload, { params: payload.tenantId ? { tenantId: payload.tenantId } : {} });
    return data;
  }

  async createNetworkChildStore(networkId: string, payload: { tenantId?: string; name: string; slug: string; role: 'HUB' | 'SPOKE' }) {
    const { data } = await this.client.post(`/network/networks/${networkId}/stores/create`, payload, { params: payload.tenantId ? { tenantId: payload.tenantId } : {} });
    return data;
  }

  async listNetworkSharedItems(networkId: string, tenantId?: string, type?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/shared-items`, { params: { ...(tenantId ? { tenantId } : {}), ...(type ? { type } : {}) } });
    return data;
  }

  async publishNetworkProduct(networkId: string, productId: string, tenantId?: string) {
    const { data } = await this.client.post(`/network/networks/${networkId}/publish/product/${productId}`, {}, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async publishNetworkPricingRuleSet(networkId: string, ruleSetId: string, tenantId?: string) {
    const { data } = await this.client.post(`/network/networks/${networkId}/publish/pricing-rule-set/${ruleSetId}`, {}, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async applyNetworkSharedItems(networkId: string, payload: { storeId: string; sharedItemId?: string; tenantId?: string }) {
    const { data } = await this.client.post(`/network/networks/${networkId}/apply`, payload, { params: payload.tenantId ? { tenantId: payload.tenantId } : {} });
    return data;
  }

  async listNetworkBindings(networkId: string, storeId: string, tenantId?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/bindings`, { params: { storeId, ...(tenantId ? { tenantId } : {}) } });
    return data;
  }

  async listNetworkRoutingRules(networkId: string, tenantId?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/routing-rules`, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async upsertNetworkRoutingRule(networkId: string, payload: { tenantId?: string; id?: string; name: string; enabled?: boolean; strategy?: 'MANUAL' | 'GEO' | 'CAPACITY' | 'PRIORITY'; config?: Record<string, any> }) {
    const { data } = await this.client.post(`/network/networks/${networkId}/routing-rules`, payload, { params: payload.tenantId ? { tenantId: payload.tenantId } : {} });
    return data;
  }

  async routeOrder(orderId: string, tenantId?: string) {
    const { data } = await this.client.post(`/network/route-order/${orderId}`, {}, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async listRoutedOrders(networkId: string, storeId?: string, tenantId?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/routed-orders`, { params: { ...(storeId ? { storeId } : {}), ...(tenantId ? { tenantId } : {}) } });
    return data;
  }

  async updateRoutedOrderStatus(networkId: string, routedOrderId: string, status: 'PROPOSED' | 'ACCEPTED' | 'IN_PRODUCTION' | 'SHIPPED' | 'COMPLETED', tenantId?: string) {
    const { data } = await this.client.post(`/network/networks/${networkId}/routed-orders/${routedOrderId}/status`, { status }, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async listRoyaltyRules(networkId: string, tenantId?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/royalty-rules`, { params: tenantId ? { tenantId } : {} });
    return data;
  }

  async upsertRoyaltyRule(networkId: string, payload: { tenantId?: string; id?: string; name: string; enabled?: boolean; basis?: 'REVENUE' | 'PROFIT' | 'DECORATION_ONLY'; ratePercent?: number | null; flatCents?: number | null; appliesTo?: Record<string, any> | null }) {
    const { data } = await this.client.post(`/network/networks/${networkId}/royalty-rules`, payload, { params: payload.tenantId ? { tenantId: payload.tenantId } : {} });
    return data;
  }

  async getRoyaltyReport(networkId: string, tenantId?: string, from?: string, to?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/royalties/report`, { params: { ...(tenantId ? { tenantId } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) } });
    return data;
  }

  async downloadRoyaltyReportCsv(networkId: string, tenantId?: string, from?: string, to?: string) {
    const { data } = await this.client.get(`/network/networks/${networkId}/royalties/export.csv`, {
      params: { ...(tenantId ? { tenantId } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) },
      responseType: 'blob',
    });
    return data as Blob;
  }

  // Health check against backend root (not prefixed by /api)
  async health(): Promise<{ status: string }> {
    const url = API_ROOT ? `${API_ROOT}/health` : `/api/health`;
    const { data } = await axios.get(url, { timeout: 5000 });
    return data;
  }
}

export const apiClient = new ApiClient();
