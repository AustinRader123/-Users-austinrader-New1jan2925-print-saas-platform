import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppStoresPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const [hostname, setHostname] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listStoreDomains(storeId);
        const list = Array.isArray(rows) ? rows : (rows?.items || []);
        return [...list].sort((a: any, b: any) => String(a.hostname || '').localeCompare(String(b.hostname || '')));
      },
      () => [],
      'stores.domains'
    );
  }, [storeId]);

  const createDomain = async () => {
    if (!hostname.trim()) {
      setMessage('Enter a hostname first.');
      return;
    }
    setMessage(null);
    try {
      await apiClient.createStoreDomain({ hostname: hostname.trim(), storeId });
      setHostname('');
      setMessage('Domain created.');
      await state.refetch();
    } catch (error: any) {
      setMessage(error?.message || 'Create domain failed.');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Stores" subtitle="Store-level domains and org settings." />

      <div className="deco-panel">
        <div className="deco-panel-head">Add domain</div>
        <div className="deco-panel-body flex flex-wrap items-center gap-2">
          <input className="deco-input" value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="store.example.com" />
          <button className="deco-btn-primary" onClick={createDomain}>Create domain</button>
          {message ? <span className="text-xs text-slate-600">{message}</span> : null}
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading stores" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && state.data && state.data.length === 0 ? <EmptyState title="No domains yet" description="Add a domain to configure store routing." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row: any) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.hostname}</td>
                    <td><span className="deco-badge">{row.status || 'PENDING'}</span></td>
                    <td className="text-xs text-slate-500">{row.verificationToken || '—'}</td>
                    <td className="flex gap-2">
                      <button className="deco-btn" onClick={async () => {
                        try {
                          await apiClient.verifyStoreDomain(row.id, row.verificationToken, true);
                          setMessage(`Domain verified: ${row.hostname}`);
                          await state.refetch();
                        } catch (error: any) {
                          setMessage(error?.message || 'Verify failed.');
                        }
                      }}>Verify</button>
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
