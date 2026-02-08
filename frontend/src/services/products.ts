import { apiClient } from '../lib/api';

export async function listProducts(storeId: string, skip = 0, take = 20) {
  return apiClient.listProducts(storeId, skip, take);
}

export async function getProduct(productId: string, storeId: string = 'default') {
  return apiClient.getProduct(productId, storeId);
}
