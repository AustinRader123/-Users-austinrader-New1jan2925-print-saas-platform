import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

const mockRows = [
  { id: 'shp-1', shipmentNumber: 'SHP-2001', carrier: 'UPS', trackingNumber: '1Z999TEST1', status: 'Label Created', updatedAt: '2026-03-01T08:12:00Z' },
  { id: 'shp-2', shipmentNumber: 'SHP-2000', carrier: 'USPS', trackingNumber: '9400TEST2', status: 'In Transit', updatedAt: '2026-03-01T07:42:00Z' },
];

export default function AppShippingPage() {
  const storeId = localStorage.getItem('storeId') || 'default';

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listShippingShipments(storeId);
        return Array.isArray(rows) ? rows : (rows?.items || []);
      },
      () => mockRows,
      'shipping.list'
    );
  }, [storeId]);

  return (
    <div className="deco-page">
      <PageHeader title="Shipping" subtitle="Track shipments, labels, and delivery status." />

      {state.loading ? <LoadingState title="Loading shipments" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && (!state.data || state.data.length === 0) ? <EmptyState title="No shipments yet" description="Shipments will appear after labels are created." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Shipment #</th>
                  <th>Carrier</th>
                  <th>Tracking</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row: any) => (
                  <tr key={row.id || row.shipmentNumber}>
                    <td className="font-semibold">{row.shipmentNumber || row.id}</td>
                    <td>{row.carrier || '—'}</td>
                    <td>{row.trackingNumber || '—'}</td>
                    <td><span className="deco-badge">{row.status || 'Created'}</span></td>
                    <td>{row.updatedAt || row.createdAt || '—'}</td>
                    <td className="flex gap-1">
                      <button className="deco-btn" disabled title="Create label action requires order context">Create label</button>
                      <button className="deco-btn" disabled title="Mark shipped requires shipment events">Mark shipped</button>
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
