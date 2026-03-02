import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  list(tenantId: string, storeId: string) {
    return [
      { id: 'p_1', tenantId, storeId, slug: 'classic-tee', name: 'Classic Tee', updatedAt: new Date().toISOString() },
      { id: 'p_2', tenantId, storeId, slug: 'premium-hoodie', name: 'Premium Hoodie', updatedAt: new Date().toISOString() },
    ].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.id < b.id ? 1 : -1));
  }
}
