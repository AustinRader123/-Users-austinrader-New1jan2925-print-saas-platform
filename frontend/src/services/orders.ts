import { apiClient } from '../lib/api';

export async function listOrders() {
  return apiClient.listOrders();
}

export async function getOrder(orderId: string) {
  return apiClient.getOrder(orderId);
}

export async function createOrder(storeId: string, cartId: string, shippingData: any) {
  return apiClient.createOrder(storeId, cartId, shippingData);
}

export async function updateOrder(orderId: string, patch: any) {
  // Assuming PATCH /api/orders/:id is supported
  return apiClient['client']?.patch(`/orders/${orderId}`, patch);
}
