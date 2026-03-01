import React from 'react';
import { apiClient } from '../lib/api';

export default function AnalyticsPage() {
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || 'default');
  const [summary, setSummary] = React.useState<any>(null);
  const [funnel, setFunnel] = React.useState<any>(null);
  const [topProducts, setTopProducts] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');

  const canQuery = Boolean(storeId.trim());

  const load = React.useCallback(async () => {
    if (!canQuery) return;
    const [sum, fun, top] = await Promise.all([
      apiClient.getAnalyticsSummary(storeId.trim()),
      apiClient.getAnalyticsFunnel(storeId.trim()),
      apiClient.getAnalyticsTopProducts(storeId.trim()),
    ]);
    setSummary(sum || null);
    setFunnel(fun || null);
    setTopProducts(Array.isArray(top) ? top : []);
  }, [canQuery, storeId]);

  React.useEffect(() => {
    load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load analytics'));
  }, [load]);

  const exportCsv = async () => {
    const csv = await apiClient.exportAnalyticsCsv(storeId.trim());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${storeId.trim()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to refresh analytics'))}>Refresh</button>
          <button className="btn btn-secondary" disabled={!canQuery} onClick={() => exportCsv().catch((err: any) => setError(err?.response?.data?.error || 'Failed to export CSV'))}>Export CSV</button>
        </div>
        {error && <div className="text-xs text-rose-700">{error}</div>}
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Summary</div>
        <div className="text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded border p-2"><div className="text-slate-500">Revenue</div><div className="font-semibold">${Number(summary?.revenue || 0).toFixed(2)}</div></div>
          <div className="rounded border p-2"><div className="text-slate-500">Orders</div><div className="font-semibold">{summary?.ordersCount || 0}</div></div>
          <div className="rounded border p-2"><div className="text-slate-500">Events</div><div className="font-semibold">{summary?.eventsCount || 0}</div></div>
          <div className="rounded border p-2"><div className="text-slate-500">Store</div><div className="font-semibold">{summary?.storeId || '-'}</div></div>
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Funnel</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded border p-2">Quotes: <b>{funnel?.quote || 0}</b></div>
          <div className="rounded border p-2">Orders: <b>{funnel?.order || 0}</b></div>
          <div className="rounded border p-2">Paid: <b>{funnel?.paid || 0}</b></div>
          <div className="rounded border p-2">Shipped: <b>{funnel?.shipped || 0}</b></div>
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Top Products</div>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 pr-2">Product</th>
                <th className="py-1 pr-2">Quantity</th>
                <th className="py-1 pr-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((row) => (
                <tr key={row.productId} className="border-b">
                  <td className="py-1 pr-2">{row.productName}</td>
                  <td className="py-1 pr-2">{row.quantity}</td>
                  <td className="py-1 pr-2">${Number(row.revenue || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
