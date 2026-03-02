import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState } from './ui';

const mockRows = [
  { id: 'JOB-901', orderNumber: 'SO-10601', assignee: 'Press Team A', status: 'In Production', due: '2026-03-02' },
  { id: 'JOB-902', orderNumber: 'SO-10600', assignee: 'Press Team B', status: 'Needs Proof', due: '2026-03-03' },
];

export default function AppProductionJobsPage() {
  const storeId = localStorage.getItem('storeId') || 'default';

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const result = await apiClient.listProductionJobs(storeId);
        const rows = Array.isArray(result) ? result : (result?.jobs || []);
        return rows;
      },
      () => mockRows,
      'production.jobs'
    );
  }, [storeId]);

  if (state.loading) return <LoadingState title="Loading jobs" />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.refetch} />;
  if (!state.data || state.data.length === 0) return <EmptyState title="No production jobs" description="Jobs will appear here when orders enter production." />;

  return (
    <div className="deco-panel">
      <div className="deco-table-wrap">
        <table className="deco-table">
          <thead>
            <tr>
              <th>Job #</th>
              <th>Order #</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((row: any) => (
              <tr key={row.id || row.jobNumber}>
                <td className="font-semibold">{row.id || row.jobNumber}</td>
                <td>{row.orderNumber || row.orderId || '—'}</td>
                <td>{row.assignee || row.assignedTo || 'Unassigned'}</td>
                <td><span className="deco-badge">{row.status || 'Pending'}</span></td>
                <td>{row.due || row.dueDate || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
