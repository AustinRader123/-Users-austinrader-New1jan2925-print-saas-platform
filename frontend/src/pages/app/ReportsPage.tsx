import React from 'react';
import { PageHeader } from './ui';

export default function AppReportsPage() {
  return (
    <div className="deco-page">
      <PageHeader title="Reports" subtitle="Operational performance summaries and exports." />
      <div className="deco-panel">
        <div className="deco-panel-head">Available Reports</div>
        <div className="deco-panel-body grid gap-2 md:grid-cols-3">
          <button className="deco-btn">Orders by Status</button>
          <button className="deco-btn">Production Throughput</button>
          <button className="deco-btn">Inventory Aging</button>
        </div>
      </div>
    </div>
  );
}
