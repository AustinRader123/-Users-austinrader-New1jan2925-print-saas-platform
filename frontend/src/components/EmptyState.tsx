import React from 'react';

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-6 text-center">
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="mt-1 text-xs text-slate-600">{description}</div>}
    </div>
  );
}
