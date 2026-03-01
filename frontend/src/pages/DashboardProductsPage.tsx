import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  basePrice: number;
  status: string;
};

export default function DashboardProductsPage() {
  const [storeId, setStoreId] = useState('default');
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState('19.99');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listProducts(storeId, 0, 100);
      setItems(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const createProduct = async () => {
    if (!name.trim()) return;
    await apiClient.createProduct({
      storeId,
      name: name.trim(),
      category: category.trim() || undefined,
      basePrice: Number(basePrice || 0),
    });
    setName('');
    setCategory('');
    await load();
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await apiClient.updateProduct(editingId, { storeId, name: editingName.trim() });
    setEditingId(null);
    setEditingName('');
    await load();
  };

  const remove = async (productId: string) => {
    await apiClient.deleteProduct(productId, storeId);
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Products</h1>

      <div className="border rounded p-4 mb-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="storeId" />
          <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
          <input className="input-base" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
          <input className="input-base" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="Base price" />
          <button className="btn btn-primary" onClick={createProduct}>Create</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <div className="border rounded overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Slug</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">
                    {editingId === p.id ? (
                      <input className="input-base" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                    ) : p.name}
                  </td>
                  <td className="p-2">{p.slug}</td>
                  <td className="p-2">{p.category || '-'}</td>
                  <td className="p-2">${Number(p.basePrice || 0).toFixed(2)}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2 flex gap-2">
                    <Link className="btn btn-secondary" to={`/dashboard/products/${p.id}?storeId=${encodeURIComponent(storeId)}`}>Open</Link>
                    <Link className="btn btn-secondary" to={`/dashboard/catalog/product-builder/${p.id}?storeId=${encodeURIComponent(storeId)}`}>Builder</Link>
                    {editingId === p.id ? (
                      <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => { setEditingId(p.id); setEditingName(p.name); }}>Edit</button>
                    )}
                    <button className="btn btn-secondary" onClick={() => remove(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
