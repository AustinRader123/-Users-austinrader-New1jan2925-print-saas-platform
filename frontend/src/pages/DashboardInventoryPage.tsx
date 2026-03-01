import React from 'react';
import { apiClient } from '../lib/api';

export default function DashboardInventoryPage() {
  const [tenantId, setTenantId] = React.useState(() => localStorage.getItem('tenantId') || '');
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || '');

  const [locations, setLocations] = React.useState<any[]>([]);
  const [skus, setSkus] = React.useState<any[]>([]);
  const [snapshot, setSnapshot] = React.useState<any>({ stocks: [], summary: [] });
  const [materials, setMaterials] = React.useState<any[]>([]);

  const [locationForm, setLocationForm] = React.useState({ name: '', code: '', type: 'WAREHOUSE' });
  const [skuForm, setSkuForm] = React.useState({ skuCode: '', name: '', unit: 'each', defaultReorderPoint: '' });
  const [adjustForm, setAdjustForm] = React.useState({ locationId: '', skuId: '', deltaOnHand: '0' });
  const [materialForm, setMaterialForm] = React.useState({ productId: '', variantId: '', skuId: '', qtyPerUnit: '1' });

  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const canQuery = Boolean(tenantId.trim() && storeId.trim());

  const loadAll = React.useCallback(async () => {
    if (!canQuery) return;
    setError('');

    const [locationsData, skusData, snapshotData, materialsData] = await Promise.all([
      apiClient.listInventoryLocations(storeId.trim(), tenantId.trim()),
      apiClient.listInventorySkus(storeId.trim(), tenantId.trim()),
      apiClient.listInventoryStockSnapshot(storeId.trim(), tenantId.trim()),
      apiClient.listInventoryMaterialMaps(storeId.trim(), tenantId.trim()),
    ]);

    setLocations(Array.isArray(locationsData) ? locationsData : []);
    setSkus(Array.isArray(skusData) ? skusData : []);
    setSnapshot(snapshotData || { stocks: [], summary: [] });
    setMaterials(Array.isArray(materialsData) ? materialsData : []);
  }, [canQuery, storeId, tenantId]);

  React.useEffect(() => {
    loadAll().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load inventory'));
  }, [loadAll]);

  const createLocation = async () => {
    await apiClient.createInventoryLocation({
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      name: locationForm.name,
      code: locationForm.code,
      type: locationForm.type,
    });
    setLocationForm({ name: '', code: '', type: 'WAREHOUSE' });
    setMessage('Location saved');
    await loadAll();
  };

  const createSku = async () => {
    await apiClient.upsertInventorySku({
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      skuCode: skuForm.skuCode,
      name: skuForm.name,
      unit: skuForm.unit,
      defaultReorderPoint: skuForm.defaultReorderPoint ? Number(skuForm.defaultReorderPoint) : undefined,
    });
    setSkuForm({ skuCode: '', name: '', unit: 'each', defaultReorderPoint: '' });
    setMessage('SKU saved');
    await loadAll();
  };

  const adjustStock = async () => {
    await apiClient.adjustInventoryStock({
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      locationId: adjustForm.locationId,
      skuId: adjustForm.skuId,
      deltaOnHand: Number(adjustForm.deltaOnHand || 0),
      type: 'ADJUSTMENT',
    });
    setAdjustForm({ locationId: '', skuId: '', deltaOnHand: '0' });
    setMessage('Stock adjusted');
    await loadAll();
  };

  const saveMaterial = async () => {
    await apiClient.upsertInventoryMaterialMap({
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      productId: materialForm.productId,
      variantId: materialForm.variantId || undefined,
      skuId: materialForm.skuId,
      qtyPerUnit: Math.max(1, Number(materialForm.qtyPerUnit || 1)),
    });
    setMaterialForm({ productId: '', variantId: '', skuId: '', qtyPerUnit: '1' });
    setMessage('Material map saved');
    await loadAll();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Inventory</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="input-base" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => loadAll()}>Refresh</button>
          {message && <span className="text-xs text-emerald-700">{message}</span>}
          {error && <span className="text-xs text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 space-y-3">
          <div className="text-sm font-semibold">Locations</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="input-base" placeholder="Name" value={locationForm.name} onChange={(e) => setLocationForm((v) => ({ ...v, name: e.target.value }))} />
            <input className="input-base" placeholder="Code" value={locationForm.code} onChange={(e) => setLocationForm((v) => ({ ...v, code: e.target.value }))} />
            <select className="input-base" value={locationForm.type} onChange={(e) => setLocationForm((v) => ({ ...v, type: e.target.value }))}>
              <option value="WAREHOUSE">WAREHOUSE</option>
              <option value="SHELF">SHELF</option>
              <option value="BIN">BIN</option>
              <option value="EXTERNAL">EXTERNAL</option>
            </select>
          </div>
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => createLocation().catch((err: any) => setError(err?.response?.data?.error || 'Failed to save location'))}>Save location</button>
          <div className="max-h-56 overflow-auto space-y-1">
            {locations.map((row) => (
              <div key={row.id} className="rounded border p-2 text-xs">{row.code} • {row.name} ({row.type})</div>
            ))}
          </div>
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <div className="text-sm font-semibold">SKUs</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input className="input-base" placeholder="SKU code" value={skuForm.skuCode} onChange={(e) => setSkuForm((v) => ({ ...v, skuCode: e.target.value }))} />
            <input className="input-base" placeholder="Name" value={skuForm.name} onChange={(e) => setSkuForm((v) => ({ ...v, name: e.target.value }))} />
            <input className="input-base" placeholder="Unit" value={skuForm.unit} onChange={(e) => setSkuForm((v) => ({ ...v, unit: e.target.value }))} />
            <input className="input-base" placeholder="Reorder point" value={skuForm.defaultReorderPoint} onChange={(e) => setSkuForm((v) => ({ ...v, defaultReorderPoint: e.target.value }))} />
          </div>
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => createSku().catch((err: any) => setError(err?.response?.data?.error || 'Failed to save sku'))}>Save SKU</button>
          <div className="max-h-56 overflow-auto space-y-1">
            {skus.map((row) => (
              <div key={row.id} className="rounded border p-2 text-xs">{row.skuCode} • {row.name}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 space-y-3">
          <div className="text-sm font-semibold">Stock Snapshot</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select className="input-base" value={adjustForm.locationId} onChange={(e) => setAdjustForm((v) => ({ ...v, locationId: e.target.value }))}>
              <option value="">Location</option>
              {locations.map((row) => <option key={row.id} value={row.id}>{row.code}</option>)}
            </select>
            <select className="input-base" value={adjustForm.skuId} onChange={(e) => setAdjustForm((v) => ({ ...v, skuId: e.target.value }))}>
              <option value="">SKU</option>
              {skus.map((row) => <option key={row.id} value={row.id}>{row.skuCode}</option>)}
            </select>
            <input className="input-base" placeholder="Delta on-hand" value={adjustForm.deltaOnHand} onChange={(e) => setAdjustForm((v) => ({ ...v, deltaOnHand: e.target.value }))} />
          </div>
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => adjustStock().catch((err: any) => setError(err?.response?.data?.error || 'Failed to adjust stock'))}>Adjust stock</button>
          <div className="max-h-64 overflow-auto space-y-1">
            {(snapshot.summary || []).map((row: any) => (
              <div key={row.skuId} className="rounded border p-2 text-xs">
                {row.skuCode} • onHand {row.onHand} • reserved {row.reserved} • available {row.available}
                {row.lowStock ? <span className="text-rose-700"> • LOW</span> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <div className="text-sm font-semibold">Product Material Map</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input className="input-base" placeholder="productId" value={materialForm.productId} onChange={(e) => setMaterialForm((v) => ({ ...v, productId: e.target.value }))} />
            <input className="input-base" placeholder="variantId (optional)" value={materialForm.variantId} onChange={(e) => setMaterialForm((v) => ({ ...v, variantId: e.target.value }))} />
            <select className="input-base" value={materialForm.skuId} onChange={(e) => setMaterialForm((v) => ({ ...v, skuId: e.target.value }))}>
              <option value="">SKU</option>
              {skus.map((row) => <option key={row.id} value={row.id}>{row.skuCode}</option>)}
            </select>
            <input className="input-base" placeholder="qty per unit" value={materialForm.qtyPerUnit} onChange={(e) => setMaterialForm((v) => ({ ...v, qtyPerUnit: e.target.value }))} />
          </div>
          <button disabled={!canQuery} className="btn btn-secondary" onClick={() => saveMaterial().catch((err: any) => setError(err?.response?.data?.error || 'Failed to save map'))}>Save map</button>
          <div className="max-h-64 overflow-auto space-y-1">
            {materials.map((row) => (
              <div key={row.id} className="rounded border p-2 text-xs">
                {row.product?.name || row.productId} / {row.variant?.sku || row.variant?.id || 'ANY'} → {row.sku?.skuCode || row.skuId} × {row.qtyPerUnit}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
