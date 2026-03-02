import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { ErrorState, LoadingState } from './ui';

const fallbackBoard = {
  needsProof: [{ id: 'JOB-901', title: 'Atlas Team Tees' }],
  readyToPrint: [{ id: 'JOB-902', title: 'North Ridge Hoodies' }],
  inProduction: [{ id: 'JOB-903', title: 'Metro Jerseys' }],
  completed: [{ id: 'JOB-904', title: 'Summit Warmups' }],
};

export default function AppProductionBoardPage() {
  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const result = await apiClient.getProductionKanban();
        return {
          needsProof: result?.needsProof || [],
          readyToPrint: result?.readyToPrint || [],
          inProduction: result?.inProduction || [],
          completed: result?.completed || [],
        };
      },
      () => fallbackBoard,
      'production.board'
    );
  }, []);

  if (state.loading) return <LoadingState title="Loading board" />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.refetch} />;

  const columns = [
    { title: 'Needs Proof', key: 'needsProof' as const },
    { title: 'Ready to Print', key: 'readyToPrint' as const },
    { title: 'In Production', key: 'inProduction' as const },
    { title: 'Completed', key: 'completed' as const },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {columns.map((col) => (
        <div key={col.key} className="deco-panel">
          <div className="deco-panel-head">{col.title}</div>
          <div className="deco-panel-body space-y-2">
            {(state.data?.[col.key] || []).length === 0 ? <div className="text-xs text-slate-500">No jobs yet.</div> : null}
            {(state.data?.[col.key] || []).map((job: any) => (
              <div key={job.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                <div className="font-semibold">{job.id || 'JOB-NA'}</div>
                <div className="text-slate-600">{job.title || job.name || 'Production job'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
