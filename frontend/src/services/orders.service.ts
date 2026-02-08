import { apiClient } from '../lib/api';

export async function listOrders() {
  return apiClient.listOrders();
}

export async function getOrder(orderId: string) {
  return apiClient.getOrder(orderId);
}

export async function updateOrderStatus(orderId: string, status: string) {
  return apiClient['client']?.patch(`/orders/${orderId}`, { status }).then((r: any) => r.data);
}
