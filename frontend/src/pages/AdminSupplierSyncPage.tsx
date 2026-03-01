import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import Breadcrumbs from '../components/Breadcrumbs';

const SUPPLIER_OPTIONS = ['MOCK', 'SANMAR', 'SSACTIVEWEAR', 'ALPHABRODER'] as const;

type SupplierConnection = {
  id: string;
  name: string;
  supplier: string;
  authType: string;
  baseUrl?: string | null;
  enabled: boolean;
  syncEnabled?: boolean;
  syncIntervalMinutes?: number;
  lastSyncAt?: string | null;
};

type SupplierRun = {
  id: string;
  status: string;
  createdAt: string;
  finishedAt?: string | null;
  counts?: Record<string, number> | null;
  errorSummary?: string | null;
  supplierConnection?: { name: string; supplier: string };
};

export default function AdminSupplierSyncPage() {
  const [storeId, setStoreId] = useState('');
  const [connections, setConnections] = useState<SupplierConnection[]>([]);
  const [runs, setRuns] = useState<SupplierRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    supplier: 'MOCK',
    name: 'Mock Supplier Feed',
    authType: 'MOCK',
    baseUrl: '',
    syncEnabled: true,
    syncIntervalMinutes: 60,
    credentials: '{\n  "mode": "mock"\n}',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextConnections, nextRuns] = await Promise.all([
        apiClient.adminListSupplierConnections(storeId || undefined),
        apiClient.adminListSupplierRuns(storeId || undefined),
      ]);
      setConnections(nextConnections || []);
      setRuns(nextRuns || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load supplier sync data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createConnection = async () => {
    try {
      setError(null);
      await apiClient.adminCreateSupplierConnection({
        storeId: storeId || undefined,
        supplier: draft.supplier,
        name: draft.name,
        authType: draft.authType,
        baseUrl: draft.baseUrl || undefined,
        syncEnabled: draft.syncEnabled,
        syncIntervalMinutes: Number(draft.syncIntervalMinutes || 60),
        credentials: JSON.parse(draft.credentials || '{}'),
      });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to create supplier connection');
    }
  };

  const runTest = async (connectionId: string) => {
    try {
      setError(null);
      const result = await apiClient.adminTestSupplierConnection(connectionId, storeId || undefined);
      alert(
        [
          `ok=${result?.ok ? 'true' : 'false'}`,
          `latencyMs=${result?.latencyMs ?? 'n/a'}`,
          `authStatus=${result?.authStatus ?? 'n/a'}`,
          result?.error ? `error=${result.error}` : '',
          Array.isArray(result?.warnings) && result.warnings.length > 0 ? `warnings=${result.warnings.join('; ')}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      );
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to test supplier connection');
    }
  };

  const runSync = async (connectionId: string) => {
    try {
      setError(null);
      await apiClient.adminRunSupplierSync(connectionId, {
        storeId: storeId || undefined,
        queue: false,
        includeImages: true,
      });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to run supplier sync');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Breadcrumbs items={[{ to: '/app', label: 'Dashboard' }, { label: 'Supplier Sync' }]} />
        <h1 className="text-2xl font-semibold">Supplier Sync</h1>
        <p className="text-sm text-gray-600">Connect suppliers, test credentials, and run catalog sync.</p>
      </div>

      <div className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">Store Scope</h2>
        <input
          className="input-base w-full"
          placeholder="Optional storeId (leave blank to use token/fallback)"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        />
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">Add Supplier Connection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className="input-base" value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}>
            {SUPPLIER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <input className="input-base" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Connection name" />
          <input className="input-base" value={draft.authType} onChange={(e) => setDraft({ ...draft, authType: e.target.value })} placeholder="Auth type" />
          <input className="input-base" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="Base URL (optional)" />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={draft.syncEnabled} onChange={(e) => setDraft({ ...draft, syncEnabled: e.target.checked })} />
            Enable scheduled sync
          </label>
          <input
            className="input-base"
            type="number"
            min={1}
            value={draft.syncIntervalMinutes}
            onChange={(e) => setDraft({ ...draft, syncIntervalMinutes: Number(e.target.value || 60) })}
            placeholder="Sync interval minutes"
          />
        </div>
        <textarea className="input-base w-full h-24" value={draft.credentials} onChange={(e) => setDraft({ ...draft, credentials: e.target.value })} />
        <button className="btn btn-primary" onClick={createConnection}>
          Create Connection
        </button>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Connections</h2>
        <div className="space-y-3">
          {connections.map((conn) => (
            <div key={conn.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-medium">{conn.name}</div>
                <div className="text-xs text-gray-600">{conn.supplier} • {conn.authType} • {conn.enabled ? 'Enabled' : 'Disabled'}</div>
                <div className="text-xs text-gray-600">Scheduled: {conn.syncEnabled ? `Every ${conn.syncIntervalMinutes || 1440} min` : 'Off'}</div>
                <div className="text-xs text-gray-500">Last sync: {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : 'Never'}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => runTest(conn.id)}>Test</button>
                <button className="btn btn-primary" onClick={() => runSync(conn.id)}>Run Sync</button>
                <button className="btn btn-secondary" onClick={() => apiClient.downloadSupplierCatalogCsv(conn.id, storeId || undefined)}>Export CSV</button>
              </div>
            </div>
          ))}
          {connections.length === 0 && <div className="text-sm text-gray-500">No supplier connections found.</div>}
        </div>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Recent Sync Runs</h2>
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{run.supplierConnection?.name || run.id}</div>
                <span className="text-xs px-2 py-1 rounded bg-slate-100">{run.status}</span>
              </div>
              <div className="text-xs text-gray-600">Started: {new Date(run.createdAt).toLocaleString()}</div>
              <div className="mt-2">
                <Link className="text-xs text-blue-700 underline" to={`/app/admin/suppliers/runs/${run.id}${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`}>
                  View Run Detail
                </Link>
              </div>
              {run.counts && <pre className="text-xs mt-2 whitespace-pre-wrap">{JSON.stringify(run.counts, null, 2)}</pre>}
              {run.errorSummary && <div className="text-xs text-red-600 mt-2">{run.errorSummary}</div>}
            </div>
          ))}
          {runs.length === 0 && <div className="text-sm text-gray-500">No supplier sync runs yet.</div>}
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {loading && <div className="text-sm text-gray-600">Loading…</div>}
    </div>
  );
}
