import React from 'react';

export default function ReportsPage() {
  return (
    <div className="p-4">
      <div className="text-sm font-semibold mb-2">Reports</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Sales Summary</div>
          <div className="h-48 rounded-sm bg-slate-100" />
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Product Performance</div>
          <div className="h-48 rounded-sm bg-slate-100" />
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Production Time</div>
          <div className="h-48 rounded-sm bg-slate-100" />
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium mb-2">Revenue by Store</div>
          <div className="h-48 rounded-sm bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
