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
  const [scanToken, setScanToken] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

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

  const runScanAdvance = async () => {
    if (!scanToken.trim()) return;
    setActionMessage(null);
    try {
      await apiClient.scanProductionV2Token(scanToken.trim(), 'advance');
      setActionMessage('Scan advanced successfully.');
      setScanToken('');
      await state.refetch();
    } catch (error: any) {
      setActionMessage(error?.message || 'Scan failed.');
    }
  };

  const batchMoveSelected = async () => {
    if (selectedIds.length === 0) return;
    setActionMessage(null);
    try {
      await Promise.all(selectedIds.map((jobId) => apiClient.adminUpdateProductionJob(jobId, 'IN_PRODUCTION')));
      setActionMessage(`Moved ${selectedIds.length} job(s) to In Production.`);
      setSelectedIds([]);
      await state.refetch();
    } catch (error: any) {
      setActionMessage(error?.message || 'Batch move failed.');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-3">
      <div className="deco-panel">
        <div className="deco-panel-body flex flex-wrap items-center gap-2">
          <input className="deco-input" placeholder="Scan token" value={scanToken} onChange={(e) => setScanToken(e.target.value)} />
          <button className="deco-btn" onClick={runScanAdvance}>Scan to Advance</button>
          <button className="deco-btn-primary" onClick={batchMoveSelected} disabled={selectedIds.length === 0}>Move Selected</button>
          {actionMessage ? <div className="text-xs text-slate-600">{actionMessage}</div> : null}
        </div>
      </div>

      <div className="deco-panel">
        <div className="deco-table-wrap">
          <table className="deco-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Job #</th>
                <th>Order #</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {[...state.data]
                .sort((a: any, b: any) => {
                  const dueA = new Date(a.due || a.dueDate || 0).getTime();
                  const dueB = new Date(b.due || b.dueDate || 0).getTime();
                  if (dueA !== dueB) return dueA - dueB;
                  return String(a.id || a.jobNumber).localeCompare(String(b.id || b.jobNumber));
                })
                .map((row: any) => {
                  const id = String(row.id || row.jobNumber);
                  return (
                    <tr key={id}>
                      <td><input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelection(id)} /></td>
                      <td className="font-semibold">{id}</td>
                      <td>{row.orderNumber || row.orderId || '—'}</td>
                      <td>{row.assignee || row.assignedTo || 'Unassigned'}</td>
                      <td><span className="deco-badge">{row.status || 'Pending'}</span></td>
                      <td>{row.due || row.dueDate || '—'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
