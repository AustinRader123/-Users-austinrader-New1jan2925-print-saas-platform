import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api';
import PricingBreakdownCard from '../components/PricingBreakdownCard';

export default function AdminPricingSimulatorPage() {
  const [storeId, setStoreId] = useState('cml43c2kt000110xp4pq3a76b');
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<'SCREEN_PRINT' | 'EMBROIDERY'>('SCREEN_PRINT');
  const [locations, setLocations] = useState(1);
  const [colors, setColors] = useState(1);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const list = await apiClient.listProducts(storeId);
      setProducts(list);
      if (list?.[0]?.variants?.[0]) setSelectedVariantId(list[0].variants[0].id);
    })();
  }, [storeId]);

  const filtered = useMemo(() => {
    if (!query) return products;
    const q = query.toLowerCase();
    return products.filter((p) =>
      String(p.name || '').toLowerCase().includes(q) || (p.variants || []).some((v: any) => String(v.sku || '').toLowerCase().includes(q))
    );
  }, [products, query]);

  const run = async () => {
    if (!selectedVariantId || !quantity) return;
    const out = await apiClient.adminPricingPreview({
      storeId,
      productVariantId: selectedVariantId,
      quantity,
      decoration: { method, locations, colors },
    });
    setResult(out);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Pricing Simulator</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-sm">Store</label>
          <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Search Variant (SKU/Name)</label>
          <input className="input-base" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Quantity</label>
          <input className="input-base" type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="font-medium mb-2">Select Variant</div>
          <select className="input-base w-full" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
            {filtered.flatMap((p) => (p.variants || []).map((v: any) => (
              <option key={v.id} value={v.id}>{p.name} — {v.sku} ({v.color || '-'} {v.size || ''})</option>
            )))}
          </select>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-sm">Method</label>
              <select className="input-base w-full" value={method} onChange={(e) => setMethod(e.target.value as any)}>
                <option value="SCREEN_PRINT">SCREEN_PRINT</option>
                <option value="EMBROIDERY">EMBROIDERY</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Locations</label>
              <input className="input-base w-full" type="number" min={1} value={locations} onChange={(e) => setLocations(parseInt(e.target.value))} />
            </div>
            <div>
              <label className="text-sm">Colors</label>
              <input className="input-base w-full" type="number" min={1} value={colors} onChange={(e) => setColors(parseInt(e.target.value))} />
            </div>
          </div>
          <button className="btn btn-secondary mt-4" onClick={run}>Run Preview</button>
        </div>
        <PricingBreakdownCard result={result} />
      </div>
    </div>
  );
}