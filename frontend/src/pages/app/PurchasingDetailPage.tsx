import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppPurchasingDetailPage() {
  const { id = '' } = useParams();
  const storeId = localStorage.getItem('storeId') || 'default';

  const state = useAsync(async () => {
    return withFallback(
      async () => apiClient.getPurchaseOrder(storeId, id),
      () => ({ id, number: id, supplierName: 'Mock Supplier', status: 'DRAFT', lines: [] }),
      `purchasing.detail.${id}`
    );
  }, [id, storeId]);

  return (
    <div className="deco-page">
      <PageHeader title={`Purchase Order ${id}`} subtitle="Supplier order details and receiving history." actions={<Link className="deco-btn" to="/app/purchasing">Back</Link>} />

      {state.loading ? <LoadingState title="Loading purchase order" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && !state.data ? <EmptyState title="Purchase order not found" description="This PO could not be loaded." /> : null}

      {!state.loading && !state.error && state.data ? (
        <div className="deco-panel">
          <div className="deco-panel-body grid gap-2 md:grid-cols-2">
            <div><span className="text-xs text-slate-500">PO #</span><div className="text-sm font-semibold">{state.data.number || state.data.id}</div></div>
            <div><span className="text-xs text-slate-500">Supplier</span><div className="text-sm font-semibold">{state.data.supplierName || '—'}</div></div>
            <div><span className="text-xs text-slate-500">Status</span><div className="text-sm font-semibold">{state.data.status || 'DRAFT'}</div></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
