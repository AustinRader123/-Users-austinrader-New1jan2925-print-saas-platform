import React from 'react';
import { apiClient } from '../lib/api';

export default function AdminInventoryPage() {
  const storeId = 'default';
  const [rows, setRows] = React.useState<any[]>([]);
  const [variantId, setVariantId] = React.useState('');
  const [qty, setQty] = React.useState(0);

  const load = React.useCallback(async () => {
    const data = await apiClient.listInventory(storeId);
    setRows(data || []);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const adjust = async () => {
    if (!variantId || !qty) return;
    await apiClient.adjustInventory({ storeId, variantId, qty });
    setQty(0);
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="input-base" placeholder="Variant ID" value={variantId} onChange={(e) => setVariantId(e.target.value)} />
        <input className="input-base" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value || 0))} />
        <button className="btn btn-primary" onClick={adjust}>Adjust</button>
      </div>
      <div className="rounded border bg-white divide-y">
        {rows.map((row) => (
          <div key={row.id} className="p-3 text-sm flex justify-between">
            <span>{row.variant?.sku || row.variantId}</span>
            <span className={row.onHand <= row.lowStockThreshold ? 'text-rose-600' : 'text-slate-600'}>onHand {row.onHand}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
