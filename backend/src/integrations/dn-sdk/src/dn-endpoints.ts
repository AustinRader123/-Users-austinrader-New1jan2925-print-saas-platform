export const defaultDnEndpoints = {
  orders: '/orders/search',
  orderById: (id: any) => `/orders/${id}`,
  products: '/products/search',
  productById: (id: any) => `/products/${id}`,
  inventory: '/inventory/search',
  inventoryById: (id: any) => `/inventory/${id}`,
  inventoryEvents: '/inventory/events',
  purchaseOrders: '/purchaseorders/search',
  purchaseOrderById: (id: any) => `/purchaseorders/${id}`,
  externalCartCreate: '/externalcart/create',
};
