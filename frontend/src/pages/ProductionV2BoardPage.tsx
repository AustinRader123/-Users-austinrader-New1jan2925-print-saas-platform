import React from 'react';
import { apiClient } from '../lib/api';

const STAGES = ['ART', 'APPROVED', 'PRINT', 'CURE', 'PACK', 'SHIP', 'COMPLETE', 'HOLD', 'CANCELLED'];

type BatchRow = {
  id: string;
  sourceType: string;
  sourceId: string;
  stage: string;
  method: string;
  dueAt?: string | null;
  storeId: string;
  _count?: { items?: number };
};

function nextStage(stage: string) {
  const idx = STAGES.indexOf(stage);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

export default function ProductionV2BoardPage() {
  const [tenantId, setTenantId] = React.useState(() => localStorage.getItem('tenantId') || '');
  const [stage, setStage] = React.useState('');
  const [method, setMethod] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [campaignId, setCampaignId] = React.useState('');
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<BatchRow[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [detail, setDetail] = React.useState<any>(null);
  const [assignUserId, setAssignUserId] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const canQuery = Boolean(tenantId.trim());

  const loadBatches = React.useCallback(async () => {
    if (!canQuery) return;
    setError('');
    const data = await apiClient.listProductionV2Batches({
      tenantId: tenantId.trim(),
      ...(stage ? { stage } : {}),
      ...(method ? { method } : {}),
      ...(storeId ? { storeId } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(q ? { q } : {}),
    });
    setRows(Array.isArray(data) ? data : []);
  }, [canQuery, tenantId, stage, method, storeId, campaignId, q]);

  const loadDetail = React.useCallback(async () => {
    if (!canQuery || !selectedId) {
      setDetail(null);
      return;
    }
    const data = await apiClient.getProductionV2Batch(selectedId, tenantId.trim());
    setDetail(data);
  }, [canQuery, selectedId, tenantId]);

  React.useEffect(() => {
    loadBatches().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load batches'));
  }, [loadBatches]);

  React.useEffect(() => {
    loadDetail().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load batch detail'));
  }, [loadDetail]);

  const doRefresh = async () => {
    try {
      await loadBatches();
      await loadDetail();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Refresh failed');
    }
  };

  const printTicket = async (batchId: string) => {
    const html = await apiClient.getProductionV2TicketHtml(batchId, tenantId.trim());
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  const exportZip = async (batchId: string) => {
    const blob = await apiClient.downloadProductionV2BatchZip(batchId, tenantId.trim());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `production-batch-${batchId}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const advanceStage = async (batch: BatchRow) => {
    const toStage = nextStage(batch.stage);
    if (!toStage) return;
    await apiClient.updateProductionV2BatchStage(batch.id, tenantId.trim(), toStage);
    setMessage(`Moved ${batch.id} to ${toStage}`);
    await doRefresh();
  };

  const assignBatch = async () => {
    if (!detail?.id || !assignUserId.trim()) return;
    await apiClient.assignProductionV2Batch(detail.id, assignUserId.trim(), tenantId.trim());
    setAssignUserId('');
    setMessage('Batch assigned');
    await doRefresh();
  };

  const unassignBatch = async () => {
    if (!detail?.id) return;
    await apiClient.unassignProductionV2Batch(detail.id, tenantId.trim());
    setMessage('Batch unassigned');
    await doRefresh();
  };

  const byStage = React.useMemo(() => {
    const grouped: Record<string, BatchRow[]> = {};
    for (const value of STAGES) grouped[value] = [];
    for (const row of rows) {
      const key = grouped[row.stage] ? row.stage : 'ART';
      grouped[key].push(row);
    }
    return grouped;
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Production V2 WIP Board</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input className="input-base" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
          <select className="input-base" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">All stages</option>
            {STAGES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="input-base" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All methods</option>
            <option value="DTF">DTF</option>
            <option value="EMBROIDERY">Embroidery</option>
            <option value="SCREEN">Screen</option>
            <option value="OTHER">Other</option>
          </select>
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <input className="input-base" placeholder="campaignId" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <input className="input-base" placeholder="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => doRefresh()}>Refresh</button>
          {message && <span className="text-xs text-emerald-700">{message}</span>}
          {error && <span className="text-xs text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 overflow-x-auto">
          <div className="min-w-[980px] grid grid-cols-9 gap-3">
            {STAGES.map((col) => (
              <div key={col} className="rounded border bg-white p-2 space-y-2">
                <div className="text-xs font-semibold border-b pb-1">{col}</div>
                {(byStage[col] || []).map((batch) => (
                  <div key={batch.id} className={`rounded border p-2 text-xs space-y-1 ${selectedId === batch.id ? 'border-blue-500' : 'border-slate-200'}`}>
                    <button className="text-left w-full" onClick={() => setSelectedId(batch.id)}>
                      <div className="font-medium truncate">{batch.id}</div>
                      <div className="text-slate-600">{batch.method} • qty {(batch._count?.items || 0)}</div>
                      <div className="text-slate-500 truncate">{batch.sourceType}:{batch.sourceId}</div>
                    </button>
                    <div className="flex flex-wrap gap-1">
                      <button className="btn btn-secondary" onClick={() => printTicket(batch.id)}>Ticket</button>
                      <button className="btn btn-secondary" onClick={() => exportZip(batch.id)}>ZIP</button>
                      {nextStage(batch.stage) && <button className="btn btn-primary" onClick={() => advanceStage(batch)}>Advance</button>}
                    </div>
                  </div>
                ))}
                {(byStage[col] || []).length === 0 && <div className="text-[11px] text-slate-500">No batches</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border bg-white p-3 space-y-3">
          <div className="text-sm font-semibold">Batch Detail</div>
          {!detail && <div className="text-xs text-slate-500">Select a batch card.</div>}
          {detail && (
            <>
              <div className="text-xs space-y-1">
                <div><span className="font-medium">Batch:</span> {detail.id}</div>
                <div><span className="font-medium">Stage:</span> {detail.stage}</div>
                <div><span className="font-medium">Method:</span> {detail.method}</div>
                <div><span className="font-medium">Source:</span> {detail.sourceType}:{detail.sourceId}</div>
                <div><span className="font-medium">Scan token:</span> {detail.scanTokens?.[0]?.token || 'n/a'}</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium">Assignment</div>
                <input className="input-base" placeholder="userId" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} />
                <div className="flex items-center gap-2">
                  <button className="btn btn-secondary" onClick={assignBatch}>Assign</button>
                  <button className="btn btn-secondary" onClick={unassignBatch}>Unassign</button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium">Items</div>
                <div className="max-h-36 overflow-auto space-y-1">
                  {(detail.items || []).map((item: any) => (
                    <div key={item.id} className="rounded border p-1 text-[11px]">
                      {item.product?.name || item.productId} / {item.variant?.name || item.variantId} • {item.location} • qty {item.qty}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium">Event Timeline</div>
                <div className="max-h-44 overflow-auto space-y-1">
                  {(detail.events || []).map((event: any) => (
                    <div key={event.id} className="rounded border p-1 text-[11px]">
                      <div>{event.type} {event.fromStage ? `${event.fromStage} → ${event.toStage}` : ''}</div>
                      <div className="text-slate-500">{new Date(event.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
