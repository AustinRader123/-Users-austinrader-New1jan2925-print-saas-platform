import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Tabs from '../components/Tabs';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import { getProduct } from '../services/products.service';

export default function ProductEditorPage() {
  const { productId } = useParams();
  const [tab, setTab] = useState('general');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (productId) {
          const data = await getProduct(productId);
          setProduct(data);
        } else {
          setProduct({ name: '', description: '', categories: [], variants: [], basePrice: 0 });
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  if (loading) return <div className="p-4"><Skeleton rows={8} /></div>;
  if (error) return <div className="p-4"><ErrorState message={error} /></div>;

  return (
    <div className="p-4">
      <div className="text-sm font-semibold mb-2">{productId ? 'Edit Product' : 'New Product'}</div>
      <Tabs
        tabs={[
          { value: 'general', label: 'General' },
          { value: 'variants', label: 'Variants' },
          { value: 'pricing', label: 'Pricing' },
          { value: 'mockups', label: 'Mockups' },
          { value: 'inventory', label: 'Inventory' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded border border-slate-200 bg-white p-3">
          {tab === 'general' && (
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs">Name</label>
                <input className="w-full rounded-sm border px-2 py-1" defaultValue={product?.name} />
              </div>
              <div>
                <label className="block text-xs">Description</label>
                <textarea className="w-full rounded-sm border px-2 py-1 h-24" defaultValue={product?.description} />
              </div>
              <div>
                <label className="block text-xs">Categories</label>
                <input className="w-full rounded-sm border px-2 py-1" defaultValue={(product?.categories || []).join(', ')} />
              </div>
            </div>
          )}
          {tab === 'variants' && (
            <div className="text-sm">
              <div className="text-xs font-medium mb-2">Variants</div>
              <div className="space-y-2">
                {(product?.variants || []).map((v: any, i: number) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input className="rounded-sm border px-2 py-1" defaultValue={v.size || ''} placeholder="Size" />
                    <input className="rounded-sm border px-2 py-1" defaultValue={v.color || ''} placeholder="Color" />
                  </div>
                ))}
                <button className="rounded-sm border px-2 py-1 text-xs">Add Variant</button>
              </div>
            </div>
          )}
          {tab === 'pricing' && (
            <div className="text-sm">
              <div className="text-xs font-medium mb-2">Pricing</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs">Base Price</label>
                  <input type="number" className="w-full rounded-sm border px-2 py-1" defaultValue={product?.basePrice || 0} />
                </div>
                <div>
                  <label className="block text-xs">Markup %</label>
                  <input type="number" className="w-full rounded-sm border px-2 py-1" defaultValue={product?.markup || 0} />
                </div>
                <div>
                  <label className="block text-xs">Tier Breaks</label>
                  <input className="w-full rounded-sm border px-2 py-1" placeholder="e.g. 12=9.99,24=8.99" />
                </div>
              </div>
            </div>
          )}
          {tab === 'mockups' && (
            <div className="text-sm">
              <div className="text-xs font-medium mb-2">Mockups</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(product?.images || []).map((img: string, i: number) => (
                  <img key={i} src={img} className="w-full h-24 object-cover" />
                ))}
                <button className="rounded-sm border px-2 py-1 text-xs">Upload</button>
              </div>
            </div>
          )}
          {tab === 'inventory' && (
            <div className="text-sm">
              <div className="text-xs font-medium mb-2">Inventory</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs">On Hand</label>
                  <input type="number" className="w-full rounded-sm border px-2 py-1" defaultValue={product?.inventory?.onHand || 0} />
                </div>
                <div>
                  <label className="block text-xs">Reserved</label>
                  <input type="number" className="w-full rounded-sm border px-2 py-1" defaultValue={product?.inventory?.reserved || 0} />
                </div>
                <div>
                  <label className="block text-xs">Low Stock Threshold</label>
                  <input type="number" className="w-full rounded-sm border px-2 py-1" defaultValue={product?.inventory?.lowStockThreshold || 0} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="rounded border border-slate-200 bg-white p-3 text-sm">
            <div className="text-xs font-medium mb-2">Actions</div>
            <div className="flex items-center gap-2">
              <button className="rounded-sm border px-2 py-1 text-xs">Save</button>
              <button className="rounded-sm border px-2 py-1 text-xs">Publish</button>
              <button className="rounded-sm border px-2 py-1 text-xs">Archive</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
