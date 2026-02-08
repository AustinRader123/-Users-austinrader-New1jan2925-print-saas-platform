import React, { useEffect, useState } from 'react';
import * as Orders from '../services/orders';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await Orders.listOrders();
        setOrders(data || []);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">My Orders</h1>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && orders.length === 0 && <div>No orders yet.</div>}
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="border rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{o.orderNumber}</div>
                <div className="text-sm text-gray-600">Status: {o.status} • Payment: {o.paymentStatus}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${(o.totalAmount || 0).toFixed(2)}</div>
                <div className="text-xs text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              {o.items?.map((it: any) => (
                <div key={it.id} className="border rounded p-2 flex items-center gap-3">
                  {it.mockupUrl && <img src={it.mockupUrl} className="w-16 h-16 object-cover rounded" />}
                  <div>
                    <div className="text-sm">{it.product?.name || it.productId}</div>
                    <div className="text-xs text-gray-600">Qty {it.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
