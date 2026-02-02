import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { apiClient } from '../lib/api';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartId } = useCartStore();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cartId) {
      apiClient.getCart(cartId)
        .then(setCart)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [cartId]);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!cart?.items?.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Cart Empty</h1>
        <button onClick={() => navigate('/products')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart ({cart.items.length} items)</h1>
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          {cart.items.map((item: any) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6 grid grid-cols-4 gap-4">
              <div className="h-24 bg-gray-100 rounded flex items-center justify-center">
                {item.mockupUrl && <img src={item.mockupUrl} alt="Mockup" className="max-h-full" />}
              </div>
              <div className="col-span-2">
                <h3 className="font-semibold text-lg">{item.product?.name}</h3>
                {item.productVariant && (
                  <p className="text-sm text-gray-600">Size: {item.productVariant.size} | Color: {item.productVariant.color}</p>
                )}
                {item.design && <p className="text-sm text-blue-600">Design: {item.design.name}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${item.pricingSnapshot?.totalPrice?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="text-2xl font-bold mb-6">${cart.total?.toFixed(2) || '0.00'}</div>
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-2">
            Checkout
          </button>
          <button onClick={() => navigate('/products')} className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
