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

  return (
    <div className="deco-page">
      <PageHeader
        title="Inventory"
        subtitle="Monitor stock, reservations, and reorder thresholds."
        actions={<Link className="deco-btn-primary" to="/app/inventory/receive">Receive Inventory</Link>}
      />

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
                {state.data.map((row: any) => {
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
                      <td className="flex gap-1">
                        <button className="deco-btn" disabled title="Adjust action pending API support">Adjust</button>
                        <button className="deco-btn" disabled title="Reserve action pending API support">Reserve</button>
                        <button className="deco-btn" disabled title="Release action pending API support">Release</button>
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
