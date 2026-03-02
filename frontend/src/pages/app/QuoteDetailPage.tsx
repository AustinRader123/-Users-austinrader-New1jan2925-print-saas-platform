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
  const [products, setProducts] = React.useState<any[]>([]);
  const [variants, setVariants] = React.useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [selectedVariantId, setSelectedVariantId] = React.useState('');
  const [units, setUnits] = React.useState(12);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        return apiClient.getQuote(id, storeId);
      },
      () => ({ id, quoteNumber: `Q-${id.slice(0, 5) || 'NA'}`, status: 'DRAFT', customerName: 'Mock Customer', total: 0, items: [] }),
      `quotes.detail.${id}`
    );
  }, [id, storeId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await apiClient.listProducts(storeId, 0, 100);
        const rows = Array.isArray(result) ? result : (result?.items || result?.products || []);
        if (!cancelled) {
          const sorted = [...rows].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
          setProducts(sorted);
          if (sorted.length > 0) setSelectedProductId(String(sorted[0].id));
        }
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!selectedProductId) {
      setVariants([]);
      setSelectedVariantId('');
      return;
    }
    (async () => {
      try {
        const rows = await apiClient.listVariants(selectedProductId, storeId);
        const list = Array.isArray(rows) ? rows : (rows?.items || rows?.variants || []);
        if (!cancelled) {
          const sorted = [...list].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
          setVariants(sorted);
          setSelectedVariantId(sorted[0]?.id ? String(sorted[0].id) : '');
        }
      } catch {
        if (!cancelled) {
          setVariants([]);
          setSelectedVariantId('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProductId, storeId]);

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

  const addLineItem = async () => {
    if (!selectedProductId) {
      setActionMessage('Select a product first.');
      return;
    }
    if (!Number.isFinite(units) || units < 1) {
      setActionMessage('Units must be at least 1.');
      return;
    }
    setActionMessage(null);
    try {
      await apiClient.addQuoteItem(id, {
        storeId,
        productId: selectedProductId,
        ...(selectedVariantId ? { variantId: selectedVariantId } : {}),
        qty: { units: Math.max(1, Math.floor(units)) },
      } as any);
      setActionMessage('Line item added.');
      await state.refetch();
    } catch (error: any) {
      setActionMessage(error?.message || 'Failed to add line item.');
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

          <div className="deco-panel">
            <div className="deco-panel-head">Add line item</div>
            <div className="deco-panel-body grid gap-2 md:grid-cols-4">
              <label className="text-xs text-slate-600">Product
                <select className="deco-input mt-1 w-full" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                  {products.map((product: any) => (
                    <option key={product.id} value={product.id}>{product.name || product.id}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">Variant
                <select className="deco-input mt-1 w-full" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
                  <option value="">Default variant</option>
                  {variants.map((variant: any) => (
                    <option key={variant.id} value={variant.id}>{variant.name || variant.sku || variant.id}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">Units
                <input className="deco-input mt-1 w-full" type="number" min={1} value={units} onChange={(e) => setUnits(Number(e.target.value || 1))} />
              </label>
              <div className="flex items-end">
                <button className="deco-btn-primary" onClick={addLineItem}>Add Item</button>
              </div>
            </div>
          </div>

          <div className="deco-panel">
            <div className="deco-panel-head">Line items</div>
            <div className="deco-table-wrap">
              <table className="deco-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {((state.data.lineItems || state.data.items || []) as any[])
                    .slice()
                    .sort((a: any, b: any) => {
                      const createdDiff = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                      if (createdDiff !== 0) return createdDiff;
                      return String(a.id).localeCompare(String(b.id));
                    })
                    .map((item: any) => (
                      <tr key={item.id}>
                        <td>{item.productId || item.product?.name || '—'}</td>
                        <td>{item.variantId || item.productVariantId || '—'}</td>
                        <td>{item.quantity || item.qty?.units || 0}</td>
                        <td>${Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td>${Number(item.lineTotal || 0).toFixed(2)}</td>
                        <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="deco-panel-body border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Subtotal</span>
              <strong>${Number(state.data.subtotal || state.data.total || 0).toFixed(2)}</strong>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
