import React from 'react';
import { apiClient } from '../lib/api';

export default function AdminPurchaseOrdersPage() {
  const storeId = 'default';
  const [rows, setRows] = React.useState<any[]>([]);
  const [supplierName, setSupplierName] = React.useState('');

  const load = React.useCallback(async () => {
    const data = await apiClient.listPurchaseOrders(storeId);
    setRows(data || []);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!supplierName) return;
    await apiClient.createPurchaseOrder({ storeId, supplierName });
    setSupplierName('');
    await load();
  };

  const receive = async (id: string) => {
    const po = await apiClient.getPurchaseOrder(storeId, id);
    const lines = (po?.lines || []).map((line: any) => ({ lineId: line.id, qtyReceived: Math.max(0, line.qtyOrdered - line.qtyReceived) }));
    if (lines.length === 0) return;
    await apiClient.receivePurchaseOrder(id, { storeId, lines });
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Purchase Orders</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="input-base" placeholder="Supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        <div />
        <button className="btn btn-primary" onClick={create}>Create PO</button>
      </div>
      <div className="rounded border bg-white divide-y">
        {rows.map((row) => (
          <div key={row.id} className="p-3 text-sm flex items-center justify-between gap-3">
            <span>{row.poNumber} · {row.supplierName}</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">{row.status}</span>
              <button className="btn btn-secondary" onClick={() => receive(row.id)}>Receive Remaining</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
