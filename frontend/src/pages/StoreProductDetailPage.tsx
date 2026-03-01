import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function StoreProductDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const storeSlug = localStorage.getItem('publicStoreSlug') || 'default';
  const [product, setProduct] = React.useState<any>(null);
  const [variantId, setVariantId] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    apiClient.publicGetProduct(storeSlug, id).then((data) => {
      setProduct(data);
      setVariantId(data?.variants?.[0]?.id || '');
    });
  }, [storeSlug, id]);

  const ensureCart = async () => {
    let token = localStorage.getItem('publicCartToken');
    if (!token) {
      const cart = await apiClient.publicCreateCart(storeSlug);
      token = cart.token;
      localStorage.setItem('publicCartToken', token);
    }
    return token;
  };

  const addToCart = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const token = await ensureCart();
      await apiClient.publicAddCartItem(token, { productId: product.id, variantId, quantity });
      navigate('/store/cart');
    } finally {
      setLoading(false);
    }
  };

  const openCustomizer = () => {
    navigate(`/store/products/${id}/customize`);
  };

  if (!product) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-3">{product.name}</h1>
      {product.images?.[0]?.url && <img src={product.images[0].url} className="h-72 w-full object-cover rounded mb-3" />}
      <p className="text-sm text-slate-700 mb-3">{product.description || 'No description'}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <select className="input-base" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          {(product.variants || []).map((variant: any) => (
            <option key={variant.id} value={variant.id}>{variant.name} ({variant.sku})</option>
          ))}
        </select>
        <input className="input-base" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} />
        <button className="btn btn-primary" disabled={loading} onClick={addToCart}>{loading ? 'Adding...' : 'Add to Cart'}</button>
        <button className="btn btn-secondary" onClick={openCustomizer}>Customize</button>
      </div>
    </div>
  );
}
