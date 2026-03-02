import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppBillingPage() {
  const storeId = localStorage.getItem('storeId') || 'default';

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const [snapshot, invoices, payments] = await Promise.all([
          apiClient.getBillingSnapshot(),
          apiClient.listOrderInvoices(storeId),
          apiClient.listPaymentLedger(storeId),
        ]);
        return { snapshot, invoices: Array.isArray(invoices) ? invoices : (invoices?.items || []), payments: Array.isArray(payments) ? payments : (payments?.items || []) };
      },
      () => ({ snapshot: { planCode: 'FREE', status: 'TRIALING' }, invoices: [], payments: [] }),
      'billing.page'
    );
  }, [storeId]);

  return (
    <div className="deco-page">
      <PageHeader title="Billing" subtitle="Invoices, payments, and account billing status." />

      {state.loading ? <LoadingState title="Loading billing" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && state.data ? (
        <>
          <div className="deco-panel">
            <div className="deco-panel-body grid gap-2 md:grid-cols-3">
              <div className="deco-kpi"><div className="deco-kpi-label">Plan</div><div className="deco-kpi-value">{state.data.snapshot?.planCode || 'FREE'}</div></div>
              <div className="deco-kpi"><div className="deco-kpi-label">Status</div><div className="deco-kpi-value">{state.data.snapshot?.status || 'ACTIVE'}</div></div>
              <div className="deco-kpi"><div className="deco-kpi-label">Tax Quotes</div><div className="deco-kpi-value">Available</div></div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="deco-panel">
              <div className="deco-panel-head">Invoices</div>
              {state.data.invoices.length === 0 ? <div className="deco-panel-body"><EmptyState title="No invoices yet" description="Create invoices from orders when billing starts." /></div> : (
                <div className="deco-table-wrap"><table className="deco-table"><thead><tr><th>Invoice #</th><th>Status</th><th>Total</th></tr></thead><tbody>{[...state.data.invoices].sort((a: any, b: any) => String(a.id || a.number).localeCompare(String(b.id || b.number))).map((row: any) => <tr key={row.id || row.number}><td>{row.number || row.id}</td><td>{row.status || 'OPEN'}</td><td>${Number(row.totalCents ? row.totalCents / 100 : row.total || 0).toFixed(2)}</td></tr>)}</tbody></table></div>
              )}
            </div>

            <div className="deco-panel">
              <div className="deco-panel-head">Payments</div>
              {state.data.payments.length === 0 ? <div className="deco-panel-body"><EmptyState title="No payments yet" description="Payment transactions will appear here." /></div> : (
                <div className="deco-table-wrap"><table className="deco-table"><thead><tr><th>Reference</th><th>Amount</th><th>Date</th></tr></thead><tbody>{[...state.data.payments].sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map((row: any) => <tr key={row.id || row.externalRef}><td>{row.externalRef || row.id}</td><td>${Number(row.amountCents ? row.amountCents / 100 : row.amount || 0).toFixed(2)}</td><td>{row.createdAt || '—'}</td></tr>)}</tbody></table></div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
