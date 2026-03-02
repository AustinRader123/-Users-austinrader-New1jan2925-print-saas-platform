import React from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';
import Table from '../../ui/Table';
import FormField from '../../ui/FormField';

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

      <div className="ops-card">
        <div className="ops-card-header">Batch Actions</div>
        <div className="ops-card-body">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <FormField
              label="Batch ID"
              description="Use a deterministic batch id to reserve, consume, or release inventory."
            >
              <input className="ops-input" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="batch-20260302-001" />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <button className="ops-btn ops-btn-secondary" onClick={() => runBatchAction('reserve')}>Reserve</button>
              <button className="ops-btn ops-btn-secondary" onClick={() => runBatchAction('consume')}>Consume</button>
              <button className="ops-btn ops-btn-secondary" onClick={() => runBatchAction('release')}>Release</button>
            </div>
          </div>
          {actionMessage ? <div className="mt-2 text-xs text-slate-600">{actionMessage}</div> : null}
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading inventory" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && (!state.data || state.data.length === 0) ? <EmptyState title="No inventory yet" description="Inventory rows will appear after receiving stock." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <Table
          title="Inventory"
          rows={[...state.data].sort((a: any, b: any) => String(a.sku || a.code || a.id).localeCompare(String(b.sku || b.code || b.id)))}
          getRowId={(row: any) => String(row.id || row.sku || row.code)}
          searchPlaceholder="Search SKU or supplier"
          searchBy={(row: any, q) =>
            String(row.sku || row.code || row.id).toLowerCase().includes(q) ||
            String(row.supplier || row.supplierName || '').toLowerCase().includes(q)
          }
          columns={[
            { key: 'sku', label: 'SKU', sortable: true, sortValue: (row: any) => String(row.sku || row.code || row.id), render: (row: any) => <span className="font-semibold">{row.sku || row.code || row.id}</span> },
            { key: 'onHand', label: 'On Hand', sortable: true, sortValue: (row: any) => Number(row.onHand ?? row.quantity ?? 0), render: (row: any) => Number(row.onHand ?? row.quantity ?? 0) },
            { key: 'reserved', label: 'Reserved', sortable: true, sortValue: (row: any) => Number(row.reserved ?? 0), render: (row: any) => Number(row.reserved ?? 0) },
            {
              key: 'available',
              label: 'Available',
              sortable: true,
              sortValue: (row: any) => Number(row.available ?? Number(row.onHand ?? row.quantity ?? 0) - Number(row.reserved ?? 0)),
              render: (row: any) => Number(row.available ?? Number(row.onHand ?? row.quantity ?? 0) - Number(row.reserved ?? 0)),
            },
            { key: 'reorder', label: 'Reorder Level', sortable: true, sortValue: (row: any) => Number(row.reorderLevel ?? 0), render: (row: any) => row.reorderLevel ?? '—' },
            { key: 'supplier', label: 'Supplier', sortable: true, sortValue: (row: any) => String(row.supplier || row.supplierName || ''), render: (row: any) => row.supplier || row.supplierName || '—' },
          ]}
          onBulkAction={(selected) => {
            console.info('Selected inventory rows', selected.length);
          }}
          bulkActionLabel="Select"
        />
      ) : null}
    </div>
  );
}
