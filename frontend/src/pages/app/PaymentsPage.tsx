import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppPaymentsPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const [message, setMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listOrderInvoices(storeId);
        const list = Array.isArray(rows) ? rows : (rows?.items || []);
        return [...list].sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      },
      () => [],
      'payments.invoices'
    );
  }, [storeId]);

  const recordPayment = async (invoiceId: string, amountCents: number) => {
    setMessage(null);
    try {
      await apiClient.recordInvoicePayment(invoiceId, {
        storeId,
        amountCents,
        description: 'Manual mock payment',
        externalRef: `mock-${Date.now()}`,
      });
      setMessage('Payment recorded.');
      await state.refetch();
    } catch (error: any) {
      setMessage(error?.message || 'Record payment failed.');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Payments" subtitle="Payment intents and invoice payment status updates." />
      {message ? <div className="text-xs text-slate-600">{message}</div> : null}

      {state.loading ? <LoadingState title="Loading payments" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && state.data && state.data.length === 0 ? <EmptyState title="No invoices available" description="Generate invoices first to record payments." /> : null}

      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row: any) => {
                  const totalCents = Number(row.totalCents || Math.round(Number(row.total || 0) * 100));
                  return (
                    <tr key={row.id}>
                      <td className="font-semibold">{row.number || row.id}</td>
                      <td><span className="deco-badge">{row.status || 'OPEN'}</span></td>
                      <td>${(totalCents / 100).toFixed(2)}</td>
                      <td className="flex gap-1">
                        <button className="deco-btn" onClick={() => recordPayment(row.id, totalCents)}>Mark paid</button>
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
