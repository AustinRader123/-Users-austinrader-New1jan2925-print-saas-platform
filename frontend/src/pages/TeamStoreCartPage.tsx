import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function TeamStoreCartPage() {
  const { slug = '' } = useParams();
  const token = localStorage.getItem(`teamCartToken:${slug}`) || '';
  const [cart, setCart] = React.useState<any>(null);

  React.useEffect(() => {
    if (!token) return;
    apiClient.publicGetCart(token).then(setCart);
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-3">Team Cart</h1>
      {(cart?.items || []).map((item: any) => (
        <div key={item.id} className="rounded border bg-white p-2 mb-2">
          {item.product?.name} / {item.productVariant?.name} × {item.quantity}
        </div>
      ))}
      <Link className="btn btn-primary" to={`/team/${slug}/checkout`}>Team Checkout</Link>
    </div>
  );
}
