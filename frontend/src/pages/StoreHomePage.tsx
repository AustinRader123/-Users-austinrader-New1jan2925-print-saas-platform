import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function StoreHomePage() {
  const [searchParams] = useSearchParams();
  const [storefront, setStorefront] = React.useState<any>(null);
  const storeSlug = searchParams.get('store') || localStorage.getItem('publicStoreSlug') || 'default';

  React.useEffect(() => {
    localStorage.setItem('publicStoreSlug', storeSlug);
    apiClient.publicGetStorefront(storeSlug).then(setStorefront).catch(() => setStorefront(null));
  }, [storeSlug]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-2">{storefront?.store?.name || 'Storefront'}</h1>
      <p className="text-sm text-slate-600 mb-4">Shop products, customize, and checkout online.</p>
      <div className="flex gap-2 mb-4">
        <Link className="btn btn-primary" to="/store/products">Browse Products</Link>
        <Link className="btn btn-secondary" to="/store/cart">Cart</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(storefront?.storefront?.collections || []).map((collection: any) => (
          <div key={collection.id} className="rounded border bg-white p-3">
            <div className="font-medium">{collection.name}</div>
            <div className="text-xs text-slate-600">{(collection.products || []).length} products</div>
            <Link className="text-blue-600 text-sm underline" to={`/store/products?collection=${encodeURIComponent(collection.slug)}`}>View</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
