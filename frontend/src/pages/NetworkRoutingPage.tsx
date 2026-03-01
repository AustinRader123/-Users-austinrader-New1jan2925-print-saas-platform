import React from 'react';
import { apiClient } from '../lib/api';

const ROUTED_STATUSES = ['PROPOSED', 'ACCEPTED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED'] as const;

export default function NetworkRoutingPage() {
  const [tenantId, setTenantId] = React.useState(() => localStorage.getItem('tenantId') || '');
  const [networkId, setNetworkId] = React.useState('');
  const [rules, setRules] = React.useState<any[]>([]);
  const [routedOrders, setRoutedOrders] = React.useState<any[]>([]);

  const [ruleName, setRuleName] = React.useState('Default hub route');
  const [strategy, setStrategy] = React.useState<'MANUAL' | 'GEO' | 'CAPACITY' | 'PRIORITY'>('MANUAL');
  const [configJson, setConfigJson] = React.useState('{"manualToStoreId":""}');

  const [orderId, setOrderId] = React.useState('');
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    if (!networkId.trim()) return;
    const [ruleRows, routedRows] = await Promise.all([
      apiClient.listNetworkRoutingRules(networkId.trim(), tenantId || undefined),
      apiClient.listRoutedOrders(networkId.trim(), undefined, tenantId || undefined),
    ]);
    setRules(Array.isArray(ruleRows) ? ruleRows : []);
    setRoutedOrders(Array.isArray(routedRows) ? routedRows : []);
  }, [networkId, tenantId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveRule = async () => {
    if (!networkId.trim() || !ruleName.trim()) return;
    let parsedConfig: Record<string, any> = {};
    try {
      parsedConfig = configJson.trim() ? JSON.parse(configJson) : {};
    } catch {
      setMessage('Invalid rule config JSON');
      return;
    }

    await apiClient.upsertNetworkRoutingRule(networkId.trim(), {
      tenantId: tenantId || undefined,
      name: ruleName.trim(),
      strategy,
      config: parsedConfig,
      enabled: true,
    });

    setMessage('Routing rule saved');
    await load();
  };

  const routeOrder = async () => {
    if (!orderId.trim()) return;
    const result = await apiClient.routeOrder(orderId.trim(), tenantId || undefined);
    setMessage(result?.routed ? 'Order routed' : `No route: ${result?.reason || 'unknown'}`);
    await load();
  };

  const updateStatus = async (routedOrderId: string, status: typeof ROUTED_STATUSES[number]) => {
    await apiClient.updateRoutedOrderStatus(networkId.trim(), routedOrderId, status, tenantId || undefined);
    await load();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Network Routing</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input-base" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
          <input className="input-base" placeholder="networkId" value={networkId} onChange={(e) => setNetworkId(e.target.value)} />
          <button className="btn btn-secondary" onClick={load}>Refresh</button>
        </div>
        {message && <div className="text-xs text-emerald-700">{message}</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Routing Rule</div>
          <input className="input-base" placeholder="Rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
          <select className="input-base" value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
            <option value="MANUAL">MANUAL</option>
            <option value="PRIORITY">PRIORITY</option>
            <option value="CAPACITY">CAPACITY</option>
            <option value="GEO">GEO</option>
          </select>
          <textarea className="input-base min-h-[110px]" value={configJson} onChange={(e) => setConfigJson(e.target.value)} />
          <button className="btn btn-primary" onClick={saveRule} disabled={!networkId.trim()}>Save Rule</button>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Manual Route Order</div>
          <input className="input-base" placeholder="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          <button className="btn btn-secondary" onClick={routeOrder}>Route Order</button>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Rules</div>
        <div className="space-y-1 text-sm">
          {rules.map((r) => (
            <div key={r.id} className="border rounded p-2">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-slate-600">{r.strategy} • {r.enabled ? 'Enabled' : 'Disabled'}</div>
            </div>
          ))}
          {rules.length === 0 && <div className="text-xs text-slate-500">No routing rules.</div>}
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Routed Orders</div>
        <div className="space-y-2 text-sm max-h-[420px] overflow-auto">
          {routedOrders.map((row) => (
            <div key={row.id} className="border rounded p-2">
              <div className="font-medium">{row.order?.orderNumber || row.orderId}</div>
              <div className="text-xs text-slate-600">From {row.fromStore?.name || row.fromStoreId} → {row.toStore?.name || row.toStoreId}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {ROUTED_STATUSES.map((st) => (
                  <button key={st} className="btn btn-secondary" onClick={() => updateStatus(row.id, st)}>
                    {st}
                  </button>
                ))}
              </div>
              <div className="text-xs mt-1">Current: {row.status}</div>
            </div>
          ))}
          {routedOrders.length === 0 && <div className="text-xs text-slate-500">No routed orders found.</div>}
        </div>
      </div>
    </div>
  );
}
