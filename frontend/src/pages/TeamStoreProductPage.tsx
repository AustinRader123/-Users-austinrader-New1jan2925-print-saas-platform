import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function TeamStoreProductPage() {
  const { slug = '', id = '' } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = React.useState<any>(null);
  const [qty, setQty] = React.useState(1);
  const [variantId, setVariantId] = React.useState('');

  React.useEffect(() => {
    apiClient.publicGetProduct('default', id).then((data) => {
      setProduct(data);
      setVariantId(data?.variants?.[0]?.id || '');
    });
  }, [id]);

  const add = async () => {
    let token = localStorage.getItem(`teamCartToken:${slug}`);
    if (!token) {
      const cart = await apiClient.publicCreateCart('default');
      token = cart.token;
      localStorage.setItem(`teamCartToken:${slug}`, token);
    }
    await apiClient.publicAddCartItem(token, { productId: product.id, variantId, quantity: qty });
    navigate(`/team/${slug}/cart`);
  };

  if (!product) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-3">{product.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <select className="input-base" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          {(product.variants || []).map((variant: any) => (
            <option key={variant.id} value={variant.id}>{variant.name}</option>
          ))}
        </select>
        <input className="input-base" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value || 1))} />
        <button className="btn btn-primary" onClick={add}>Add to Team Cart</button>
      </div>
    </div>
  );
}
