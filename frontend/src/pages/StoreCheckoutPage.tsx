import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function StoreCheckoutPage() {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async () => {
    const cartToken = localStorage.getItem('publicCartToken') || '';
    if (!cartToken) {
      setError('Cart is missing');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const out = await apiClient.publicCheckout(cartToken, {
        customerName,
        customerEmail,
        shippingAddress: { line1: address },
        paymentProvider: 'NONE',
      });
      localStorage.removeItem('publicCartToken');
      navigate(`/store/order/${out.orderToken}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      {error && <div className="mb-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-sm text-rose-700">{error}</div>}
      <div className="space-y-2">
        <input className="input-base w-full" placeholder="Full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <input className="input-base w-full" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        <input className="input-base w-full" placeholder="Shipping address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="btn btn-primary" disabled={loading} onClick={submit}>{loading ? 'Placing order...' : 'Place Order'}</button>
      </div>
    </div>
  );
}
