import React from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function PublicPortalPage() {
  const { token = '' } = useParams();
  const [state, setState] = React.useState<any>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const run = async () => {
      try {
        const data = await apiClient.getPublicPortal(token);
        setState(data);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Failed to load portal');
      }
    };
    run();
  }, [token]);

  if (error) return <div className="max-w-4xl mx-auto px-4 py-8">{error}</div>;
  if (!state) return <div className="max-w-4xl mx-auto px-4 py-8">Loading portal...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Order Portal</h1>
        <p className="text-sm text-slate-600">{state.store?.name} • {state.order?.orderNumber}</p>
      </div>

      <div className="rounded border bg-white p-4 text-sm space-y-1">
        <div>Customer: {state.order?.customerName}</div>
        <div>Email: {state.order?.customerEmail}</div>
        <div>Order Status: {state.order?.status}</div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-semibold mb-2">Invoices</div>
        <div className="space-y-2 text-sm">
          {(state.invoices || []).map((row: any) => (
            <div key={row.id} className="rounded border p-2">
              <div>{row.invoiceNumber} • {row.status}</div>
              <div>Total: {row.totalCents} • Balance: {row.balanceDueCents}</div>
            </div>
          ))}
          {(!state.invoices || state.invoices.length === 0) && <div className="text-xs text-slate-500">No invoices yet.</div>}
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-semibold mb-2">Shipments</div>
        <div className="space-y-2 text-sm">
          {(state.shipments || []).map((row: any) => (
            <div key={row.id} className="rounded border p-2">
              <div>{row.carrier || row.provider || 'Carrier'} • {row.trackingNumber || 'pending'}</div>
              <div>Status: {row.status}</div>
            </div>
          ))}
          {(!state.shipments || state.shipments.length === 0) && <div className="text-xs text-slate-500">No shipments yet.</div>}
        </div>
      </div>
    </div>
  );
}
