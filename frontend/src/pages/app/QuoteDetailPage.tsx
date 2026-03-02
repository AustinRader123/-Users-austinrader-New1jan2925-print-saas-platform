import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppQuoteDetailPage() {
  const { id = '' } = useParams();
  const storeId = localStorage.getItem('storeId') || 'default';
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        return apiClient.getQuote(id, storeId);
      },
      () => ({ id, quoteNumber: `Q-${id.slice(0, 5) || 'NA'}`, status: 'DRAFT', customerName: 'Mock Customer', total: 0, items: [] }),
      `quotes.detail.${id}`
    );
  }, [id, storeId]);

  const mutate = async (action: 'send' | 'reprice' | 'approve' | 'convert') => {
    setActionMessage(null);
    try {
      if (action === 'send') await apiClient.sendQuote(id, { storeId });
      if (action === 'reprice') await apiClient.repriceQuote(id, storeId);
      if (action === 'approve') await apiClient.updateQuoteStatus(id, { storeId, status: 'APPROVED' });
      if (action === 'convert') await apiClient.convertQuoteToOrder(id, storeId);
      setActionMessage(`Action completed: ${action}`);
      await state.refetch();
    } catch (error: any) {
      setActionMessage(error?.message || `Action failed: ${action}`);
    }
  };

  return (
    <div className="deco-page">
      <PageHeader
        title={`Quote ${id}`}
        subtitle="Review quote details, pricing, and conversion readiness."
        actions={<Link to="/app/quotes" className="deco-btn">Back to Quotes</Link>}
      />

      {actionMessage ? <div className="text-xs text-slate-600">{actionMessage}</div> : null}
      {state.loading ? <LoadingState title="Loading quote" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && !state.data ? <EmptyState title="Quote not found" description="This quote could not be loaded." /> : null}

      {!state.loading && !state.error && state.data ? (
        <>
          <div className="deco-panel">
            <div className="deco-panel-body grid gap-2 md:grid-cols-2">
              <div><span className="text-xs text-slate-500">Quote #</span><div className="text-sm font-semibold">{state.data.quoteNumber || state.data.id}</div></div>
              <div><span className="text-xs text-slate-500">Status</span><div className="text-sm font-semibold">{state.data.status || 'DRAFT'}</div></div>
              <div><span className="text-xs text-slate-500">Customer</span><div className="text-sm font-semibold">{state.data.customerName || state.data.customer?.name || 'Unknown'}</div></div>
              <div><span className="text-xs text-slate-500">Total</span><div className="text-sm font-semibold">${Number(state.data.total || state.data.totalAmount || 0).toFixed(2)}</div></div>
            </div>
          </div>

          <div className="deco-panel">
            <div className="deco-panel-head">Quote Actions</div>
            <div className="deco-panel-body flex flex-wrap gap-2">
              <button className="deco-btn" onClick={() => mutate('reprice')}>Reprice</button>
              <button className="deco-btn" onClick={() => mutate('send')}>Send</button>
              <button className="deco-btn" onClick={() => mutate('approve')}>Approve</button>
              <button className="deco-btn-primary" onClick={() => mutate('convert')}>Convert to Order</button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
