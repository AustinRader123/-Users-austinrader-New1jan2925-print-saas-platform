import React from 'react';

export default function StatusChip({ value }: { value: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    IN_PRODUCTION: 'bg-blue-50 text-blue-700 border-blue-200',
    SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    READY: 'bg-violet-50 text-violet-700 border-violet-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200',
    APPROVAL_PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  const cls = map[value] || 'bg-slate-100 text-slate-700 border-slate-200';
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${cls}`}>{value.replace('_', ' ')}</span>;
}
