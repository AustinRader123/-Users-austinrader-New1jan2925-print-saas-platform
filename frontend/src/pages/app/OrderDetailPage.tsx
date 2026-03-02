import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppOrderDetailPage() {
  const { id = '' } = useParams();
  const [updating, setUpdating] = React.useState<string | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const row = await apiClient.getOrder(id);
        return row;
      },
      () => ({
        id,
        orderNumber: `SO-${id.slice(0, 5) || 'NA'}`,
        status: 'Pending',
        customerName: 'Mock Customer',
        total: 0,
        items: [],
      }),
      `orders.detail.${id}`
    );
  }, [id]);

  const transitionStatus = async (nextStatus: 'IN_PRODUCTION' | 'SHIPPED') => {
    setStatusError(null);
    setUpdating(nextStatus);
    try {
      await apiClient.updateOrderStatus(id, nextStatus);
      await state.refetch();
    } catch (error: any) {
      setStatusError(error?.message || `Failed to set status ${nextStatus}`);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="deco-page">
      <PageHeader
        title={`Order ${id}`}
        subtitle="Order details, timeline, and line items."
        actions={<Link to="/app/orders" className="deco-btn">Back to Orders</Link>}
      />

      {state.loading ? <LoadingState title="Loading order" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && !state.data ? (
        <EmptyState title="Order not found" description="This order could not be loaded." />
      ) : null}

      {!state.loading && !state.error && state.data ? (
        <div className="space-y-3">
          <div className="deco-panel">
            <div className="deco-panel-body grid gap-2 md:grid-cols-2">
              <div><span className="text-xs text-slate-500">Order #</span><div className="text-sm font-semibold">{state.data.orderNumber || state.data.id}</div></div>
              <div><span className="text-xs text-slate-500">Status</span><div className="text-sm font-semibold">{state.data.status || 'Pending'}</div></div>
              <div><span className="text-xs text-slate-500">Customer</span><div className="text-sm font-semibold">{state.data.customerName || state.data.customer?.name || 'Unknown'}</div></div>
              <div><span className="text-xs text-slate-500">Total</span><div className="text-sm font-semibold">${Number(state.data.total || 0).toFixed(2)}</div></div>
            </div>
          </div>

          <div className="deco-panel">
            <div className="deco-panel-head">Status transitions</div>
            <div className="deco-panel-body flex flex-wrap gap-2">
              <button className="deco-btn" disabled={!!updating} onClick={() => transitionStatus('IN_PRODUCTION')}>
                {updating === 'IN_PRODUCTION' ? 'Updating…' : 'Move to In Production'}
              </button>
              <button className="deco-btn-primary" disabled={!!updating} onClick={() => transitionStatus('SHIPPED')}>
                {updating === 'SHIPPED' ? 'Updating…' : 'Mark Shipped'}
              </button>
              {statusError ? <div className="text-xs text-red-600">{statusError}</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
