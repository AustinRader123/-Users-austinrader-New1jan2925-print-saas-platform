import React, { useState } from 'react';
import { apiClient } from '../lib/api';

export default function AdminVendorImportPage() {
  const [vendorId, setVendorId] = useState('');
  const [storeId, setStoreId] = useState('cml43c2kt000110xp4pq3a76b'); // default store from seed
  const [csv, setCsv] = useState('productExternalId,productName,variantExternalId,variantSku,variantColor,variantSize,variantPrice,variantInventory,imageUrl\nSKU-001,Classic Tee,SKU-001-BLK-L,TSHIRT-BLACK-L,Black,L,12.99,100,https://via.placeholder.com/300x300');
  const [mapping, setMapping] = useState({
    productExternalId: 'productExternalId',
    productName: 'productName',
    productDescription: 'productDescription',
    brand: 'brand',
    category: 'category',
    imageUrl: 'imageUrl',
    variantExternalId: 'variantExternalId',
    variantSku: 'variantSku',
    variantSize: 'variantSize',
    variantColor: 'variantColor',
    variantPrice: 'variantPrice',
    variantInventory: 'variantInventory',
  });
  const [result, setResult] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runImport = async () => {
    try {
      setLoading(true);
      setError(null);
      const out = await apiClient.adminImportVendorCsv(vendorId, { storeId, csv, mapping });
      setResult(out);
      const products = await apiClient.adminListVendorCatalog(vendorId);
      setCatalog(products);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Vendor CSV Import</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Vendor ID</label>
          <input className="input-base w-full" value={vendorId} onChange={(e) => setVendorId(e.target.value)} placeholder="Enter vendorId" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Store ID</label>
          <input className="input-base w-full" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">CSV Mapping (keys)</label>
          <textarea className="input-base w-full h-32" value={JSON.stringify(mapping, null, 2)} onChange={(e) => {
            try { setMapping(JSON.parse(e.target.value)); } catch {}
          }} />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">CSV Content</label>
        <textarea className="input-base w-full h-40" value={csv} onChange={(e) => setCsv(e.target.value)} />
      </div>

      <div className="mt-4">
        <button className="btn btn-primary" onClick={runImport} disabled={loading}>Run Import</button>
        {loading && <span className="ml-3">Importing…</span>}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>

      {result && (
        <div className="mt-6 border rounded p-4">
          <div className="font-medium">Import Result</div>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="mt-6">
        <div className="font-medium mb-2">Imported Vendor Catalog</div>
        <div className="space-y-2">
          {catalog.map((p) => (
            <div key={p.id} className="border rounded p-3">
              <div className="flex items-center gap-3">
                {p.imageUrl && <img src={p.imageUrl} className="w-16 h-16 object-cover rounded" />}
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-600">{p.brand} • {p.category}</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {p.variants?.map((v: any) => (
                  <div key={v.id} className="border rounded p-2 text-xs">
                    <div>SKU: {v.sku || v.externalId}</div>
                    <div>Color: {v.color || '-'}</div>
                    <div>Size: {v.size || '-'}</div>
                    <div>Price: ${v.price?.toFixed(2)}</div>
                    <div>Inventory: {v.inventory}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
