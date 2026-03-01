import React from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function StoreOrderStatusPage() {
  const { token = '' } = useParams();
  const [order, setOrder] = React.useState<any>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    apiClient.publicGetOrder(token).then(setOrder).catch((err) => setError(err?.response?.data?.error || 'Order not found'));
  }, [token]);

  if (error) return <div className="max-w-4xl mx-auto px-4 py-8">{error}</div>;
  if (!order) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-3">Order {order.orderNumber}</h1>
      <div className="text-sm mb-1">Status: <span className="font-medium">{order.status}</span></div>
      <div className="text-sm mb-3">Fulfillment: <span className="font-medium">{order.fulfillmentStatus}</span></div>
      <div className="rounded border bg-white p-3 space-y-2">
        {(order.items || []).map((item: any) => (
          <div key={item.id} className="text-sm">
            {item.product?.name} / {item.productVariant?.name} × {item.quantity}
          </div>
        ))}
      </div>
    </div>
  );
}
