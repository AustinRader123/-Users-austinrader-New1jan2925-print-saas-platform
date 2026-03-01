import React from 'react';
import { apiClient } from '../lib/api';

export default function DashboardBillingPage() {
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || '');
  const [orderId, setOrderId] = React.useState('');
  const [paymentInvoiceId, setPaymentInvoiceId] = React.useState('');
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [rows, setRows] = React.useState<any[]>([]);
  const [ledgerRows, setLedgerRows] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const canQuery = Boolean(storeId.trim());

  const load = React.useCallback(async () => {
    if (!canQuery) return;
    const [invoices, ledger] = await Promise.all([
      apiClient.listOrderInvoices(storeId.trim()),
      apiClient.listPaymentLedger(storeId.trim()),
    ]);
    setRows(Array.isArray(invoices) ? invoices : []);
    setLedgerRows(Array.isArray(ledger) ? ledger : []);
  }, [canQuery, storeId]);

  React.useEffect(() => {
    load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load billing'));
  }, [load]);

  const createInvoice = async () => {
    if (!orderId.trim()) return;
    await apiClient.createOrderInvoice(orderId.trim(), { storeId: storeId.trim() });
    setMessage('Invoice created');
    setOrderId('');
    await load();
  };

  const recordPayment = async () => {
    if (!paymentInvoiceId.trim() || !paymentAmount.trim()) return;
    await apiClient.recordInvoicePayment(paymentInvoiceId.trim(), {
      storeId: storeId.trim(),
      amountCents: Math.max(1, Number(paymentAmount)),
    });
    setMessage('Payment recorded');
    setPaymentAmount('');
    await load();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Order Billing</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <input className="input-base" placeholder="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => createInvoice().catch((err: any) => setError(err?.response?.data?.error || 'Failed to create invoice'))}>Create Invoice</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input-base" placeholder="invoiceId" value={paymentInvoiceId} onChange={(e) => setPaymentInvoiceId(e.target.value)} />
          <input className="input-base" placeholder="payment amount cents" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => recordPayment().catch((err: any) => setError(err?.response?.data?.error || 'Failed to record payment'))}>Record Payment</button>
        </div>
        <div className="flex gap-2 text-xs">
          <button className="btn btn-secondary" onClick={() => load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to refresh'))}>Refresh</button>
          {message && <span className="text-emerald-700">{message}</span>}
          {error && <span className="text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-3">
          <div className="text-sm font-semibold mb-2">Invoices</div>
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1 pr-2">Invoice</th>
                  <th className="py-1 pr-2">Order</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1 pr-2">Total</th>
                  <th className="py-1 pr-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-1 pr-2">{row.invoiceNumber}</td>
                    <td className="py-1 pr-2">{row.order?.orderNumber || row.orderId}</td>
                    <td className="py-1 pr-2">{row.status}</td>
                    <td className="py-1 pr-2">{row.totalCents}</td>
                    <td className="py-1 pr-2">{row.balanceDueCents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="text-sm font-semibold mb-2">Payment Ledger (append-only)</div>
          <div className="overflow-auto max-h-96">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1 pr-2">When</th>
                  <th className="py-1 pr-2">Type</th>
                  <th className="py-1 pr-2">Invoice</th>
                  <th className="py-1 pr-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-1 pr-2">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="py-1 pr-2">{row.entryType}</td>
                    <td className="py-1 pr-2">{row.invoice?.invoiceNumber || '-'}</td>
                    <td className="py-1 pr-2">{row.amountCents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
