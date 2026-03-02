import React from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

const mockRows = [
  { sku: 'TS-BLK-001', onHand: 120, reserved: 30, available: 90, reorderLevel: 40, supplier: 'Core Apparel' },
  { sku: 'HD-NVY-002', onHand: 46, reserved: 12, available: 34, reorderLevel: 35, supplier: 'North Supply' },
];

export default function AppInventoryPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const tenantId = localStorage.getItem('tenantId') || '';
  const [batchId, setBatchId] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listInventory(storeId);
        return Array.isArray(rows) ? rows : (rows?.items || []);
      },
      () => mockRows,
      'inventory.list'
    );
  }, [storeId]);

  const runBatchAction = async (action: 'reserve' | 'release' | 'consume') => {
    if (!batchId.trim()) {
      setActionMessage('Enter a batch ID first.');
      return;
    }
    if (!tenantId) {
      setActionMessage('tenantId is required for inventory batch actions.');
      return;
    }
    setActionMessage(null);
    try {
      if (action === 'reserve') await apiClient.reserveInventoryBatch(batchId.trim(), tenantId);
      if (action === 'release') await apiClient.releaseInventoryBatch(batchId.trim(), tenantId);
      if (action === 'consume') await apiClient.consumeInventoryBatch(batchId.trim(), tenantId);
      setActionMessage(`Batch ${action} completed.`);
      await state.refetch();
    } catch (error: any) {
      setActionMessage(error?.message || `Batch ${action} failed.`);
    }
  };

  return (
    <div className="deco-page">
      <PageHeader
        title="Inventory"
        subtitle="Monitor stock, reservations, and reorder thresholds."
        actions={<Link className="deco-btn-primary" to="/app/inventory/receive">Receive Inventory</Link>}
      />

      <div className="deco-panel">
        <div className="deco-panel-body flex flex-wrap items-center gap-2">
          <input className="deco-input" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Batch ID for reserve/consume/release" />
          <button className="deco-btn" onClick={() => runBatchAction('reserve')}>Reserve</button>
          <button className="deco-btn" onClick={() => runBatchAction('consume')}>Consume</button>
          <button className="deco-btn" onClick={() => runBatchAction('release')}>Release</button>
          {actionMessage ? <span className="text-xs text-slate-600">{actionMessage}</span> : null}
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading inventory" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && (!state.data || state.data.length === 0) ? <EmptyState title="No inventory yet" description="Inventory rows will appear after receiving stock." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Reorder Level</th>
                  <th>Supplier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...state.data]
                  .sort((a: any, b: any) => String(a.sku || a.code || a.id).localeCompare(String(b.sku || b.code || b.id)))
                  .map((row: any) => {
                  const onHand = Number(row.onHand ?? row.quantity ?? 0);
                  const reserved = Number(row.reserved ?? 0);
                  const available = Number(row.available ?? onHand - reserved);
                  return (
                    <tr key={row.sku || row.id}>
                      <td className="font-semibold">{row.sku || row.code || row.id}</td>
                      <td>{onHand}</td>
                      <td>{reserved}</td>
                      <td>{available}</td>
                      <td>{row.reorderLevel ?? '—'}</td>
                      <td>{row.supplier || row.supplierName || '—'}</td>
                      <td className="text-xs text-slate-600">
                        Use batch actions above for reserve/consume/release.
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
