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
  const [orderId, setOrderId] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

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

  const quoteRates = async () => {
    if (!orderId.trim()) {
      setActionMessage('Enter an order ID to quote rates.');
      return;
    }
    setActionMessage(null);
    try {
      const rates = await apiClient.quoteShippingRates({ storeId, orderId: orderId.trim() });
      const count = Array.isArray(rates) ? rates.length : (rates?.items?.length || 0);
      setActionMessage(`Rate quote complete (${count} options).`);
    } catch (error: any) {
      setActionMessage(error?.message || 'Rate quote failed.');
    }
  };

  const createLabel = async () => {
    if (!orderId.trim()) {
      setActionMessage('Enter an order ID to create a label.');
      return;
    }
    setActionMessage(null);
    try {
      await apiClient.createShippingLabel(orderId.trim(), { storeId, carrier: 'mock', serviceLevel: 'ground' });
      setActionMessage('Shipping label created.');
      await state.refetch();
    } catch (error: any) {
      setActionMessage(error?.message || 'Create label failed.');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Shipping" subtitle="Track shipments, labels, and delivery status." />

      <div className="deco-panel">
        <div className="deco-panel-body flex flex-wrap items-center gap-2">
          <input className="deco-input" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID" />
          <button className="deco-btn" onClick={quoteRates}>Quote Rates</button>
          <button className="deco-btn-primary" onClick={createLabel}>Create Shipment + Label</button>
          {actionMessage ? <span className="text-xs text-slate-600">{actionMessage}</span> : null}
        </div>
      </div>

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
                {[...state.data]
                  .sort((a: any, b: any) => {
                    const updatedDiff = new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
                    if (updatedDiff !== 0) return updatedDiff;
                    return String(a.id || a.shipmentNumber).localeCompare(String(b.id || b.shipmentNumber));
                  })
                  .map((row: any) => (
                  <tr key={row.id || row.shipmentNumber}>
                    <td className="font-semibold">{row.shipmentNumber || row.id}</td>
                    <td>{row.carrier || '—'}</td>
                    <td>{row.trackingNumber || '—'}</td>
                    <td><span className="deco-badge">{row.status || 'Created'}</span></td>
                    <td>{row.updatedAt || row.createdAt || '—'}</td>
                    <td className="flex gap-1">
                      <button className="deco-btn" onClick={async () => {
                        try {
                          await apiClient.syncShipmentTracking(String(row.id || row.shipmentNumber), storeId);
                          setActionMessage('Shipment synced.');
                          await state.refetch();
                        } catch (error: any) {
                          setActionMessage(error?.message || 'Sync failed.');
                        }
                      }}>Sync</button>
                      <button className="deco-btn" onClick={async () => {
                        try {
                          await apiClient.createShipmentEvent(String(row.id || row.shipmentNumber), {
                            storeId,
                            eventType: 'MANUAL_UPDATE',
                            status: 'SHIPPED',
                            message: 'Updated from UI',
                          });
                          setActionMessage('Shipment event logged.');
                          await state.refetch();
                        } catch (error: any) {
                          setActionMessage(error?.message || 'Update failed.');
                        }
                      }}>Mark shipped</button>
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
