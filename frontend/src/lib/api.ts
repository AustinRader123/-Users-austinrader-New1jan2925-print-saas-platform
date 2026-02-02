import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Prefer dev proxy via relative '/api' to avoid CORS and hard-coded ports.
// Allows overriding via VITE_API_URL when needed.
const API_URL = (import.meta.env.VITE_API_URL as string) || '/api';

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
    // Avoid hanging requests in dev; fail fast for diagnostics
    this.client.defaults.timeout = 10000; // 10s
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

  async listProducts(storeId: string, skip = 0, take = 20) {
    const { data } = await this.client.get('/products', {
      params: { storeId, skip, take, status: 'ACTIVE' },
    });
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
  async adminImportVendorCsv(vendorId: string, payload: { storeId: string; csv: string; mapping: any }) {
    const { data } = await this.client.post(`/vendors/${vendorId}/import-csv`, payload);
    return data;
  }

  async adminListVendorCatalog(vendorId: string) {
    const { data } = await this.client.get(`/vendors/${vendorId}/products`);
    return data;
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
    const { data } = await this.client.patch(`/admin/pricing-rules/${id}`, patch);
    return data;
  }
}

export const apiClient = new ApiClient();
