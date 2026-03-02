import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppProductDetailPage() {
  const { id = '' } = useParams();
  const storeId = localStorage.getItem('storeId') || 'default';
  const [variants, setVariants] = React.useState<any[]>([]);

  const state = useAsync(async () => {
    return withFallback(
      async () => apiClient.getProduct(id, storeId),
      () => ({ id, sku: 'MOCK-SKU', name: 'Mock Product', description: 'Fallback product detail', variants: [] }),
      `products.detail.${id}`
    );
  }, [id, storeId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiClient.listVariants(id, storeId);
        const list = Array.isArray(rows) ? rows : (rows?.items || rows?.variants || []);
        if (!cancelled) {
          const sorted = [...list].sort((a: any, b: any) => {
            const skuCompare = String(a.sku || '').localeCompare(String(b.sku || ''));
            if (skuCompare !== 0) return skuCompare;
            return String(a.id).localeCompare(String(b.id));
          });
          setVariants(sorted);
        }
      } catch {
        if (!cancelled) setVariants([]);
      }
    })();
    return () => {
      cancelled = true;
    };
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
        <div className="space-y-3">
          <div className="deco-panel">
            <div className="deco-panel-body grid gap-2 md:grid-cols-2">
              <div><span className="text-xs text-slate-500">Name</span><div className="text-sm font-semibold">{state.data.name || 'Unnamed product'}</div></div>
              <div><span className="text-xs text-slate-500">SKU</span><div className="text-sm font-semibold">{state.data.sku || state.data.id}</div></div>
              <div className="md:col-span-2"><span className="text-xs text-slate-500">Description</span><div className="text-sm">{state.data.description || 'No description yet.'}</div></div>
            </div>
          </div>

          <div className="deco-panel">
            <div className="deco-panel-head">Variants</div>
            {variants.length === 0 ? (
              <div className="deco-panel-body text-xs text-slate-500">No variants found for this product.</div>
            ) : (
              <div className="deco-table-wrap">
                <table className="deco-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Color</th>
                      <th>Size</th>
                      <th>Inventory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant: any) => (
                      <tr key={variant.id}>
                        <td className="font-semibold">{variant.sku || variant.id}</td>
                        <td>{variant.name || '—'}</td>
                        <td>{variant.color || '—'}</td>
                        <td>{variant.size || '—'}</td>
                        <td>{variant.inventoryQty ?? variant.inventoryCount ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
