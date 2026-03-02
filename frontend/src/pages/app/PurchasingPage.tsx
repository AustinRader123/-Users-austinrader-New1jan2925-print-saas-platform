import React from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

const mockRows = [
  { id: 'po-110', number: 'PO-110', supplierName: 'Core Apparel', status: 'DRAFT', lineCount: 4, expectedAt: '2026-03-04' },
  { id: 'po-109', number: 'PO-109', supplierName: 'North Supply', status: 'SENT', lineCount: 9, expectedAt: '2026-03-05' },
];

export default function AppPurchasingPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const tenantId = localStorage.getItem('tenantId') || '';
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listPurchaseOrders(storeId);
        return Array.isArray(rows) ? rows : (rows?.items || []);
      },
      () => mockRows,
      'purchasing.list'
    );
  }, [storeId]);

  const runPoAction = async (id: string, action: 'send' | 'receive' | 'close') => {
    if (!tenantId) {
      setActionMessage('tenantId is required for purchasing actions.');
      return;
    }
    setActionMessage(null);
    try {
      if (action === 'send') {
        await apiClient.sendPurchasingPo(id, { storeId, tenantId });
      }
      if (action === 'receive') {
        await apiClient.receivePurchasingPo(id, {
          storeId,
          tenantId,
          locationId: 'default',
          lines: [],
        });
      }
      if (action === 'close') {
        await apiClient.closePurchasingPo(id, { storeId, tenantId });
      }
      setActionMessage(`PO action completed: ${action}`);
      await state.refetch();
    } catch (error: any) {
      setActionMessage(error?.message || `PO action failed: ${action}`);
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Purchasing" subtitle="Manage supplier purchase orders and receiving." />
      {actionMessage ? <div className="text-xs text-slate-600">{actionMessage}</div> : null}

      {state.loading ? <LoadingState title="Loading purchase orders" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && (!state.data || state.data.length === 0) ? <EmptyState title="No purchase orders yet" description="Create your first PO to start procurement." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Expected</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...state.data]
                  .sort((a: any, b: any) => {
                    const dateCompare = String(b.expectedAt || '').localeCompare(String(a.expectedAt || ''));
                    if (dateCompare !== 0) return dateCompare;
                    return String(a.id || a.number).localeCompare(String(b.id || b.number));
                  })
                  .map((row: any) => (
                  <tr key={row.id || row.number}>
                    <td className="font-semibold">{row.number || row.id}</td>
                    <td>{row.supplierName || row.supplier || '—'}</td>
                    <td><span className="deco-badge">{row.status || 'DRAFT'}</span></td>
                    <td>{row.lineCount || row.items?.length || 0}</td>
                    <td>{row.expectedAt || '—'}</td>
                    <td className="flex gap-1">
                      <button className="deco-btn" onClick={() => runPoAction(String(row.id || row.number), 'send')}>Send</button>
                      <button className="deco-btn" onClick={() => runPoAction(String(row.id || row.number), 'receive')}>Receive</button>
                      <button className="deco-btn" onClick={() => runPoAction(String(row.id || row.number), 'close')}>Close</button>
                      <Link className="deco-btn" to={`/app/purchasing/${row.id || row.number}`}>View</Link>
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
