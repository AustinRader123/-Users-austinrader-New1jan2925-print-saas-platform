import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import CSVUpload from '../components/CSVUpload';

type Tab = 'catalog' | 'import' | 'settings';

export default function AdminVendorDetailPage() {
  const { vendorId = '' } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [storeId, setStoreId] = useState('cml43c2kt000110xp4pq3a76b');
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const list = await apiClient.adminListVendorCatalog(vendorId);
      setProducts(list);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const js = await apiClient.adminListVendorImportJobs(vendorId, 20);
      setJobs(js);
    } catch (e) {}
  };

  useEffect(() => { loadCatalog(); loadJobs(); }, [vendorId]);

  const filtered = useMemo(() => {
    if (!query) return products;
    const q = query.toLowerCase();
    return products.filter((p) =>
      String(p.name || '').toLowerCase().includes(q) ||
      (p.variants || []).some((v: any) => String(v.sku || '').toLowerCase().includes(q) || String(v.name || '').toLowerCase().includes(q))
    );
  }, [products, query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Vendor: {vendorId}</h1>

      <div className="flex items-center gap-2 mb-4">
        <button className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('catalog')}>Catalog</button>
        <button className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('import')}>Import</button>
        <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('settings')}>Settings</button>
        <div className="ml-auto">
          <label className="text-sm mr-2">Store</label>
          <input className="input-base w-64" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div>
          <div className="mb-3">
            <input className="input-base w-80" placeholder="Search by name or SKU" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="card p-3">
                <div className="flex items-center gap-3">
                  {p.imageUrl && <img src={p.imageUrl} className="w-16 h-16 object-cover rounded" />}
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-600">{p.brand} • {p.category}</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(p.variants || []).map((v: any) => (
                    <div key={v.id} className="border rounded p-2 text-xs">
                      <div>SKU: {v.sku || v.externalId}</div>
                      <div>Color: {v.color || '-'}</div>
                      <div>Size: {v.size || '-'}</div>
                      <div>Price: ${typeof v.price === 'number' ? v.price.toFixed(2) : v.price}</div>
                      <div>Inventory: {v.inventory}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="font-medium mb-2">Upload CSV</div>
            <CSVUpload vendorId={vendorId} storeId={storeId} onComplete={() => { loadCatalog(); loadJobs(); }} />
          </div>
          <div>
            <div className="font-medium mb-2">Recent Import Jobs</div>
            <div className="space-y-2 text-sm">
              {jobs.map((j) => (
                <div key={j.id} className="border rounded p-2">
                  <div className="font-medium">{j.status}</div>
                  <div>Started: {j.startedAt ? new Date(j.startedAt).toLocaleString() : '-'}</div>
                  <div>Ended: {j.endedAt ? new Date(j.endedAt).toLocaleString() : '-'}</div>
                  {j.error && <div className="text-red-600">Error: {j.error}</div>}
                </div>
              ))}
              {jobs.length === 0 && <div className="text-slate-500">No jobs</div>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="text-sm text-slate-600">No vendor settings yet.</div>
      )}
    </div>
  );
}