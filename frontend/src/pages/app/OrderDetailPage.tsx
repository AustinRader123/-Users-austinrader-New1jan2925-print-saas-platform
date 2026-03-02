import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

type TimelineEvent = {
  id: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  propertiesJson?: Record<string, any>;
  createdAt: string;
};

const eventLabel: Record<string, string> = {
  'order.created_from_quote': 'Order created from quote',
  'quote.converted': 'Quote converted',
  'order.status_changed': 'Order status changed',
  'invoice.sent': 'Invoice sent',
};

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

  const timelineState = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.getOrderTimeline(id);
        const list = Array.isArray(rows) ? rows : [];
        return list
          .slice()
          .sort((a: any, b: any) => {
            const byDate = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            if (byDate !== 0) return byDate;
            return String(b.id || '').localeCompare(String(a.id || ''));
          }) as TimelineEvent[];
      },
      () => [],
      `orders.timeline.${id}`
    );
  }, [id]);

  const transitionStatus = async (nextStatus: 'IN_PRODUCTION' | 'SHIPPED') => {
    setStatusError(null);
    setUpdating(nextStatus);
    try {
      await apiClient.updateOrderStatus(id, nextStatus);
      await state.refetch();
      await timelineState.refetch();
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

          <div className="deco-panel">
            <div className="deco-panel-head">Timeline</div>
            <div className="deco-panel-body space-y-2">
              {timelineState.loading ? <div className="text-xs text-slate-500">Loading timeline…</div> : null}
              {!timelineState.loading && timelineState.data && timelineState.data.length === 0 ? (
                <div className="text-xs text-slate-500">No timeline events yet.</div>
              ) : null}
              {!timelineState.loading && timelineState.data?.map((evt) => {
                const status = String(evt.propertiesJson?.status || '').trim();
                const previousStatus = String(evt.propertiesJson?.previousStatus || '').trim();
                const detail = evt.eventType === 'order.status_changed' && status
                  ? `${previousStatus ? `${previousStatus} → ` : ''}${status}`
                  : String(evt.propertiesJson?.orderNumber || evt.propertiesJson?.quoteId || '');
                return (
                  <div key={evt.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{eventLabel[evt.eventType] || evt.eventType}</div>
                      {detail ? <div className="text-xs text-slate-500">{detail}</div> : null}
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">{new Date(evt.createdAt).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
