import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  supplier: string;
  variants: number;
  updated: string;
};

const mockProducts: ProductRow[] = [
  { id: 'prod-1', sku: 'TS-BLK-001', name: 'Classic Tee', supplier: 'Core Apparel', variants: 12, updated: '2026-03-01T08:20:00Z' },
  { id: 'prod-2', sku: 'HD-NVY-002', name: 'Pullover Hoodie', supplier: 'North Supply', variants: 9, updated: '2026-03-01T07:30:00Z' },
];

export default function AppProductsPage() {
  const [query, setQuery] = useState('');
  const storeId = localStorage.getItem('storeId') || 'default';

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const result = await apiClient.listProducts(storeId, 0, 50);
        const rows = Array.isArray(result) ? result : (result?.items || result?.products || []);
        return rows.map((row: any) => ({
          id: String(row.id || row.productId),
          sku: String(row.sku || row.slug || row.id),
          name: String(row.name || 'Unnamed product'),
          supplier: String(row.supplierName || row.vendorName || '—'),
          variants: Number(row.variantsCount || row.variants?.length || 0),
          updated: String(row.updatedAt || row.createdAt || new Date().toISOString()),
        })) as ProductRow[];
      },
      () => mockProducts,
      'products.list'
    );
  }, [storeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = state.data || [];
    return !q ? rows : rows.filter((row) => row.name.toLowerCase().includes(q) || row.sku.toLowerCase().includes(q));
  }, [state.data, query]);

  return (
    <div className="deco-page">
      <PageHeader
        title="Products"
        subtitle="Catalog products, variants, and supplier mappings."
        actions={<Link className="deco-btn-primary" to="/app/products/import">Import</Link>}
      />

      <div className="deco-panel">
        <div className="deco-panel-body flex items-center gap-2">
          <input className="deco-input" placeholder="Search SKU or name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading products" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && filtered.length === 0 ? <EmptyState title="No products yet" description="Import products to start catalog operations." /> : null}

      {!state.loading && !state.error && filtered.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Supplier</th>
                  <th>Variants</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.sku}</td>
                    <td>{row.name}</td>
                    <td>{row.supplier}</td>
                    <td>{row.variants}</td>
                    <td>{new Date(row.updated).toLocaleString()}</td>
                    <td><Link className="deco-btn" to={`/app/products/${row.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
