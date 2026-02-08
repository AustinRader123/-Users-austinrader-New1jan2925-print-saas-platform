import { apiClient } from '../lib/api';

// Placeholder customer service; replace with real endpoints when available
export async function listCustomers(params: { skip?: number; take?: number } = {}) {
  // Assuming GET /api/customers supported in backend
  return apiClient['client']?.get('/customers', { params }).then((r: any) => r.data);
}

export async function getCustomer(customerId: string) {
  return apiClient['client']?.get(`/customers/${customerId}`).then((r: any) => r.data);
}
