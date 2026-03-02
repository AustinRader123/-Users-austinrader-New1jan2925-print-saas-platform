import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';
import Table from '../../ui/Table';

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
  const navigate = useNavigate();
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
    const rows = state.data || [];
    const filteredRows = rows;
    return filteredRows.sort((a, b) => {
      const updatedDiff = new Date(b.updated).getTime() - new Date(a.updated).getTime();
      if (updatedDiff !== 0) return updatedDiff;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [state.data]);

  return (
    <div className="deco-page">
      <PageHeader
        title="Products"
        subtitle="Catalog products, variants, and supplier mappings."
        actions={<Link className="deco-btn-primary" to="/app/products/import">Import</Link>}
      />

      {state.loading ? <LoadingState title="Loading products" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && filtered.length === 0 ? <EmptyState title="No products yet" description="Import products to start catalog operations." /> : null}

      {!state.loading && !state.error && filtered.length > 0 ? (
        <Table
          title="Products"
          rows={filtered}
          pageSize={10}
          searchPlaceholder="Search SKU or product name"
          searchBy={(row, value) => row.sku.toLowerCase().includes(value) || row.name.toLowerCase().includes(value)}
          getRowId={(row) => row.id}
          columns={[
            { key: 'sku', label: 'SKU', sortable: true, sortValue: (row) => row.sku, render: (row) => <span className="font-semibold">{row.sku}</span> },
            { key: 'name', label: 'Name', sortable: true, sortValue: (row) => row.name, render: (row) => row.name },
            { key: 'supplier', label: 'Supplier', sortable: true, sortValue: (row) => row.supplier, render: (row) => row.supplier },
            { key: 'variants', label: 'Variants', sortable: true, sortValue: (row) => row.variants, render: (row) => row.variants },
            {
              key: 'updated',
              label: 'Updated',
              sortable: true,
              sortValue: (row) => new Date(row.updated).getTime(),
              render: (row) => new Date(row.updated).toLocaleString(),
            },
          ]}
          rowActions={[
            {
              label: 'View',
              onClick: (row) => navigate(`/app/products/${row.id}`),
            },
          ]}
          onBulkAction={(rows) => console.info('Selected products', rows.map((row) => row.id))}
          bulkActionLabel="Export"
        />
      ) : null}
    </div>
  );
}
