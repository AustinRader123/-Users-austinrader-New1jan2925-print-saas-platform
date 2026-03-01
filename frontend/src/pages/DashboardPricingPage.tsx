import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

export default function DashboardPricingPage() {
  const [storeId, setStoreId] = useState('default');
  const [ruleSets, setRuleSets] = useState<any[]>([]);
  const [ruleSetName, setRuleSetName] = useState('');
  const [selectedRuleSetId, setSelectedRuleSetId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [ruleMethod, setRuleMethod] = useState('DECORATION_PER_ITEM');
  const [ruleConditions, setRuleConditions] = useState('{"decorationMethod":"SCREEN_PRINT"}');
  const [ruleEffects, setRuleEffects] = useState('{"perItem":1.75,"setupFee":25}');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qty, setQty] = useState(12);
  const [decorationMethod, setDecorationMethod] = useState('SCREEN_PRINT');
  const [locations, setLocations] = useState('front');
  const [result, setResult] = useState<any>(null);

  const load = async () => {
    const [rs, ps] = await Promise.all([
      apiClient.listPricingRuleSets(storeId),
      apiClient.listProducts(storeId, 0, 100),
    ]);
    setRuleSets(rs || []);
    setProducts(ps || []);
    if ((rs || []).length && !selectedRuleSetId) setSelectedRuleSetId(rs[0].id);
    const firstProduct = (ps || [])[0];
    if (firstProduct && !selectedProductId) {
      setSelectedProductId(firstProduct.id);
      const firstVariant = (firstProduct.variants || [])[0];
      if (firstVariant) setSelectedVariantId(firstVariant.id);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const createRuleSet = async () => {
    if (!ruleSetName.trim()) return;
    await apiClient.createPricingRuleSet({ storeId, name: ruleSetName.trim(), isDefault: ruleSets.length === 0, active: true });
    setRuleSetName('');
    await load();
  };

  const createRule = async () => {
    if (!selectedRuleSetId || !ruleName.trim()) return;
    await apiClient.createPricingRule(selectedRuleSetId, {
      storeId,
      name: ruleName.trim(),
      method: ruleMethod,
      conditions: JSON.parse(ruleConditions || '{}'),
      effects: JSON.parse(ruleEffects || '{}'),
      priority: 20,
      active: true,
    });
    setRuleName('');
    await load();
  };

  const runEvaluate = async () => {
    if (!selectedProductId) return;
    const data = await apiClient.evaluatePricing({
      storeId,
      productId: selectedProductId,
      variantId: selectedVariantId || undefined,
      qty,
      decorationMethod,
      locations: locations
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    });
    setResult(data);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Pricing</h1>
      <div className="mb-4">
        <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="storeId" />
      </div>

      <div className="border rounded p-4 bg-white mb-4">
        <h2 className="font-medium mb-2">Rule Sets</h2>
        <div className="flex gap-2 mb-3">
          <input className="input-base" value={ruleSetName} onChange={(e) => setRuleSetName(e.target.value)} placeholder="New rule set name" />
          <button className="btn btn-primary" onClick={createRuleSet}>Create</button>
        </div>
        <div className="space-y-2 text-sm">
          {ruleSets.map((rs) => (
            <button key={rs.id} onClick={() => setSelectedRuleSetId(rs.id)} className={`w-full text-left border rounded px-2 py-2 ${selectedRuleSetId === rs.id ? 'bg-slate-100' : ''}`}>
              <div className="font-medium">{rs.name}</div>
              <div>Active: {String(rs.active)} • Default: {String(rs.isDefault)} • Rules: {(rs.rules || []).length}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 border-t pt-4">
          <h3 className="font-medium mb-2">Add Rule (JSON)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input className="input-base" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Rule name" />
            <select className="input-base" value={ruleMethod} onChange={(e) => setRuleMethod(e.target.value)}>
              <option value="QUANTITY_BREAK">QUANTITY_BREAK</option>
              <option value="DECORATION_PER_ITEM">DECORATION_PER_ITEM</option>
            </select>
          </div>
          <textarea className="input-base w-full mb-2" rows={3} value={ruleConditions} onChange={(e) => setRuleConditions(e.target.value)} />
          <textarea className="input-base w-full mb-2" rows={3} value={ruleEffects} onChange={(e) => setRuleEffects(e.target.value)} />
          <button className="btn btn-primary" onClick={createRule}>Save Rule</button>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <h2 className="font-medium mb-2">Pricing Test Harness</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          <select className="input-base" value={selectedProductId} onChange={(e) => {
            setSelectedProductId(e.target.value);
            const next = products.find((p: any) => p.id === e.target.value);
            setSelectedVariantId((next?.variants || [])[0]?.id || '');
          }}>
            <option value="">Select product</option>
            {products.map((product: any) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
          <select className="input-base" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
            <option value="">Select variant</option>
            {(products.find((p: any) => p.id === selectedProductId)?.variants || []).map((v: any) => (
              <option key={v.id} value={v.id}>{v.name} ({v.sku})</option>
            ))}
          </select>
          <input className="input-base" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value || 1))} />
          <input className="input-base" value={decorationMethod} onChange={(e) => setDecorationMethod(e.target.value)} placeholder="Decoration method" />
          <input className="input-base" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="locations csv (front,back)" />
          <button className="btn btn-primary" onClick={runEvaluate}>Run</button>
        </div>
        {result && <pre className="text-xs whitespace-pre-wrap bg-slate-50 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>}
      </div>
    </div>
  );
}
