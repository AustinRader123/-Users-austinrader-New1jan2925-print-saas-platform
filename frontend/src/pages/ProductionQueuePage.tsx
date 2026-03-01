import React, { useEffect, useState } from 'react';
import { listProductionJobs, updateProductionJob } from '../services/production.service';
import { apiClient } from '../lib/api';

type Job = { id: string; title?: string; status: string; dueAt?: string };

const COLUMNS = [
  { key: 'QUEUED', label: 'Queued' },
  { key: 'ARTWORK_REVIEW', label: 'Artwork Review' },
  { key: 'IN_PRODUCTION', label: 'In Production' },
  { key: 'QUALITY_CHECK', label: 'Quality Check' },
  { key: 'READY_TO_PACK', label: 'Ready to Pack' },
  { key: 'PACKED', label: 'Packed' },
];

export default function ProductionQueuePage() {
  const [jobsByCol, setJobsByCol] = useState<Record<string, Job[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const jobs = await listProductionJobs();
        const grouped: Record<string, Job[]> = {};
        COLUMNS.forEach((c) => (grouped[c.key] = []));
        (jobs || []).forEach((j: any) => {
          const status = j.status || 'NEW';
          const job: Job = { id: String(j.id), title: j.title || j.orderId || 'Job', status, dueAt: j.dueAt };
          (grouped[status] || (grouped[status] = [])).push(job);
        });
        setJobsByCol(grouped);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load production jobs');
      }
    })();
  }, []);

  const onDrop = async (jobId: string, targetCol: string) => {
    try {
      await updateProductionJob(jobId, targetCol);
      setJobsByCol((prev) => {
        const next: Record<string, Job[]> = {};
        for (const k of Object.keys(prev)) next[k] = prev[k].filter((j) => j.id !== jobId);
        const moved = Object.values(prev).flat().find((j) => j.id === jobId);
        if (moved) next[targetCol] = [...(next[targetCol] || []), { ...moved, status: targetCol }];
        return next;
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to move job');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Production Queue</div>
        <div className="text-xs text-slate-600">Drag jobs across columns</div>
      </div>
      {error && <div className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-700 text-xs mb-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="rounded border border-slate-200 bg-white p-2 min-h-[240px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const jobId = e.dataTransfer.getData('text/plain');
              onDrop(jobId, col.key);
            }}
          >
            <div className="text-xs font-medium mb-2">{col.label}</div>
            <div className="space-y-2">
              {(jobsByCol[col.key] || []).map((j) => (
                <div
                  key={j.id}
                  className="rounded-sm border border-slate-300 p-2 text-xs bg-slate-50"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', j.id)}
                >
                  <div className="font-medium">{j.title}</div>
                  <div className="text-slate-600">Due {j.dueAt ? new Date(j.dueAt).toLocaleDateString() : '—'}</div>
                  <button
                    className="mt-1 rounded border px-2 py-1 text-[11px]"
                    onClick={async () => {
                      try {
                        await apiClient.generateWorkOrder(j.id);
                      } catch (e: any) {
                        setError(e?.response?.data?.error || 'Failed to generate work order');
                      }
                    }}
                  >
                    Generate Work Order
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
