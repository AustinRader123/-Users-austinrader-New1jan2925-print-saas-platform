import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { Link } from 'react-router-dom';
import KanbanPackButton from '../components/KanbanPackButton';

export default function ProductionDashboard() {
  const [jobsByStatus, setJobsByStatus] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      // Use existing kanban if available; admin endpoints could also be used
      const kanban = await apiClient.getProductionKanban();
      setJobsByStatus(kanban || {});
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load production board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statuses = Object.keys(jobsByStatus);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="production-dashboard">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" data-testid="production-title">Production Board</h1>
        <button className="px-3 py-2 border rounded" onClick={load}>Refresh</button>
      </div>
      {toast && (
        <div className="mb-4 px-3 py-2 rounded bg-green-100 text-green-800" data-testid="toast">{toast}</div>
      )}
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {statuses.map((status) => (
          <div key={status} className="border rounded p-3 bg-gray-50">
            <div className="font-medium mb-2">{status.replace(/_/g, ' ')}</div>
            <div className="space-y-2">
              {jobsByStatus[status]?.map((job: any) => (
                <div key={job.id} className="bg-white border rounded p-2 hover:shadow" data-testid="job-card" data-job-id={job.id}>
                  <Link to={`/admin/production/jobs/${job.id}`} className="block">
                    <div className="text-sm font-medium">{job.jobNumber}</div>
                    <div className="text-xs text-gray-600">Order: {job.order?.orderNumber}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {job.order?.items?.slice(0,3).map((it: any) => (
                        <img key={it.id} src={it.mockupUrl} className="w-full h-16 object-cover rounded" />
                      ))}
                    </div>
                  </Link>
                  <KanbanPackButton jobId={job.id} initialReady={!!job.packUrl} onSuccess={(msg) => { setToast(msg || 'Pack ready'); load(); setTimeout(() => setToast(null), 3000); }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
