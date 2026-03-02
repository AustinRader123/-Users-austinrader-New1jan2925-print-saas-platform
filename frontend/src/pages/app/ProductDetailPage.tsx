import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppProductDetailPage() {
  const { id = '' } = useParams();
  const storeId = localStorage.getItem('storeId') || 'default';

  const state = useAsync(async () => {
    return withFallback(
      async () => apiClient.getProduct(id, storeId),
      () => ({ id, sku: 'MOCK-SKU', name: 'Mock Product', description: 'Fallback product detail', variants: [] }),
      `products.detail.${id}`
    );
  }, [id, storeId]);

  return (
    <div className="deco-page">
      <PageHeader
        title={`Product ${id}`}
        subtitle="Product details, variant summary, and update metadata."
        actions={<Link to="/app/products" className="deco-btn">Back to Products</Link>}
      />

      {state.loading ? <LoadingState title="Loading product" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && !state.data ? <EmptyState title="Product not found" description="This product does not exist or cannot be loaded." /> : null}

      {!state.loading && !state.error && state.data ? (
        <div className="deco-panel">
          <div className="deco-panel-body grid gap-2 md:grid-cols-2">
            <div><span className="text-xs text-slate-500">Name</span><div className="text-sm font-semibold">{state.data.name || 'Unnamed product'}</div></div>
            <div><span className="text-xs text-slate-500">SKU</span><div className="text-sm font-semibold">{state.data.sku || state.data.id}</div></div>
            <div className="md:col-span-2"><span className="text-xs text-slate-500">Description</span><div className="text-sm">{state.data.description || 'No description yet.'}</div></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
