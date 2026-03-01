import React from 'react';
import { apiClient } from '../lib/api';

export default function ReportsPage() {
  const [storeId, setStoreId] = React.useState('default');
  const [summary, setSummary] = React.useState<any>(null);
  const [products, setProducts] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    const [summaryData, productRows] = await Promise.all([
      apiClient.getReportsSummary(storeId),
      apiClient.getReportsProducts(storeId),
    ]);
    setSummary(summaryData);
    setProducts(productRows || []);
  }, [storeId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportOrdersCsv = async () => {
    const blob = await apiClient.downloadOrdersReportCsv(storeId);
    downloadBlob(blob, `orders-report-${storeId}.csv`);
  };

  const exportQuotesCsv = async () => {
    const blob = await apiClient.downloadQuotesReportCsv(storeId);
    downloadBlob(blob, `quotes-report-${storeId}.csv`);
  };

  const metrics = summary?.metrics || {};

  return (
    <div className="p-4">
      <div className="text-sm font-semibold mb-2">Reports</div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="storeId" />
        <button className="btn btn-secondary" onClick={load}>Refresh</button>
        <button className="btn btn-secondary" onClick={exportOrdersCsv}>Export Orders CSV</button>
        <button className="btn btn-secondary" onClick={exportQuotesCsv}>Export Quotes CSV</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Sales Summary</div>
          <div className="text-sm space-y-1">
            <div>Orders: {metrics.orderCount || 0}</div>
            <div>Revenue: ${Number(metrics.revenue || 0).toFixed(2)}</div>
            <div>Projected Profit: ${Number(metrics.projectedProfit || 0).toFixed(2)}</div>
            <div>Margin: {Number(metrics.marginPct || 0).toFixed(2)}%</div>
          </div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Product Performance</div>
          <div className="space-y-1 max-h-48 overflow-auto text-xs">
            {products.slice(0, 10).map((row) => (
              <div key={row.productId} className="border-b pb-1">
                <div className="font-medium">{row.productName}</div>
                <div>Qty {row.quantity} • Revenue ${Number(row.revenue || 0).toFixed(2)} • Margin {Number(row.marginPct || 0).toFixed(2)}%</div>
              </div>
            ))}
            {products.length === 0 && <div className="text-slate-500">No product rows.</div>}
          </div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Production Time</div>
          <div className="h-48 rounded-sm bg-slate-100 flex items-center justify-center text-xs text-slate-500">Reserved for phase extension</div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Revenue by Store</div>
          <div className="h-48 rounded-sm bg-slate-100 flex items-center justify-center text-xs text-slate-500">Current store: {storeId}</div>
        </div>
      </div>
    </div>
  );
}
