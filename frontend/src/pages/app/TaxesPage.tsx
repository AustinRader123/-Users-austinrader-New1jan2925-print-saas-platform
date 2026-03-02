import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppTaxesPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const [name, setName] = React.useState('Default Sales Tax');
  const [jurisdiction, setJurisdiction] = React.useState('US-DEFAULT');
  const [ratePercent, setRatePercent] = React.useState(7.5);
  const [message, setMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listTaxRates(storeId);
        const list = Array.isArray(rows) ? rows : (rows?.items || []);
        return [...list].sort((a: any, b: any) => String(a.jurisdiction || '').localeCompare(String(b.jurisdiction || '')));
      },
      () => [],
      'taxes.list'
    );
  }, [storeId]);

  const saveRates = async () => {
    setMessage(null);
    try {
      const next = [
        ...(state.data || []),
        {
          name: name.trim() || 'Default Sales Tax',
          jurisdiction: jurisdiction.trim() || 'US-DEFAULT',
          ratePercent: Number(ratePercent || 0),
          inclusive: false,
          appliesShipping: true,
          priority: 1,
        },
      ];
      const deduped = new Map<string, any>();
      for (const row of next as any[]) {
        const key = `${String(row.jurisdiction || '').toLowerCase()}::${String(row.name || '').toLowerCase()}`;
        deduped.set(key, row);
      }
      await apiClient.updateTaxRates({ storeId, rates: [...deduped.values()] });
      setMessage('Tax rates saved.');
      await state.refetch();
    } catch (error: any) {
      setMessage(error?.message || 'Save tax rates failed.');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Taxes" subtitle="Tax provider configuration and tax rate table." />

      <div className="deco-panel">
        <div className="deco-panel-head">Add tax rule</div>
        <div className="deco-panel-body grid gap-2 md:grid-cols-4">
          <input className="deco-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          <input className="deco-input" value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} placeholder="Jurisdiction" />
          <input className="deco-input" type="number" step="0.01" value={ratePercent} onChange={(event) => setRatePercent(Number(event.target.value || 0))} placeholder="Rate %" />
          <button className="deco-btn-primary" onClick={saveRates}>Save rates</button>
        </div>
        {message ? <div className="deco-panel-body text-xs text-slate-600">{message}</div> : null}
      </div>

      {state.loading ? <LoadingState title="Loading tax rates" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && state.data && state.data.length === 0 ? <EmptyState title="No tax rates" description="Add tax rules to enable consistent quote/order totals." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Jurisdiction</th>
                  <th>Rate %</th>
                  <th>Applies Shipping</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row: any) => (
                  <tr key={`${row.id || row.name}-${row.jurisdiction}`}>
                    <td className="font-semibold">{row.name}</td>
                    <td>{row.jurisdiction}</td>
                    <td>{Number(row.ratePercent || 0).toFixed(2)}</td>
                    <td>{row.appliesShipping ? 'Yes' : 'No'}</td>
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
