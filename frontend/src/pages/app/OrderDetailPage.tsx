import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppOrderDetailPage() {
  const { id = '' } = useParams();

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
        <div className="deco-panel">
          <div className="deco-panel-body grid gap-2 md:grid-cols-2">
            <div><span className="text-xs text-slate-500">Order #</span><div className="text-sm font-semibold">{state.data.orderNumber || state.data.id}</div></div>
            <div><span className="text-xs text-slate-500">Status</span><div className="text-sm font-semibold">{state.data.status || 'Pending'}</div></div>
            <div><span className="text-xs text-slate-500">Customer</span><div className="text-sm font-semibold">{state.data.customerName || state.data.customer?.name || 'Unknown'}</div></div>
            <div><span className="text-xs text-slate-500">Total</span><div className="text-sm font-semibold">${Number(state.data.total || 0).toFixed(2)}</div></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
