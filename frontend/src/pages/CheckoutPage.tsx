import React, { useState } from 'react';
import { apiClient } from '../lib/api';
import { useCartStore } from '../stores/cartStore';

export default function CheckoutPage() {
  const { cart, cartId } = useCartStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  } as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const total = cart?.total ?? 0;

  const onCheckout = async () => {
    if (!cartId) return;
    setLoading(true);
    setError(null);
    try {
      // Start checkout
      const { intentId, provider } = await apiClient.checkout('default', cartId, {
        name,
        email,
        address,
      });

      // For mock provider, confirm immediately
      const resp = await fetch('/api/payments/mock/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId }),
      });
      const data = await resp.json();
      if (data?.orderId) setOrderId(data.orderId);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {orderId ? (
        <div className="p-4 border rounded bg-green-50">
          <div className="font-medium">Payment confirmed!</div>
          <div>Your order has been created.</div>
          <div className="mt-2 text-sm">Order ID: {orderId}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Address Line 1</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium">Address Line 2</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium">City</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium">State</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium">Postal Code</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium">Country</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-lg">Total: ${total.toFixed(2)}</div>
            <button className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" onClick={onCheckout} disabled={loading || !cartId}>
              {loading ? 'Processing…' : 'Pay & Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
