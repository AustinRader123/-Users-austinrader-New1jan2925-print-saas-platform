import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function StoreProductsPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const storeSlug = localStorage.getItem('publicStoreSlug') || 'default';
  const collection = searchParams.get('collection') || undefined;

  React.useEffect(() => {
    setLoading(true);
    apiClient.publicListProducts(storeSlug, collection)
      .then((rows) => setProducts(rows || []))
      .finally(() => setLoading(false));
  }, [storeSlug, collection]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link className="btn btn-secondary" to="/store/cart">Cart</Link>
      </div>
      {loading ? <div>Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {products.map((product) => (
            <Link key={product.id} to={`/store/products/${product.slug || product.id}`} className="rounded border bg-white p-3">
              {product.images?.[0]?.url && <img src={product.images[0].url} className="h-36 w-full object-cover rounded mb-2" />}
              <div className="font-medium">{product.name}</div>
              <div className="text-xs text-slate-600">{(product.variants || []).length} variants</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
