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
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [jobErrors, setJobErrors] = useState<any[]>([]);
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

  const loadJobDetail = async (jobId: string) => {
    try {
      const j = await apiClient.adminGetImportJob(jobId);
      setSelectedJob(j);
    } catch {}
  };

  const loadJobErrors = async (jobId: string) => {
    try {
      const errs = await apiClient.adminListImportJobErrors(jobId, undefined, 20);
      setJobErrors(errs);
    } catch {}
  };

  useEffect(() => { loadCatalog(); loadJobs(); }, [vendorId]);

  useEffect(() => {
    const running = jobs.find((j) => j.status === 'RUNNING');
    const jobId = running?.id || jobs[0]?.id;
    if (jobId) {
      loadJobDetail(jobId);
      loadJobErrors(jobId);
    }
  }, [jobs]);

  useEffect(() => {
    if (!selectedJob) return;
    if (selectedJob.status === 'RUNNING') {
      const t = setInterval(async () => {
        const j = await apiClient.adminGetImportJob(selectedJob.id);
        setSelectedJob(j);
      }, 1500);
      return () => clearInterval(t);
    }
  }, [selectedJob?.id, selectedJob?.status]);

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
                  <div className="font-medium">{j.status} • {j.id}</div>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedJob(null); setJobErrors([]); loadJobDetail(j.id); loadJobErrors(j.id); }}>View</button>
                  </div>
                  <div>Created: {new Date(j.createdAt).toLocaleString()}</div>
                  {j.startedAt && <div>Started: {new Date(j.startedAt).toLocaleString()}</div>}
                  {j.finishedAt && <div>Finished: {new Date(j.finishedAt).toLocaleString()}</div>}
                  {j.error && <div className="text-red-600">Error: {j.error}</div>}
                </div>
              ))}
              {jobs.length === 0 && <div className="text-slate-500">No jobs</div>}
            </div>
            {selectedJob && (
              <div className="mt-4 border rounded p-3">
                <div className="font-medium mb-2">Job Detail</div>
                <div>Status: {selectedJob.status} ({selectedJob.percent || 0}%)</div>
                <div>Progress: {selectedJob.processedRows}/{selectedJob.totalRows}</div>
                <div>Created: {selectedJob.createdCount} • Updated: {selectedJob.updatedCount} • Failed: {selectedJob.failedRows}</div>
                <div className="mt-2">
                  <a className="btn btn-secondary btn-sm" href={`/api/import-jobs/${selectedJob.id}/errors.csv`} target="_blank">Download errors CSV</a>
                  {selectedJob.failedRows > 0 && (
                    <button className="btn btn-primary btn-sm ml-2" onClick={async () => {
                      const { newJobId } = await apiClient.adminRetryImportJob(selectedJob.id);
                      await loadJobs();
                      await loadJobDetail(newJobId);
                      await loadJobErrors(newJobId);
                    }}>Retry failed rows</button>
                  )}
                </div>
                <div className="mt-3">
                  <div className="font-medium">Errors (first 20)</div>
                  <div className="text-xs max-h-64 overflow-auto">
                    {jobErrors.map((e) => (
                      <div key={e.id} className="border-b py-1">
                        <div>Row {e.rowNumber}: {e.message}</div>
                      </div>
                    ))}
                    {jobErrors.length === 0 && <div className="text-slate-500">No errors</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="text-sm text-slate-600">No vendor settings yet.</div>
      )}
    </div>
  );
}