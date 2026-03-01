import React, { useEffect, useState } from 'react';
import { listArtworkApprovals, approveArtwork, rejectArtwork } from '../services/artwork.service';

type ApprovalItem = { id: string; thumbnailUrl?: string; orderId?: string; customer?: string; dueAt?: string };

export default function ArtworkApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listArtworkApprovals();
        const normalized = (data || []).map((a: any) => ({
          id: String(a.id),
          thumbnailUrl: a.mockup?.imageUrl || a.order?.items?.[0]?.mockupUrl || a.thumbnailUrl || a.mockupUrl,
          orderId: a.order?.orderNumber || a.orderId || a.designId,
          customer: a.order?.customerName || a.customer || '—',
          dueAt: a.expiresAt || a.dueAt,
        }));
        setItems(normalized);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Not connected');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const act = async (id: string, type: 'approve' | 'reject') => {
    try {
      if (type === 'approve') await approveArtwork(id);
      else await rejectArtwork(id, '');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Action failed');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-2 text-sm font-semibold">Artwork Approvals</div>
      {error && <div className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-800 text-xs mb-2">{error}</div>}
      {loading ? (
        <div className="text-xs text-slate-600">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-slate-600">No pending approvals.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {items.map((it) => (
            <div key={it.id} className="rounded border border-slate-200 bg-white p-2 text-xs">
              {it.thumbnailUrl ? (
                <img src={it.thumbnailUrl} className="w-full h-24 object-cover" />
              ) : (
                <div className="h-24 bg-slate-100" />
              )}
              <div className="mt-1">Order {it.orderId}</div>
              <div className="text-slate-600">{it.customer}</div>
              <div className="text-slate-500">Due {it.dueAt ? new Date(it.dueAt).toLocaleDateString() : '—'}</div>
              <div className="mt-2 flex items-center gap-1">
                <button className="rounded-sm border px-2 py-1" onClick={() => act(it.id, 'approve')}>Approve</button>
                <button className="rounded-sm border px-2 py-1" onClick={() => act(it.id, 'reject')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
