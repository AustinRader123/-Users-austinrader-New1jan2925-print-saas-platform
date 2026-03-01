import React from 'react';
import { apiClient } from '../lib/api';

export default function DashboardShippingPage() {
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || '');
  const [orderId, setOrderId] = React.useState('');
  const [carrier, setCarrier] = React.useState('MOCK_CARRIER');
  const [serviceLevel, setServiceLevel] = React.useState('GROUND');
  const [rows, setRows] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const canQuery = Boolean(storeId.trim());

  const load = React.useCallback(async () => {
    if (!canQuery) return;
    const shipments = await apiClient.listShippingShipments(storeId.trim());
    setRows(Array.isArray(shipments) ? shipments : []);
  }, [canQuery, storeId]);

  React.useEffect(() => {
    load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load shipments'));
  }, [load]);

  const createLabel = async () => {
    if (!orderId.trim()) return;
    await apiClient.createShippingLabel(orderId.trim(), {
      storeId: storeId.trim(),
      carrier: carrier || undefined,
      serviceLevel: serviceLevel || undefined,
    });
    setMessage('Shipping label created');
    setOrderId('');
    await load();
  };

  const syncTracking = async (shipmentId: string) => {
    await apiClient.syncShipmentTracking(shipmentId, storeId.trim());
    setMessage('Tracking synced');
    await load();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Shipping</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <input className="input-base" placeholder="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          <input className="input-base" placeholder="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          <input className="input-base" placeholder="service level" value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} />
        </div>
        <div className="flex gap-2 text-xs">
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => createLabel().catch((err: any) => setError(err?.response?.data?.error || 'Failed to create label'))}>Create Label</button>
          <button className="btn btn-secondary" onClick={() => load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to refresh'))}>Refresh</button>
          {message && <span className="text-emerald-700">{message}</span>}
          {error && <span className="text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Shipments</div>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 pr-2">Shipment</th>
                <th className="py-1 pr-2">Order</th>
                <th className="py-1 pr-2">Tracking</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-1 pr-2">{row.id.slice(0, 8)}</td>
                  <td className="py-1 pr-2">{row.order?.orderNumber || row.orderId}</td>
                  <td className="py-1 pr-2">{row.trackingNumber || '-'}</td>
                  <td className="py-1 pr-2">{row.status}</td>
                  <td className="py-1 pr-2">
                    <button className="btn btn-secondary" onClick={() => syncTracking(row.id).catch((err: any) => setError(err?.response?.data?.error || 'Failed to sync tracking'))}>Sync</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
