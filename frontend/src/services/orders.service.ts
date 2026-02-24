import { apiClient } from '../lib/api';
const USE_MOCKS = (import.meta as any).env?.VITE_USE_MOCKS === 'true';

export async function listOrders() {
  if (USE_MOCKS) {
    return [
      { id: 'o_1', orderNumber: '1001', status: 'PAID', paymentStatus: 'PAID', customer: { name: 'Alice' }, storeId: 'default', totalAmount: 120.5, createdAt: new Date().toISOString() },
      { id: 'o_2', orderNumber: '1002', status: 'IN_PRODUCTION', paymentStatus: 'PAID', customer: { name: 'Bob' }, storeId: 'default', totalAmount: 78.2, createdAt: new Date().toISOString() },
    ];
  }
  return apiClient.listOrders();
}

export async function getOrder(orderId: string) {
  if (USE_MOCKS) {
    return {
      id: orderId,
      orderNumber: orderId,
      status: 'PAID',
      customer: { name: 'Alice' },
      createdAt: new Date().toISOString(),
      items: [
        { id: 'i1', productId: 'p1', quantity: 12, variantId: 'v1', mockupUrl: '' },
      ],
      activity: [{ message: 'Order created' }, { message: 'Payment captured' }],
    };
  }
  return apiClient.getOrder(orderId);
}

export async function updateOrderStatus(orderId: string, status: string) {
  return apiClient['client']?.patch(`/orders/${orderId}`, { status }).then((r: any) => r.data);
}
