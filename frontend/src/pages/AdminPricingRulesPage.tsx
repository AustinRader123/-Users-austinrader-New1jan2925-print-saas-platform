import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

export default function AdminPricingRulesPage() {
  const [storeId, setStoreId] = useState('default');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState<any>({ name: 'Standard', basePrice: 9.99, colorSurcharge: 0.5, perPlacementCost: 2.0, quantityBreaklist: [{ qty: 1, price: 9.99 }, { qty: 10, price: 8.99 }, { qty: 25, price: 7.99 }] });

  const [simVariantId, setSimVariantId] = useState('');
  const [simQty, setSimQty] = useState(1);
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const prods = await apiClient.listProducts(storeId);
      setProducts(prods);
      if (prods[0]) {
        setSelectedProductId(prods[0].id);
      }
    })();
  }, [storeId]);

  useEffect(() => {
    (async () => {
      if (selectedProductId) {
        const rs = await apiClient.adminListPricingRules(selectedProductId);
        setRules(rs);
        // pick first variant for simulator
        const prod = products.find((p) => p.id === selectedProductId);
        const variant = prod?.variants?.[0];
        if (variant) setSimVariantId(variant.id);
      }
    })();
  }, [selectedProductId]);

  const createRule = async () => {
    const payload = { ...newRule, productId: selectedProductId };
    const created = await apiClient.adminCreatePricingRule(payload);
    setRules([created, ...rules]);
  };

  const runSim = async () => {
    if (!simVariantId || !simQty) return;
    const res = await apiClient.calculatePrice(simVariantId, simQty);
    setSimResult(res);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Pricing Rules</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium">Store</label>
          <input className="input-base w-full" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Product</label>
          <select className="input-base w-full" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border rounded p-4 mb-6">
        <div className="font-medium mb-2">Create Rule</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input-base" placeholder="Name" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
          <input className="input-base" type="number" step="0.01" placeholder="Base Price" value={newRule.basePrice} onChange={(e) => setNewRule({ ...newRule, basePrice: parseFloat(e.target.value) })} />
          <input className="input-base" type="number" step="0.01" placeholder="Color Surcharge" value={newRule.colorSurcharge} onChange={(e) => setNewRule({ ...newRule, colorSurcharge: parseFloat(e.target.value) })} />
          <input className="input-base" type="number" step="0.01" placeholder="Per Placement Cost" value={newRule.perPlacementCost} onChange={(e) => setNewRule({ ...newRule, perPlacementCost: parseFloat(e.target.value) })} />
        </div>
        <div className="mt-3">
          <label className="text-sm">Quantity Breaks (JSON)</label>
          <textarea className="input-base w-full h-24" value={JSON.stringify(newRule.quantityBreaklist, null, 2)} onChange={(e) => { try { setNewRule({ ...newRule, quantityBreaklist: JSON.parse(e.target.value) }); } catch {} }} />
        </div>
        <button className="btn btn-primary mt-3" onClick={createRule}>Create Rule</button>
      </div>

      <div className="border rounded p-4 mb-6">
        <div className="font-medium mb-2">Existing Rules</div>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="border rounded p-3 text-sm">
              <div className="font-medium">{r.name}</div>
              <div>Base: ${r.basePrice} • Color: ${r.colorSurcharge} • Placement: ${r.perPlacementCost}</div>
              <div>Breaks: {JSON.stringify(r.quantityBreaklist)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded p-4">
        <div className="font-medium mb-2">Simulator</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="input-base" value={simVariantId} onChange={(e) => setSimVariantId(e.target.value)}>
            {products.find((p) => p.id === selectedProductId)?.variants?.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name} ({v.sku})</option>
            ))}
          </select>
          <input className="input-base" type="number" min={1} value={simQty} onChange={(e) => setSimQty(parseInt(e.target.value))} />
          <button className="btn btn-secondary" onClick={runSim}>Preview Price</button>
        </div>
        {simResult && (
          <div className="mt-3">
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(simResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
