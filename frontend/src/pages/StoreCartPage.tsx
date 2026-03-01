import React from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function StoreCartPage() {
  const token = localStorage.getItem('publicCartToken') || '';
  const [cart, setCart] = React.useState<any>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    const data = await apiClient.publicGetCart(token);
    setCart(data);
  }, [token]);

  React.useEffect(() => { load(); }, [load]);

  if (!token) {
    return <div className="max-w-4xl mx-auto px-4 py-8">Cart is empty.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>
      <div className="space-y-2 mb-3">
        {(cart?.items || []).map((item: any) => (
          <div key={item.id} className="rounded border bg-white p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{item.product?.name}</div>
              <div className="text-xs text-slate-600">{item.productVariant?.name} • Qty {item.quantity}</div>
            </div>
            <button className="btn btn-secondary" onClick={async () => { await apiClient.publicRemoveCartItem(token, item.id); await load(); }}>Remove</button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="font-medium">Total: ${Number(cart?.total || 0).toFixed(2)}</div>
        <Link className="btn btn-primary" to="/store/checkout">Checkout</Link>
      </div>
    </div>
  );
}
