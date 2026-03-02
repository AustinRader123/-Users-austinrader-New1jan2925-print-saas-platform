import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppIntegrationsPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const [name, setName] = React.useState('Mock Supplier');
  const [message, setMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.adminListSupplierConnections(storeId);
        const list = Array.isArray(rows) ? rows : (rows?.items || []);
        return [...list].sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
      },
      () => [],
      'integrations.suppliers'
    );
  }, [storeId]);

  const createConnection = async () => {
    setMessage(null);
    try {
      await apiClient.adminCreateSupplierConnection({
        storeId,
        supplier: 'MOCK',
        name: name.trim() || 'Mock Supplier',
        authType: 'MOCK',
        enabled: true,
      });
      setMessage('Supplier connection created.');
      await state.refetch();
    } catch (error: any) {
      setMessage(error?.message || 'Create connection failed.');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Integrations" subtitle="Provider adapters and supplier sync controls." />

      <div className="deco-panel">
        <div className="deco-panel-head">Add supplier adapter</div>
        <div className="deco-panel-body flex flex-wrap items-center gap-2">
          <input className="deco-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Connection name" />
          <button className="deco-btn-primary" onClick={createConnection}>Create mock connection</button>
          {message ? <span className="text-xs text-slate-600">{message}</span> : null}
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading integrations" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && state.data && state.data.length === 0 ? <EmptyState title="No integrations yet" description="Create supplier connections to enable sync." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row: any) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.name || row.id}</td>
                    <td>{row.supplier || 'MOCK'}</td>
                    <td><span className="deco-badge">{row.enabled === false ? 'DISABLED' : 'ACTIVE'}</span></td>
                    <td className="flex gap-1">
                      <button className="deco-btn" onClick={async () => {
                        try {
                          await apiClient.adminTestSupplierConnection(row.id, storeId);
                          setMessage(`Connection test passed: ${row.name || row.id}`);
                        } catch (error: any) {
                          setMessage(error?.message || 'Connection test failed.');
                        }
                      }}>Test</button>
                      <button className="deco-btn" onClick={async () => {
                        try {
                          await apiClient.adminRunSupplierSync(row.id, { storeId, queue: false, limitProducts: 25 });
                          setMessage(`Sync started: ${row.name || row.id}`);
                        } catch (error: any) {
                          setMessage(error?.message || 'Sync start failed.');
                        }
                      }}>Run sync</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
