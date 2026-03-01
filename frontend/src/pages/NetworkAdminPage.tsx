import React from 'react';
import { apiClient } from '../lib/api';

export default function NetworkAdminPage() {
  const [tenantId, setTenantId] = React.useState(() => localStorage.getItem('tenantId') || '');
  const [networks, setNetworks] = React.useState<any[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = React.useState('');
  const [overview, setOverview] = React.useState<any>(null);
  const [stores, setStores] = React.useState<any[]>([]);
  const [sharedItems, setSharedItems] = React.useState<any[]>([]);
  const [bindings, setBindings] = React.useState<any[]>([]);

  const [newNetworkName, setNewNetworkName] = React.useState('');
  const [ownerStoreId, setOwnerStoreId] = React.useState('');

  const [childStoreName, setChildStoreName] = React.useState('');
  const [childStoreSlug, setChildStoreSlug] = React.useState('');
  const [childStoreRole, setChildStoreRole] = React.useState<'HUB' | 'SPOKE'>('SPOKE');

  const [addStoreId, setAddStoreId] = React.useState('');
  const [addStoreRole, setAddStoreRole] = React.useState<'OWNER' | 'HUB' | 'SPOKE'>('SPOKE');

  const [publishProductId, setPublishProductId] = React.useState('');
  const [publishRuleSetId, setPublishRuleSetId] = React.useState('');
  const [applyStoreId, setApplyStoreId] = React.useState('');
  const [status, setStatus] = React.useState<string>('');

  const loadNetworks = React.useCallback(async () => {
    const rows = await apiClient.listNetworks(tenantId || undefined);
    const arr = Array.isArray(rows) ? rows : [];
    setNetworks(arr);

    if (!selectedNetworkId && arr[0]?.id) {
      setSelectedNetworkId(arr[0].id);
    }
  }, [tenantId, selectedNetworkId]);

  const loadSelected = React.useCallback(async () => {
    if (!selectedNetworkId) return;
    const [ov, storeRows, sharedRows] = await Promise.all([
      apiClient.getNetworkOverview(selectedNetworkId, tenantId || undefined),
      apiClient.listNetworkStores(selectedNetworkId, tenantId || undefined),
      apiClient.listNetworkSharedItems(selectedNetworkId, tenantId || undefined),
    ]);

    setOverview(ov || null);
    setStores(Array.isArray(storeRows) ? storeRows : []);
    setSharedItems(Array.isArray(sharedRows) ? sharedRows : []);

    if (applyStoreId) {
      const bindingRows = await apiClient.listNetworkBindings(selectedNetworkId, applyStoreId, tenantId || undefined);
      setBindings(Array.isArray(bindingRows) ? bindingRows : []);
    }
  }, [selectedNetworkId, tenantId, applyStoreId]);

  React.useEffect(() => {
    loadNetworks();
  }, [loadNetworks]);

  React.useEffect(() => {
    loadSelected();
  }, [loadSelected]);

  const createNetwork = async () => {
    if (!newNetworkName.trim() || !ownerStoreId.trim()) return;
    await apiClient.createNetwork({
      tenantId: tenantId || undefined,
      name: newNetworkName.trim(),
      ownerStoreId: ownerStoreId.trim(),
    });
    setNewNetworkName('');
    await loadNetworks();
    setStatus('Network created');
  };

  const createChildStore = async () => {
    if (!selectedNetworkId || !childStoreName.trim() || !childStoreSlug.trim()) return;
    await apiClient.createNetworkChildStore(selectedNetworkId, {
      tenantId: tenantId || undefined,
      name: childStoreName.trim(),
      slug: childStoreSlug.trim(),
      role: childStoreRole,
    });
    setChildStoreName('');
    setChildStoreSlug('');
    await loadSelected();
    setStatus('Child store created');
  };

  const addStore = async () => {
    if (!selectedNetworkId || !addStoreId.trim()) return;
    await apiClient.addNetworkStore(selectedNetworkId, {
      tenantId: tenantId || undefined,
      storeId: addStoreId.trim(),
      role: addStoreRole,
    });
    setAddStoreId('');
    await loadSelected();
    setStatus('Store added to network');
  };

  const publishProduct = async () => {
    if (!selectedNetworkId || !publishProductId.trim()) return;
    await apiClient.publishNetworkProduct(selectedNetworkId, publishProductId.trim(), tenantId || undefined);
    setPublishProductId('');
    await loadSelected();
    setStatus('Product published to shared catalog');
  };

  const publishRuleSet = async () => {
    if (!selectedNetworkId || !publishRuleSetId.trim()) return;
    await apiClient.publishNetworkPricingRuleSet(selectedNetworkId, publishRuleSetId.trim(), tenantId || undefined);
    setPublishRuleSetId('');
    await loadSelected();
    setStatus('Pricing rule set published to shared catalog');
  };

  const applyToStore = async (sharedItemId?: string) => {
    if (!selectedNetworkId || !applyStoreId.trim()) return;
    await apiClient.applyNetworkSharedItems(selectedNetworkId, {
      tenantId: tenantId || undefined,
      storeId: applyStoreId.trim(),
      sharedItemId,
    });
    const bindingRows = await apiClient.listNetworkBindings(selectedNetworkId, applyStoreId.trim(), tenantId || undefined);
    setBindings(Array.isArray(bindingRows) ? bindingRows : []);
    setStatus(sharedItemId ? 'Shared item applied' : 'All shared items applied');
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Network Admin</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Context</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input-base" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
          <select className="input-base" value={selectedNetworkId} onChange={(e) => setSelectedNetworkId(e.target.value)}>
            <option value="">Select network</option>
            {networks.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => { loadNetworks(); loadSelected(); }}>Refresh</button>
        </div>
        {status && <div className="text-xs text-emerald-700">{status}</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Create Network</div>
          <input className="input-base" placeholder="Network name" value={newNetworkName} onChange={(e) => setNewNetworkName(e.target.value)} />
          <input className="input-base" placeholder="Owner store ID" value={ownerStoreId} onChange={(e) => setOwnerStoreId(e.target.value)} />
          <button className="btn btn-primary" onClick={createNetwork}>Create Network</button>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Overview</div>
          <div className="text-sm">Routed Orders: {overview?.routedCount || 0}</div>
          <div className="text-sm">Revenue (cents): {overview?.revenueCents || 0}</div>
          <div className="text-sm">Royalties (cents): {overview?.royaltyCents || 0}</div>
          <div className="text-xs text-slate-500">Use Routing and Royalties pages for full management.</div>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Add Existing Store</div>
          <input className="input-base" placeholder="Store ID" value={addStoreId} onChange={(e) => setAddStoreId(e.target.value)} />
          <select className="input-base" value={addStoreRole} onChange={(e) => setAddStoreRole(e.target.value as any)}>
            <option value="OWNER">OWNER</option>
            <option value="HUB">HUB</option>
            <option value="SPOKE">SPOKE</option>
          </select>
          <button className="btn btn-secondary" onClick={addStore} disabled={!selectedNetworkId}>Add Store</button>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Create Child Store</div>
          <input className="input-base" placeholder="Store name" value={childStoreName} onChange={(e) => setChildStoreName(e.target.value)} />
          <input className="input-base" placeholder="Store slug" value={childStoreSlug} onChange={(e) => setChildStoreSlug(e.target.value)} />
          <select className="input-base" value={childStoreRole} onChange={(e) => setChildStoreRole(e.target.value as any)}>
            <option value="HUB">HUB</option>
            <option value="SPOKE">SPOKE</option>
          </select>
          <button className="btn btn-secondary" onClick={createChildStore} disabled={!selectedNetworkId}>Create Child Store</button>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Network Stores</div>
        <div className="space-y-1 max-h-56 overflow-auto text-sm">
          {stores.map((s) => (
            <div key={s.id} className="border rounded p-2">
              <div className="font-medium">{s.store?.name || s.storeId}</div>
              <div className="text-xs text-slate-600">{s.storeId} • {s.role} • {s.status}</div>
            </div>
          ))}
          {stores.length === 0 && <div className="text-xs text-slate-500">No stores in network.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Publish Shared Catalog</div>
          <input className="input-base" placeholder="Product ID" value={publishProductId} onChange={(e) => setPublishProductId(e.target.value)} />
          <button className="btn btn-secondary" onClick={publishProduct} disabled={!selectedNetworkId}>Publish Product</button>
          <input className="input-base" placeholder="Pricing Rule Set ID" value={publishRuleSetId} onChange={(e) => setPublishRuleSetId(e.target.value)} />
          <button className="btn btn-secondary" onClick={publishRuleSet} disabled={!selectedNetworkId}>Publish Pricing Rule Set</button>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Apply to Store</div>
          <input className="input-base" placeholder="Target store ID" value={applyStoreId} onChange={(e) => setApplyStoreId(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => applyToStore()} disabled={!selectedNetworkId}>Apply All Shared Items</button>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Shared Catalog Items</div>
        <div className="space-y-1 max-h-56 overflow-auto text-sm">
          {sharedItems.map((item) => (
            <div key={item.id} className="border rounded p-2 flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{item.type}</div>
                <div className="text-xs text-slate-600">Source: {item.sourceId} • v{item.version}</div>
              </div>
              <button className="btn btn-secondary" disabled={!applyStoreId} onClick={() => applyToStore(item.id)}>Apply</button>
            </div>
          ))}
          {sharedItems.length === 0 && <div className="text-xs text-slate-500">No shared items published.</div>}
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Store Bindings</div>
        <div className="space-y-1 max-h-56 overflow-auto text-sm">
          {bindings.map((b) => (
            <div key={b.id} className="border rounded p-2">
              <div className="font-medium">{b.sharedCatalogItem?.type || b.sharedCatalogItemId}</div>
              <div className="text-xs text-slate-600">Status: {b.status} • Applied Version: {b.appliedVersion}</div>
            </div>
          ))}
          {bindings.length === 0 && <div className="text-xs text-slate-500">No bindings for selected store.</div>}
        </div>
      </div>
    </div>
  );
}
