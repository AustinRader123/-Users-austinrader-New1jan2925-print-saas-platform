import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { PageHeader } from './ui';

export default function AppReportsPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const summary = await apiClient.getReportsSummary(storeId);
        return { summary };
      },
      () => ({ summary: { orders: 0, revenue: 0 } }),
      'reports.summary'
    );
  }, [storeId]);

  return (
    <div className="deco-page">
      <PageHeader title="Reports" subtitle="Operational performance summaries and exports." />
      <div className="deco-panel">
        <div className="deco-panel-head">Available Reports</div>
        <div className="deco-panel-body grid gap-2 md:grid-cols-3">
          <button className="deco-btn" onClick={state.refetch}>Load data</button>
          <button className="deco-btn">Orders by Status</button>
          <button className="deco-btn">Production Throughput</button>
          <button className="deco-btn">Inventory Aging</button>
        </div>
      </div>
      <div className="text-xs text-slate-600">Summary loaded: {state.loading ? 'Loading…' : 'Yes'}</div>
    </div>
  );
}
