import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function DashboardProductDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const initialStore = useMemo(() => new URLSearchParams(location.search).get('storeId') || 'default', [location.search]);

  const [storeId, setStoreId] = useState(initialStore);
  const [variants, setVariants] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [sku, setSku] = useState('');
  const [variantName, setVariantName] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [v, i] = await Promise.all([
        apiClient.listVariants(id, storeId),
        apiClient.listProductImages(id, storeId),
      ]);
      setVariants(v || []);
      setImages(i || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, storeId]);

  const addVariant = async () => {
    if (!sku.trim()) return;
    await apiClient.createVariant(id, {
      storeId,
      name: variantName || `${color || ''} ${size || ''}`.trim() || sku,
      sku,
      size: size || undefined,
      color: color || undefined,
    });
    setSku('');
    setVariantName('');
    setSize('');
    setColor('');
    await load();
  };

  const deleteVariant = async (variantId: string) => {
    await apiClient.deleteVariant(id, variantId, storeId);
    await load();
  };

  const addImage = async () => {
    if (!imageUrl.trim()) return;
    await apiClient.createProductImage(id, { storeId, url: imageUrl.trim() });
    setImageUrl('');
    await load();
  };

  const deleteImage = async (imageId: string) => {
    await apiClient.deleteProductImage(id, imageId, storeId);
    await load();
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;

    const current = images[index];
    const target = images[nextIndex];

    await Promise.all([
      apiClient.updateProductImage(id, current.id, { storeId, sortOrder: target.sortOrder ?? target.position ?? nextIndex + 1 }),
      apiClient.updateProductImage(id, target.id, { storeId, sortOrder: current.sortOrder ?? current.position ?? index + 1 }),
    ]);

    await load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Product Detail</h1>
      <div className="mb-4">
        <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="storeId" />
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border rounded p-4 bg-white">
            <h2 className="font-medium mb-3">Variant Matrix</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input className="input-base" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="Variant name" />
              <input className="input-base" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" />
              <input className="input-base" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Size" />
              <input className="input-base" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" />
            </div>
            <button className="btn btn-primary mb-3" onClick={addVariant}>Add Variant</button>
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.id} className="border rounded px-2 py-2 flex items-center justify-between text-sm">
                  <div>{v.name} • {v.sku} • {v.color || '-'} / {v.size || '-'}</div>
                  <button className="btn btn-secondary" onClick={() => deleteVariant(v.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded p-4 bg-white">
            <h2 className="font-medium mb-3">Image Manager</h2>
            <div className="flex gap-2 mb-3">
              <input className="input-base flex-1" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              <button className="btn btn-primary" onClick={addImage}>Add</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div key={img.id} className="border rounded p-2">
                  <img src={img.url} alt={img.altText || 'product'} className="w-full h-28 object-cover rounded" />
                  <div className="mt-2 flex gap-2">
                    <button className="btn btn-secondary w-full" onClick={() => moveImage(idx, -1)}>Up</button>
                    <button className="btn btn-secondary w-full" onClick={() => moveImage(idx, 1)}>Down</button>
                  </div>
                  <button className="btn btn-secondary mt-2 w-full" onClick={() => deleteImage(img.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
