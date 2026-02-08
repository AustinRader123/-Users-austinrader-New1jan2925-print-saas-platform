import React, { useEffect, useState } from 'react';
import DataTable, { Column } from '../components/DataTable';
import { listProducts } from '../services/products.service';
import { useNavigate } from 'react-router-dom';

type ProductRow = { id: string; name: string; sku?: string; category?: string; variants?: number; price?: number };

export default function ProductsCatalogPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [grid, setGrid] = useState(false);
  const navigate = useNavigate();

  const columns: Column<ProductRow>[] = [
    { key: 'name', header: 'Product', sortable: true, render: (r) => (
      <button className="text-blue-600 hover:underline" onClick={() => navigate(`/app/products/${r.id}/edit`)}>{r.name}</button>
    ) },
    { key: 'sku', header: 'SKU', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'variants', header: 'Variants', sortable: true },
    { key: 'price', header: 'Base Price', sortable: true, render: (r) => `$${(r.price || 0).toFixed(2)}` },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listProducts('default', 0, 50);
        const normalized = (data || []).map((p: any) => ({
          id: String(p.id || p.productId || p.sku || Math.random()),
          name: p.name || p.title || 'Product',
          sku: p.sku || p.productId || '—',
          category: p.category || '—',
          variants: Array.isArray(p.variants) ? p.variants.length : (p.variantCount || 0),
          price: p.basePrice || p.price || 0,
        }));
        setRows(normalized);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, sort]);

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Product Catalog</div>
        <div className="flex items-center gap-2">
          <button className="rounded-sm border px-2 py-1 text-xs" onClick={() => setGrid((g) => !g)}>{grid ? 'Table' : 'Grid'}</button>
          <button className="rounded-sm border px-2 py-1 text-xs" onClick={() => navigate('/app/products/new')}>Add Product</button>
        </div>
      </div>
      {grid ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded border border-slate-200 bg-white p-2 text-sm">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-slate-600">{r.sku}</div>
              <div className="text-xs text-slate-600">Variants: {r.variants}</div>
              <div className="mt-1">
                <button className="rounded-sm border px-2 py-1 text-xs" onClick={() => navigate(`/app/products/${r.id}/edit`)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable<ProductRow>
          columns={columns}
          rows={rows}
          page={page}
          pageSize={20}
          total={rows.length}
          onPageChange={setPage}
          onSortChange={(key, dir) => setSort({ key, dir })}
          sort={sort}
          getRowId={(r) => r.id}
        />
      )}
    </div>
  );
}
