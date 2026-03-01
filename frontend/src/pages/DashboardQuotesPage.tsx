import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api';

export default function DashboardQuotesPage() {
  const [storeId, setStoreId] = useState('default');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qty, setQty] = useState(12);
  const [decorationMethod, setDecorationMethod] = useState('SCREEN_PRINT');
  const [decorationLocations, setDecorationLocations] = useState('front');
  const [printSizeTier, setPrintSizeTier] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('MEDIUM');
  const [colorCount, setColorCount] = useState(1);
  const [stitchCount, setStitchCount] = useState(4000);
  const [rush, setRush] = useState(false);
  const [weightOz, setWeightOz] = useState(8);
  const [actionMessage, setActionMessage] = useState('');

  const selectedProduct = useMemo(() => products.find((p: any) => p.id === selectedProductId), [products, selectedProductId]);

  const load = async () => {
    const [q, p] = await Promise.all([
      apiClient.listQuotes(storeId),
      apiClient.listProducts(storeId, 0, 100),
    ]);
    setQuotes(q || []);
    setProducts(p || []);
    const nextId = selectedQuoteId || (q || [])[0]?.id;
    if (nextId) {
      setSelectedQuoteId(nextId);
      const detail = await apiClient.getQuote(nextId, storeId);
      setSelectedQuote(detail);
    } else {
      setSelectedQuote(null);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const createQuote = async () => {
    await apiClient.createQuote({
      storeId,
      customerId: customerId.trim() || undefined,
      customerName: customerName.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
    });
    setCustomerId('');
    setCustomerName('');
    setCustomerEmail('');
    await load();
  };

  const updateStatus = async (status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'CONVERTED') => {
    if (!selectedQuoteId) return;
    await apiClient.updateQuoteStatus(selectedQuoteId, { storeId, status });
    await load();
  };

  const addItem = async () => {
    if (!selectedQuoteId || !selectedProductId) return;
    await apiClient.addQuoteItem(selectedQuoteId, {
      storeId,
      productId: selectedProductId,
      variantId: selectedVariantId || undefined,
      qty: { units: qty },
      decorationMethod,
      decorationLocations: decorationLocations
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      decorationInput: {
        printSizeTier,
        colorCount,
        stitchCount,
        rush,
        weightOz,
      },
      printSizeTier,
      colorCount,
      stitchCount,
      rush,
      weightOz,
    });
    await load();
  };

  const repriceQuote = async () => {
    if (!selectedQuoteId) return;
    await apiClient.repriceQuote(selectedQuoteId, storeId);
    setActionMessage('Quote repriced with latest pricing rules/config.');
    await load();
  };

  const convertToOrder = async () => {
    if (!selectedQuoteId) return;
    const order = await apiClient.convertQuoteToOrder(selectedQuoteId, storeId);
    setActionMessage(`Quote converted to order ${order.orderNumber || order.id}`);
    await load();
  };

  const requestProof = async () => {
    if (!selectedQuote?.convertedOrder?.id) return;
    const approval = await apiClient.createProofRequest({
      storeId,
      orderId: selectedQuote.convertedOrder.id,
      recipientEmail: selectedQuote.customerEmail || undefined,
      message: 'Please approve your design proof.',
      expiresHours: 72,
    });
    const publicUrl = approval.publicUrl || (approval.token ? `/proof/${approval.token}` : '');
    if (publicUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(publicUrl);
      setActionMessage(`Proof link copied: ${publicUrl}`);
      return;
    }
    setActionMessage(`Proof request created: ${publicUrl || approval.token}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Quotes</h1>
      <div className="mb-4">
        <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="storeId" />
      </div>

      <div className="border rounded p-4 bg-white mb-4">
        <h2 className="font-medium mb-2">Create Quote</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="input-base" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Customer ID (optional)" />
          <input className="input-base" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
          <input className="input-base" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Customer email" />
          <button className="btn btn-primary" onClick={createQuote}>Create Quote</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <h2 className="font-medium mb-2">Quotes List</h2>
          <div className="space-y-2 text-sm">
            {quotes.map((q) => (
              <button
                key={q.id}
                onClick={async () => {
                  setSelectedQuoteId(q.id);
                  const detail = await apiClient.getQuote(q.id, storeId);
                  setSelectedQuote(detail);
                }}
                className={`w-full text-left border rounded px-2 py-2 ${selectedQuoteId === q.id ? 'bg-slate-100' : ''}`}
              >
                <div className="font-medium">{q.quoteNumber} • {q.customerName || q.customerId || 'No customer'}</div>
                <div>Status: {q.status} • Total: ${Number(q.total || 0).toFixed(2)}</div>
                <div>Items: {(q.lineItems || []).length}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded p-4 bg-white">
          <h2 className="font-medium mb-2">Quote Detail</h2>
          {actionMessage && <div className="mb-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">{actionMessage}</div>}
          <div className="flex gap-2 mb-3">
            <button className="btn btn-secondary" onClick={() => updateStatus('SENT')}>Mark Sent</button>
            <button className="btn btn-secondary" onClick={() => updateStatus('APPROVED')}>Mark Approved</button>
            <button className="btn btn-secondary" onClick={() => updateStatus('DECLINED')}>Mark Declined</button>
            <button className="btn btn-primary" onClick={convertToOrder}>Convert to Order</button>
            <button className="btn btn-secondary" onClick={repriceQuote}>Reprice Quote</button>
            <button className="btn btn-secondary" onClick={requestProof} disabled={!selectedQuote?.convertedOrder?.id}>Request Proof</button>
          </div>
          <h3 className="font-medium mb-2">Add Line Item</h3>
          <div className="space-y-2">
            <select className="input-base w-full" value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); setSelectedVariantId(''); }}>
              <option value="">Select product</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="input-base w-full" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
              <option value="">No variant</option>
              {(selectedProduct?.variants || []).map((v: any) => <option key={v.id} value={v.id}>{v.name} ({v.sku})</option>)}
            </select>
            <input className="input-base w-full" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value || 1))} placeholder="Quantity" />
            <input className="input-base w-full" value={decorationMethod} onChange={(e) => setDecorationMethod(e.target.value)} placeholder="Decoration method" />
            <input className="input-base w-full" value={decorationLocations} onChange={(e) => setDecorationLocations(e.target.value)} placeholder="Decoration locations csv" />
            <select className="input-base w-full" value={printSizeTier} onChange={(e) => setPrintSizeTier(e.target.value as 'SMALL' | 'MEDIUM' | 'LARGE')}>
              <option value="SMALL">SMALL</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LARGE">LARGE</option>
            </select>
            <input className="input-base w-full" type="number" min={1} value={colorCount} onChange={(e) => setColorCount(Number(e.target.value || 1))} placeholder="Color count" />
            <input className="input-base w-full" type="number" min={0} value={stitchCount} onChange={(e) => setStitchCount(Number(e.target.value || 0))} placeholder="Stitch count" />
            <input className="input-base w-full" type="number" min={0} step="0.1" value={weightOz} onChange={(e) => setWeightOz(Number(e.target.value || 0))} placeholder="Weight (oz)" />
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} />Rush</label>
            <button className="btn btn-primary w-full" onClick={addItem}>Add Line Item</button>
          </div>

          {selectedQuote && (
            <div className="mt-4 border-t pt-3 space-y-2">
              {selectedQuote.convertedOrder && (
                <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs">
                  Converted Order: {selectedQuote.convertedOrder.orderNumber || selectedQuote.convertedOrder.id}
                </div>
              )}
              {(selectedQuote.lineItems || []).map((item: any) => (
                <div key={item.id} className="rounded border p-2 text-xs">
                  <div className="font-medium">{item.description || item.productId}</div>
                  <div>Qty: {item.quantity} • Unit: ${Number(item.unitPrice || 0).toFixed(2)} • Total: ${Number(item.lineTotal || 0).toFixed(2)}</div>
                  {item.pricingSnapshot && (
                    <div className="mt-1 text-[11px] text-slate-700">
                      Margin {Number(item.pricingSnapshot?.effectiveMarginPct || 0).toFixed(2)}% • Profit ${Number(item.pricingSnapshot?.projectedProfit || 0).toFixed(2)}
                    </div>
                  )}
                  {item.pricingSnapshot && (
                    <pre className="mt-1 bg-slate-50 p-2 rounded whitespace-pre-wrap">{JSON.stringify(item.pricingSnapshot, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
