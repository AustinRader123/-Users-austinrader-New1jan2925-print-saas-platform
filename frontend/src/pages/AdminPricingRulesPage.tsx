import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import RuleEditor, { RuleDraft } from '../components/RuleEditor';

export default function AdminPricingRulesPage() {
  const [storeId, setStoreId] = useState('default');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState<RuleDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<RuleDraft | null>(null);

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
    if (!newRule) return;
    const payload = {
      storeId: newRule.storeId,
      name: newRule.name,
      method: newRule.method,
      breaks: newRule.breaks,
      // Provide productId for precise targeting though canonical schema is sent
      productId: selectedProductId,
    };
    const created = await apiClient.adminCreatePricingRule(payload as any);
    setRules([created, ...rules]);
    setNewRule(null);
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditingDraft({
      storeId: storeId,
      name: r.name,
      method: r.printMethod || 'SCREEN_PRINT',
      breaks: (r.quantityBreaklist?.breaks || []).map((b: any) => ({ minQty: b.minQty ?? b.qty ?? 1, unitPrice: b.unitPrice ?? 0 })),
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editingDraft) return;
    const patch: any = {
      name: editingDraft.name,
      method: editingDraft.method,
      breaks: editingDraft.breaks,
    };
    const updated = await apiClient.adminUpdatePricingRule(editingId, patch);
    setRules(rules.map((r) => (r.id === editingId ? updated : r)));
    setEditingId(null);
    setEditingDraft(null);
  };

  const removeRule = async (id: string) => {
    await apiClient.adminDeletePricingRule(id);
    setRules(rules.filter((r) => r.id !== id));
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
        <RuleEditor initial={undefined} onChange={(r) => setNewRule(r)} />
        <button className="btn btn-primary mt-3" onClick={createRule} disabled={!newRule}>Create Rule</button>
      </div>

      <div className="border rounded p-4 mb-6">
        <div className="font-medium mb-2">Existing Rules</div>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="border rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.name}</div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-secondary" onClick={() => startEdit(r)}>Edit</button>
                  <button className="btn btn-secondary" onClick={() => removeRule(r.id)}>Delete</button>
                </div>
              </div>
              <div>MinQty: {r.minQuantity} • MaxQty: {r.maxQuantity ?? '-'} • Active: {String(r.active)}</div>
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

      {editingId && editingDraft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="card p-4 w-[640px]">
            <div className="font-medium mb-2">Edit Rule</div>
            <RuleEditor initial={editingDraft} onChange={(d) => setEditingDraft(d)} />
            <div className="mt-3 flex items-center gap-2 justify-end">
              <button className="btn btn-secondary" onClick={() => { setEditingId(null); setEditingDraft(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
