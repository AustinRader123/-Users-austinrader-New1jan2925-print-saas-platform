import React from 'react';
import { apiClient } from '../lib/api';

export default function DashboardPurchasingPage() {
  const [tenantId, setTenantId] = React.useState(() => localStorage.getItem('tenantId') || '');
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || '');
  const [locationId, setLocationId] = React.useState('');

  const [locations, setLocations] = React.useState<any[]>([]);
  const [rows, setRows] = React.useState<any[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [detail, setDetail] = React.useState<any>(null);

  const [poForm, setPoForm] = React.useState({ supplierName: '', expectedAt: '' });
  const [lineForm, setLineForm] = React.useState({ skuId: '', qtyOrdered: '1', unitCostCents: '' });
  const [receiveQty, setReceiveQty] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const canQuery = Boolean(tenantId.trim() && storeId.trim());

  const load = React.useCallback(async () => {
    if (!canQuery) return;
    const [locationData, listData] = await Promise.all([
      apiClient.listInventoryLocations(storeId.trim(), tenantId.trim()),
      apiClient.listPurchasingPos(storeId.trim(), tenantId.trim()),
    ]);
    setLocations(Array.isArray(locationData) ? locationData : []);
    setRows(Array.isArray(listData) ? listData : []);
  }, [canQuery, storeId, tenantId]);

  const loadDetail = React.useCallback(async () => {
    if (!canQuery || !selectedId) {
      setDetail(null);
      return;
    }
    const data = await apiClient.getPurchasingPo(selectedId, storeId.trim(), tenantId.trim());
    setDetail(data);
  }, [canQuery, selectedId, storeId, tenantId]);

  React.useEffect(() => {
    load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load purchasing data'));
  }, [load]);

  React.useEffect(() => {
    loadDetail().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load purchase order'));
  }, [loadDetail]);

  const createPo = async () => {
    const row = await apiClient.createPurchasingPo({
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      supplierName: poForm.supplierName,
      expectedAt: poForm.expectedAt || undefined,
    });
    setSelectedId(row.id);
    setPoForm({ supplierName: '', expectedAt: '' });
    setMessage('Purchase order created');
    await load();
    await loadDetail();
  };

  const addLine = async () => {
    if (!selectedId) return;
    await apiClient.addPurchasingPoLine(selectedId, {
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      skuId: lineForm.skuId || undefined,
      qtyOrdered: Math.max(1, Number(lineForm.qtyOrdered || 1)),
      unitCostCents: lineForm.unitCostCents ? Number(lineForm.unitCostCents) : undefined,
    });
    setLineForm({ skuId: '', qtyOrdered: '1', unitCostCents: '' });
    setMessage('Line added');
    await load();
    await loadDetail();
  };

  const sendPo = async () => {
    if (!selectedId) return;
    await apiClient.sendPurchasingPo(selectedId, { tenantId: tenantId.trim(), storeId: storeId.trim() });
    setMessage('PO marked as SENT');
    await load();
    await loadDetail();
  };

  const receivePo = async () => {
    if (!selectedId || !locationId) return;
    const lines = (detail?.lines || [])
      .map((line: any) => ({ lineId: line.id, qtyReceived: Number(receiveQty[line.id] || 0) }))
      .filter((row: any) => row.qtyReceived > 0);

    if (!lines.length) return;

    await apiClient.receivePurchasingPo(selectedId, {
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      locationId,
      lines,
    });
    setReceiveQty({});
    setMessage('Receipt posted');
    await load();
    await loadDetail();
  };

  const closePo = async () => {
    if (!selectedId) return;
    await apiClient.closePurchasingPo(selectedId, { tenantId: tenantId.trim(), storeId: storeId.trim() });
    setMessage('PO closed');
    await load();
    await loadDetail();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Purchasing</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input-base" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <select className="input-base" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Receipt location</option>
            {locations.map((row) => <option key={row.id} value={row.id}>{row.code}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => load()}>Refresh</button>
          {message && <span className="text-xs text-emerald-700">{message}</span>}
          {error && <span className="text-xs text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 rounded border bg-white p-3 space-y-3">
          <div className="text-sm font-semibold">Create PO</div>
          <input className="input-base" placeholder="Supplier" value={poForm.supplierName} onChange={(e) => setPoForm((v) => ({ ...v, supplierName: e.target.value }))} />
          <input className="input-base" type="date" value={poForm.expectedAt} onChange={(e) => setPoForm((v) => ({ ...v, expectedAt: e.target.value }))} />
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => createPo().catch((err: any) => setError(err?.response?.data?.error || 'Failed to create PO'))}>Create</button>

          <div className="text-sm font-semibold pt-2 border-t">Purchase Orders</div>
          <div className="max-h-96 overflow-auto space-y-1">
            {rows.map((row) => (
              <button key={row.id} className={`w-full text-left rounded border p-2 text-xs ${selectedId === row.id ? 'border-blue-500' : 'border-slate-200'}`} onClick={() => setSelectedId(row.id)}>
                <div className="font-medium">{row.id}</div>
                <div className="text-slate-600">{row.supplierName || 'Supplier'} • {row.status}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 rounded border bg-white p-3 space-y-3">
          <div className="text-sm font-semibold">PO Detail</div>
          {!detail && <div className="text-xs text-slate-500">Select a purchase order.</div>}
          {detail && (
            <>
              <div className="text-xs">{detail.id} • {detail.status} • {detail.supplierName || 'Supplier'}</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input className="input-base" placeholder="skuId" value={lineForm.skuId} onChange={(e) => setLineForm((v) => ({ ...v, skuId: e.target.value }))} />
                <input className="input-base" placeholder="qty ordered" value={lineForm.qtyOrdered} onChange={(e) => setLineForm((v) => ({ ...v, qtyOrdered: e.target.value }))} />
                <input className="input-base" placeholder="unit cost cents" value={lineForm.unitCostCents} onChange={(e) => setLineForm((v) => ({ ...v, unitCostCents: e.target.value }))} />
                <button className="btn btn-secondary" onClick={() => addLine().catch((err: any) => setError(err?.response?.data?.error || 'Failed to add line'))}>Add line</button>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-1 pr-2">Line</th>
                      <th className="py-1 pr-2">SKU</th>
                      <th className="py-1 pr-2">Ordered</th>
                      <th className="py-1 pr-2">Received</th>
                      <th className="py-1 pr-2">Receive now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.lines || []).map((line: any) => (
                      <tr key={line.id} className="border-b">
                        <td className="py-1 pr-2">{line.id.slice(0, 8)}</td>
                        <td className="py-1 pr-2">{line.sku?.skuCode || line.skuId || 'n/a'}</td>
                        <td className="py-1 pr-2">{line.qtyOrdered}</td>
                        <td className="py-1 pr-2">{line.qtyReceived}</td>
                        <td className="py-1 pr-2">
                          <input
                            className="input-base"
                            value={receiveQty[line.id] || ''}
                            onChange={(e) => setReceiveQty((v) => ({ ...v, [line.id]: e.target.value }))}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="btn btn-secondary" onClick={() => sendPo().catch((err: any) => setError(err?.response?.data?.error || 'Failed to send PO'))}>Mark SENT</button>
                <button className="btn btn-secondary" onClick={() => receivePo().catch((err: any) => setError(err?.response?.data?.error || 'Failed to receive PO'))}>Receive</button>
                <button className="btn btn-secondary" onClick={() => closePo().catch((err: any) => setError(err?.response?.data?.error || 'Failed to close PO'))}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
